export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { buildRecentMatchItem, OWN_RECENT_TEAM_IDS, RECENT_MATCH_LIMIT, type RecentMatchesResponse } from '@/lib/recentMatches';
import { getLzvMatchesForTeams } from '@/lib/supabase';

export async function GET() {
    try {
        const nowTs = Date.now();
        const playedMatches = await getLzvMatchesForTeams([...OWN_RECENT_TEAM_IDS], { status: 'Played', ascending: false });
        const mappedMatches = playedMatches.map((match) => buildRecentMatchItem(match, nowTs));
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
