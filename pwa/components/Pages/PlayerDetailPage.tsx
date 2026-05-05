'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ReferenceLine, YAxis } from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { POINTS, RANKS, type PlayerWithStats, type ScoreHistoryPoint } from '../StatsView';

interface PlayerDetailPageProps {
    open: boolean;
    player: PlayerWithStats;
    rank: number;
    onClose: () => void;
}

export default function PlayerDetailPage({ open, player, rank, onClose }: PlayerDetailPageProps) {
    if (typeof document === 'undefined') return null;
    if (!player?.stats) return null;

    const s = player.stats;
    const currentRank = s.rank;
    const currentRankIndex = RANKS.findIndex(r => r.name === currentRank.name);
    const nextRank = currentRankIndex > 0 ? RANKS[currentRankIndex - 1] : null;
    const progressToNext = nextRank
        ? Math.max(0.05, Math.min(1, (s.score - currentRank.minScore) / (nextRank.minScore - currentRank.minScore)))
        : 1;

    const streakValue = s.currentStreakPresent > 0 ? s.currentStreakPresent : s.currentStreakAbsent;
    const streakIsPositive = s.currentStreakPresent > 0;
    const streakLabel = streakIsPositive ? 'present' : s.currentStreakAbsent > 0 ? 'missed' : 'no streak';
    const streakColor = streakIsPositive ? '#ff6b35' : s.currentStreakAbsent > 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)';

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--color-bg)',
                        zIndex: 10020,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
            >
                {/* Top fade gradient */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 'calc(var(--safe-top) + 92px)',
                        background: 'linear-gradient(to bottom, var(--color-bg) 25%, transparent 100%)',
                        pointerEvents: 'none',
                        zIndex: 4,
                    }}
                />

                {/* Back button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { hapticPatterns.tap(); onClose(); }}
                    aria-label="Back"
                    style={{
                        position: 'absolute',
                        top: 'calc(var(--safe-top) + 20px)',
                        left: 12,
                        zIndex: 5,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--color-glass-heavy)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        border: '0.5px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <ChevronLeft size={22} strokeWidth={2} />
                </motion.button>

                {/* Centered bold title with subtitle */}
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(var(--safe-top) + 20px)',
                        left: 64,
                        right: 64,
                        height: 44,
                        zIndex: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        pointerEvents: 'none',
                    }}
                >
                    <span
                        style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.15,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                        }}
                    >
                        {player.name}
                    </span>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                        }}
                    >
                        #{rank} · {s.rank.name} · {s.score} pts
                    </span>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 'calc(var(--safe-top) + 84px)' }}>
                    <div style={{ padding: '24px 20px 20px' }}>
                        {/* Score Card */}
                        <div style={{ padding: 18, background: 'var(--color-bg-elevated)', borderRadius: 16, textAlign: 'center', border: '0.5px solid var(--color-border)' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: s.rank.color }}>{s.score}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Shotten Points</div>

                            {/* Next rank text */}
                            {nextRank && (
                                <div style={{ marginTop: 14, fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                                    {nextRank.minScore - s.score} pts to <span style={{ color: nextRank.color, fontWeight: 600 }}>{nextRank.name}</span>
                                </div>
                            )}

                            {/* Sparkline */}
                            {s.scoreHistory && s.scoreHistory.length > 1 && (
                                <div style={{ marginTop: 16 }}>
                                    <ScoreSparkline history={s.scoreHistory} />
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: 8 }}>Season trend</div>
                                </div>
                            )}
                        </div>

                        {/* Attendance + Streaks row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
                            {/* Attendance */}
                            <div style={{ padding: '14px 8px', background: 'var(--color-bg-elevated)', borderRadius: 14, border: '0.5px solid var(--color-border)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{s.attendancePct}%</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Presence</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{s.presentCount}/{s.totalMatches}</div>
                            </div>
                            {/* Current Streak */}
                            <div style={{ padding: '14px 8px', background: streakIsPositive ? 'rgba(255,107,53,0.08)' : 'var(--color-bg-elevated)', borderRadius: 14, border: `0.5px solid ${streakIsPositive ? 'rgba(255,107,53,0.3)' : 'var(--color-border)'}`, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: streakColor }}>
                                    {streakIsPositive && s.currentStreakPresent >= 3 ? '🔥 ' : ''}{streakValue}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Streak</div>
                                <div style={{ fontSize: '0.7rem', color: streakColor, marginTop: 2 }}>{streakLabel}</div>
                            </div>
                            {/* Best Streak */}
                            <div style={{ padding: '14px 8px', background: 'rgba(247,203,97,0.06)', borderRadius: 14, border: '0.5px solid rgba(247,203,97,0.2)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f7cb61' }}>{s.bestStreak}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Best</div>
                                <div style={{ fontSize: '0.7rem', color: '#f7cb61', marginTop: 2 }}>record</div>
                            </div>
                        </div>

                        {/* Status breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                            <StatMini label="Present" value={s.presentCount} color="var(--color-success)" />
                            <StatMini label="Maybe" value={s.maybeCount} color="var(--color-warning)" />
                            <StatMini label="Absent" value={s.absentCount} color="var(--color-danger)" />
                            <StatMini label="Ghost" value={s.ghostCount} color="var(--color-text-tertiary)" />
                        </div>

                        {/* Recent Form */}
                        {s.recentForm.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Recent Form</div>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
                                    {s.recentForm.map((status, j) => (
                                        <div key={j} style={{
                                            width: 44, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                                            background: status === 'present' ? 'rgb(var(--color-success-rgb) / 0.2)' : status === 'maybe' ? 'rgb(var(--color-warning-rgb) / 0.2)' : status === 'notPresent' ? 'rgb(var(--color-danger-rgb) / 0.2)' : 'var(--color-surface-hover)',
                                            color: status === 'present' ? 'var(--color-success)' : status === 'maybe' ? 'var(--color-warning)' : status === 'notPresent' ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                                        }}>
                                            {status === 'present' ? '✓' : status === 'maybe' ? '?' : status === 'notPresent' ? '✕' : '👻'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Match History */}
                    <div style={{ padding: '0 20px calc(var(--safe-bottom, 0px) + 24px)', flex: 1 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Match History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {s.matchResults.map((result) => (
                                <div key={result.matchId} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 12px', background: 'var(--color-bg-elevated)', borderRadius: 10,
                                    border: '0.5px solid var(--color-border-subtle)',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {result.matchName.replace(/-/g, ' – ')}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>{result.date.toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.9rem' }}>
                                            {result.status === 'present' ? '✅' : result.status === 'maybe' ? '⚠️' : result.status === 'notPresent' ? '❌' : '👻'}
                                        </span>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: result.points > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                            {result.points > 0 ? '+' : ''}{result.points}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>,
        document.body
    );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
}

function ScoreSparkline({ history }: { history: ScoreHistoryPoint[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => {
            const { width, height } = el.getBoundingClientRect();
            if (width > 0 && height > 0) {
                setDimensions({ width, height });
            }
        };

        update();

        const observer = new ResizeObserver(() => update());
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (history.length < 2) return null;

    const startScore = history[0].score;
    const endScore = history[history.length - 1].score;
    const trendColor = endScore >= startScore ? 'var(--color-success)' : 'var(--color-danger)';
    const trendArrow = endScore > startScore ? '↗' : endScore < startScore ? '↘' : '→';
    const scores = history.map((point) => point.score);
    const visualMin = Math.min(...scores, POINTS.base);
    const visualMax = Math.max(...scores, POINTS.base);
    const scoreRange = Math.max(visualMax - visualMin, 40);
    const yPadding = Math.max(28, Math.round(scoreRange * 0.45));
    const chartMin = visualMin - yPadding;
    const chartMax = visualMax + yPadding;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 84 }}>
            {dimensions && (
            <LineChart
                width={dimensions.width}
                height={dimensions.height}
                data={history}
                margin={{ top: 10, right: 24, bottom: 10, left: 6 }}
            >
                <YAxis hide domain={[chartMin, chartMax]} />
                <ReferenceLine y={1000} stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke={trendColor}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
            )}
            <div style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.85rem',
                color: trendColor,
                fontWeight: 600,
            }}>
                {trendArrow}
            </div>
        </div>
    );
}
