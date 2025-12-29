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

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (href) => {
        if (href === '/dashboard') {
            return pathname === '/' || pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">📦</div>
                <span className="sidebar-logo-text">StockFlow</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
                    >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-section">
                <div className="sidebar-section-title">Quick Actions</div>
                <Link href="/transfers/new" className="sidebar-link">
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
        </aside>
    );
}
