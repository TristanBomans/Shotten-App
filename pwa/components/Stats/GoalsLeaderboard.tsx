'use client';

import { Goal, Crown } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { formatGoalsPerMatch, rankScorers, type GoalsIndex } from '@/lib/goals';
import type { PlayerWithStats } from '../StatsView';

interface GoalsLeaderboardProps {
    players: PlayerWithStats[];
    goals: GoalsIndex;
    currentPlayerId: number;
    onSelectPlayer?: (id: number) => void;
}

/** Second stats view: top scorer panel + goals leaderboard from LZV data. */
export default function GoalsLeaderboard({ players, goals, currentPlayerId, onSelectPlayer }: GoalsLeaderboardProps) {
    const ranked = rankScorers(players, goals);
    const unlinked = players.filter(p => p.stats.totalMatches > 0 && !goals.byPlayer.get(p.id)?.link).length;
    const top = ranked[0];
    const teamGoals = ranked.reduce((sum, r) => sum + r.goals.goals, 0);

    if (ranked.length === 0) {
        return (
            <div className="panel" style={{ padding: '24px 18px', textAlign: 'center' }}>
                <h2 className="t-title" style={{ marginBottom: 6 }}>No goals linked yet</h2>
                <p className="t-body" style={{ maxWidth: 320, margin: '0 auto' }}>
                    Goals come from lzvcup.be. Once players are linked to their LZV profile they show up here.
                </p>
            </div>
        );
    }

    return (
        <>
            {top && top.goals.goals > 0 && (
                <button
                    className="panel press"
                    onClick={() => {
                        hapticPatterns.tap();
                        onSelectPlayer?.(top.player.id);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: 14,
                        marginBottom: 'var(--sp-5)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                    }}
                    aria-label={`Top scorer ${top.player.name}, ${top.goals.goals} goals`}
                >
                    <span
                        className="flex-center"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: 'rgb(var(--warn-rgb) / 0.13)',
                            color: 'var(--warn)',
                            flexShrink: 0,
                        }}
                        aria-hidden
                    >
                        <Crown size={20} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="t-caption" style={{ display: 'block' }}>Top scorer</span>
                        <span
                            style={{
                                display: 'block',
                                fontSize: 'var(--fs-base)',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {top.player.name}
                        </span>
                    </span>
                    <span style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="t-num" style={{ display: 'block', fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            {top.goals.goals}
                        </span>
                        <span className="t-caption t-num">
                            {formatGoalsPerMatch(top.goals.goalsPerMatch)} per match
                        </span>
                    </span>
                </button>
            )}

            <div className="section-label">
                <span>Goals leaderboard</span>
                <span className="t-num">{teamGoals}</span>
            </div>
            <div className="list-section">
                {ranked.map(({ player, goals: g }, i) => {
                    const isMe = player.id === currentPlayerId;
                    const maxGoals = Math.max(top?.goals.goals ?? 0, 1);
                    return (
                        <button
                            key={player.id}
                            className="row"
                            onClick={() => {
                                hapticPatterns.tap();
                                onSelectPlayer?.(player.id);
                            }}
                            aria-label={`${player.name}, ${g.goals} goals${goals.hasAssists ? `, ${g.assists} assists` : ''}`}
                            style={{ minHeight: 48, background: isMe ? 'var(--bg-subtle)' : undefined }}
                        >
                            <span
                                className="t-num"
                                style={{
                                    width: 26,
                                    textAlign: 'center',
                                    fontSize: 'var(--fs-2xs)',
                                    fontWeight: 600,
                                    color: i < 3 && g.goals > 0 ? 'var(--text-1)' : 'var(--text-3)',
                                    flexShrink: 0,
                                }}
                            >
                                {i + 1}
                            </span>
                            <span
                                className="flex-center"
                                style={{ width: 20, height: 20, color: i === 0 && g.goals > 0 ? 'var(--warn)' : 'var(--text-3)', flexShrink: 0 }}
                                aria-hidden
                            >
                                <Goal size={16} />
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
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
                                    {player.name}
                                </span>
                                <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 2 }}>
                                    {g.gamesPlayed} {g.gamesPlayed === 1 ? 'match' : 'matches'}
                                    {' · '}{formatGoalsPerMatch(g.goalsPerMatch)} per match
                                </span>
                            </span>
                            {goals.hasAssists && (
                                <span style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
                                    <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 500, color: g.assists ? 'var(--text-2)' : 'var(--text-3)' }}>
                                        {g.assists}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>ast</span>
                                </span>
                            )}
                            <span style={{ width: 48, textAlign: 'right', flexShrink: 0 }}>
                                <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, color: g.goals ? 'var(--text-1)' : 'var(--text-3)' }}>
                                    {g.goals}
                                </span>
                                <span
                                    aria-hidden
                                    style={{
                                        display: 'block',
                                        height: 3,
                                        marginTop: 4,
                                        borderRadius: 'var(--r-full)',
                                        background: 'var(--bg-subtle-strong)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <span style={{ display: 'block', height: '100%', width: `${(g.goals / maxGoals) * 100}%`, background: 'var(--text-2)' }} />
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {unlinked > 0 && (
                <p className="t-caption" style={{ padding: '6px 4px 0' }}>
                    {unlinked} {unlinked === 1 ? 'player isn’t' : 'players aren’t'} linked to an LZV profile yet.
                </p>
            )}
        </>
    );
}
