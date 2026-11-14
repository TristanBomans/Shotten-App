

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
    deleteMotmVote,
    getCoreMatch,
    toMatchResponse,
    toMotmVoteResponse,
    upsertMotmVote,
    type MatchResponse,
} from '@/lib/supabase';
import { getMotmVotingState } from '@/lib/motmRules';

type Params = { params: Promise<{ id: string; playerId: string }> };

async function loadOpenMatch(matchId: number): Promise<MatchResponse | NextResponse> {
    const coreMatch = await getCoreMatch(matchId);
    if (!coreMatch) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = await toMatchResponse(coreMatch);
    const state = getMotmVotingState(match);
    if (state !== 'open') {
        return NextResponse.json(
            { error: state === 'closed' ? 'Voting has closed for this match' : 'Voting is not open for this match' },
            { status: 409 }
        );
    }
    return match;
}

function isPresent(match: MatchResponse, playerId: number): boolean {
    return match.attendances.some(a => a.playerId === playerId && a.status === 'Present');
}

/** Cast or change a man of the match vote: ?votedPlayerId=<teammate id>. */
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id: matchIdStr, playerId: playerIdStr } = await params;
        const matchId = parseInt(matchIdStr);
        const voterPlayerId = parseInt(playerIdStr);
        const votedPlayerId = parseInt(new URL(request.url).searchParams.get('votedPlayerId') ?? '');

        if ([matchId, voterPlayerId, votedPlayerId].some(n => !Number.isFinite(n))) {
            return NextResponse.json({ error: 'Invalid match, voter or votedPlayerId' }, { status: 400 });
        }
        if (voterPlayerId === votedPlayerId) {
            return NextResponse.json({ error: 'You cannot vote for yourself' }, { status: 400 });
        }

        const match = await loadOpenMatch(matchId);
        if (match instanceof NextResponse) return match;

        if (!isPresent(match, voterPlayerId)) {
            return NextResponse.json({ error: 'Only players who were present can vote' }, { status: 403 });
        }
        if (!isPresent(match, votedPlayerId)) {
            return NextResponse.json({ error: 'You can only vote for a player who was present' }, { status: 400 });
        }

        const vote = await upsertMotmVote(matchId, voterPlayerId, votedPlayerId);
        return NextResponse.json(toMotmVoteResponse(vote));
    } catch (error) {
        console.error('Error saving man of the match vote:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

/** Withdraw a vote while voting is still open. */
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const { id: matchIdStr, playerId: playerIdStr } = await params;
        const matchId = parseInt(matchIdStr);
        const voterPlayerId = parseInt(playerIdStr);

        if (!Number.isFinite(matchId) || !Number.isFinite(voterPlayerId)) {
            return NextResponse.json({ error: 'Invalid match or voter' }, { status: 400 });
        }

        const match = await loadOpenMatch(matchId);
        if (match instanceof NextResponse) return match;

        await deleteMotmVote(matchId, voterPlayerId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error removing man of the match vote:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
