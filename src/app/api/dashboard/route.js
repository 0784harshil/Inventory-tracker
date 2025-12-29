import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Use global cache that persists across requests
const globalCache = globalThis;
if (!globalCache.dashboardCache) {
    globalCache.dashboardCache = null;
    globalCache.dashboardCacheTime = 0;
}

const CACHE_TTL = 120000; // 2 minutes cache

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const skipCache = searchParams.get('fresh') === 'true';

        const now = Date.now();

        // Return cached data immediately if available
        if (!skipCache && globalCache.dashboardCache && (now - globalCache.dashboardCacheTime) < CACHE_TTL) {
            return NextResponse.json(globalCache.dashboardCache, {
                headers: {
                    'X-Cache': 'HIT',
                    'X-Cache-Age': String(Math.round((now - globalCache.dashboardCacheTime) / 1000)),
                    'Cache-Control': 'public, max-age=120, stale-while-revalidate=300'
                }
            });
        }

        // Execute minimal queries in parallel - COUNTS ONLY for stats
        const [
            inventoryCountResult,
            storesCountResult,
            pendingTransfersResult,
            lowStockCountResult,
            storesResult,
            recentTransfersResult
        ] = await Promise.all([
            // 1. Total inventory count - HEAD only
            supabase
                .from('inventory')
                .select('*', { count: 'exact', head: true }),

            // 2. Total stores count - HEAD only
            supabase
                .from('stores')
                .select('*', { count: 'exact', head: true }),

            // 3. Pending transfers count - HEAD only
            supabase
                .from('transfers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending'),

            // 4. Low stock count - HEAD only
            supabase
                .from('inventory')
                .select('*', { count: 'exact', head: true })
                .lt('in_stock', 10)
                .gt('in_stock', 0),

            // 5. Get stores - minimal fields
            supabase
                .from('stores')
                .select('id, store_id, store_name'),

            // 6. Recent transfers - minimal fields, just 3
            supabase
                .from('transfers')
                .select('id, from_store_id, to_store_id, status, created_at')
                .order('created_at', { ascending: false })
                .limit(3)
        ]);

        const totalItems = inventoryCountResult.count || 0;
        const totalStores = storesCountResult.count || 0;
        const pendingTransfers = pendingTransfersResult.count || 0;
        const lowStockCount = lowStockCountResult.count || 0;
        const stores = storesResult.data || [];
        const recentTransfers = recentTransfersResult.data || [];

        // Map transfers
        const mappedTransfers = recentTransfers.map(t => ({
            ...t,
            from_store: t.from_store_id,
            to_store: t.to_store_id
        }));

        // Simple store overview without inventory counts (too slow)
        const storeOverview = stores.map(store => ({
            id: store.id,
            name: store.store_name,
            store_code: store.store_id,
            item_count: Math.round(totalItems / (stores.length || 1)), // Approximate
            total_stock: 0
        }));

        const responseData = {
            stats: {
                totalItems,
                lowStockCount,
                totalStores,
                pendingTransfers
            },
            lowStockItems: [], // Defer to separate endpoint
            recentTransfers: mappedTransfers,
            storeOverview
        };

        // Update cache
        globalCache.dashboardCache = responseData;
        globalCache.dashboardCacheTime = now;

        return NextResponse.json(responseData, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, max-age=120, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
