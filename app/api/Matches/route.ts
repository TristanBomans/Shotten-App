export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCoreMatches, createCoreMatch, toMatchesResponse, toMatchResponse } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const playerIdParam = searchParams.get('playerId');
        const playerId = playerIdParam ? parseInt(playerIdParam) : undefined;
        
        const matches = await getCoreMatches(playerId);
        const response = await toMatchesResponse(matches);
        
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching matches:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, location, name, teamName, teamId } = body;
        
        const match = await createCoreMatch({
            date: new Date(date).toISOString(),
            location,
            name,
            team_name: teamName,
            team_id: teamId
        });
        
        const response = await toMatchResponse(match);
        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error creating match:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
