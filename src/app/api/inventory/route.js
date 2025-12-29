import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Smaller default page size for faster initial load
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// Simple cache for inventory queries
const queryCache = new Map();
const CACHE_TTL = 15000; // 15 seconds

function getCacheKey(params) {
    return `${params.store || 'all'}-${params.search || ''}-${params.lowStock || ''}-${params.page}-${params.pageSize}`;
}

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

        // Check cache
        const cacheKey = getCacheKey({ store, search, lowStock, page, pageSize });
        const cached = queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json(cached.data, {
                headers: {
                    'X-Cache': 'HIT',
                    'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
                }
            });
        }

        // Build query - only select minimal columns needed
        let query = supabase
            .from('inventory')
            .select('id, item_num, item_name, store_id, dept_id, cost, price, in_stock', { count: 'exact' })
            .order('item_name', { ascending: true })
            .range(offset, offset + pageSize - 1);

        // Filter by store if specified
        if (store && store !== 'all') {
            query = query.eq('store_id', store);
        }

        // Search by item name or item number
        if (search) {
            query = query.or(`item_name.ilike.%${search}%,item_num.ilike.%${search}%`);
        }

        // Filter low stock items (less than 10)
        if (lowStock === 'true') {
            query = query.lt('in_stock', 10);
        }

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

        // Update cache
        queryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });

        // Clean old cache entries (keep last 20)
        if (queryCache.size > 20) {
            const keys = Array.from(queryCache.keys());
            for (let i = 0; i < keys.length - 20; i++) {
                queryCache.delete(keys[i]);
            }
        }

        return NextResponse.json(responseData, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
