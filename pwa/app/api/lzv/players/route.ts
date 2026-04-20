

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getLzvPlayers } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teamIdParam = searchParams.get('teamId');
        const teamId = teamIdParam ? parseInt(teamIdParam) : undefined;
        
        const players = await getLzvPlayers(teamId);
        return NextResponse.json(players);
    } catch (error) {
        console.error('Error fetching LZV players:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
