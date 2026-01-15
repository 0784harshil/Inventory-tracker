'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InventoryReportsPage() {
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        totalValue: 0,
        totalStores: 0,
        lowStockCount: 0
    });

    useEffect(() => {
        fetchAllInventory();
    }, []);

    const fetchAllInventory = async () => {
        try {
            setLoading(true);
            // Fetch all inventory items
            const res = await fetch('/api/inventory?pageSize=200');
            const data = await res.json();

            setInventory(data.items || []);
            calculateStats(data.items || []);
        } catch (err) {
            console.error('Error fetching inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (items) => {
        const totalValue = items.reduce((sum, item) => sum + (item.in_stock * item.cost), 0);
        const stores = [...new Set(items.map(item => item.store_id))];
        const lowStock = items.filter(item => item.in_stock < 10);

        setStats({
            totalItems: items.length,
            totalValue,
            totalStores: stores.length,
            lowStockCount: lowStock.length
        });
    };

    const getLowStockItems = () => {
        return inventory
            .filter(item => item.in_stock < 10)
            .sort((a, b) => a.in_stock - b.in_stock);
    };

    const getHighValueItems = () => {
        return inventory
            .map(item => ({
                ...item,
                totalValue: item.in_stock * (item.cost || 0)
            }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 20);
    };

    const getDepartmentAnalysis = () => {
        const deptMap = {};

        inventory.forEach(item => {
            const dept = item.department || 'Unknown';
            if (!deptMap[dept]) {
                deptMap[dept] = {
                    count: 0,
                    totalValue: 0,
                    totalStock: 0
                };
            }
            deptMap[dept].count++;
            deptMap[dept].totalValue += item.in_stock * (item.cost || 0);
            deptMap[dept].totalStock += item.in_stock;
        });

        return Object.entries(deptMap).map(([name, data]) => ({
            name,
            ...data,
            avgValue: data.totalValue / data.count
        })).sort((a, b) => b.totalValue - a.totalValue);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1>Inventory Reports</h1>
                </div>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Loading analytics...
                </div>
            </div>
        );
    }

    const lowStockItems = getLowStockItems();
    const highValueItems = getHighValueItems();
    const departmentData = getDepartmentAnalysis();

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Inventory Reports</h1>
                    <p className="subtitle">Analytics and insights for better decision making</p>
                </div>
                <Link href="/inventory" className="btn btn-secondary">
                    ← Back to Inventory
                </Link>
            </div>

            {/* Quick Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalItems.toLocaleString()}</div>
                        <div className="stat-label">Total Items</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-value">{formatCurrency(stats.totalValue)}</div>
                        <div className="stat-label">Total Value</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏪</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalStores}</div>
                        <div className="stat-label">Active Stores</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value" style={{ color: stats.lowStockCount > 0 ? '#ff6b6b' : '#51cf66' }}>
                            {stats.lowStockCount}
                        </div>
                        <div className="stat-label">Low Stock Alerts</div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2>⚠️ Low Stock Alerts ({lowStockItems.length})</h2>
                </div>
                <div className="card-content">
                    {lowStockItems.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                            No low stock items! 🎉
                        </p>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Store</th>
                                        <th>In Stock</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.slice(0, 10).map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="item-info">
                                                    <span className="item-name">{item.item_name}</span>
                                                    <span className="item-num">{item.item_num}</span>
                                                </div>
                                            </td>
                                            <td><span className="store-badge">{item.store_id}</span></td>
                                            <td style={{ color: item.in_stock === 0 ? '#ff4444' : '#ff8800' }}>
                                                {item.in_stock}
                                            </td>
                                            <td>
                                                <span className={item.in_stock === 0 ? 'status-badge status-cancelled' : 'status-badge status-pending'}>
                                                    {item.in_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {lowStockItems.length > 10 && (
                                <p style={{ textAlign: 'center', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    Showing top 10 of {lowStockItems.length} low stock items
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* High-Value Inventory */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2>💎 High-Value Inventory (Top 20)</h2>
                </div>
                <div className="card-content">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Item</th>
                                    <th>Store</th>
                                    <th>Stock</th>
                                    <th>Unit Cost</th>
                                    <th>Total Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {highValueItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: '600', color: index < 3 ? '#ffd700' : 'inherit' }}>
                                            #{index + 1}
                                        </td>
                                        <td>
                                            <div className="item-info">
                                                <span className="item-name">{item.item_name}</span>
                                                <span className="item-num">{item.item_num}</span>
                                            </div>
                                        </td>
                                        <td><span className="store-badge">{item.store_id}</span></td>
                                        <td>{item.in_stock}</td>
                                        <td>{formatCurrency(item.cost)}</td>
                                        <td style={{ fontWeight: '600' }}>{formatCurrency(item.totalValue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Department Analysis */}
            <div className="card">
                <div className="card-header">
                    <h2>📊 Department Analysis</h2>
                </div>
                <div className="card-content">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Items</th>
                                    <th>Total Stock</th>
                                    <th>Total Value</th>
                                    <th>Avg Value/Item</th>
                                    <th>Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departmentData.map(dept => (
                                    <tr key={dept.name}>
                                        <td style={{ fontWeight: '600' }}>{dept.name}</td>
                                        <td>{dept.count}</td>
                                        <td>{dept.totalStock.toLocaleString()}</td>
                                        <td>{formatCurrency(dept.totalValue)}</td>
                                        <td>{formatCurrency(dept.avgValue)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    flex: 1,
                                                    height: '8px',
                                                    background: 'var(--border)',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${(dept.totalValue / stats.totalValue * 100)}%`,
                                                        height: '100%',
                                                        background: 'var(--primary)',
                                                        borderRadius: '4px'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '45px' }}>
                                                    {((dept.totalValue / stats.totalValue * 100).toFixed(1))}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
