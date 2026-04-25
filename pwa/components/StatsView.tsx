'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trophy, Megaphone, Sparkles, Armchair, Beer, Ghost, Flame, Award } from 'lucide-react';
import { LineChart, Line, ReferenceLine, YAxis } from 'recharts';
import type { Match, Player } from '@/lib/mockData';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';

interface StatsViewProps {
    matches: Match[];
    players: Player[];
    currentPlayerId: number;
    showRules?: boolean;
    onShowRulesChange?: (open: boolean) => void;
    selectedPlayerId?: number | null;
    onSelectPlayer?: (id: number | null) => void;
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

    // Streak calculation (matches newest-first in matchResults)
    let currentPresent = 0;
    let currentAbsent = 0;
    let bestPresent = 0;
    let tempPresent = 0;

    for (let i = 0; i < matchResults.length; i++) {
        const r = matchResults[i];
        if (r.status === 'present') {
            if (currentAbsent > 0) break;
            currentPresent++;
        } else if (r.status === 'notPresent' || r.status === 'ghost') {
            if (currentPresent > 0) break;
            currentAbsent++;
        } else {
            break;
        }
    }

    for (const r of matchResults) {
        if (r.status === 'present') {
            tempPresent++;
            bestPresent = Math.max(bestPresent, tempPresent);
        } else {
            tempPresent = 0;
        }
    }

    const attendancePct = relevantMatches.length > 0 ? Math.round((presentCount / relevantMatches.length) * 100) : 0;

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
        currentStreakPresent: currentPresent,
        currentStreakAbsent: currentAbsent,
        bestStreak: bestPresent,
        attendancePct,
    };
}

type PlayerWithStats = Player & { stats: ReturnType<typeof calculatePlayerScore> };

export default function StatsView({
    matches,
    players,
    currentPlayerId,
    showRules,
    onShowRulesChange,
    selectedPlayerId,
    onSelectPlayer,
}: StatsViewProps) {
    const [internalShowRules, setInternalShowRules] = useState(false);
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

    const selectedPlayer = selectedPlayerId != null
        ? playerStats.find(p => p.id === selectedPlayerId) || null
        : null;

    return (
        <div className="container content-under-top-overlay">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
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
                                onSelectPlayer?.(player.id);
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
            <RulesModal open={isRulesOpen} onClose={() => setRulesOpen(false)} />

            {/* Player Detail Modal */}
            <PlayerDetailModal
                open={Boolean(selectedPlayer)}
                player={selectedPlayer || ({} as PlayerWithStats)}
                rank={selectedPlayer ? playerStats.findIndex(p => p.id === selectedPlayer.id) + 1 : 0}
                onClose={() => onSelectPlayer?.(null)}
            />
        </div>
    );
}

function PlayerDetailModal({ open, player, rank, onClose }: {
    open: boolean;
    player: PlayerWithStats;
    rank: number;
    onClose: () => void;
}) {
    if (typeof document === 'undefined') return null;
    if (!player?.stats) return null;

    const s = player.stats;
    const nextRank = [...RANKS].reverse().find(r => r.minScore > s.score);
    const currentRank = s.rank;
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
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    padding: 'calc(var(--safe-top) + 8px) 16px 12px',
                    borderBottom: '0.5px solid var(--color-border-subtle)',
                    background: 'var(--color-surface)',
                }}>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => { hapticPatterns.tap(); onClose(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', color: 'var(--color-accent)', fontSize: '1.05rem', fontWeight: 400, cursor: 'pointer', padding: '4px 8px 4px 0', marginLeft: -4 }}>
                        <ChevronLeft size={28} strokeWidth={1.5} />Back
                    </motion.button>
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)', maxWidth: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {player.name}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px 20px 20px' }}>
                        {/* Rank badge */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                            #{rank} · <player.stats.rank.icon size={12} style={{ color: player.stats.rank.color }} /> {player.stats.rank.name}
                        </div>

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
                    <div style={{ padding: '0 20px 24px', flex: 1 }}>
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

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (typeof document === 'undefined') return null;

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
                {/* Header with iOS-style back button */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'calc(var(--safe-top) + 8px) 16px 12px',
                        borderBottom: '0.5px solid var(--color-border-subtle)',
                        background: 'var(--color-surface)',
                    }}
                >
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-accent)',
                            fontSize: '1.05rem',
                            fontWeight: 400,
                            cursor: 'pointer',
                            padding: '4px 8px 4px 0',
                            marginLeft: -4,
                        }}
                    >
                        <ChevronLeft size={28} strokeWidth={1.5} />
                        Back
                    </motion.button>
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '1.05rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                        }}
                    >
                        How it works
                    </div>
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px',
                    }}
                >
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
                </div>
            </motion.div>
        )}
        </AnimatePresence>,
        document.body
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
