

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getLzvMatches } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teamIdParam = searchParams.get('teamId');
        const teamId = teamIdParam ? parseInt(teamIdParam) : undefined;
        
        const matches = await getLzvMatches(teamId);
        
        // Transform to API response format
        const response = matches.map(m => ({
            externalId: m.external_id,
            date: m.date,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            homeScore: m.home_score,
            awayScore: m.away_score,
            location: m.location,
            teamId: m.team_id,
            status: m.status
        }));
        
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching LZV matches:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
