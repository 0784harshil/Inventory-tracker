'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Loading fallback for Suspense
function LoadingFallback() {
    return (
        <div className="page-container">
            <div className="loading-spinner">Loading...</div>
        </div>
    );
}

// Main component that uses useSearchParams
function NewTransferForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stores, setStores] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        if (fromStore) {
            fetchInventoryForStore(fromStore);
        } else {
            setInventory([]);
        }
    }, [fromStore]);

    // Pre-fill from URL params
    useEffect(() => {
        const itemParam = searchParams.get('item');
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');

        if (fromParam) setFromStore(fromParam);
        if (toParam) setToStore(toParam);
    }, [searchParams]);

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/stores');
            if (res.ok) {
                const data = await res.json();
                setStores(data);
            }
        } catch (err) {
            console.error('Error fetching stores:', err);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (fromStore) {
                fetchInventoryForStore(fromStore, searchTerm);
            }
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, fromStore]);

    const fetchInventoryForStore = async (storeCode, search = '') => {
        try {
            // Fetch items from server - search query is passed to API
            const queryParams = new URLSearchParams({
                store: storeCode,
                pageSize: '50', // Fetch 50 matches
                search: search
            });

            const res = await fetch(`/api/inventory?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInventory(data.items || []);
            }
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setInventory([]);
        }
    };

    const addItem = (item) => {
        if (selectedItems.find(i => i.item_num === item.item_num)) return;
        setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    };

    const removeItem = (itemNum) => {
        setSelectedItems(selectedItems.filter(i => i.item_num !== itemNum));
    };

    const updateQuantity = (itemNum, quantity) => {
        // Allow any quantity (no max limit) - supports negative stock transfers
        setSelectedItems(selectedItems.map(item =>
            item.item_num === itemNum
                ? { ...item, quantity: Math.max(1, quantity) }
                : item
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fromStore || !toStore) {
            alert('Please select both source and destination stores');
            return;
        }

        if (fromStore === toStore) {
            alert('Source and destination stores cannot be the same');
            return;
        }

        if (selectedItems.length === 0) {
            alert('Please add at least one item to transfer');
            return;
        }

        try {
            setSubmitting(true);

            const res = await fetch('/api/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_store: fromStore,
                    to_store: toStore,
                    notes: notes,
                    items: selectedItems.map(item => ({
                        item_num: item.item_num,
                        item_name: item.item_name,
                        quantity: item.quantity
                    }))
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create transfer');
            }

            router.push('/transfers');
        } catch (err) {
            console.error('Error creating transfer:', err);
            alert('Failed to create transfer: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };



    const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <Link href="/transfers" className="back-link">← Back to Transfers</Link>
                    <h1>New Transfer</h1>
                    <p className="subtitle">Create a new inventory transfer between stores</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="transfer-form-grid">
                    {/* Left Column - Store Selection & Items */}
                    <div className="transfer-form-main">
                        {/* Store Selection */}
                        <div className="card">
                            <div className="card-header">
                                <h2>Transfer Route</h2>
                            </div>
                            <div className="card-content">
                                <div className="store-selection">
                                    <div className="form-group">
                                        <label>From Store *</label>
                                        <select
                                            value={fromStore}
                                            onChange={(e) => {
                                                setFromStore(e.target.value);
                                                setSelectedItems([]);
                                            }}
                                            required
                                        >
                                            <option value="">Select source store</option>
                                            {stores.map(store => (
                                                <option key={store.id} value={store.store_code}>
                                                    {store.name} ({store.store_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="arrow-indicator">→</div>
                                    <div className="form-group">
                                        <label>To Store *</label>
                                        <select
                                            value={toStore}
                                            onChange={(e) => setToStore(e.target.value)}
                                            required
                                        >
                                            <option value="">Select destination store</option>
                                            {stores.filter(s => s.store_code !== fromStore).map(store => (
                                                <option key={store.id} value={store.store_code}>
                                                    {store.name} ({store.store_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Item Selection */}
                        <div className="card">
                            <div className="card-header">
                                <h2>Select Items</h2>
                                {fromStore && (
                                    <span className="item-count">Showing {inventory.length} items</span>
                                )}
                            </div>
                            <div className="card-content">
                                {!fromStore ? (
                                    <div className="empty-message">
                                        <p>Select a source store to view available items</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="search-box">
                                            <input
                                                type="text"
                                                placeholder="Search items..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="search-input"
                                            />
                                        </div>
                                        <div className="item-picker-list">
                                            {inventory.length === 0 ? (
                                                <p className="empty-message">No items found</p>
                                            ) : (
                                                inventory.slice(0, 50).map(item => (
                                                    <div
                                                        key={item.id}
                                                        className={`item-picker-row ${selectedItems.find(i => i.item_num === item.item_num) ? 'selected' : ''}`}
                                                        onClick={() => addItem(item)}
                                                    >
                                                        <div className="item-info">
                                                            <span className="item-name">{item.item_name}</span>
                                                            <span className="item-num">{item.item_num}</span>
                                                        </div>
                                                        <div className="item-stock">
                                                            {item.in_stock} in stock
                                                        </div>
                                                        <button type="button" className="btn btn-sm btn-secondary">
                                                            + Add
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                            {inventory.length >= 50 && (
                                                <p className="more-items">Showing top 50 matches. Refine search for more.</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary */}
                    <div className="transfer-form-sidebar">
                        <div className="card sticky">
                            <div className="card-header">
                                <h2>Transfer Summary</h2>
                            </div>
                            <div className="card-content">
                                {selectedItems.length === 0 ? (
                                    <div className="empty-message">
                                        <p>No items selected</p>
                                    </div>
                                ) : (
                                    <div className="selected-items-list">
                                        {selectedItems.map(item => (
                                            <div key={item.item_num} className="selected-item">
                                                <div className="item-details">
                                                    <span className="item-name">{item.item_name}</span>
                                                    <span className="item-num">{item.item_num}</span>
                                                </div>
                                                <div className="quantity-control">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.item_num, item.quantity - 1)}
                                                        className="qty-btn"
                                                    >
                                                        -
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.item_num, parseInt(e.target.value) || 1)}
                                                        min="1"
                                                        className="qty-input"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.item_num, item.quantity + 1)}
                                                        className="qty-btn"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.item_num)}
                                                    className="remove-btn"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="summary-totals">
                                    <div className="summary-row">
                                        <span>Total Items</span>
                                        <span>{selectedItems.length}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Total Quantity</span>
                                        <span>{totalItems}</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Notes (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add any notes about this transfer..."
                                        rows="3"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-block"
                                    disabled={submitting || selectedItems.length === 0}
                                >
                                    {submitting ? 'Creating...' : 'Create Transfer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

// Wrapper component with Suspense boundary to fix hydration error
export default function NewTransferPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <NewTransferForm />
        </Suspense>
    );
}
