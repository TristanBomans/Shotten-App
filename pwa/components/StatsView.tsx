'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Megaphone, Sparkles, Armchair, Beer, Ghost, Hourglass, CalendarDays, Clock3 } from 'lucide-react';
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
    { name: 'Club Legend', icon: Trophy, minPct: 90, color: 'var(--warn)', bg: 'rgb(var(--warn-rgb) / 0.13)' },
    { name: 'Ultra', icon: Megaphone, minPct: 75, color: 'var(--warn)', bg: 'rgb(var(--warn-rgb) / 0.13)' },
    { name: 'Plastic Fan', icon: Sparkles, minPct: 60, color: 'var(--accent)', bg: 'rgb(var(--accent-rgb) / 0.13)' },
    { name: 'Bench Warmer', icon: Armchair, minPct: 45, color: 'var(--text-3)', bg: 'var(--bg-subtle)' },
    { name: 'Casual', icon: Beer, minPct: 25, color: 'var(--warn)', bg: 'rgb(var(--warn-rgb) / 0.13)' },
    { name: 'Professional Ghost', icon: Ghost, minPct: 0, color: 'var(--tbd)', bg: 'rgb(var(--tbd-rgb) / 0.13)' },
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

export interface AttendanceHistoryPoint {
    matchIndex: number;
    attendancePct: number;
    matchName: string;
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

    // Build chronological attendance history (oldest first)
    const chronologicalMatches = [...relevantMatches].sort((a, b) =>
        parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
    );
    let runningPresent = 0;
    const attendanceHistory: AttendanceHistoryPoint[] = chronologicalMatches.map((match, index) => {
        const attendance = match.attendances?.find(a => a.playerId === player.id);
        if (attendance?.status === 'Present') {
            runningPresent++;
        }
        return {
            matchIndex: index + 1,
            attendancePct: Math.round((runningPresent / (index + 1)) * 100),
            matchName: match.name,
        };
    });

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
        attendanceHistory,
    };
}

export type PlayerWithStats = Player & { stats: ReturnType<typeof calculatePlayerStats> };

const formDotColor: Record<MatchResult['status'], string> = {
    present: 'var(--ok)',
    maybe: 'var(--warn)',
    notPresent: 'var(--no)',
    ghost: 'var(--tbd)',
};

