'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { parseDate } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';
import type { RecentMatchItem } from '@/lib/recentMatches';
import { isSameTeamName } from '@/lib/teamNameMatching';
import type { Match } from '@/lib/mockData';

interface RecentMatchesSheetProps {
    open: boolean;
    loading: boolean;
    matches: RecentMatchItem[];
    recentCount: number;
    hasRecentWithin3Days: boolean;
    playerId: number;
    internalMatches?: Match[];
    onClose: () => void;
}

type StatusBadgeMeta = {
    label: string;
    color: string;
    background: string;
    border: string;
};

type InternalMatchLike = Match & {
    teamId: number | null;
    teamName?: string | null;
};

function resultMeta(result: RecentMatchItem['result']): StatusBadgeMeta {
    if (result === 'W') {
        return {
            label: 'W',
            color: 'var(--color-success)',
            background: 'rgb(var(--color-success-rgb) / 0.10)',
            border: 'rgb(var(--color-success-rgb) / 0.18)',
        };
    }
    if (result === 'L') {
        return {
            label: 'L',
            color: 'var(--color-danger)',
            background: 'rgb(var(--color-danger-rgb) / 0.10)',
            border: 'rgb(var(--color-danger-rgb) / 0.18)',
        };
    }
    return {
        label: 'D',
        color: 'var(--color-warning)',
        background: 'rgb(var(--color-warning-rgb) / 0.10)',
        border: 'rgb(var(--color-warning-rgb) / 0.18)',
    };
}

function formatRelativeTime(dateStr: string): string {
    const date = parseDate(dateStr);
    if (!date) return '--';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60 * 1000) return 'Just now';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Use calendar-day diff for accurate day/week counts (consistent with isSameCalendarDay)
    const calendarDaysDiff = Math.floor(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) /
            (1000 * 60 * 60 * 24)
    );
    const calendarWeeksDiff = Math.floor(calendarDaysDiff / 7);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (calendarDaysDiff === 1) return 'Yesterday';
    if (calendarDaysDiff < 7) return `${calendarDaysDiff}d ago`;
    return `${calendarWeeksDiff}w ago`;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
    return (
        left.getUTCFullYear() === right.getUTCFullYear() &&
        left.getUTCMonth() === right.getUTCMonth() &&
        left.getUTCDate() === right.getUTCDate()
    );
}

function isRecentMatch(dateStr: string): boolean {
    const date = parseDate(dateStr);
    if (!date) return false;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    // Only highlight if within last 72h and not in the future
    return diffMs >= 0 && diffMs <= 72 * 60 * 60 * 1000;
}

function matchesRecentTeam(match: RecentMatchItem, internalMatch: InternalMatchLike): boolean {
    if (internalMatch.teamId === match.teamId) {
        return true;
    }

    if (internalMatch.teamName) {
        return isSameTeamName(internalMatch.teamName, match.teamName);
    }

    return false;
}

function getAttendanceStatus(match: RecentMatchItem, internalMatches: InternalMatchLike[], playerId: number): 'present' | 'not-present' | 'maybe' | 'unknown' {
    const recentMatchDate = parseDate(match.date);
    if (!recentMatchDate) return 'unknown';

    const sameTeamMatches = internalMatches
        .map(internalMatch => ({
            internalMatch,
            internalDate: parseDate(internalMatch.date),
        }))
        .filter(({ internalDate, internalMatch }) =>
            internalDate !== null &&
            matchesRecentTeam(match, internalMatch) &&
            isSameCalendarDay(recentMatchDate, internalDate)
        )
        .sort((left, right) =>
            Math.abs(left.internalDate!.getTime() - recentMatchDate.getTime()) -
            Math.abs(right.internalDate!.getTime() - recentMatchDate.getTime())
        );

    const internalMatch = sameTeamMatches[0]?.internalMatch;

    if (!internalMatch) return 'unknown';

    const attendance = internalMatch.attendances?.find(a => a.playerId === playerId);
    if (!attendance) return 'unknown';

    const status = attendance.status.toLowerCase();
    if (status === 'present') return 'present';
    if (status === 'maybe') return 'maybe';
    return 'not-present';
}

