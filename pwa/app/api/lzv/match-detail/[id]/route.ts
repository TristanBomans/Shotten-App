export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getLzvMatchDetail } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const resultId = parseInt(id);
        if (!Number.isFinite(resultId)) {
            return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
        }

        const detail = await getLzvMatchDetail(resultId);
        if (!detail) {
            return NextResponse.json({ error: 'Match detail not found' }, { status: 404 });
        }

        return NextResponse.json(detail);
    } catch (error) {
        console.error('Error fetching LZV match detail:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
