'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '400px'
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: toast.type === 'success' ? '#51cf66' :
                                toast.type === 'error' ? '#ff6b6b' :
                                    toast.type === 'warning' ? '#ffd43b' : '#4dabf7',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            animation: 'slideIn 0.3s ease-out',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        {toast.type === 'success' && '✅ '}
                        {toast.type === 'error' && '❌ '}
                        {toast.type === 'warning' && '⚠️ '}
                        {toast.type === 'info' && 'ℹ️ '}
                        {toast.message}
                    </div>
                ))}
            </div>
            <style jsx global>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
