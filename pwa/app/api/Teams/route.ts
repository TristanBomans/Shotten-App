import { NextRequest, NextResponse } from 'next/server';
import { getCoreTeams, createCoreTeam, toTeamResponse } from '@/lib/supabase';

export async function GET() {
    try {
        const teams = await getCoreTeams();
        return NextResponse.json(teams.map(toTeamResponse));
    } catch (error) {
        console.error('Error fetching teams:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, lzvExternalId } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const team = await createCoreTeam(
            name.trim(),
            typeof lzvExternalId === 'number' ? lzvExternalId : null,
        );
        return NextResponse.json(toTeamResponse(team), { status: 201 });
    } catch (error) {
        console.error('Error creating team:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
