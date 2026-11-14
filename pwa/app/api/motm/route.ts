

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getMotmVotes, toMotmVoteResponse } from '@/lib/supabase';

const MAX_MATCH_IDS = 500;

/** Man of the match votes for a set of matches: ?matchIds=1,2,3 */
export async function GET(request: NextRequest) {
    try {
        const raw = new URL(request.url).searchParams.get('matchIds') ?? '';
        const matchIds = [...new Set(
            raw.split(',').map(s => parseInt(s.trim())).filter(n => Number.isFinite(n) && n > 0)
        )];

        if (matchIds.length > MAX_MATCH_IDS) {
            return NextResponse.json({ error: `At most ${MAX_MATCH_IDS} matchIds` }, { status: 400 });
        }

        const votes = await getMotmVotes(matchIds);
        return NextResponse.json(votes.map(toMotmVoteResponse));
    } catch (error) {
        console.error('Error fetching man of the match votes:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
