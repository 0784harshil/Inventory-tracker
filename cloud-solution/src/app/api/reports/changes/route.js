import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const store = searchParams.get('store');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const changeType = searchParams.get('type');

        let query = supabase
            .from('inventory_changes')
            .select('*')
            .order('created_at', { ascending: false });

        // Filter by store
        if (store && store !== 'all') {
            query = query.eq('store_id', store);
        }

        // Filter by date range
        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate + 'T23:59:59');
        }

        // Filter by change type
        if (changeType && changeType !== 'all') {
            query = query.eq('change_type', changeType);
        }

        // Limit results
        query = query.limit(500);

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching inventory changes:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('inventory_changes')
            .insert([{
                item_num: body.item_num,
                item_name: body.item_name,
                store_id: body.store_id,
                change_type: body.change_type,
                quantity_change: body.quantity_change,
                old_stock: body.old_stock,
                new_stock: body.new_stock,
                transfer_id: body.transfer_id,
                notes: body.notes
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating inventory change:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
