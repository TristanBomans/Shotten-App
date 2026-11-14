'use client';

import { Award } from 'lucide-react';
import { useMotmVotes } from '@/lib/motm';
import { getMotmVotingState } from '@/lib/motmRules';
import type { Match } from '@/lib/mockData';
import { StatusChip } from '../ui/controls';

/** Nudge on a played match card while the player still has a vote to cast. */
export default function MotmCardHint({ match, currentPlayerId }: { match: Match; currentPlayerId: number }) {
    const wasPresent = match.attendances?.some(a => a.playerId === currentPlayerId && a.status === 'Present') ?? false;
    const enabled = wasPresent && getMotmVotingState(match) === 'open';
    const { votes, loading } = useMotmVotes([match.id], enabled);

    if (!enabled || loading || votes.some(v => v.voterPlayerId === currentPlayerId)) return null;

    return (
        <div style={{ marginTop: -3, marginBottom: 9 }}>
            <StatusChip tone="accent">
                <Award size={11} aria-hidden />
                Vote man of the match
            </StatusChip>
        </div>
    );
}
