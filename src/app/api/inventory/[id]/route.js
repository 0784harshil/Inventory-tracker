import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request, context) {
    try {
        const { id } = await context.params;

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request, context) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const updateData = {};
        // Allow updating specific fields
        if (body.item_name !== undefined) updateData.item_name = body.item_name;
        if (body.dept_id !== undefined) updateData.dept_id = body.dept_id;
        if (body.item_type !== undefined) updateData.itemtype = parseInt(body.item_type) || 0; // Default to 0
        if (body.in_stock !== undefined) updateData.in_stock = parseFloat(body.in_stock);
        if (body.cost !== undefined) updateData.cost = parseFloat(body.cost);
        if (body.price !== undefined) {
            updateData.price = parseFloat(body.price);
            updateData.retail_price = parseFloat(body.price); // Keep aligned
        }

        // Always update the timestamp so the sync agent picks up the change
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating item:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    try {
        const { id } = await context.params;

        // Perform "Soft Delete" by renaming the item to 'DELETED'
        // This allows the Sync Agent to see the change and remove it locally.
        const { error } = await supabase
            .from('inventory')
            .update({
                item_name: 'DELETED',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error deleting item (soft delete):', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
