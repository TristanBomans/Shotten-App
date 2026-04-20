

import { NextResponse } from 'next/server';
import { getLzvTeams, toScraperTeamResponse } from '@/lib/supabase';

export async function GET() {
    try {
        const teams = await getLzvTeams();
        return NextResponse.json(teams.map(toScraperTeamResponse));
    } catch (error) {
        console.error('Error fetching LZV stats:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
