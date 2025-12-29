'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/inventory', label: 'Inventory', icon: '📦' },
    { href: '/transfers', label: 'Transfers', icon: '🔄' },
    { href: '/stores', label: 'Stores', icon: '🏪' },
    { href: '/reports', label: 'Reports', icon: '📋' },
];

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();

    const isActive = (href) => {
        if (href === '/dashboard') {
            return pathname === '/' || pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header-row">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">JG</div>
                    <span className="sidebar-logo-text">JDGurus</span>
                </div>
                <button className="sidebar-close-btn" onClick={onClose}>×</button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
                        onClick={onClose} // Close on navigation on mobile
                    >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-section">
                <div className="sidebar-section-title">Quick Actions</div>
                <Link href="/transfers/new" className="sidebar-link" onClick={onClose}>
                    <span className="sidebar-link-icon">➕</span>
                    New Transfer
                </Link>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-section-title">Sync Status</div>
                <div className="sidebar-link" style={{ cursor: 'default' }}>
                    <span className="sidebar-link-icon">🟢</span>
                    <div>
                        <div style={{ fontSize: '0.875rem' }}>Connected</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Last sync: Just now
                        </div>
                    </div>
                </div>
            </div>
            <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '2rem', paddingLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Provided by JDGurus
            </div>
        </aside>
    );
}