function attendanceDotColor(status: ReturnType<typeof getAttendanceStatus>): string {
    if (status === 'present') return 'var(--color-success)';
    if (status === 'maybe') return 'var(--color-warning)';
    if (status === 'not-present') return 'var(--color-danger)';
    return 'var(--color-text-tertiary)';
}

function attendanceLabel(status: ReturnType<typeof getAttendanceStatus>): string {
    if (status === 'present') return 'Present';
    if (status === 'maybe') return 'Maybe';
    if (status === 'not-present') return 'Absent';
    return '';
}

function isForfaitMatch(match: RecentMatchItem, internalMatches: InternalMatchLike[]): boolean {
    const recentMatchDate = parseDate(match.date);
    if (!recentMatchDate) return false;

    const sameTeamMatches = internalMatches
        .map(internalMatch => ({
            internalMatch,
            internalDate: parseDate(internalMatch.date),
        }))
        .filter(({ internalDate, internalMatch }) =>
            internalDate !== null &&
            matchesRecentTeam(match, internalMatch) &&
            isSameCalendarDay(recentMatchDate, internalDate)
        )
        .sort((left, right) =>
            Math.abs(left.internalDate!.getTime() - recentMatchDate.getTime()) -
            Math.abs(right.internalDate!.getTime() - recentMatchDate.getTime())
        );

    return sameTeamMatches[0]?.internalMatch.forfait === true;
}

