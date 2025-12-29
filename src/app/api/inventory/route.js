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

        // Pagination parameters
        const page = parseInt(searchParams.get('page')) || 1;
        const pageSize = Math.min(
            parseInt(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE
        );
        const offset = (page - 1) * pageSize;

        // Start building the query
        // Note: In Supabase JS, you can chain filters. 
        // We apply filters BEFORE range to imply logical precedence, though PostgREST handles it.
        let query = supabase
            .from('inventory')
            .select('id, item_num, item_name, store_id, dept_id, cost, price, in_stock', { count: 'exact' });

        // Filter by store if specified
        if (store && store !== 'all') {
            query = query.eq('store_id', store);
        }

        // Search by item name or item number
        if (search) {
            // Sanitize search term slightly to avoid breaking the OR string
            // Note: PostgREST .or() uses a specific syntax. 
            // We search both item_name and item_num with ILIKE
            const term = search.replace(/[,()]/g, ''); // Remove chars that might break .or() format
            if (term) {
                query = query.or(`item_name.ilike.%${term}%,item_num.ilike.%${term}%`);
            }
        }

        // Filter low stock items (less than 10)
        if (lowStock === 'true') {
            query = query.lt('in_stock', 10);
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
