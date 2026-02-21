'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Megaphone, Sparkles, Armchair, Beer, Ghost } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Match, Player } from '@/lib/mockData';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';

interface StatsViewProps {
    matches: Match[];
    players: Player[];
    currentPlayerId: number;
    showRules?: boolean;
    onShowRulesChange?: (open: boolean) => void;
}

// Rank configuration
const RANKS = [
    { name: 'Club Legend', icon: Trophy, minScore: 1300, color: 'var(--color-warning)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Ultra', icon: Megaphone, minScore: 1100, color: 'var(--color-warning-secondary)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Plastic Fan', icon: Sparkles, minScore: 1000, color: 'var(--color-accent)', bg: 'rgb(var(--color-accent-rgb) / 0.15)' },
    { name: 'Bench Warmer', icon: Armchair, minScore: 800, color: 'var(--color-text-tertiary)', bg: 'rgb(var(--color-text-tertiary-rgb) / 0.15)' },
    { name: 'Casual', icon: Beer, minScore: 500, color: 'var(--color-warning-secondary)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Professional Ghost', icon: Ghost, minScore: 0, color: 'var(--color-accent-secondary)', bg: 'rgb(var(--color-accent-rgb) / 0.15)' },
];

const POINTS = {
    present: 50,
    maybe: -20,
    notPresent: -50,
    ghost: -100,
    base: 1000,
};

function getRank(score: number) {
    return RANKS.find(r => score >= r.minScore) || RANKS[RANKS.length - 1];
}

interface MatchResult {
    matchId: number;
    matchName: string;
    date: Date;
    status: 'present' | 'maybe' | 'notPresent' | 'ghost';
    points: number;
}

interface ScoreHistoryPoint {
    date: number;
    score: number;
    matchName: string;
    delta: number;
}

function calculateScoreHistory(player: Player, allMatches: Match[]): ScoreHistoryPoint[] {
    const now = Date.now();
    const relevantMatches = allMatches.filter(m => {
        const isPast = parseDateToTimestamp(m.date) < now;
        const isPlayerTeam = player.teamIds.includes(m.teamId);
        const hasAttendees = m.attendances?.some(a => a.status === 'Present');
        return isPast && isPlayerTeam && hasAttendees;
    });

    // Sort ASCENDING (oldest first) for chronological history
    const sortedMatches = [...relevantMatches].sort((a, b) =>
        parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
    );

    let runningScore = POINTS.base;
    const history: ScoreHistoryPoint[] = [{
        date: 0,
        score: POINTS.base,
        matchName: 'Start',
        delta: 0,
    }];

    sortedMatches.forEach((match, index) => {
        const attendance = match.attendances?.find(a => a.playerId === player.id);
        let delta: number;

        if (!attendance) {
            delta = POINTS.ghost;
        } else if (attendance.status === 'Present') {
            delta = POINTS.present;
        } else if (attendance.status === 'Maybe') {
            delta = POINTS.maybe;
        } else {
            delta = POINTS.notPresent;
        }

        runningScore += delta;
        history.push({
            date: index + 1,
            score: runningScore,
            matchName: match.name,
            delta,
        });
    });

    return history;
}

function calculatePlayerScore(player: Player, allMatches: Match[]) {
    // Filter: player's team's matches, past, and at least 1 person Present
    const now = Date.now();
    const relevantMatches = allMatches.filter(m => {
        const isPast = parseDateToTimestamp(m.date) < now;
        const isPlayerTeam = player.teamIds.includes(m.teamId);
        const hasAttendees = m.attendances?.some(a => a.status === 'Present');
        return isPast && isPlayerTeam && hasAttendees;
    });

    const sortedMatches = [...relevantMatches].sort((a, b) =>
        parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date)
    );

    let score = POINTS.base;
    let presentCount = 0;
    let maybeCount = 0;
    let absentCount = 0;
    let ghostCount = 0;

    const matchResults: MatchResult[] = [];

    sortedMatches.forEach(match => {
        const attendance = match.attendances?.find(a => a.playerId === player.id);

        let status: MatchResult['status'];
        let points: number;

        if (!attendance) {
            status = 'ghost';
            points = POINTS.ghost;
            ghostCount++;
        } else if (attendance.status === 'Present') {
            status = 'present';
            points = POINTS.present;
            presentCount++;
        } else if (attendance.status === 'Maybe') {
            status = 'maybe';
            points = POINTS.maybe;
            maybeCount++;
        } else {
            status = 'notPresent';
            points = POINTS.notPresent;
            absentCount++;
        }

        score += points;
        matchResults.push({
            matchId: match.id,
            matchName: match.name,
            date: parseDate(match.date) || new Date(0),
            status,
            points,
        });
    });

    const recentForm = matchResults.slice(0, 5).map(r => r.status);
    const scoreHistory = calculateScoreHistory(player, allMatches);

    return {
        score,
        presentCount,
        maybeCount,
        absentCount,
        ghostCount,
        totalMatches: relevantMatches.length,
        rank: getRank(score),
        recentForm,
        matchResults,
        scoreHistory,
    };
}

