'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Static skeleton - renders IMMEDIATELY before any data
const StaticSkeleton = () => (
    <div className="page-container">
        <div className="page-header">
            <h1>Dashboard</h1>
            <p className="subtitle">Multi-store inventory overview</p>
        </div>
        <div className="stats-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="stat-card">
                    <div className="skeleton skeleton-icon"></div>
                    <div className="skeleton skeleton-text-lg"></div>
                    <div className="skeleton skeleton-text-sm"></div>
                </div>
            ))}
        </div>
        <div className="dashboard-grid">
            <div className="card">
                <div className="card-header">
                    <h2>Store Overview</h2>
                </div>
                <div className="card-content">
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton skeleton-text" style={{ marginBottom: '1rem' }}></div>
                    ))}
                </div>
            </div>
            <div className="card">
                <div className="card-header">
                    <h2>Recent Transfers</h2>
                </div>
                <div className="card-content">
                    {[1, 2].map(i => (
                        <div key={i} className="skeleton skeleton-text" style={{ marginBottom: '1rem' }}></div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Cache data in sessionStorage to avoid refetching on navigation
const CACHE_KEY = 'dashboard_cache';
const CACHE_TTL = 60000; // 1 minute

function getCachedData() {
    if (typeof window === 'undefined') return null;
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                return data;
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return null;
}

function setCachedData(data) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        // Ignore errors
    }
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [lowStockLoading, setLowStockLoading] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        // Check cache first
        const cached = getCachedData();
        if (cached) {
            setDashboardData(cached);
            setLoading(false);
            return;
        }

        if (!fetchedRef.current) {
            fetchedRef.current = true;
            fetchDashboardData();
        }
    }, []);

    const fetchDashboardData = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch('/api/dashboard', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setDashboardData(data);
            setCachedData(data);
        } catch (err) {
            if (err.name === 'AbortError') {
                setError('Request timed out. Check your connection.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Lazy load low stock items only when scrolled into view
    const loadLowStockItems = async () => {
        if (lowStockItems.length > 0 || lowStockLoading) return;
        setLowStockLoading(true);
        try {
            const res = await fetch('/api/inventory?lowStock=true&pageSize=10');
            if (res.ok) {
                const data = await res.json();
                setLowStockItems(data.items || []);
            }
        } catch (e) {
            console.error('Error loading low stock items:', e);
        } finally {
            setLowStockLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusStyles = {
            pending: 'status-pending',
            approved: 'status-approved',
            in_transit: 'status-in-transit',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        };
        return statusStyles[status] || 'status-pending';
    };

    if (loading) {
        return <StaticSkeleton />;
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    <h3>Error loading dashboard</h3>
                    <p>{error}</p>
                    <button onClick={() => { setError(null); setLoading(true); fetchDashboardData(); }} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const { stats, recentTransfers, storeOverview } = dashboardData || {
        stats: { totalItems: 0, lowStockCount: 0, totalStores: 0, pendingTransfers: 0 },
        recentTransfers: [],
        storeOverview: []
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p className="subtitle">Multi-store inventory overview</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalItems.toLocaleString()}</span>
                        <span className="stat-label">Total Items</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏪</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalStores}</span>
                        <span className="stat-label">Active Stores</span>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.lowStockCount}</span>
                        <span className="stat-label">Low Stock Alerts</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.pendingTransfers}</span>
                        <span className="stat-label">Pending Transfers</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Store Overview */}
                <div className="card">
                    <div className="card-header">
                        <h2>Store Overview</h2>
                        <Link href="/stores" className="btn btn-secondary btn-sm">View All</Link>
                    </div>
                    <div className="card-content">
                        {storeOverview.length === 0 ? (
                            <p className="empty-message">No stores configured yet</p>
                        ) : (
                            <div className="store-list">
                                {storeOverview.map(store => (
                                    <div key={store.id} className="store-item">
                                        <div className="store-info">
                                            <span className="store-name">{store.name}</span>
                                            <span className="store-code">{store.store_code}</span>
                                        </div>
                                        <div className="store-stats">
                                            <span className="item-count">~{store.item_count} items</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Transfers */}
                <div className="card">
                    <div className="card-header">
                        <h2>Recent Transfers</h2>
                        <Link href="/transfers" className="btn btn-secondary btn-sm">View All</Link>
                    </div>
                    <div className="card-content">
                        {recentTransfers.length === 0 ? (
                            <p className="empty-message">No transfers yet</p>
                        ) : (
                            <div className="transfers-list">
                                {recentTransfers.map(transfer => (
                                    <div key={transfer.id} className="transfer-item">
                                        <div className="transfer-route">
                                            <span className="from-store">{transfer.from_store}</span>
                                            <span className="arrow">→</span>
                                            <span className="to-store">{transfer.to_store}</span>
                                        </div>
                                        <div className="transfer-meta">
                                            <span className={`status-badge ${getStatusBadge(transfer.status)}`}>
                                                {transfer.status.replace('_', ' ')}
                                            </span>
                                            <span className="transfer-date">{formatDate(transfer.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock Alerts - Lazy Loaded */}
                <div className="card full-width">
                    <div className="card-header">
                        <h2>⚠️ Low Stock Alerts ({stats.lowStockCount})</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {lowStockItems.length === 0 && !lowStockLoading && (
                                <button onClick={loadLowStockItems} className="btn btn-secondary btn-sm">
                                    Load Items
                                </button>
                            )}
                            <Link href="/inventory?lowStock=true" className="btn btn-secondary btn-sm">View All</Link>
                        </div>
                    </div>
                    <div className="card-content">
                        {lowStockLoading ? (
                            <div className="loading-spinner" style={{ padding: '2rem', textAlign: 'center' }}>
                                Loading low stock items...
                            </div>
                        ) : lowStockItems.length === 0 ? (
                            <p className="empty-message">
                                {stats.lowStockCount === 0 ? 'No low stock items 🎉' : 'Click "Load Items" to view low stock alerts'}
                            </p>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Store</th>
                                            <th>In Stock</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockItems.slice(0, 5).map(item => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div className="item-info">
                                                        <span className="item-name">{item.item_name}</span>
                                                        <span className="item-num">{item.item_num}</span>
                                                    </div>
                                                </td>
                                                <td><span className="store-badge">{item.store_id}</span></td>
                                                <td>
                                                    <span className={`stock-value ${item.in_stock < 5 ? 'critical' : 'warning'}`}>
                                                        {item.in_stock}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Link href={`/transfers/new?item=${item.item_num}&to=${item.store_id}`}
                                                        className="btn btn-primary btn-sm">
                                                        Request Transfer
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
