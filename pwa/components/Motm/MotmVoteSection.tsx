'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Check } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { castMotmVote, clearMotmVote, useMotmVotes } from '@/lib/motm';
import { getMotmClosesAt, getMotmVotingState, getMotmWinners, tallyMotmVotes, type MotmVote } from '@/lib/motmRules';
import type { Match } from '@/lib/mockData';
import type { RosterPlayer } from '../MatchBoard/types';
import { Avatar, InlineNotice, StatusChip } from '../ui/controls';

interface MotmVoteSectionProps {
    match: Match;
    roster: RosterPlayer[];
    currentPlayerId: number;
}

function formatClosesIn(diffMs: number): string {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
}

/**
 * Man of the match vote on a played match. Players who were present pick one
 * present teammate; the vote can change until the window closes, after which
 * the tally is final and the winner is shown on top.
 */
export default function MotmVoteSection({ match, roster, currentPlayerId }: MotmVoteSectionProps) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    const state = getMotmVotingState(match, now);
    const { votes, setVotes, loading } = useMotmVotes([match.id], state !== 'none');
    const [saving, setSaving] = useState<number | 'clear' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const present = useMemo(
        () => roster.filter(p => p.status === 'Present').sort((a, b) => a.name.localeCompare(b.name)),
        [roster]
    );
    const nameById = useMemo(() => new Map(roster.map(p => [p.id, p.name])), [roster]);
    const tally = useMemo(() => tallyMotmVotes(votes), [votes]);
    const votesFor = useMemo(() => new Map(tally.map(t => [t.playerId, t.votes])), [tally]);

    if (state === 'none' || present.length < 2) return null;

    const isOpen = state === 'open';
    const canVote = isOpen && present.some(p => p.id === currentPlayerId);
    const myVote = votes.find(v => v.voterPlayerId === currentPlayerId)?.votedPlayerId ?? null;
    const totalVotes = votes.length;
    const maxVotes = tally[0]?.votes ?? 0;
    const winners = state === 'closed' ? getMotmWinners(votes) : [];

    const applyVote = async (votedPlayerId: number | null) => {
        if (saving !== null) return;
        const previous = votes;
        const others = votes.filter(v => v.voterPlayerId !== currentPlayerId);
        const next: MotmVote[] = votedPlayerId === null
            ? others
            : [...others, { matchId: match.id, voterPlayerId: currentPlayerId, votedPlayerId }];

        hapticPatterns.tap();
        setError(null);
        setSaving(votedPlayerId ?? 'clear');
        setVotes(next);
        try {
            if (votedPlayerId === null) await clearMotmVote(match.id, currentPlayerId);
            else await castMotmVote(match.id, currentPlayerId, votedPlayerId);
            hapticPatterns.success();
        } catch (e) {
            setVotes(previous);
            setError(e instanceof Error ? e.message : 'Could not save your vote');
            hapticPatterns.error();
        } finally {
            setSaving(null);
        }
    };

    // Open: alphabetical so rows don't jump while votes come in.
    // Closed: by votes, the winner(s) first.
    const rows = isOpen
        ? present.filter(p => p.id !== currentPlayerId || !canVote)
        : [...present]
            .filter(p => (votesFor.get(p.id) ?? 0) > 0)
            .sort((a, b) => (votesFor.get(b.id) ?? 0) - (votesFor.get(a.id) ?? 0) || a.name.localeCompare(b.name));

    const presentVoters = present.length;
    const label = (
        <div className="section-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Award size={13} aria-hidden />
                Man of the match
            </span>
            {isOpen ? (
                <StatusChip tone="accent">
                    <span className="t-num">Closes in {formatClosesIn(getMotmClosesAt(match.date) - now)}</span>
                </StatusChip>
            ) : (
                <StatusChip>Final</StatusChip>
            )}
        </div>
    );

    return (
        <section style={{ marginBottom: 'var(--sp-5)' }} aria-label="Man of the match">
            {label}

            {state === 'closed' && winners.length > 0 && (
                <div
                    className="panel"
                    style={{
                        padding: 14,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'rgb(var(--warn-rgb) / 0.08)',
                        borderColor: 'rgb(var(--warn-rgb) / 0.24)',
                    }}
                >
                    <span
                        className="flex-center"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'rgb(var(--warn-rgb) / 0.16)',
                            color: 'var(--warn)',
                            flexShrink: 0,
                        }}
                        aria-hidden
                    >
                        <Award size={20} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', fontWeight: 500, color: 'var(--warn)' }}>
                            {winners.length > 1 ? 'Shared man of the match' : 'Man of the match'}
                        </span>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'var(--fs-base)',
                                fontWeight: 600,
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {winners.map(id => nameById.get(id) ?? 'Unknown').join(' & ')}
                        </span>
                    </span>
                    <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', flexShrink: 0 }}>
                        {maxVotes} of {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                    </span>
                </div>
            )}

            <div className="list-section">
                {isOpen && (
                    <div className="row row-static" style={{ minHeight: 40, justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)' }}>
                            {canVote
                                ? myVote === null ? 'Who was the best player? Tap to vote.' : 'Tap another player to change your vote.'
                                : 'Only players who were present can vote.'}
                        </span>
                        <span className="t-num" style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', flexShrink: 0 }}>
                            {totalVotes}/{presentVoters} voted
                        </span>
                    </div>
                )}

                {rows.length === 0 ? (
                    <div className="row row-static">
                        <span className="t-caption">{loading ? 'Loading votes…' : 'No votes were cast.'}</span>
                    </div>
                ) : (
                    rows.map(player => {
                        const count = votesFor.get(player.id) ?? 0;
                        const selected = myVote === player.id;
                        const isWinner = winners.includes(player.id);
                        const isMe = player.id === currentPlayerId;
                        const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
                        const content = (
                            <>
                                <Avatar name={player.name} size="xs" highlight={selected} />
                                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--fs-sm)',
                                            fontWeight: selected || isWinner ? 600 : 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {player.name}
                                        {isMe && (
                                            <span style={{ marginLeft: 6, fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>(you)</span>
                                        )}
                                    </span>
                                    <span
                                        aria-hidden
                                        style={{
                                            display: 'block',
                                            height: 3,
                                            marginTop: 5,
                                            maxWidth: 160,
                                            borderRadius: 'var(--r-full)',
                                            background: 'var(--bg-subtle-strong)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'block',
                                                height: '100%',
                                                width: `${pct}%`,
                                                background: isWinner ? 'var(--warn)' : selected ? 'var(--accent)' : 'var(--text-3)',
                                                transition: 'width 240ms ease',
                                            }}
                                        />
                                    </span>
                                </span>
                                <span className="t-num" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: count > 0 ? 'var(--text-1)' : 'var(--text-3)', flexShrink: 0 }}>
                                    {count}
                                </span>
                                {canVote && (
                                    <span
                                        className="flex-center"
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            border: selected ? 'none' : '1.5px solid var(--border-strong)',
                                            background: selected ? 'var(--accent)' : 'transparent',
                                            color: '#fff',
                                        }}
                                        aria-hidden
                                    >
                                        {saving === player.id ? (
                                            <span
                                                className="animate-spin"
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    border: '2px solid rgb(255 255 255 / 0.4)',
                                                    borderTopColor: '#fff',
                                                    borderRadius: '50%',
                                                    display: 'inline-block',
                                                }}
                                            />
                                        ) : selected ? (
                                            <Check size={13} strokeWidth={3} />
                                        ) : null}
                                    </span>
                                )}
                            </>
                        );

                        if (!canVote) {
                            return (
                                <div key={player.id} className="row row-static" style={{ minHeight: 48 }}>
                                    {content}
                                </div>
                            );
                        }
                        return (
                            <button
                                key={player.id}
                                className="row"
                                style={{
                                    minHeight: 48,
                                    background: selected ? 'rgb(var(--accent-rgb) / 0.08)' : undefined,
                                }}
                                aria-pressed={selected}
                                aria-label={`Vote ${player.name} man of the match, ${count} ${count === 1 ? 'vote' : 'votes'}`}
                                disabled={saving !== null}
                                onClick={() => void applyVote(selected ? null : player.id)}
                            >
                                {content}
                            </button>
                        );
                    })
                )}
            </div>

            {error && (
                <div style={{ marginTop: 8 }}>
                    <InlineNotice tone="error">{error}</InlineNotice>
                </div>
            )}
            {canVote && myVote !== null && (
                <p className="t-caption" style={{ padding: '6px 4px 0' }}>
                    You voted for <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{nameById.get(myVote)}</span>.
                    {' '}Tap again to remove your vote.
                </p>
            )}
        </section>
    );
}
