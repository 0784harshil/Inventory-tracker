'use client';

import { useState, useEffect } from 'react';

export default function ReportsPage() {
    const [changes, setChanges] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [storeFilter, setStoreFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchStores();
        fetchChanges();
    }, []);

    useEffect(() => {
        fetchChanges();
    }, [storeFilter, typeFilter, startDate, endDate]);

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

    const fetchChanges = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (storeFilter !== 'all') params.append('store', storeFilter);
            if (typeFilter !== 'all') params.append('type', typeFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`/api/reports/changes?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch changes');
            const data = await res.json();
            setChanges(data);
        } catch (err) {
            console.error('Error fetching changes:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getChangeTypeBadge = (type) => {
        const styles = {
            transfer_out: 'status-danger',
            transfer_in: 'status-success',
            adjustment: 'status-warning',
            sale: 'status-info',
            receipt: 'status-approved'
        };
        return styles[type] || 'status-pending';
    };

    const getChangeTypeLabel = (type) => {
        const labels = {
            transfer_out: 'Transfer Out',
            transfer_in: 'Transfer In',
            adjustment: 'Adjustment',
            sale: 'Sale',
            receipt: 'Receipt'
        };
        return labels[type] || type;
    };

    const exportToCSV = () => {
        if (changes.length === 0) return;

        const headers = ['Date', 'Store', 'Item Number', 'Item Name', 'Change Type', 'Quantity Change', 'Old Stock', 'New Stock', 'Notes'];
        const rows = changes.map(c => [
            formatDate(c.created_at),
            c.store_id,
            c.item_num,
            c.item_name || '',
            getChangeTypeLabel(c.change_type),
            c.quantity_change,
            c.old_stock || '',
            c.new_stock || '',
            c.notes || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_changes_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    // Summary stats
    const totalOut = changes
        .filter(c => c.change_type === 'transfer_out')
        .reduce((sum, c) => sum + Math.abs(parseFloat(c.quantity_change) || 0), 0);

    const totalIn = changes
        .filter(c => c.change_type === 'transfer_in')
        .reduce((sum, c) => sum + parseFloat(c.quantity_change) || 0, 0);

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    <h3>Error loading reports</h3>
                    <p>{error}</p>
                    <button onClick={fetchChanges} className="btn btn-primary">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>📊 Inventory Change Report</h1>
                    <p className="subtitle">{changes.length} changes recorded</p>
                </div>
                <button onClick={exportToCSV} className="btn btn-secondary" disabled={changes.length === 0}>
                    📥 Export CSV
                </button>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value text-danger">-{totalOut.toFixed(0)}</div>
                    <div className="stat-label">Units Transferred Out</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-success">+{totalIn.toFixed(0)}</div>
                    <div className="stat-label">Units Transferred In</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{changes.length}</div>
                    <div className="stat-label">Total Changes</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label>Store:</label>
                    <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Stores</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.store_code}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Type:</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Types</option>
                        <option value="transfer_out">Transfer Out</option>
                        <option value="transfer_in">Transfer In</option>
                        <option value="adjustment">Adjustment</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>From:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label>To:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="filter-input"
                    />
                </div>
            </div>

            {/* Changes Table */}
            <div className="card">
                <div className="card-content">
                    {loading ? (
                        <div className="loading-spinner">Loading changes...</div>
                    ) : changes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No Changes Recorded Yet</h3>
                            <p>Inventory changes from transfers will appear here once processed by the sync agents.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Store</th>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th>Change</th>
                                        <th>Old Stock</th>
                                        <th>New Stock</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {changes.map(change => (
                                        <tr key={change.id}>
                                            <td>{formatDate(change.created_at)}</td>
                                            <td>
                                                <span className="store-badge">{change.store_id}</span>
                                            </td>
                                            <td>
                                                <div className="item-info">
                                                    <span className="item-name">{change.item_name || 'N/A'}</span>
                                                    <span className="item-num">{change.item_num}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getChangeTypeBadge(change.change_type)}`}>
                                                    {getChangeTypeLabel(change.change_type)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`stock-value ${parseFloat(change.quantity_change) >= 0 ? 'in-stock' : 'critical'}`}>
                                                    {parseFloat(change.quantity_change) >= 0 ? '+' : ''}{parseFloat(change.quantity_change).toFixed(0)}
                                                </span>
                                            </td>
                                            <td>{change.old_stock ? parseFloat(change.old_stock).toFixed(0) : '-'}</td>
                                            <td>{change.new_stock ? parseFloat(change.new_stock).toFixed(0) : '-'}</td>
                                            <td className="truncate" title={change.notes}>{change.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
