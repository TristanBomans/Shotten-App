export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { buildRecentMatchItem, RECENT_MATCH_LIMIT, type RecentMatchesResponse } from '@/lib/recentMatches';
import { getLzvMatchesForTeams, getOwnLzvTeams } from '@/lib/supabase';

export async function GET() {
    try {
        const ownTeams = await getOwnLzvTeams();
        const ownIds = ownTeams.map(team => team.lzvExternalId);
        const teamNameByLzvId = Object.fromEntries(
            ownTeams.map(team => [team.lzvExternalId, team.name]),
        );

        const nowTs = Date.now();
        const playedMatches = await getLzvMatchesForTeams(ownIds, { status: 'Played', ascending: false });
        const mappedMatches = playedMatches.map((match) => buildRecentMatchItem(match, nowTs, teamNameByLzvId));
        const recentCount = mappedMatches.filter((match) => match.isRecent).length;

        const response: RecentMatchesResponse = {
            matches: mappedMatches.slice(0, RECENT_MATCH_LIMIT),
            recentCount,
            hasRecentWithin3Days: recentCount > 0,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching recent LZV matches:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
