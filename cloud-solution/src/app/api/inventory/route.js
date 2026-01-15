import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Smaller default page size for faster initial load
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const store = searchParams.get('store');
        const search = searchParams.get('search');
        const lowStock = searchParams.get('lowStock');
        const department = searchParams.get('department');
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');

        // Pagination parameters
        const page = parseInt(searchParams.get('page')) || 1;
        const pageSize = Math.min(
            parseInt(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE
        );
        const offset = (page - 1) * pageSize;

        // Start building the query
        let query = supabase
            .from('inventory')
            .select('id, item_num, item_name, store_id, dept_id, cost, price, in_stock', { count: 'exact' })
            .neq('item_name', 'DELETED'); // Filter out soft-deleted items

        // Filter by store if specified
        if (store && store !== 'all') {
            query = query.eq('store_id', store);
        }

        // Search by item name or item number
        if (search) {
            const term = search.replace(/[,()]/g, '');
            if (term) {
                query = query.or(`item_name.ilike.%${term}%,item_num.ilike.%${term}%`);
            }
        }

        // Filter low stock items
        if (lowStock === 'true') {
            query = query.lt('in_stock', 10);
        }

        // Filter by department
        if (department && department !== 'all') {
            query = query.eq('dept_id', department);
        }

        // Filter by price range
        if (priceMin) {
            const minPrice = parseFloat(priceMin);
            if (!isNaN(minPrice)) {
                query = query.gte('price', minPrice);
            }
        }
        if (priceMax) {
            const maxPrice = parseFloat(priceMax);
            if (!isNaN(maxPrice)) {
                query = query.lte('price', maxPrice);
            }
        }

        // Apply sorting and pagination LAST
        query = query
            .order('item_name', { ascending: true })
            .range(offset, offset + pageSize - 1);

        const { data, count, error } = await query;

        if (error) {
            console.error('Error fetching inventory:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map dept_id to department for frontend compatibility
        const items = (data || []).map(item => ({
            ...item,
            department: item.dept_id
        }));

        const responseData = {
            items,
            pagination: {
                page,
                pageSize,
                totalItems: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
                hasMore: offset + pageSize < (count || 0)
            }
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Normalize store_ids to an array
        let storeIds = [];
        if (body.store_ids && Array.isArray(body.store_ids) && body.store_ids.length > 0) {
            storeIds = body.store_ids;
        } else if (body.store_id) {
            storeIds = [body.store_id];
        }

        // Basic validation
        if (storeIds.length === 0 || !body.item_num) {
            return NextResponse.json(
                { error: 'Item Number and at least one Store are required' },
                { status: 400 }
            );
        }

        const results = [];
        const errors = [];

        // Iterate through each store and create the item
        for (const storeId of storeIds) {
            const { data, error } = await supabase
                .from('inventory')
                .insert([{
                    item_num: body.item_num,
                    item_name: body.item_name || 'New Item',
                    store_id: storeId,
                    dept_id: body.dept_id || 'NONE',
                    itemtype: parseInt(body.item_type) || 0,
                    in_stock: parseFloat(body.in_stock) || 0,
                    cost: parseFloat(body.cost) || 0,
                    price: parseFloat(body.price) || 0,
                    retail_price: parseFloat(body.price) || 0,
                    last_synced_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error(`Error creating item for store ${storeId}:`, error);
                // Handle unique constraint violation specifically
                if (error.code === '23505') {
                    errors.push(`Item ${body.item_num} already exists in ${storeId}`);
                } else {
                    errors.push(`Failed to add to ${storeId}: ${error.message}`);
                }
            } else {
                results.push(data);
            }
        }

        // Determine final response status
        if (results.length === 0 && errors.length > 0) {
            return NextResponse.json({ error: errors.join(', ') }, { status: 409 });
        }

        if (errors.length > 0) {
            return NextResponse.json({
                message: 'Item created with some errors',
                results,
                errors
            }, { status: 207 });
        }

        return NextResponse.json({
            message: 'Item created successfully in all selected stores',
            results
        }, { status: 201 });

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const item_num = searchParams.get('item_num');
        const store_id = searchParams.get('store_id');
        // Note: The previous DELETE implementation used [id] dynamic route, but we are in /api/inventory/route.js which is the collection route.
        // Wait, the previous view_file was /api/inventory/route.js.
        // There is also /api/inventory/[id]/route.js.
        // This file (collection route) likely handles bulk or query-based operations, OR I am mistakenly editing the collection route for DELETE?
        // Standard REST: DELETE /inventory?id=... or DELETE /inventory/[id]
        // Let's check which file I am editing. 
        // TargetFile is: c:\Users\harsh\.gemini\antigravity\scratch\inventory-tracker\src\app\api\inventory\route.js
        // The [id] route is elsewhere. 
        // I should probably edit [id]/route.js for Single Item Deletion.
        // BUT, if the user hits "Delete" on the list page, they might use this route with params?
        // Let's assume standard Next.js App Router: [id] route handles specific item.
        // I will return an error here if DELETE is called on collection? Or handle query params?
        // The original code in this file (lines 114-195 shown in Step 2574) only had GET and POST.
        // So I am ADDING DELETE here? 
        // The user request was "FIX EVERYTHING".
        // I need to check [id]/route.js too.

        return NextResponse.json({ error: 'Method not allowed on collection. Use /api/inventory/[id]' }, { status: 405 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
