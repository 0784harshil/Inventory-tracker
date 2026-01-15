'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

// Skeleton row for instant visual feedback
const SkeletonRow = () => (
    <tr className="skeleton-row">
        <td><div className="skeleton skeleton-text" style={{ width: '80%' }}></div></td>
        <td><div className="skeleton skeleton-badge"></div></td>
        <td><div className="skeleton skeleton-text" style={{ width: '60%' }}></div></td>
        <td><div className="skeleton skeleton-number"></div></td>
        <td><div className="skeleton skeleton-number"></div></td>
        <td><div className="skeleton skeleton-number"></div></td>
        <td><div className="skeleton skeleton-badge"></div></td>
        <td><div className="skeleton skeleton-btn"></div></td>
    </tr>
);

export default function InventoryPage() {
    const { showToast } = useToast();
    const [inventory, setInventory] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState('all');
    const [showLowStock, setShowLowStock] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 50, // Reduced initial load
        totalItems: 0,
        totalPages: 0,
        hasMore: false
    });

    const searchTimeoutRef = useRef(null);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Debounce search input - 400ms delay
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm]);

    // Fetch stores on mount (cached on server)
    useEffect(() => {
        fetchStores();
    }, []);

    // Reset and fetch inventory when filters change
    useEffect(() => {
        setInventory([]);
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchInventory(1, true);
    }, [selectedStore, showLowStock, debouncedSearch, selectedDepartment, priceMin, priceMax]);

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

    const fetchInventory = useCallback(async (page = 1, reset = false) => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', '50'); // Smaller page size for faster loads

            if (selectedStore !== 'all') params.append('store', selectedStore);
            if (showLowStock) params.append('lowStock', 'true');
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
            if (priceMin) params.append('priceMin', priceMin);
            if (priceMax) params.append('priceMax', priceMax);

            const res = await fetch(`/api/inventory?${params.toString()}`, {
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) throw new Error('Failed to fetch inventory');

            const data = await res.json();

            if (reset || page === 1) {
                setInventory(data.items);
            } else {
                setInventory(prev => [...prev, ...data.items]);
            }
            setPagination(data.pagination);
        } catch (err) {
            if (err.name === 'AbortError') {
                return; // Request was cancelled, ignore
            }
            console.error('Error fetching inventory:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedStore, showLowStock, debouncedSearch, selectedDepartment, priceMin, priceMax]);

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination.hasMore && !loadingMore && !loading) {
                    fetchInventory(pagination.page + 1);
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [pagination.hasMore, pagination.page, loadingMore, loading, fetchInventory]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // "/" to focus search (unless already in an input)
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                document.querySelector('.search-input')?.focus();
            }
            // Escape to clear search
            if (e.key === 'Escape' && document.activeElement.classList.contains('search-input')) {
                setSearchTerm('');
                document.activeElement.blur();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const getStockStatus = (quantity) => {
        if (quantity <= 0) return { class: 'out-of-stock', label: 'Out of Stock' };
        if (quantity < 5) return { class: 'critical', label: 'Critical' };
        if (quantity < 10) return { class: 'low', label: 'Low Stock' };
        return { class: 'in-stock', label: 'In Stock' };
    };

    const formatPrice = (price) => {
        if (!price) return '-';
        return `$${parseFloat(price).toFixed(2)}`;
    };

    const handleStockAdjustment = async (itemId, currentStock, adjustment) => {
        const newStock = Math.max(0, currentStock + adjustment);

        // Optimistic UI update
        setInventory(prev => prev.map(item =>
            item.id === itemId ? { ...item, in_stock: newStock } : item
        ));

        try {
            const res = await fetch(`/api/inventory/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ in_stock: newStock })
            });

            if (!res.ok) throw new Error('Failed to update stock');
        } catch (err) {
            // Revert on error
            setInventory(prev => prev.map(item =>
                item.id === itemId ? { ...item, in_stock: currentStock } : item
            ));
            alert('Failed to adjust stock: ' + err.message);
        }
    };

    const toggleSelectItem = (itemId) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === inventory.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(inventory.map(item => item.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedItems.length} items? This cannot be undone.`)) {
            return;
        }

        try {
            const deletePromises = selectedItems.map(id =>
                fetch(`/api/inventory/${id}`, { method: 'DELETE' })
            );
            await Promise.all(deletePromises);

            // Remove from local state
            setInventory(prev => prev.filter(item => !selectedItems.includes(item.id)));
            setSelectedItems([]);
            alert('Items deleted successfully');
        } catch (err) {
            alert('Failed to delete some items: ' + err.message);
        }
    };

    const handleExportCSV = () => {
        // Prepare CSV headers
        const headers = ['Item Number', 'Item Name', 'Store', 'Department', 'In Stock', 'Cost', 'Price', 'Status'];

        // Prepare CSV rows
        const rows = inventory.map(item => {
            const status = getStockStatus(item.in_stock);
            return [
                item.item_num,
                item.item_name || 'Unnamed Item',
                item.store_id,
                item.department || '-',
                item.in_stock,
                item.cost || 0,
                item.price || 0,
                status.label
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    <h3>Error loading inventory</h3>
                    <p>{error}</p>
                    <button onClick={() => fetchInventory(1, true)} className="btn btn-primary">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Inventory</h1>
                    <p className="subtitle">
                        {loading ? 'Loading...' : `${pagination.totalItems.toLocaleString()} items across all stores`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href="/inventory/new" className="btn btn-primary">
                        + Add Item
                    </Link>
                    <Link href="/inventory/import" className="btn btn-secondary">
                        📤 Import CSV
                    </Link>
                    <button onClick={handleExportCSV} className="btn btn-secondary" disabled={inventory.length === 0}>
                        📥 Export CSV
                    </button>
                    <Link href="/transfers/new" className="btn btn-secondary">
                        + New Transfer
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by name or item number..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Stores</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.store_code}>
                                {store.name} ({store.store_code})
                            </option>
                        ))}
                    </select>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showLowStock}
                            onChange={(e) => setShowLowStock(e.target.checked)}
                        />
                        Low Stock Only
                    </label>
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="filter-select"
                        style={{ minWidth: '140px' }}
                    >
                        <option value="all">All Departments</option>
                        <option value="GROCERY">Grocery</option>
                        <option value="BEVERAGE">Beverage</option>
                        <option value="TOBACCO">Tobacco</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="number"
                            placeholder="Min Price"
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="search-input"
                            style={{ width: '100px' }}
                            min="0"
                            step="0.01"
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                        <input
                            type="number"
                            placeholder="Max Price"
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="search-input"
                            style={{ width: '100px' }}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedItems.length > 0 && (
                <div style={{ backgroundColor: 'var(--surface)', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setSelectedItems([])} className="btn btn-secondary btn-sm">
                            Clear Selection
                        </button>
                        <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
                            🗑️ Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Inventory Table */}
            <div className="card">
                <div className="card-content">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={inventory.length > 0 && selectedItems.length === inventory.length}
                                            onChange={toggleSelectAll}
                                            title="Select all"
                                        />
                                    </th>
                                    <th>Item</th>
                                    <th>Store</th>
                                    <th>Department</th>
                                    <th>In Stock</th>
                                    <th>Cost</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    // Show skeleton rows while loading
                                    Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                                ) : inventory.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>
                                            <div className="empty-message">
                                                <p>No inventory items found</p>
                                                {searchTerm && <p>Try adjusting your search or filters</p>}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    inventory.map(item => {
                                        const status = getStockStatus(item.in_stock);
                                        return (
                                            <tr key={item.id}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.includes(item.id)}
                                                        onChange={() => toggleSelectItem(item.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="item-info">
                                                        <span className="item-name">{item.item_name || 'Unnamed Item'}</span>
                                                        <span className="item-num">{item.item_num}</span>
                                                    </div>
                                                </td>
                                                <td><span className="store-badge">{item.store_id}</span></td>
                                                <td>{item.department || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleStockAdjustment(item.id, item.in_stock, -1)}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: '18px', padding: '2px 8px', lineHeight: '1' }}
                                                            title="Decrease stock"
                                                            disabled={item.in_stock <= 0}
                                                        >
                                                            −
                                                        </button>
                                                        <span className={`stock-value ${status.class}`} style={{ minWidth: '40px', textAlign: 'center' }}>
                                                            {item.in_stock}
                                                        </span>
                                                        <button
                                                            onClick={() => handleStockAdjustment(item.id, item.in_stock, +1)}
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ fontSize: '18px', padding: '2px 8px', lineHeight: '1' }}
                                                            title="Increase stock"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>{formatPrice(item.cost)}</td>
                                                <td>{formatPrice(item.price)}</td>
                                                <td>
                                                    <span className={`status-badge status-${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <Link
                                                            href={`/inventory/${item.id}`}
                                                            className="btn btn-secondary btn-sm"
                                                            title="Edit item"
                                                        >
                                                            ✏️ Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Delete "${item.item_name}"?`)) {
                                                                    fetch(`/api/inventory/${item.id}`, { method: 'DELETE' })
                                                                        .then(() => {
                                                                            setInventory(prev => prev.filter(i => i.id !== item.id));
                                                                            showToast('Item deleted successfully', 'success');
                                                                        })
                                                                        .catch(() => showToast('Failed to delete item', 'error'));
                                                                }
                                                            }}
                                                            className="btn btn-sm"
                                                            style={{ background: '#ff6b6b', color: 'white' }}
                                                            title="Delete item"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Load more trigger */}
                    {!loading && (
                        <div ref={loadMoreRef} style={{ height: '20px', marginTop: '20px' }}>
                            {loadingMore && (
                                <div className="loading-spinner" style={{ textAlign: 'center' }}>
                                    Loading more items...
                                </div>
                            )}
                            {!pagination.hasMore && inventory.length > 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '20px 0' }}>
                                    Showing all {pagination.totalItems.toLocaleString()} items
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
