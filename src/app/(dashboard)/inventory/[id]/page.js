'use client';

import { useState, useEffect } from 'react';
import ItemForm from '../item-form';
import { useRouter } from 'next/navigation';

export default function EditItemPage({ params }) {
    const router = useRouter();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Unwrap params in Next.js 15+
    const [resolvedParams, setResolvedParams] = useState(null);
    useEffect(() => {
        Promise.resolve(params).then(setResolvedParams);
    }, [params]);

    useEffect(() => {
        if (resolvedParams?.id) {
            fetchItem(resolvedParams.id);
        }
    }, [resolvedParams]);

    const fetchItem = async (id) => {
        try {
            const res = await fetch(`/api/inventory/${id}`);
            if (!res.ok) throw new Error('Failed to fetch item');
            const data = await res.json();
            setItem(data);
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading item details...</div>;

    if (error) return (
        <div className="p-8 text-red-600">
            Error: {error}
            <button onClick={() => router.back()} className="block mt-4 text-blue-600 underline">
                Go Back
            </button>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header mb-6">
                <h1 className="text-2xl font-bold">Edit Item</h1>
            </div>
            {item && <ItemForm initialData={item} />}
        </div>
    );
}
