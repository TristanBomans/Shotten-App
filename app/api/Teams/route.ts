export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getCoreTeams, toTeamResponse } from '@/lib/supabase';

export async function GET() {
    try {
        const teams = await getCoreTeams();
        return NextResponse.json(teams.map(toTeamResponse));
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