function formatCountdownShort(diffMs: number): { value: string; label: string } {
    if (diffMs <= 0) return { value: '0', label: 'now' };
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return { value: String(days), label: days === 1 ? 'day' : 'days' };
    if (hours > 0) return { value: String(hours), label: hours === 1 ? 'hour' : 'hours' };
    return { value: String(mins), label: mins === 1 ? 'minute' : 'minutes' };
}

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

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

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

    const hasLeaderboardData = useMemo(
        () => playerStats.some(p => p.stats.totalMatches > 0),
        [playerStats]
    );

    const nextMatch = useMemo(() => {
        const upcoming = matches
            .map(m => ({ match: m, ts: parseDateToTimestamp(m.date) }))
            .filter(({ ts }) => ts > now)
            .sort((a, b) => a.ts - b.ts);
        return upcoming[0]?.match ?? null;
    }, [matches, now]);

    const nextMatchDate = useMemo(
        () => (nextMatch ? parseDate(nextMatch.date) : null),
        [nextMatch]
    );

    const selectedPlayer = selectedPlayerId != null
        ? playerStats.find(p => p.id === selectedPlayerId) || null
        : null;

    if (!hasLeaderboardData) {
        const diffMs = nextMatchDate ? nextMatchDate.getTime() - now : null;
        const short = diffMs != null ? formatCountdownShort(diffMs) : null;
        const dateStr = nextMatchDate
            ? nextMatchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            : null;
        const timeStr = nextMatchDate
            ? nextMatchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : null;

        return (
            <div className="screen">
                <div className="section-label">
                    <span>Attendance leaderboard</span>
                    <span className="t-num" style={{ opacity: 0.5 }}>{playerStats.length}</span>
                </div>

                <div
                    className="panel"
                    style={{
                        padding: '28px 18px 22px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0,
                    }}
                >
                    <span
                        className="flex-center"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-3)',
                            marginBottom: 14,
                        }}
                        aria-hidden
                    >
                        <Hourglass size={20} />
                    </span>

                    <h2 className="t-title" style={{ marginBottom: 6 }}>
                        No data yet
                    </h2>

                    {nextMatch && diffMs != null && diffMs > 0 ? (
                        <>
                            <p className="t-body" style={{ maxWidth: 320, marginBottom: 16 }}>
                                The season hasn&apos;t started yet. Rankings will appear once the first match is played.
                            </p>

                            <div
                                role="timer"
                                aria-label={`Season starts in ${short?.value} ${short?.label}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 'var(--fs-2xs)',
                                    fontWeight: 500,
                                    color: 'var(--text-3)',
                                    letterSpacing: '0.01em',
                                    marginBottom: 14,
                                }}
                            >
                                <Clock3 size={12} style={{ opacity: 0.7 }} aria-hidden />
                                <span className="t-num">Season starts in {short?.value} {short?.label}</span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 2,
                                    padding: '8px 12px',
                                    borderRadius: 'var(--r-sm)',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-subtle)',
                                    maxWidth: '100%',
                                }}
                            >
                                <span
                                    className="flex-center"
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: 'var(--bg-panel-raised)',
                                        border: '1px solid var(--border-hairline)',
                                        color: 'var(--text-2)',
                                        flexShrink: 0,
                                    }}
                                    aria-hidden
                                >
                                    <CalendarDays size={14} />
                                </span>
                                <span style={{ textAlign: 'left', minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--fs-xs)',
                                            fontWeight: 700,
                                            lineHeight: 1.2,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {nextMatch.name.replace(/-/g, ' — ')}
                                    </span>
                                    <span
                                        className="t-num"
                                        style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', fontWeight: 600 }}
                                    >
                                        {dateStr} · {timeStr}
                                        {nextMatch.location ? ` · ${nextMatch.location}` : ''}
                                    </span>
                                </span>
                            </div>
                        </>
                    ) : (
                        <p className="t-body" style={{ maxWidth: 320 }}>
                            No matches have been played yet. Rankings will appear once results are in.
                        </p>
                    )}
                </div>

                <RulesPage open={isRulesOpen} onClose={() => setRulesOpen(false)} />

                <PlayerDetailPage
                    open={Boolean(selectedPlayer)}
                    player={selectedPlayer || ({} as PlayerWithStats)}
                    rank={selectedPlayer ? playerStats.findIndex(p => p.id === selectedPlayer.id) + 1 : 0}
                    onClose={() => onSelectPlayer?.(null)}
                />
            </div>
        );
    }

    return (
        <div className="screen">
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
                                minHeight: 58,
                                background: isMe ? 'rgb(var(--accent-rgb) / 0.08)' : undefined,
                                boxShadow: isMe ? 'inset 3px 0 0 var(--accent)' : undefined,
                            }}
                        >
                            {/* Position */}
                            <span
                                className="t-num"
                                style={{
                                    width: 26,
                                    textAlign: 'center',
                                    fontSize: 'var(--fs-2xs)',
                                    fontWeight: 800,
                                    color: i === 0
                                        ? 'var(--warn)'
                                        : i < 3
                                            ? 'var(--text-1)'
                                            : 'var(--text-3)',
                                    flexShrink: 0,
                                }}
                            >
                                {i + 1}
                            </span>

                            {/* Rank icon tile */}
                            <span
                                className="flex-center"
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 9,
                                    background: player.stats.rank.bg,
                                    color: player.stats.rank.color,
                                    flexShrink: 0,
                                }}
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
                                        fontWeight: isMe ? 700 : 600,
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
                                    <span style={{ fontSize: '0.625rem', color: player.stats.rank.color, fontWeight: 600 }}>
                                        {player.stats.rank.name}
                                    </span>
                                </span>
                            </span>

                            {/* Attendance % */}
                            <span style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span
                                    className="t-num"
                                    style={{
                                        display: 'block',
                                        fontSize: 'var(--fs-base)',
                                        fontWeight: 800,
                                        letterSpacing: '-0.01em',
                                        color: player.stats.attendancePct >= 80
                                            ? 'var(--ok)'
                                            : player.stats.attendancePct >= 50
                                                ? 'var(--warn)'
                                                : 'var(--no)',
                                    }}
                                >
                                    {player.stats.attendancePct}%
                                </span>
                                <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--text-3)', fontWeight: 600 }}>
                                    present
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

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
