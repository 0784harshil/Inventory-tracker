'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function DashboardShell({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="layout">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`mobile-header ${isSidebarOpen ? 'hidden' : ''}`}>
                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    ☰
                </button>
                <div className="mobile-logo">JDGurus</div>
            </div>

            <main className="main-content">
                {children}
            </main>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
