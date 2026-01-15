'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ImportInventoryPage() {
    const router = useRouter();
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState([]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            parseCSV(selectedFile);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const parseCSV = async (file) => {
        setParsing(true);
        setErrors([]);

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                throw new Error('CSV file must contain headers and at least one data row');
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map((line, index) => {
                const values = line.split(',').map(v => v.trim());
                return {
                    rowNumber: index + 2,
                    item_num: values[0] || '',
                    item_name: values[1] || '',
                    store_id: values[2] || '',
                    dept_id: values[3] || 'OTHER',
                    in_stock: parseFloat(values[4]) || 0,
                    cost: parseFloat(values[5]) || 0,
                    price: parseFloat(values[6]) || 0
                };
            });

            // Validate rows
            const validationErrors = [];
            rows.forEach(row => {
                if (!row.item_num) {
                    validationErrors.push(`Row ${row.rowNumber}: Item Number is required`);
                }
                if (!row.store_id) {
                    validationErrors.push(`Row ${row.rowNumber}: Store ID is required`);
                }
            });

            setErrors(validationErrors);
            setPreview(rows);
        } catch (err) {
            alert('Error parsing CSV: ' + err.message);
        } finally {
            setParsing(false);
        }
    };

    const handleImport = async () => {
        if (!preview || preview.length === 0) return;

        setImporting(true);
        let successCount = 0;
        let failureCount = 0;
        const importErrors = [];

        try {
            for (const row of preview) {
                try {
                    const res = await fetch('/api/inventory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            item_num: row.item_num,
                            item_name: row.item_name,
                            store_id: row.store_id,
                            dept_id: row.dept_id,
                            in_stock: row.in_stock,
                            cost: row.cost,
                            price: row.price
                        })
                    });

                    if (res.ok) {
                        successCount++;
                    } else {
                        failureCount++;
                        const error = await res.json();
                        importErrors.push(`Row ${row.rowNumber}: ${error.error || 'Unknown error'}`);
                    }
                } catch (err) {
                    failureCount++;
                    importErrors.push(`Row ${row.rowNumber}: ${err.message}`);
                }
            }

            alert(`Import complete!\nSuccess: ${successCount}\nFailed: ${failureCount}`);

            if (importErrors.length > 0) {
                setErrors(importErrors);
            } else {
                router.push('/inventory');
            }
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Import Inventory</h1>
                    <p className="subtitle">Upload a CSV file to bulk import inventory items</p>
                </div>
                <Link href="/inventory" className="btn btn-secondary">
                    ← Back to Inventory
                </Link>
            </div>

            <div className="card">
                <div className="card-content">
                    {/* Instructions */}
                    <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--surface)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>CSV Format Instructions</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Your CSV file should have the following columns (in order):
                        </p>
                        <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '20px' }}>
                            <li>Item Number (required)</li>
                            <li>Item Name</li>
                            <li>Store ID (required, e.g., STORE-H, STORE-K)</li>
                            <li>Department (optional, defaults to OTHER)</li>
                            <li>In Stock (number)</li>
                            <li>Cost (number)</li>
                            <li>Price (number)</li>
                        </ol>
                    </div>

                    {/* File Upload */}
                    <div style={{ marginBottom: '24px' }}>
                        <label className="form-group">
                            <span>Select CSV File</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="search-input"
                                disabled={parsing || importing}
                            />
                        </label>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div style={{ marginBottom: '24px', padding: '16px', background: '#ff444420', border: '1px solid #ff4444', borderRadius: '8px' }}>
                            <h4 style={{ color: '#ff6666', marginBottom: '8px', fontSize: '14px' }}>
                                ⚠️ Validation Errors ({errors.length})
                            </h4>
                            <ul style={{ fontSize: '13px', color: '#ff8888', marginLeft: '20px', maxHeight: '200px', overflow: 'auto' }}>
                                {errors.slice(0, 10).map((error, i) => (
                                    <li key={i}>{error}</li>
                                ))}
                                {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
                            </ul>
                        </div>
                    )}

                    {/* Preview */}
                    {preview && preview.length > 0 && (
                        <>
                            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                                    Preview ({preview.length} items)
                                </h3>
                                <button
                                    onClick={handleImport}
                                    className="btn btn-primary"
                                    disabled={importing || errors.length > 0}
                                >
                                    {importing ? 'Importing...' : `Import ${preview.length} Items`}
                                </button>
                            </div>

                            <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Row</th>
                                            <th>Item #</th>
                                            <th>Item Name</th>
                                            <th>Store</th>
                                            <th>Dept</th>
                                            <th>Stock</th>
                                            <th>Cost</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.slice(0, 50).map((row, i) => (
                                            <tr key={i}>
                                                <td>{row.rowNumber}</td>
                                                <td>{row.item_num}</td>
                                                <td>{row.item_name || '-'}</td>
                                                <td><span className="store-badge">{row.store_id}</span></td>
                                                <td>{row.dept_id}</td>
                                                <td>{row.in_stock}</td>
                                                <td>${row.cost.toFixed(2)}</td>
                                                <td>${row.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {preview.length > 50 && (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    ...and {preview.length - 50} more rows
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {parsing && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            Parsing CSV file...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
