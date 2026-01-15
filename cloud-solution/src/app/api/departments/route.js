import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET /api/departments - Get all departments, optionally filtered by store_id
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('store_id');

        let query = supabase
            .from('departments')
            .select('*')
            .order('dept_id');

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching departments:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