export default function RecentMatchesSheet({
    open,
    loading,
    matches,
    recentCount,
    hasRecentWithin3Days,
    playerId,
    internalMatches = [],
    onClose,
}: RecentMatchesSheetProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--color-overlay)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            zIndex: 10012,
                        }}
                    />

                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10013,
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            padding: 16,
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 480,
                                maxHeight: '75dvh',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 24,
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(50px)',
                                WebkitBackdropFilter: 'blur(50px)',
                                boxShadow: 'var(--shadow-lg)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    borderBottom: '1px solid var(--color-border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <h3
                                        style={{
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            margin: 0,
                                            color: 'var(--color-text-primary)',
                                            letterSpacing: '-0.02em',
                                        }}
                                    >
                                        Recent Matches
                                    </h3>
                                    {matches.length > 0 && (
                                        <span
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-tertiary)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {matches.length}
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onClose();
                                    }}
                                    aria-label="Close recent matches"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 10,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--color-surface)';
                                    }}
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Content */}
                            <div
                                className="scrollbar-hide"
                                style={{
                                    overflowY: 'auto',
                                    padding: '8px 12px 12px',
                                }}
                            >
                                {loading ? (
                                    <div
                                        style={{
                                            padding: '32px 0',
                                            textAlign: 'center',
                                            color: 'var(--color-text-tertiary)',
                                            fontSize: '0.82rem',
                                        }}
                                    >
                                        Loading matches...
                                    </div>
                                ) : matches.length === 0 ? (
                                    <div
                                        style={{
                                            padding: '32px 0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 8,
                                            color: 'var(--color-text-tertiary)',
                                        }}
                                    >
                                        <Trophy size={24} style={{ opacity: 0.4 }} />
                                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                            No matches yet
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {matches.map((match, index) => {
                                            const result = resultMeta(match.result);
                                            const attStatus = getAttendanceStatus(match, internalMatches, playerId);
                                            const attColor = attendanceDotColor(attStatus);
                                            const attLabel = attendanceLabel(attStatus);
                                            const isRecent = isRecentMatch(match.date);
                                            const isForfait = isForfaitMatch(match, internalMatches);

                                            return (
                                                <motion.div
                                                    key={match.externalId}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.03, duration: 0.2 }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 12,
                                                        padding: '10px 12px',
                                                        borderRadius: 14,
                                                        cursor: 'default',
                                                        transition: 'background 0.15s ease',
                                                        border: isForfait 
                                                            ? '1px solid rgb(var(--color-danger-rgb) / 0.2)' 
                                                            : isRecent 
                                                                ? '1px solid rgb(var(--color-accent-rgb) / 0.2)' 
                                                                : '1px solid transparent',
                                                        background: isForfait 
                                                            ? 'rgb(var(--color-danger-rgb) / 0.04)' 
                                                            : isRecent 
                                                                ? 'rgb(var(--color-accent-rgb) / 0.04)' 
                                                                : 'transparent',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = isForfait
                                                            ? 'rgb(var(--color-danger-rgb) / 0.08)'
                                                            : isRecent
                                                                ? 'rgb(var(--color-accent-rgb) / 0.08)'
                                                                : 'var(--color-surface-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = isForfait
                                                            ? 'rgb(var(--color-danger-rgb) / 0.04)'
                                                            : isRecent
                                                                ? 'rgb(var(--color-accent-rgb) / 0.04)'
                                                                : 'transparent';
                                                    }}
                                                >
                                                    {/* Result indicator */}
                                                    <div
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            background: isForfait ? 'rgb(var(--color-danger-rgb) / 0.10)' : result.background,
                                                            border: `1px solid ${isForfait ? 'rgb(var(--color-danger-rgb) / 0.18)' : result.border}`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            color: isForfait ? 'var(--color-danger)' : result.color,
                                                            letterSpacing: '0.02em',
                                                            flexShrink: 0,
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {isForfait ? 'F' : result.label}
                                                        {isRecent && !isForfait && (
                                                            <span
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: -2,
                                                                    right: -2,
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    background: 'var(--color-accent)',
                                                                    border: '2px solid var(--color-surface)',
                                                                }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Match info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                fontSize: '0.84rem',
                                                                fontWeight: 600,
                                                                color: 'var(--color-text-primary)',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                lineHeight: 1.3,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                            }}
                                                        >
                                                            {match.teamName}
                                                            <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                                                                vs
                                                            </span>
                                                            {match.opponent}
                                                            {isRecent && !isForfait && (
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.55rem',
                                                                        fontWeight: 700,
                                                                        color: 'var(--color-accent)',
                                                                        background: 'rgb(var(--color-accent-rgb) / 0.12)',
                                                                        padding: '1px 5px',
                                                                        borderRadius: 4,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.03em',
                                                                    }}
                                                                >
                                                                    New
                                                                </span>
                                                            )}
                                                            {isForfait && (
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.55rem',
                                                                        fontWeight: 700,
                                                                        color: 'var(--color-danger)',
                                                                        background: 'rgb(var(--color-danger-rgb) / 0.12)',
                                                                        padding: '1px 5px',
                                                                        borderRadius: 4,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.03em',
                                                                    }}
                                                                >
                                                                    Forfait
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                                marginTop: 3,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 500, flexShrink: 0 }}>
                                                                {formatRelativeTime(match.date)}
                                                            </span>
                                                            {attLabel && !isForfait && (
                                                                <>
                                                                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>·</span>
                                                                    <span
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4,
                                                                            fontSize: '0.72rem',
                                                                            color: attColor,
                                                                            fontWeight: 500,
                                                                            flexShrink: 0,
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{
                                                                                width: 5,
                                                                                height: 5,
                                                                                borderRadius: '50%',
                                                                                background: attColor,
                                                                            }}
                                                                        />
                                                                        {attLabel}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {match.location && (
                                                                <>
                                                                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>·</span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.72rem',
                                                                            color: 'var(--color-text-tertiary)',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                        }}
                                                                    >
                                                                        {match.location}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Score */}
                                                    <div
                                                        style={{
                                                            fontSize: isForfait ? '0.75rem' : '1rem',
                                                            fontWeight: isForfait ? 700 : 800,
                                                            color: isForfait ? 'var(--color-danger)' : 'var(--color-text-primary)',
                                                            letterSpacing: '-0.02em',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            flexShrink: 0,
                                                            textTransform: isForfait ? 'uppercase' : 'none',
                                                        }}
                                                    >
                                                        {isForfait ? 'Forfait' : match.scoreline}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
