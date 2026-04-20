

import { NextRequest, NextResponse } from 'next/server';
import { getCorePlayers, createCorePlayer, toPlayerResponse } from '@/lib/supabase';

export async function GET() {
    try {
        const players = await getCorePlayers();
        return NextResponse.json(players.map(toPlayerResponse));
    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, teamIds } = body;
        
        const player = await createCorePlayer(name, teamIds || []);
        return NextResponse.json(toPlayerResponse(player), { status: 201 });
    } catch (error) {
        console.error('Error creating player:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
