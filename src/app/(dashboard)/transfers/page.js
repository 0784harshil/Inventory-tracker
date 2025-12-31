'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TransfersPage() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTransfers();
    }, [statusFilter]);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await fetch(`/api/transfers?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch transfers');
            const data = await res.json();
            setTransfers(data);
        } catch (err) {
            console.error('Error fetching transfers:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateTransferStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/transfers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update transfer');
            fetchTransfers();
        } catch (err) {
            console.error('Error updating transfer:', err);
            alert('Failed to update transfer: ' + err.message);
        }
    };

    const cancelTransfer = async (id) => {
        if (!confirm('Are you sure you want to cancel this transfer?')) return;
        await updateTransferStatus(id, 'cancelled');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'status-pending',
            approved: 'status-approved',
            in_transit: 'status-in-transit',
            completed: 'status-completed',
            received: 'status-received',
            cancelled: 'status-cancelled'
        };
        return styles[status] || 'status-pending';
    };

    const getNextActions = (status) => {
        if (!status) return [];
        const currentStatus = status.toLowerCase();

        switch (currentStatus) {
            case 'pending':
                return [
                    { label: 'Approve', status: 'approved', class: 'btn-success' },
                    { label: 'Cancel', status: 'cancelled', class: 'btn-danger' }
                ];
            // Explicitly return empty array for these statuses
            case 'approved':
            case 'in_transit':
            case 'completed':
            case 'received':
            case 'cancelled':
                return [];
            default:
                return [];
        }
    };

    // Filter by search term
    const filteredTransfers = transfers.filter(t => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            t.id.toLowerCase().includes(search) ||
            t.from_store.toLowerCase().includes(search) ||
            t.to_store.toLowerCase().includes(search) ||
            (t.notes && t.notes.toLowerCase().includes(search))
        );
    });

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    <h3>Error loading transfers</h3>
                    <p>{error}</p>
                    <button onClick={fetchTransfers} className="btn btn-primary">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Transfers</h1>
                    <p className="subtitle">{filteredTransfers.length} transfers</p>
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
                        placeholder="Search by ID, store, or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-tabs">
                    {['all', 'pending', 'approved', 'in_transit', 'completed', 'received', 'cancelled'].map(status => (
                        <button
                            key={status}
                            className={`filter-tab ${statusFilter === status ? 'active' : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'all' ? 'All' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transfers List */}
            <div className="card">
                <div className="card-content">
                    {loading ? (
                        <div className="loading-spinner">Loading transfers...</div>
                    ) : filteredTransfers.length === 0 ? (
                        <div className="empty-message">
                            <p>No transfers found</p>
                            <Link href="/transfers/new" className="btn btn-primary">Create First Transfer</Link>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Transfer ID</th>
                                        <th>Route</th>
                                        <th>Items</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransfers.map(transfer => (
                                        <tr key={transfer.id}>
                                            <td>
                                                <span className="transfer-id">{transfer.id.slice(0, 8)}...</span>
                                            </td>
                                            <td>
                                                <div className="transfer-route">
                                                    <span className="from-store">{transfer.from_store}</span>
                                                    <span className="arrow">→</span>
                                                    <span className="to-store">{transfer.to_store}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="item-count">
                                                    {transfer.transfer_items?.length || 0} items
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusBadge(transfer.status)}`}>
                                                    {transfer.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{formatDate(transfer.created_at)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    {getNextActions(transfer.status).map(action => (
                                                        <button
                                                            key={action.status}
                                                            onClick={() => updateTransferStatus(transfer.id, action.status)}
                                                            className={`btn btn-sm ${action.class}`}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
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
    );
}
