import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// In-memory cache with TTL
let storesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds cache - stores don't change often

export async function GET() {
    try {
        // Return cached data if still valid
        const now = Date.now();
        if (storesCache && (now - cacheTimestamp) < CACHE_TTL) {
            return NextResponse.json(storesCache, {
                headers: {
                    'X-Cache': 'HIT',
                    'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
                }
            });
        }

        // Execute all queries in parallel
        const [storesResult, inventoryCountsResult, syncLogsResult] = await Promise.all([
            // Get all stores
            supabase
                .from('stores')
                .select('*')
                .order('store_name', { ascending: true }),

            // Get inventory counts per store - only select store_id
            supabase
                .from('inventory')
                .select('store_id'),

            // Get latest sync per store - optimized query
            supabase
                .from('sync_log')
                .select('store_id, completed_at')
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
        ]);

        const stores = storesResult.data || [];
        const inventoryCounts = inventoryCountsResult.data || [];
        const syncLogs = syncLogsResult.data || [];

        if (storesResult.error) {
            console.error('Error fetching stores:', storesResult.error);
            return NextResponse.json({ error: storesResult.error.message }, { status: 500 });
        }

        // Count items per store
        const itemCounts = {};
        for (const item of inventoryCounts) {
            itemCounts[item.store_id] = (itemCounts[item.store_id] || 0) + 1;
        }

        // Get latest sync per store
        const lastSync = {};
        for (const log of syncLogs) {
            if (!lastSync[log.store_id]) {
                lastSync[log.store_id] = log.completed_at;
            }
        }

        // Enrich stores with counts and sync info
        const enrichedStores = stores.map(store => ({
            id: store.id,
            name: store.store_name,
            store_code: store.store_id,
            address: store.address,
            phone: store.phone,
            manager: store.manager_email,
            is_active: store.is_active,
            item_count: itemCounts[store.store_id] || 0,
            last_sync: lastSync[store.store_id] || null,
            sync_status: lastSync[store.store_id] ? 'online' : 'offline'
        }));

        // Update cache
        storesCache = enrichedStores;
        cacheTimestamp = now;

        return NextResponse.json(enrichedStores, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('stores')
            .insert([{
                store_id: body.store_code,
                store_name: body.name,
                address: body.address,
                phone: body.phone,
                manager_email: body.manager
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating store:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Invalidate cache
        storesCache = null;
        cacheTimestamp = 0;

        return NextResponse.json({
            id: data.id,
            name: data.store_name,
            store_code: data.store_id,
            address: data.address,
            phone: data.phone,
            manager: data.manager_email
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
