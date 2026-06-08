'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Megaphone, Sparkles, Armchair, Beer, Ghost } from 'lucide-react';
import type { Match, Player } from '@/lib/mockData';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';
import PlayerDetailPage from './Pages/PlayerDetailPage';
import RulesPage from './Pages/RulesPage';

interface StatsViewProps {
    matches: Match[];
    players: Player[];
    currentPlayerId: number;
    showRules?: boolean;
    onShowRulesChange?: (open: boolean) => void;
    selectedPlayerId?: number | null;
    onSelectPlayer?: (id: number | null) => void;
}

// Rank configuration — percentage based
export const RANKS = [
    { name: 'Club Legend', icon: Trophy, minPct: 90, color: 'var(--color-warning)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Ultra', icon: Megaphone, minPct: 75, color: 'var(--color-warning-secondary)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Plastic Fan', icon: Sparkles, minPct: 60, color: 'var(--color-accent)', bg: 'rgb(var(--color-accent-rgb) / 0.15)' },
    { name: 'Bench Warmer', icon: Armchair, minPct: 45, color: 'var(--color-text-tertiary)', bg: 'rgb(var(--color-text-tertiary-rgb) / 0.15)' },
    { name: 'Casual', icon: Beer, minPct: 25, color: 'var(--color-warning-secondary)', bg: 'rgb(var(--color-warning-rgb) / 0.15)' },
    { name: 'Professional Ghost', icon: Ghost, minPct: 0, color: 'var(--color-accent-secondary)', bg: 'rgb(var(--color-accent-rgb) / 0.15)' },
];

function getRank(attendancePct: number) {
    return RANKS.find(r => attendancePct >= r.minPct) || RANKS[RANKS.length - 1];
}

interface MatchResult {
    matchId: number;
    matchName: string;
    date: Date;
    status: 'present' | 'maybe' | 'notPresent' | 'ghost';
}

function calculatePlayerStats(player: Player, allMatches: Match[]) {
    // Filter: player's team's matches, past, and at least 1 person Present
    const now = Date.now();
    const relevantMatches = allMatches.filter(m => {
        const isPast = parseDateToTimestamp(m.date) < now;
        const isPlayerTeam = player.teamIds.includes(m.teamId);
        const hasAttendees = m.attendances?.some(a => a.status === 'Present');
        const isForfait = m.forfait === true;
        return isPast && isPlayerTeam && hasAttendees && !isForfait;
    });

    const sortedMatches = [...relevantMatches].sort((a, b) =>
        parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date)
    );

    let presentCount = 0;
    let maybeCount = 0;
    let absentCount = 0;
    let ghostCount = 0;

    const matchResults: MatchResult[] = [];

    sortedMatches.forEach(match => {
        const attendance = match.attendances?.find(a => a.playerId === player.id);

        let status: MatchResult['status'];

        if (!attendance) {
            status = 'ghost';
            ghostCount++;
        } else if (attendance.status === 'Present') {
            status = 'present';
            presentCount++;
        } else if (attendance.status === 'Maybe') {
            status = 'maybe';
            maybeCount++;
        } else {
            status = 'notPresent';
            absentCount++;
        }

        matchResults.push({
            matchId: match.id,
            matchName: match.name,
            date: parseDate(match.date) || new Date(0),
            status,
        });
    });

    const recentForm = matchResults.slice(0, 5).map(r => r.status);

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
        presentCount,
        maybeCount,
        absentCount,
        ghostCount,
        totalMatches: relevantMatches.length,
        rank: getRank(attendancePct),
        recentForm,
        matchResults,
        currentStreakPresent: currentPresent,
        currentStreakAbsent: currentAbsent,
        bestStreak: bestPresent,
        attendancePct,
    };
}

export type PlayerWithStats = Player & { stats: ReturnType<typeof calculatePlayerStats> };

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
        stats: calculatePlayerStats(player, matches),
    })).sort((a, b) => b.stats.attendancePct - a.stats.attendancePct);

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

                            {/* Attendance % */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 2,
                            }}>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: player.stats.attendancePct >= 80
                                        ? 'var(--color-success)'
                                        : player.stats.attendancePct >= 50
                                            ? 'var(--color-warning)'
                                            : 'var(--color-danger)',
                                }}>
                                    {player.stats.attendancePct}%
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    present
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Rules Page */}
            <RulesPage open={isRulesOpen} onClose={() => setRulesOpen(false)} />

            {/* Player Detail Page */}
            <PlayerDetailPage
                open={Boolean(selectedPlayer)}
                player={selectedPlayer || ({} as PlayerWithStats)}
                rank={selectedPlayer ? playerStats.findIndex(p => p.id === selectedPlayer.id) + 1 : 0}
                onClose={() => onSelectPlayer?.(null)}
            />
        </div>
    );
}
