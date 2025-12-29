'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

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
    const [inventory, setInventory] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState('all');
    const [showLowStock, setShowLowStock] = useState(false);
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
    }, [selectedStore, showLowStock, debouncedSearch]);

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
    }, [selectedStore, showLowStock, debouncedSearch]);

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
                <Link href="/transfers/new" className="btn btn-primary">
                    + New Transfer
                </Link>
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
                </div>
            </div>

            {/* Inventory Table */}
            <div className="card">
                <div className="card-content">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
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
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
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
                                                    <div className="item-info">
                                                        <span className="item-name">{item.item_name || 'Unnamed Item'}</span>
                                                        <span className="item-num">{item.item_num}</span>
                                                    </div>
                                                </td>
                                                <td><span className="store-badge">{item.store_id}</span></td>
                                                <td>{item.department || '-'}</td>
                                                <td className={`stock-value ${status.class}`}>{item.in_stock}</td>
                                                <td>{formatPrice(item.cost)}</td>
                                                <td>{formatPrice(item.price)}</td>
                                                <td>
                                                    <span className={`status-badge status-${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Link
                                                        href={`/transfers/new?item=${item.item_num}&from=${item.store_id}`}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Transfer
                                                    </Link>
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
