'use client';

import { Award } from 'lucide-react';
import { useMotmVotes } from '@/lib/motm';
import { summarizeMotm } from '@/lib/motmRules';
import { formatMatchDate } from '@/lib/dateUtils';
import { ListSection, MetricRow } from '../ui/ListSection';

interface PlayerMotmSummaryProps {
    playerId: number;
    /** The player's past matches (id, name, date), newest first. */
    matches: { matchId: number; matchName: string; date: Date }[];
}

/** Man of the match count and the matches won, on the player detail page. */
export default function PlayerMotmSummary({ playerId, matches }: PlayerMotmSummaryProps) {
    const refs = matches.map(m => ({ id: m.matchId, date: m.date }));
    const { votes } = useMotmVotes(refs.map(r => r.id), refs.length > 0);
    const summary = summarizeMotm(votes, refs).get(playerId);
    const awards = summary?.awards ?? 0;
    const received = summary?.votes ?? 0;
    const won = new Set(summary?.wonMatchIds ?? []);
    const wonMatches = matches.filter(m => won.has(m.matchId));

    return (
        <ListSection label="Man of the match">
            <MetricRow
                label="Awards"
                value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: awards > 0 ? 'var(--warn)' : undefined }}>
                        <Award size={13} aria-hidden />
                        {awards}
                    </span>
                }
            />
            <MetricRow label="Votes received" value={received} />
            {wonMatches.map(m => (
                <div key={m.matchId} className="row row-static">
                    <span className="flex-center" style={{ width: 20, height: 20, color: 'var(--warn)', flexShrink: 0 }} aria-hidden>
                        <Award size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'var(--fs-xs)',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {m.matchName.replace(/-/g, ' – ')}
                        </span>
                        <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 1 }}>
                            {formatMatchDate(m.date)}
                        </span>
                    </span>
                </div>
            ))}
        </ListSection>
    );
}