type PlayerWithStats = Player & { stats: ReturnType<typeof calculatePlayerScore> };

export default function StatsView({
    matches,
    players,
    currentPlayerId,
    showRules,
    onShowRulesChange,
}: StatsViewProps) {
    const [internalShowRules, setInternalShowRules] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);
    const isRulesOpen = showRules ?? internalShowRules;

    const setRulesOpen = (open: boolean) => {
        if (showRules === undefined) {
            setInternalShowRules(open);
        }
        onShowRulesChange?.(open);
    };

    const playerStats = players.map(player => ({
        ...player,
        stats: calculatePlayerScore(player, matches),
    })).sort((a, b) => b.stats.score - a.stats.score);

    const topScorer = playerStats[0];
    const mostGhosts = playerStats.length > 0 ? playerStats.reduce((a, b) =>
        a.stats.ghostCount > b.stats.ghostCount ? a : b
    ) : null;
    const mostMaybe = playerStats.length > 0 ? playerStats.reduce((a, b) =>
        a.stats.maybeCount > b.stats.maybeCount ? a : b
    ) : null;

    return (
        <div className="container content-under-top-overlay">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Highlights */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 16,
                }}>
                    <HighlightCard icon="🏆" title="THE LEGEND" player={topScorer?.name} />
                    <HighlightCard icon="👻" title="CASPER" player={mostGhosts?.name} />
                    <HighlightCard icon="🤔" title="MISS MAYBE" player={mostMaybe?.name} />
                </div>

                {/* Leaderboard - Clean simple layout */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 20,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                    }}
                >
                    {playerStats.map((player, i) => (
                        <motion.div
                            key={player.id}
                            onClick={() => {
                                hapticPatterns.tap();
                                setSelectedPlayer(player);
                            }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 16px',
                                background: player.id === currentPlayerId
                                    ? 'rgb(var(--color-accent-rgb) / 0.15)'
                                    : 'transparent',
                                borderLeft: player.id === currentPlayerId
                                    ? '3px solid var(--color-accent)'
                                    : '3px solid transparent',
                                cursor: 'pointer',
                                borderBottom: i < playerStats.length - 1
                                    ? '0.5px solid var(--color-border-subtle)'
                                    : 'none',
                            }}
                        >
                            {/* Rank */}
                            <span style={{
                                width: 28,
                                fontSize: i < 3 ? '1.1rem' : '0.9rem',
                                fontWeight: 600,
                                color: i === 0 ? 'var(--color-warning)' : i === 1 ? 'var(--color-text-secondary)' : i === 2 ? 'var(--color-warning-secondary)' : 'var(--color-text-tertiary)',
                                textAlign: 'center',
                            }}>
                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                            </span>

                            {/* Avatar - Rank Icon */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: player.stats.rank.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: player.stats.rank.color,
                            }}>
                                <player.stats.rank.icon size={20} />
                            </div>

                            {/* Info - simplified */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {player.name}
                                </div>
                                {/* Recent Form dots only */}
                                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                                    {player.stats.recentForm.map((status, j) => (
                                        <div
                                            key={j}
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: status === 'present' ? 'var(--color-success)' :
                                                    status === 'maybe' ? 'var(--color-warning)' :
                                                        status === 'notPresent' ? 'var(--color-danger)' :
                                                            'var(--color-text-tertiary)',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                            }}>
                                {player.stats.score}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Rules Modal */}
            <AnimatePresence>
                {isRulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
            </AnimatePresence>

            {/* Player Detail Modal */}
            <AnimatePresence>
                {selectedPlayer && (
                    <PlayerDetailModal
                        player={selectedPlayer}
                        rank={playerStats.findIndex(p => p.id === selectedPlayer.id) + 1}
                        onClose={() => setSelectedPlayer(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function HighlightCard({ icon, title, player }: { icon: string; title: string; player?: string }) {
    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: 14,
            border: '0.5px solid var(--color-border)',
            padding: '12px 10px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{icon}</div>
            <div style={{
                fontSize: '0.55rem',
                fontWeight: 700,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: 4,
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {player}
            </div>
        </div>
    );
}

function PlayerDetailModal({ player, rank, onClose }: {
    player: PlayerWithStats;
    rank: number;
    onClose: () => void;
}) {
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--color-overlay)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        width: '100%', maxWidth: 360, maxHeight: 'calc(100dvh - 120px)',
                        display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24, border: '0.5px solid var(--color-border)',
                        boxShadow: '0 24px 80px var(--color-overlay)', overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid var(--color-border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    #{rank} · <player.stats.rank.icon size={12} style={{ color: player.stats.rank.color }} /> {player.stats.rank.name}
                                </div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                                    {player.name}
                                </h2>
                            </div>
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32, height: 32, borderRadius: 9999, border: 'none',
                                    background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>

                        {/* Score */}
                        <div style={{
                            marginTop: 16, padding: 14, background: 'var(--color-bg-elevated)',
                            borderRadius: 14, textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: player.stats.rank.color }}>
                                {player.stats.score}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                                Shotten Points
                            </div>

                            {/* Score History Sparkline */}
                            {player.stats.scoreHistory && player.stats.scoreHistory.length > 1 && (
                                <div style={{ marginTop: 12 }}>
                                    <ScoreSparkline history={player.stats.scoreHistory} />
                                    <div style={{
                                        fontSize: '0.6rem',
                                        color: 'var(--color-text-tertiary)',
                                        marginTop: 4,
                                    }}>
                                        Season trend
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                            <StatMini label="Present" value={player.stats.presentCount} color="var(--color-success)" />
                            <StatMini label="Maybe" value={player.stats.maybeCount} color="var(--color-warning)" />
                            <StatMini label="Absent" value={player.stats.absentCount} color="var(--color-danger)" />
                            <StatMini label="Ghost" value={player.stats.ghostCount} color="var(--color-text-tertiary)" />
                        </div>
                    </div>

                    {/* Match History */}
                    <div style={{ padding: '12px 16px 20px', overflowY: 'auto', flex: 1 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Match History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {player.stats.matchResults.map((result) => (
                                <div
                                    key={result.matchId}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'var(--color-bg-elevated)',
                                        borderRadius: 10,
                                        border: '0.5px solid var(--color-border-subtle)',
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 500,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                            {result.matchName.replace(/-/g, ' – ')}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>
                                            {result.date.toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.9rem' }}>
                                            {result.status === 'present' ? '✅' :
                                                result.status === 'maybe' ? '⚠️' :
                                                    result.status === 'notPresent' ? '❌' : '👻'}
                                        </span>
                                        <span style={{
                                            fontWeight: 700, fontSize: '0.9rem',
                                            color: result.points > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                        }}>
                                            {result.points > 0 ? '+' : ''}{result.points}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
}

function RulesModal({ onClose }: { onClose: () => void }) {
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'var(--color-overlay)', backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)', zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        width: '100%', maxWidth: 340, maxHeight: 'calc(100dvh - 120px)',
                        overflowY: 'auto', pointerEvents: 'auto',
                        background: 'var(--color-surface)', backdropFilter: 'blur(60px)',
                        WebkitBackdropFilter: 'blur(60px)', borderRadius: 24,
                        border: '0.5px solid var(--color-border)',
                        boxShadow: '0 24px 80px var(--color-overlay)', padding: 20,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                            How it works 🤡
                        </h2>
                        <motion.button
                            onClick={() => {
                                hapticPatterns.tap();
                                onClose();
                            }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                width: 32, height: 32, borderRadius: 9999, border: 'none',
                                background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={16} />
                        </motion.button>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Points
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                            Start with <strong style={{ color: 'var(--color-text-primary)' }}>1000</strong> points.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <PointRow emoji="✅" label="Present" points="+50" color="var(--color-success)" />
                            <PointRow emoji="⚠️" label="Maybe" points="-20" color="var(--color-warning)" />
                            <PointRow emoji="❌" label="Absent" points="-50" color="var(--color-danger)" />
                            <PointRow emoji="👻" label="Ghost" points="-100" color="var(--color-text-tertiary)" />
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Ranks
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {RANKS.map(rank => (
                                <div key={rank.name} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 10px', background: rank.bg, borderRadius: 8,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <rank.icon size={16} style={{ color: rank.color }} />
                                        <span style={{ color: rank.color, fontWeight: 500, fontSize: '0.85rem' }}>{rank.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{rank.minScore}+</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <motion.button
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%', marginTop: 20, padding: '12px',
                            background: 'var(--color-surface-hover)', border: 'none', borderRadius: 12,
                            color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Got it
                    </motion.button>
                </motion.div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

function ScoreSparkline({ history }: { history: ScoreHistoryPoint[] }) {
    if (history.length < 2) return null;

    const startScore = history[0].score;
    const endScore = history[history.length - 1].score;
    const trendColor = endScore >= startScore ? 'var(--color-success)' : 'var(--color-danger)';
    const trendArrow = endScore > startScore ? '↗' : endScore < startScore ? '↘' : '→';

    return (
        <div style={{ position: 'relative', width: '100%', height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                    <ReferenceLine y={1000} stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke={trendColor}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
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

function PointRow({ emoji, label, points, color }: { emoji: string; label: string; points: string; color: string }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px',
            background: 'var(--color-bg-elevated)',
            borderRadius: 8,
            border: '0.5px solid var(--color-border-subtle)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{emoji}</span>
                <span style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{label}</span>
            </div>
            <span style={{ fontWeight: 700, color, fontSize: '0.85rem' }}>{points}</span>
        </div>
    );
}
