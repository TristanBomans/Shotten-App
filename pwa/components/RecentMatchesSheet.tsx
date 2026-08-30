'use client';

import { Trophy, Calendar } from 'lucide-react';
import { parseDate } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';
import type { RecentMatchItem } from '@/lib/recentMatches';
import { isSameTeamName } from '@/lib/teamNameMatching';
import type { Match } from '@/lib/mockData';
import Sheet from './ui/Sheet';
import { EmptyState } from './ui/controls';

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

type InternalMatchLike = Match & {
    teamId: number | null;
    teamName?: string | null;
};

function resultColor(result: RecentMatchItem['result']): string {
    if (result === 'W') return 'var(--ok)';
    if (result === 'L') return 'var(--no)';
    return 'var(--warn)';
}

function resultBg(result: RecentMatchItem['result']): string {
    if (result === 'W') return 'rgb(var(--ok-rgb) / 0.12)';
    if (result === 'L') return 'rgb(var(--no-rgb) / 0.12)';
    return 'rgb(var(--warn-rgb) / 0.12)';
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

function isUpcomingMatch(dateStr: string): boolean {
    const date = parseDate(dateStr);
    if (!date) return false;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return diffMs > 0;
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

function findInternalMatch(
    match: RecentMatchItem,
    internalMatches: InternalMatchLike[]
): InternalMatchLike | undefined {
    const recentMatchDate = parseDate(match.date);
    if (!recentMatchDate) return undefined;

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

    return sameTeamMatches[0]?.internalMatch;
}

function getAttendanceStatus(
    match: RecentMatchItem,
    internalMatches: InternalMatchLike[],
    playerId: number
): 'present' | 'not-present' | 'maybe' | 'unknown' {
    const internalMatch = findInternalMatch(match, internalMatches);
    if (!internalMatch) return 'unknown';

    const attendance = internalMatch.attendances?.find(a => a.playerId === playerId);
    if (!attendance) return 'unknown';

    const status = attendance.status.toLowerCase();
    if (status === 'present') return 'present';
    if (status === 'maybe') return 'maybe';
    return 'not-present';
}

function attendanceDotColor(status: ReturnType<typeof getAttendanceStatus>): string {
    if (status === 'present') return 'var(--ok)';
    if (status === 'maybe') return 'var(--warn)';
    if (status === 'not-present') return 'var(--no)';
    return 'var(--text-3)';
}

function attendanceLabel(status: ReturnType<typeof getAttendanceStatus>): string {
    if (status === 'present') return 'Present';
    if (status === 'maybe') return 'Maybe';
    if (status === 'not-present') return 'Absent';
    return '';
}

function isForfaitMatch(match: RecentMatchItem, internalMatches: InternalMatchLike[]): boolean {
    return findInternalMatch(match, internalMatches)?.forfait === true;
}

export default function RecentMatchesSheet({
    open,
    loading,
    matches,
    playerId,
    internalMatches = [],
    onClose,
}: RecentMatchesSheetProps) {
    const handleClose = () => {
        hapticPatterns.tap();
        onClose();
    };

    return (
        <Sheet
            open={open}
            onClose={handleClose}
            title="Recent Matches"
            subtitle={matches.length > 0 ? `${matches.length} result${matches.length === 1 ? '' : 's'}` : undefined}
        >
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 52 }} />
                    ))}
                </div>
            ) : matches.length === 0 ? (
                <EmptyState icon={<Trophy size={18} />} title="No matches yet" compact />
            ) : (
                <div className="list-section">
                    {matches.map((match) => {
                        const attStatus = getAttendanceStatus(match, internalMatches, playerId);
                        const attColor = attendanceDotColor(attStatus);
                        const attLabel = attendanceLabel(attStatus);
                        const isRecent = isRecentMatch(match.date);
                        const isForfait = isForfaitMatch(match, internalMatches);
                        const isUpcoming = isUpcomingMatch(match.date);

                        const badgeColor = isUpcoming
                            ? 'var(--accent)'
                            : isForfait
                                ? 'var(--no)'
                                : resultColor(match.result);
                        const badgeBg = isUpcoming
                            ? 'rgb(var(--accent-rgb) / 0.12)'
                            : isForfait
                                ? 'rgb(var(--no-rgb) / 0.12)'
                                : resultBg(match.result);

                        return (
                            <div
                                key={match.externalId}
                                className="row row-static"
                                style={{ paddingTop: 10, paddingBottom: 10 }}
                            >
                                {/* Result indicator */}
                                <span
                                    className="flex-center t-num"
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: badgeBg,
                                        color: badgeColor,
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                        position: 'relative',
                                    }}
                                    aria-label={
                                        isUpcoming ? 'Upcoming' : isForfait ? 'Forfait' : `Result ${match.result}`
                                    }
                                >
                                    {isUpcoming ? <Calendar size={13} /> : isForfait ? 'F' : match.result}
                                    {isRecent && !isUpcoming && (
                                        <span
                                            aria-hidden
                                            style={{
                                                position: 'absolute',
                                                top: -2,
                                                right: -2,
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                background: isForfait ? 'var(--no)' : 'var(--accent)',
                                                border: '2px solid var(--bg-sheet)',
                                            }}
                                        />
                                    )}
                                </span>

                                {/* Match info */}
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--fs-xs)',
                                            fontWeight: 600,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {match.teamName}
                                        <span style={{ fontWeight: 400, color: 'var(--text-3)' }}> vs </span>
                                        {match.opponent}
                                    </span>
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginTop: 2,
                                            fontSize: 'var(--fs-3xs)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-2)', flexShrink: 0 }}>
                                            {formatRelativeTime(match.date)}
                                        </span>
                                        {attLabel && !isForfait && (
                                            <>
                                                <span style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden>·</span>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        color: attColor,
                                                        fontWeight: 600,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <span
                                                        aria-hidden
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
                                                <span style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden>·</span>
                                                <span
                                                    style={{
                                                        color: 'var(--text-3)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {match.location}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </span>

                                {/* Score */}
                                {!isUpcoming && (
                                    <span
                                        className="t-num"
                                        style={{
                                            fontSize: isForfait ? 'var(--fs-3xs)' : 'var(--fs-sm)',
                                            fontWeight: 800,
                                            color: isForfait ? 'var(--no)' : 'var(--text-1)',
                                            letterSpacing: '-0.01em',
                                            flexShrink: 0,
                                            textTransform: isForfait ? 'uppercase' : 'none',
                                        }}
                                    >
                                        {isForfait ? 'Forfait' : match.scoreline}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Sheet>
    );
}
