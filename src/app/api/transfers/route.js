import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Generate a unique transfer number
function generateTransferNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TRF-${timestamp}-${random}`;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        let query = supabase
            .from('transfers')
            .select(`
                *,
                transfer_items (
                    id,
                    item_num,
                    item_name,
                    quantity
                )
            `)
            .order('created_at', { ascending: false });

        // Filter by status
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching transfers:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map transfers to frontend expected format
        let filteredData = (data || []).map(t => ({
            ...t,
            from_store: t.from_store_id,  // Map from_store_id to from_store
            to_store: t.to_store_id       // Map to_store_id to to_store
        }));

        // Apply search filter client-side
        if (search) {
            const searchLower = search.toLowerCase();
            filteredData = filteredData.filter(t =>
                t.id.toLowerCase().includes(searchLower) ||
                (t.transfer_number && t.transfer_number.toLowerCase().includes(searchLower)) ||
                (t.notes && t.notes.toLowerCase().includes(searchLower)) ||
                t.from_store.toLowerCase().includes(searchLower) ||
                t.to_store.toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json(filteredData);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Create the transfer with correct column names
        const { data: transfer, error: transferError } = await supabase
            .from('transfers')
            .insert([{
                transfer_number: generateTransferNumber(),
                from_store_id: body.from_store,  // Map from_store to from_store_id
                to_store_id: body.to_store,      // Map to_store to to_store_id
                status: 'pending',
                notes: body.notes,
                created_by: body.created_by || 'system'
            }])
            .select()
            .single();

        if (transferError) {
            console.error('Error creating transfer:', transferError);
            return NextResponse.json({ error: transferError.message }, { status: 500 });
        }

        // Add transfer items
        if (body.items && body.items.length > 0) {
            const transferItems = body.items.map(item => ({
                transfer_id: transfer.id,
                item_num: item.item_num,
                item_name: item.item_name,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from('transfer_items')
                .insert(transferItems);

            if (itemsError) {
                console.error('Error adding transfer items:', itemsError);
                // Delete the transfer if items fail
                await supabase.from('transfers').delete().eq('id', transfer.id);
                return NextResponse.json({ error: itemsError.message }, { status: 500 });
            }
        }

        // Return mapped response
        return NextResponse.json({
            ...transfer,
            from_store: transfer.from_store_id,
            to_store: transfer.to_store_id
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
