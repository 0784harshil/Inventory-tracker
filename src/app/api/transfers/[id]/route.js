import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function PATCH(request, context) {
    try {
        // In Next.js 14+, params is a Promise that needs to be awaited
        const { id } = await context.params;
        const body = await request.json();

        console.log('Updating transfer:', id, 'to status:', body.status);

        // Build update object based on status
        const updateData = { status: body.status };

        // Add timestamp based on status change
        if (body.status === 'approved') {
            updateData.approved_at = new Date().toISOString();
        } else if (body.status === 'in_transit') {
            updateData.shipped_at = new Date().toISOString();
        } else if (body.status === 'completed') {
            updateData.completed_at = new Date().toISOString();

            // *** AUTOMATIC STOCK UPDATE ***
            // When marking completed, update BOTH stores' inventory in Supabase
            // This ensures cloud data is always correct, regardless of sync agent timing
            try {
                // Get transfer details including items
                const { data: transfer, error: fetchError } = await supabase
                    .from('transfers')
                    .select('from_store_id, to_store_id')
                    .eq('id', id)
                    .single();

                if (fetchError) throw fetchError;

                const { data: items, error: itemsError } = await supabase
                    .from('transfer_items')
                    .select('item_num, item_name, quantity')
                    .eq('transfer_id', id);

                if (itemsError) throw itemsError;

                // Update inventory for each item
                for (const item of items) {
                    // Decrement source store's stock in cloud
                    const { data: sourceItem } = await supabase
                        .from('inventory')
                        .select('id, in_stock')
                        .eq('store_id', transfer.from_store_id)
                        .eq('item_num', item.item_num)
                        .single();

                    if (sourceItem) {
                        await supabase
                            .from('inventory')
                            .update({ in_stock: (sourceItem.in_stock || 0) - item.quantity })
                            .eq('id', sourceItem.id);
                        console.log(`Decremented ${item.item_num} at ${transfer.from_store_id}: -${item.quantity}`);
                    }

                    // Increment destination store's stock in cloud (or create if not exists)
                    const { data: destItem } = await supabase
                        .from('inventory')
                        .select('id, in_stock')
                        .eq('store_id', transfer.to_store_id)
                        .eq('item_num', item.item_num)
                        .single();

                    if (destItem) {
                        await supabase
                            .from('inventory')
                            .update({ in_stock: (destItem.in_stock || 0) + item.quantity })
                            .eq('id', destItem.id);
                        console.log(`Incremented ${item.item_num} at ${transfer.to_store_id}: +${item.quantity}`);
                    } else {
                        // Item doesn't exist at destination - create it
                        await supabase
                            .from('inventory')
                            .insert({
                                item_num: item.item_num,
                                item_name: item.item_name,
                                store_id: transfer.to_store_id,
                                in_stock: item.quantity,
                                dept_id: 'NONE',
                                price: 0,
                                cost: 0
                            });
                        console.log(`Created ${item.item_num} at ${transfer.to_store_id} with stock ${item.quantity}`);
                    }
                }
                console.log('Cloud inventory updated successfully');
            } catch (stockError) {
                console.error('Error updating cloud inventory:', stockError);
                // Continue with status update even if stock update fails
                // The sync agents can still handle it as a backup
            }
        }

        const { data, error } = await supabase
            .from('transfers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating transfer:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Map response to frontend format
        return NextResponse.json({
            ...data,
            from_store: data.from_store_id,
            to_store: data.to_store_id
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        // In Next.js 14+, params is a Promise that needs to be awaited
        const { id } = await context.params;

        console.log('Deleting transfer:', id);

        // Delete transfer items first
        const { error: itemsError } = await supabase
            .from('transfer_items')
            .delete()
            .eq('transfer_id', id);

        if (itemsError) {
            console.error('Error deleting transfer items:', itemsError);
        }

        // Delete the transfer
        const { error } = await supabase
            .from('transfers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting transfer:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
