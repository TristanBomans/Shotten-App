'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useUpdateAttendance } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { parseDate } from '@/lib/dateUtils';
import type { Match, Player } from '@/lib/mockData';
import type { AttendanceStatus, RosterPlayer } from './types';
import Confetti from './Confetti';
import MatchPage from '../Pages/MatchPage';
import { ResponseControl } from '../ui/controls';
import AvailabilityCounts from './AvailabilityCounts';
import AvailabilityRoster from './AvailabilityRoster';

interface MatchSummaryProps {
    match: Match;
    currentPlayerId: number;
    allPlayers: Player[];
    onUpdate: (matchId: number, newStatus: AttendanceStatus) => void;
    /** Marks the next upcoming match with a quiet emphasis treatment. */
    isNext?: boolean;
    isModalOpen?: boolean;
    onOpenModal?: () => void;
    onCloseModal?: () => void;
}

function formatCountdown(diffMs: number): string {
    if (diffMs <= 0) return 'now';
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${mins % 60}m`;
    return `in ${mins}m`;
}

/**
 * One dense, uniform availability panel per upcoming match. Every panel keeps
 * the roster breakdown and the player's one-tap response visible without any
 * extra interaction.
 */
export default function MatchSummary({
    match,
    currentPlayerId,
    allPlayers,
    onUpdate,
    isNext = false,
    isModalOpen,
    onOpenModal,
    onCloseModal,
}: MatchSummaryProps) {
    const { updating, updateAttendance } = useUpdateAttendance();
    const [showConfetti, setShowConfetti] = useState(false);
    const [showFullNames, setShowFullNames] = useState(true);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const stored = localStorage.getItem('showFullNames');
        setShowFullNames(stored === null ? true : stored === 'true');

        const handleShowFullNamesChanged = (event: Event) => {
            setShowFullNames((event as CustomEvent<boolean>).detail);
        };

        window.addEventListener('showFullNamesChanged', handleShowFullNamesChanged);
        return () => window.removeEventListener('showFullNamesChanged', handleShowFullNamesChanged);
    }, []);

    // Minute-level countdown; no per-second ticking in the list.
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, []);

    const dateObj = useMemo(() => parseDate(match.date) || new Date(0), [match.date]);
    const isPast = dateObj.getTime() < now;

    const roster: RosterPlayer[] = useMemo(() => {
        const teamPlayers = allPlayers.filter(p => p.teamIds?.includes(match.teamId));
        return teamPlayers.map(player => {
            const att = match.attendances?.find(a => a.playerId === player.id);
            return { ...player, status: att?.status || 'Unknown' };
        });
    }, [allPlayers, match.teamId, match.attendances]);

    const myStatus = (roster.find(p => p.id === currentPlayerId)?.status || 'Unknown') as AttendanceStatus | 'Unknown';
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const notPresent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    const dateStr = dateObj
        .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        .toUpperCase();
    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const handleStatusUpdate = async (status: AttendanceStatus) => {
        hapticPatterns.tap();
        if (status === 'Present') {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1500);
        }
        try {
            await updateAttendance(match.id, currentPlayerId, status, () => {
                if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
                    navigator.vibrate([50, 30, 50]);
                }
                onUpdate(match.id, status);
            });
        } catch {
            // Error handled in hook
        }
    };

    return (
        <div
            className="panel press"
            onClick={() => {
                hapticPatterns.tap();
                onOpenModal?.();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenModal?.();
                }
            }}
            aria-label={`Match ${match.name.replace(/-/g, ' versus ')}, open details`}
            style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                borderColor: isNext ? 'var(--border-strong)' : undefined,
            }}
        >
            <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

            <div style={{ padding: '10px 12px 12px' }}>
                {/* Meta row: date · time · countdown + response control */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 7,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 6,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {isNext && (
                            <span
                                style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    color: 'var(--accent)',
                                    flexShrink: 0,
                                }}
                            >
                                NEXT
                            </span>
                        )}
                        <span
                            className="t-num"
                            style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, flexShrink: 0 }}
                        >
                            {dateStr}
                        </span>
                        <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', flexShrink: 0 }}>
                            {timeStr}
                        </span>
                        {!isPast && (
                            <span
                                className="t-num"
                                role="timer"
                                aria-label={`${formatCountdown(dateObj.getTime() - now)} until kick-off`}
                                style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', flexShrink: 0 }}
                            >
                                {formatCountdown(dateObj.getTime() - now)}
                            </span>
                        )}
                        {match.forfait && (
                            <span
                                style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'var(--no)',
                                    background: 'rgb(var(--no-rgb) / 0.13)',
                                    border: '1px solid rgb(var(--no-rgb) / 0.25)',
                                    borderRadius: 5,
                                    padding: '1px 5px',
                                    flexShrink: 0,
                                }}
                            >
                                Forfait
                            </span>
                        )}
                    </div>

                    <ResponseControl
                        status={myStatus}
                        updating={updating as AttendanceStatus | null}
                        onSelect={handleStatusUpdate}
                        size="sm"
                    />
                </div>

                {/* Teams */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                    <h3
                        style={{
                            fontSize: 'var(--fs-sm)',
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.3,
                            minWidth: 0,
                            flex: 1,
                        }}
                    >
                        {match.name.replace(/-/g, ' — ')}
                    </h3>
                    <ChevronRight
                        size={14}
                        aria-hidden
                        style={{ color: 'var(--text-3)', opacity: 0.7, flexShrink: 0 }}
                    />
                </div>

                {!showFullNames && (
                    <AvailabilityCounts
                        present={present.length}
                        maybe={maybe.length}
                        notPresent={notPresent.length}
                        unknown={unknown.length}
                    />
                )}

                {/* Roster breakdown */}
                {showFullNames && (
                    <div
                        className="hairline-t"
                        style={{ marginTop: 9, paddingTop: 8 }}
                    >
                        <AvailabilityRoster
                            present={present}
                            maybe={maybe}
                            notPresent={notPresent}
                            unknown={unknown}
                            currentPlayerId={currentPlayerId}
                        />
                    </div>
                )}
            </div>

            <MatchPage
                match={match}
                dateObj={dateObj}
                roster={roster}
                currentPlayerId={currentPlayerId}
                open={!!isModalOpen}
                onClose={() => onCloseModal?.()}
            />
        </div>
    );
}
