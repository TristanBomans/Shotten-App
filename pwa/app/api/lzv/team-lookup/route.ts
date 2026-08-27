export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getLzvTeamNameIndex } from '@/lib/supabase';
import { findNamedTeam } from '@/lib/teamNameMatching';

export async function GET(request: NextRequest) {
    try {
        const name = request.nextUrl.searchParams.get('name')?.trim();
        if (!name) {
            return NextResponse.json({ error: 'Missing name' }, { status: 400 });
        }

        const teams = await getLzvTeamNameIndex();
        const matched = findNamedTeam(
            teams.map(team => ({ externalId: team.external_id, name: team.name })),
            name,
        );

        if (!matched) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        return NextResponse.json(matched);
    } catch (error) {
        console.error('Error looking up LZV team:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
