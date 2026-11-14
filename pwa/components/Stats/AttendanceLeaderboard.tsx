'use client';

import { hapticPatterns } from '@/lib/haptic';
import type { MatchResult, PlayerWithStats } from '../StatsView';

interface AttendanceLeaderboardProps {
    playerStats: PlayerWithStats[];
    currentPlayerId: number;
    onSelectPlayer?: (id: number) => void;
}

const formDotColor: Record<MatchResult['status'], string> = {
    present: 'var(--ok)',
    maybe: 'var(--warn)',
    notPresent: 'var(--no)',
    ghost: 'var(--tbd)',
};

/** Primary stats view: players ranked by attendance %. */
export default function AttendanceLeaderboard({ playerStats, currentPlayerId, onSelectPlayer }: AttendanceLeaderboardProps) {
    return (
        <>
            <div className="section-label">
                <span>Attendance leaderboard</span>
                <span className="t-num">{playerStats.length}</span>
            </div>
            <div className="list-section">
                {playerStats.map((player, i) => {
                    const isMe = player.id === currentPlayerId;
                    const RankIcon = player.stats.rank.icon;
                    return (
                        <button
                            key={player.id}
                            className="row"
                            onClick={() => {
                                hapticPatterns.tap();
                                onSelectPlayer?.(player.id);
                            }}
                            aria-label={`${player.name}, rank ${i + 1}, ${player.stats.attendancePct} percent attendance`}
                            style={{
                                minHeight: 48,
                                background: isMe ? 'var(--bg-subtle)' : undefined,
                            }}
                        >
                            {/* Position */}
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

                            {/* Rank icon */}
                            <span
                                className="flex-center"
                                style={{ width: 20, height: 20, color: 'var(--text-3)', flexShrink: 0 }}
                                aria-hidden
                            >
                                <RankIcon size={16} />
                            </span>

                            {/* Name + form */}
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
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                    <span style={{ display: 'flex', gap: 3 }} aria-hidden>
                                        {player.stats.recentForm.map((status, j) => (
                                            <span
                                                key={j}
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: formDotColor[status],
                                                }}
                                            />
                                        ))}
                                    </span>
                                    <span style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)' }}>
                                        {player.stats.rank.name}
                                    </span>
                                </span>
                            </span>

                            {/* Attendance % */}
                            <span style={{ width: 48, textAlign: 'right', flexShrink: 0 }}>
                                <span
                                    className="t-num"
                                    style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 500 }}
                                >
                                    {player.stats.attendancePct}%
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
                                    <span
                                        style={{
                                            display: 'block',
                                            height: '100%',
                                            width: `${player.stats.attendancePct}%`,
                                            background: 'var(--text-2)',
                                        }}
                                    />
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
