export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getLzvTeam, toScraperTeamResponse } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const externalId = parseInt(id);
        const team = await getLzvTeam(externalId);
        
        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        
        return NextResponse.json(toScraperTeamResponse(team));
    } catch (error) {
        console.error('Error fetching LZV team:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
