export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getGoalsData } from '@/lib/supabase';

export async function GET() {
    try {
        return NextResponse.json(await getGoalsData());
    } catch (error) {
        console.error('Error fetching goals data:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
