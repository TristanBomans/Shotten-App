'use client';

import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { useMotmVotes } from '@/lib/motm';
import { getMotmVotingState, summarizeMotm } from '@/lib/motmRules';
import type { Match, Player } from '@/lib/mockData';

interface MotmLeaderboardProps {
    matches: Match[];
    players: Player[];
    currentPlayerId: number;
    onSelectPlayer?: (id: number) => void;
}

/** Season man of the match table: awards first, then votes received. */
export default function MotmLeaderboard({ matches, players, currentPlayerId, onSelectPlayer }: MotmLeaderboardProps) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, []);
    const votable = matches.filter(m => getMotmVotingState(m, now) !== 'none');
    const openCount = votable.filter(m => getMotmVotingState(m, now) === 'open').length;
    const { votes, loading } = useMotmVotes(votable.map(m => m.id), votable.length > 0);

    const summary = summarizeMotm(votes, votable, now);
    const rows = players
        .map(p => ({ player: p, ...(summary.get(p.id) ?? { awards: 0, votes: 0 }) }))
        .filter(r => r.awards > 0 || r.votes > 0)
        .sort((a, b) => b.awards - a.awards || b.votes - a.votes || a.player.name.localeCompare(b.player.name));
    const closedCount = votable.length - openCount;

    if (votable.length === 0) return null;

    return (
        <section style={{ marginTop: 'var(--sp-5)' }} aria-label="Man of the match leaderboard">
            <div className="section-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Award size={13} aria-hidden />
                    Man of the match
                </span>
                <span className="t-num">
                    {closedCount} {closedCount === 1 ? 'match' : 'matches'}
                </span>
            </div>
            <div className="list-section">
                {rows.length === 0 ? (
                    <div className="row row-static">
                        <span className="t-caption">{loading ? 'Loading votes…' : 'No votes yet. Vote after the next match.'}</span>
                    </div>
                ) : (
                    rows.map((row, i) => {
                        const isMe = row.player.id === currentPlayerId;
                        return (
                            <button
                                key={row.player.id}
                                className="row"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onSelectPlayer?.(row.player.id);
                                }}
                                aria-label={`${row.player.name}, ${row.awards} man of the match ${row.awards === 1 ? 'award' : 'awards'}, ${row.votes} votes`}
                                style={{ minHeight: 48, background: isMe ? 'var(--bg-subtle)' : undefined }}
                            >
                                <span
                                    className="t-num"
                                    style={{
                                        width: 26,
                                        textAlign: 'center',
                                        fontSize: 'var(--fs-2xs)',
                                        fontWeight: 600,
                                        color: i < 3 ? 'var(--text-1)' : 'var(--text-3)',
                                        flexShrink: 0,
                                    }}
                                >
                                    {i + 1}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--fs-sm)',
                                            fontWeight: isMe ? 600 : 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {row.player.name}
                                    </span>
                                    <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 2 }}>
                                        {row.votes} {row.votes === 1 ? 'vote' : 'votes'} received
                                    </span>
                                </span>
                                <span
                                    className="t-num"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 'var(--fs-sm)',
                                        fontWeight: 600,
                                        color: row.awards > 0 ? 'var(--warn)' : 'var(--text-3)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Award size={14} aria-hidden />
                                    {row.awards}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
            {openCount > 0 && (
                <p className="t-caption" style={{ padding: '6px 4px 0' }}>
                    {openCount} {openCount === 1 ? 'vote is' : 'votes are'} still open. Awards count once voting closes.
                </p>
            )}
        </section>
    );
}
