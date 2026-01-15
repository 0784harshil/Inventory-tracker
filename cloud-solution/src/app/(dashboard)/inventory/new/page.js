'use client';

import ItemForm from '../item-form';

export default function NewItemPage() {
    return (
        <div className="page-container">
            <div className="page-header mb-6">
                <h1 className="text-2xl font-bold">Add New Item</h1>
            </div>
            <ItemForm />
        </div>
    );
}
