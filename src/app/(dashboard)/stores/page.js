'use client';

import { useState, useEffect } from 'react';

export default function StoresPage() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newStore, setNewStore] = useState({
        name: '',
        store_code: '',
        address: '',
        phone: '',
        manager: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/stores');
            if (!res.ok) throw new Error('Failed to fetch stores');
            const data = await res.json();
            setStores(data);
        } catch (err) {
            console.error('Error fetching stores:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStore = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStore)
            });

            if (!res.ok) throw new Error('Failed to create store');

            setShowModal(false);
            setNewStore({ name: '', store_code: '', address: '', phone: '', manager: '' });
            fetchStores();
        } catch (err) {
            console.error('Error creating store:', err);
            alert('Failed to create store: ' + err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    <h3>Error loading stores</h3>
                    <p>{error}</p>
                    <button onClick={fetchStores} className="btn btn-primary">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Stores</h1>
                    <p className="subtitle">{stores.length} locations connected</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    + Add Store
                </button>
            </div>

            {/* Stores Grid */}
            {loading ? (
                <div className="loading-spinner">Loading stores...</div>
            ) : stores.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏪</div>
                    <h3>No stores configured</h3>
                    <p>Add your first store to start syncing inventory</p>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        Add Store
                    </button>
                </div>
            ) : (
                <div className="stores-grid">
                    {stores.map(store => (
                        <div key={store.id} className="store-card">
                            <div className="store-card-header">
                                <div className="store-title">
                                    <h3>{store.name}</h3>
                                    <span className="store-code">{store.store_code}</span>
                                </div>
                                <div className={`sync-indicator ${store.sync_status}`}>
                                    <span className="sync-dot"></span>
                                    {store.sync_status === 'online' ? 'Syncing' : 'Offline'}
                                </div>
                            </div>
                            <div className="store-card-body">
                                <div className="store-stats-row">
                                    <div className="store-stat">
                                        <span className="stat-value">{store.item_count.toLocaleString()}</span>
                                        <span className="stat-label">Items</span>
                                    </div>
                                    <div className="store-stat">
                                        <span className="stat-value">{formatDate(store.last_sync)}</span>
                                        <span className="stat-label">Last Sync</span>
                                    </div>
                                </div>
                                {store.address && (
                                    <div className="store-detail">
                                        <span className="detail-icon">📍</span>
                                        <span>{store.address}</span>
                                    </div>
                                )}
                                {store.phone && (
                                    <div className="store-detail">
                                        <span className="detail-icon">📞</span>
                                        <span>{store.phone}</span>
                                    </div>
                                )}
                                {store.manager && (
                                    <div className="store-detail">
                                        <span className="detail-icon">👤</span>
                                        <span>{store.manager}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Store Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Store</h2>
                            <button onClick={() => setShowModal(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleAddStore}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Store Name *</label>
                                    <input
                                        type="text"
                                        value={newStore.name}
                                        onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                                        required
                                        placeholder="e.g. Main Street Store"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Store Code *</label>
                                    <input
                                        type="text"
                                        value={newStore.store_code}
                                        onChange={e => setNewStore({ ...newStore, store_code: e.target.value })}
                                        required
                                        placeholder="e.g. STORE-H"
                                    />
                                    <small>Must match the cloud_store_id in sync agent config</small>
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        value={newStore.address}
                                        onChange={e => setNewStore({ ...newStore, address: e.target.value })}
                                        placeholder="Full address"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        value={newStore.phone}
                                        onChange={e => setNewStore({ ...newStore, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Manager</label>
                                    <input
                                        type="text"
                                        value={newStore.manager}
                                        onChange={e => setNewStore({ ...newStore, manager: e.target.value })}
                                        placeholder="Manager name"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Store
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
