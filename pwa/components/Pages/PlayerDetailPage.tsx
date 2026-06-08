'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { RANKS, type PlayerWithStats } from '../StatsView';

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
        ? Math.max(0.05, Math.min(1, (s.attendancePct - currentRank.minPct) / (nextRank.minPct - currentRank.minPct)))
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
                        #{rank} · {s.rank.name} · {s.attendancePct}% present
                    </span>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 'calc(var(--safe-top) + 84px)' }}>
                    <div style={{ padding: '24px 20px 20px' }}>
                        {/* Attendance Card */}
                        <div style={{ padding: 18, background: 'var(--color-bg-elevated)', borderRadius: 16, textAlign: 'center', border: '0.5px solid var(--color-border)' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: s.rank.color }}>{s.attendancePct}%</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Attendance Rate</div>

                            {/* Next rank text */}
                            {nextRank && (
                                <div style={{ marginTop: 14, fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                                    {nextRank.minPct - s.attendancePct}% to <span style={{ color: nextRank.color, fontWeight: 600 }}>{nextRank.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Activity Overview Card */}
                        <div style={{
                            marginTop: 16,
                            padding: 18,
                            background: 'var(--color-bg-elevated)',
                            borderRadius: 16,
                            border: '0.5px solid var(--color-border)',
                        }}>
                            {/* Header with mini attendance pill */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 16,
                            }}>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-tertiary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}>
                                    Activity
                                </span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '3px 10px',
                                    background: 'var(--color-bg)',
                                    borderRadius: 20,
                                    border: '0.5px solid var(--color-border-subtle)',
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 4,
                                        borderRadius: 2,
                                        background: 'var(--color-border-subtle)',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${s.attendancePct}%`,
                                            height: '100%',
                                            background: 'var(--color-success)',
                                            borderRadius: 2,
                                        }} />
                                    </div>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: 'var(--color-success)',
                                    }}>
                                        {s.attendancePct}%
                                    </span>
                                </div>
                            </div>

                            {/* Stats Grid - single row of 4 */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 8,
                            }}>
                                <StatMini icon="✓" label="Present" value={s.presentCount} color="var(--color-success)" />
                                <StatMini icon="?" label="Maybe" value={s.maybeCount} color="var(--color-warning)" />
                                <StatMini icon="✕" label="Absent" value={s.absentCount} color="var(--color-danger)" />
                                <StatMini icon="·" label="Ghost" value={s.ghostCount} color="var(--color-text-tertiary)" />
                            </div>

                            {/* Streak & Best - only show if there's an actual streak */}
                            {(s.currentStreakPresent >= 3 || s.currentStreakAbsent >= 2) && (
                                <div style={{
                                    display: 'flex',
                                    gap: 6,
                                    marginTop: 12,
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 10px',
                                        borderRadius: 20,
                                        background: streakIsPositive ? 'rgba(255,107,53,0.08)' : 'var(--color-bg)',
                                        border: `0.5px solid ${streakIsPositive ? 'rgba(255,107,53,0.2)' : 'var(--color-border-subtle)'}`,
                                    }}>
                                        <span>{streakIsPositive ? '🔥' : '❄️'}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: streakColor }}>{streakValue}</span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)' }}>{streakLabel}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '5px 10px',
                                        borderRadius: 20,
                                        background: 'rgba(247,203,97,0.04)',
                                        border: '0.5px solid rgba(247,203,97,0.15)',
                                    }}>
                                        <span>🏆</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f7cb61' }}>{s.bestStreak}</span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)' }}>best</span>
                                    </div>
                                </div>
                            )}

                            {/* Recent Form - compact cells with icons */}
                            {s.recentForm.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        color: 'var(--color-text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        marginBottom: 8,
                                    }}>
                                        Last {s.recentForm.length} matches
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: 4,
                                    }}>
                                        {s.recentForm.map((status, j) => {
                                            const config = {
                                                present: { icon: '✓', color: 'var(--color-success)', bg: 'rgb(var(--color-success-rgb) / 0.15)' },
                                                maybe: { icon: '?', color: 'var(--color-warning)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
                                                notPresent: { icon: '✕', color: 'var(--color-danger)', bg: 'rgb(var(--color-danger-rgb) / 0.15)' },
                                                ghost: { icon: '·', color: 'var(--color-text-tertiary)', bg: 'var(--color-surface-hover)' },
                                            };
                                            const c = config[status as keyof typeof config] || config.ghost;
                                            return (
                                                <div
                                                    key={j}
                                                    style={{
                                                        flex: 1,
                                                        height: 28,
                                                        borderRadius: 6,
                                                        background: c.bg,
                                                        color: c.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {c.icon}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
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
                                    <span style={{ fontSize: '0.9rem' }}>
                                        {result.status === 'present' ? '✅' : result.status === 'maybe' ? '⚠️' : result.status === 'notPresent' ? '❌' : '👻'}
                                    </span>
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

function StatMini({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    const isZero = value === 0;
    return (
        <div style={{
            textAlign: 'center',
            padding: '8px 2px',
        }}>
            <div style={{
                fontSize: '0.8rem',
                color: isZero ? 'var(--color-text-tertiary)' : color,
                opacity: isZero ? 0.4 : 1,
                marginBottom: 2,
            }}>
                {icon}
            </div>
            <div style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: isZero ? 'var(--color-text-tertiary)' : color,
                lineHeight: 1.2,
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.55rem',
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
            }}>
                {label}
            </div>
        </div>
    );
}


