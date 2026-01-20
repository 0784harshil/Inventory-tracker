'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ItemForm({ initialData = null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stores, setStores] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [validationErrors, setValidationErrors] = useState({});

    // "Lazy" Defaults
    const isEditMode = !!initialData;
    const [priceMode, setPriceMode] = useState('margin'); // Default to smart pricing
    const [margin, setMargin] = useState('45'); // Standard retail margin default

    // State for simple Multi-Store selection
    // In edit mode, we stick to the single store being edited to avoid confusion
    const [selectedStoreIds, setSelectedStoreIds] = useState(
        initialData?.store_id ? [initialData.store_id] : []
    );

    const [formData, setFormData] = useState({
        item_num: '',
        item_name: '',
        item_type: initialData?.itemtype?.toString() || '0', // Map from itemtype
        dept_id: 'NONE', // Lazy default
        in_stock: '0', // Lazy default
        cost: '0.00',
        price: '0.00',
        ...initialData,
        // Ensure item_type is correctly set even after spread
        item_type: initialData?.itemtype?.toString() || initialData?.item_type?.toString() || '0'
    });

    useEffect(() => {
        fetchStores();
        fetchDepartments();
    }, []);

    // Auto-select all stores for new items (Lazy convenience)
    useEffect(() => {
        if (!isEditMode && stores.length > 0 && selectedStoreIds.length === 0) {
            // Optional: Default to ALL stores or just the first one. 
            // Let's default to ALL for maximum laziness if < 3 stores, else just first.
            if (stores.length <= 3) {
                setSelectedStoreIds(stores.map(s => s.store_code));
            } else {
                setSelectedStoreIds([stores[0].store_code]);
            }
        }
    }, [stores, isEditMode]);

    // Auto-calculate price logic
    useEffect(() => {
        if (priceMode === 'margin' && formData.cost) {
            const cost = parseFloat(formData.cost) || 0;
            const marginPercent = parseFloat(margin) || 0;
            // Sales Price = Cost / (1 - Margin%) is standard retail, 
            // but often simple markup Cost * (1 + Markup%) is used.
            // Let's stick to simple markup as per previous code: Cost * (1 + Margin/100)
            const calculatedPrice = cost * (1 + marginPercent / 100);
            setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
        }
    }, [formData.cost, margin, priceMode]);

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/stores');
            if (res.ok) {
                const data = await res.json();
                setStores(data);
            }
        } catch (err) {
            console.error('Error fetching stores:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await fetch('/api/departments');
            if (res.ok) {
                const data = await res.json();
                // Deduplicate by dept_id
                const uniqueDepts = [];
                const seenIds = new Set();
                data.forEach(d => {
                    const id = (d.dept_id || '').trim();
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        uniqueDepts.push({ ...d, dept_id: id });
                    }
                });
                uniqueDepts.sort((a, b) => (a.description || '').localeCompare(b.description || ''));
                setDepartments(uniqueDepts);
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const toggleStore = (storeCode) => {
        if (isEditMode) return; // Disable changing store in edit mode for now

        setSelectedStoreIds(prev => {
            if (prev.includes(storeCode)) {
                return prev.filter(id => id !== storeCode);
            } else {
                return [...prev, storeCode];
            }
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear errors on type
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleCostBlur = () => {
        const cost = parseFloat(formData.cost) || 0;
        setFormData(prev => ({ ...prev, cost: cost.toFixed(2) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (selectedStoreIds.length === 0) {
            setError("Please select at least one store.");
            setLoading(false);
            return;
        }

        if (!formData.item_num || !formData.item_name) {
            setValidationErrors({
                item_num: !formData.item_num ? 'Required' : null,
                item_name: !formData.item_name ? 'Required' : null
            });
            setLoading(false);
            return;
        }

        try {
            const url = isEditMode
                ? `/api/inventory/${initialData.id}`
                : '/api/inventory';

            const method = isEditMode ? 'PATCH' : 'POST';

            // Prepare payload
            const payload = {
                ...formData,
                store_ids: selectedStoreIds, // New array field
                store_id: selectedStoreIds[0] // Fallback for single store edits
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok && res.status !== 207) { // 207 is partial success
                throw new Error(data.error || 'Failed to save item');
            }

            if (data.errors && data.errors.length > 0) {
                // Formatting partial errors for alert
                alert(`Note: ${data.errors.join('\n')}`);
            }

            router.push('/inventory');
            router.refresh();
        } catch (err) {
            setError(err.message);
            window.scrollTo(0, 0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <button onClick={() => router.back()} className="back-link">← Back to Inventory</button>
                    <h1>Add New Item</h1>
                    <p className="subtitle">Create a new item in your master inventory database</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="transfer-form-grid">
                {/* Main Card */}
                <div className="card">
                    <div className="card-header">
                        <h2>Item Details</h2>
                    </div>
                    <div className="card-content">
                        {error && (
                            <div className="error-message mb-4 p-4">
                                <h3>Error</h3>
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Store Selection */}
                        <div className="form-group mb-6">
                            <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Publish To Stores *</label>
                            <div className="flex flex-wrap gap-2">
                                {stores.map(store => {
                                    const isSelected = selectedStoreIds.includes(store.store_code);
                                    return (
                                        <label
                                            key={store.id}
                                            className={`
                                                cursor-pointer px-4 py-2 rounded-md border flex items-center gap-2 transition-all
                                                ${isSelected
                                                    ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#60A5FA]'
                                                    : 'bg-[#1E1E1E] border-[#333] text-gray-400 hover:border-gray-500'
                                                }
                                            `}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleStore(store.store_code)}
                                                disabled={isEditMode && !isSelected}
                                                className="hidden"
                                            />
                                            <span className="font-bold text-sm">{store.name}</span>
                                            {isSelected && <span>✓</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Identification */}
                        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-400 mb-2">UPC / Item # *</label>
                                <input
                                    type="text"
                                    name="item_num"
                                    value={formData.item_num}
                                    onChange={handleChange}
                                    className={`search-input ${validationErrors.item_num ? 'border-red-500' : ''}`}
                                    placeholder="Scan or type..."
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Item Name *</label>
                                <input
                                    type="text"
                                    name="item_name"
                                    value={formData.item_name}
                                    onChange={handleChange}
                                    className={`search-input ${validationErrors.item_name ? 'border-red-500' : ''}`}
                                    placeholder="Product description"
                                />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Department</label>
                                <select
                                    name="dept_id"
                                    value={formData.dept_id}
                                    onChange={handleChange}
                                    className="search-input"
                                >
                                    <option value="NONE">Select Dept...</option>
                                    {departments.map(d => (
                                        <option key={d.dept_id} value={d.dept_id}>
                                            {d.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Item Type</label>
                                <input
                                    type="number"
                                    name="item_type"
                                    value={formData.item_type || 0}
                                    onChange={handleChange}
                                    className="search-input text-center"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Pricing Wrapper */}
                        <div className="bg-[#121212] rounded-lg p-5 border border-[#333] mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-wide">Pricing Strategy</label>
                                <button
                                    type="button"
                                    onClick={() => setPriceMode(priceMode === 'margin' ? 'manual' : 'margin')}
                                    className="text-xs btn btn-sm btn-ghost text-[#3B82F6] hover:bg-[#3B82F6]/10"
                                >
                                    {priceMode === 'margin' ? 'Switch to Manual Entry' : 'Auto-Calculate'}
                                </button>
                            </div>

                            <div className="flex items-end gap-3">
                                <div className="form-group flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Cost ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="cost"
                                        value={formData.cost}
                                        onChange={handleChange}
                                        onBlur={handleCostBlur}
                                        className="search-input font-mono text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="pb-3 text-gray-500 font-light text-2xl">+</div>
                                <div className="form-group w-24">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Margin (%)</label>
                                    <input
                                        type="number"
                                        value={margin}
                                        onChange={(e) => setMargin(e.target.value)}
                                        className="search-input font-mono text-lg text-center"
                                        disabled={priceMode !== 'margin'}
                                        placeholder="%"
                                    />
                                </div>
                                <div className="pb-3 text-gray-500 font-light text-2xl">=</div>
                                <div className="form-group flex-1">
                                    <label className="block text-xs font-bold text-[#60A5FA] mb-1">Retail Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        className={`search-input font-mono text-lg font-bold
                                            ${priceMode !== 'manual' ? 'bg-[#1E1E1E] text-[#60A5FA] border-[#3B82F6]/50' : ''}
                                        `}
                                        readOnly={priceMode !== 'manual'}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stock */}
                        <div className="form-group max-w-xs">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Initial Stock Level (Units)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    name="in_stock"
                                    value={formData.in_stock}
                                    onChange={handleChange}
                                    className="search-input font-mono text-lg"
                                />
                                <span className="text-xs text-gray-500">
                                    Applied to {selectedStoreIds.length} stores
                                </span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#333]">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {loading && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>}
                                {loading ? 'Saving...' : 'Save & Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
