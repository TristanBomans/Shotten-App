'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { parseDate } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';
import type { RecentMatchItem } from '@/lib/recentMatches';
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
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${diffWeeks}w ago`;
}

function isSameCalendarDay(left: Date, right: Date): boolean {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function getAttendanceStatus(match: RecentMatchItem, internalMatches: Match[], playerId: number): 'present' | 'not-present' | 'maybe' | 'unknown' {
    const recentMatchDate = parseDate(match.date);
    if (!recentMatchDate) return 'unknown';

    const sameTeamMatches = internalMatches
        .map(internalMatch => ({
            internalMatch,
            internalDate: parseDate(internalMatch.date),
        }))
        .filter(({ internalDate, internalMatch }) =>
            internalDate !== null &&
            internalMatch.teamId === match.teamId &&
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
                                {hasRecentWithin3Days && (
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            margin: '4px 0 6px',
                                            borderRadius: 10,
                                            background: 'rgb(var(--color-accent-rgb) / 0.06)',
                                            border: '1px solid rgb(var(--color-accent-rgb) / 0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: '0.78rem',
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: 'var(--color-accent)',
                                                flexShrink: 0,
                                                boxShadow: '0 0 6px var(--color-accent-glow)',
                                            }}
                                        />
                                        <strong style={{ color: 'var(--color-text-primary)' }}>{recentCount}</strong>
                                        <span>match{recentCount === 1 ? '' : 'es'} in 72h</span>
                                    </div>
                                )}

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
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    {/* Result indicator */}
                                                    <div
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            background: result.background,
                                                            border: `1px solid ${result.border}`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            color: result.color,
                                                            letterSpacing: '0.02em',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {result.label}
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
                                                            }}
                                                        >
                                                            {match.teamName}
                                                            <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', margin: '0 5px', fontSize: '0.75rem' }}>
                                                                vs
                                                            </span>
                                                            {match.opponent}
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
                                                            {attLabel && (
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
                                                            fontSize: '1rem',
                                                            fontWeight: 800,
                                                            color: 'var(--color-text-primary)',
                                                            letterSpacing: '-0.02em',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {match.scoreline}
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
