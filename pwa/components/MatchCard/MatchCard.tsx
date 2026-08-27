'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useUpdateAttendance } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import type { MatchCardProps, RosterPlayer, AttendanceStatus } from './types';
import Confetti from './Confetti';
import { HeaderResponseButton } from './ResponseButtons';
import { SquadMeter, SquadNamesList } from './SquadDisplay';
import MatchPage from '../Pages/MatchPage';

type Countdown = { days: number; hours: number; mins: number; secs: number };

const metaSeparator: React.CSSProperties = {
    color: 'var(--color-text-tertiary)',
    opacity: 0.45,
    userSelect: 'none',
    flexShrink: 0,
};

/**
 * Remaining time as a muted suffix of the date, never a headline of its own:
 * compact units so the header stays a single row next to the response buttons.
 */
function TimeRemaining({ countdown }: { countdown: Countdown }) {
    const { days, hours, mins, secs } = countdown;
    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

    const [text, label] =
        days > 0
            ? [`${days}d ${hours}h`, `${plural(days, 'day')} ${plural(hours, 'hour')}`]
            : hours > 0
                ? [`${hours}h ${mins}m`, `${plural(hours, 'hour')} ${plural(mins, 'minute')}`]
                : [`${mins}m ${secs}s`, `${plural(mins, 'minute')} ${plural(secs, 'second')}`];

    return (
        <>
            <span style={metaSeparator} aria-hidden>·</span>
            <span
                role="timer"
                aria-label={`${label} until kick-off`}
                aria-live="off"
                style={{
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    color: 'var(--color-text-tertiary)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    overflow: 'hidden',
                }}
            >
                {text}
            </span>
        </>
    );
}

function TapAffordance() {
    return (
        <ChevronRight
            size={14}
            strokeWidth={2}
            aria-hidden
            style={{ color: 'var(--color-text-tertiary)', opacity: 0.55, flexShrink: 0 }}
        />
    );
}

function TapForDetails() {
    return (
        <div style={{ marginTop: 4, textAlign: 'right' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                Tap for details
            </span>
        </div>
    );
}

export default function MatchCard({
    match,
    currentPlayerId,
    allPlayers,
    onUpdate,
    variant,
    isModalOpen,
    onOpenModal,
    onCloseModal,
}: MatchCardProps) {
    const { updating, updateAttendance } = useUpdateAttendance();
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
    const [showConfetti, setShowConfetti] = useState(false);
    const [showFullNames, setShowFullNames] = useState(true);

    // Load showFullNames setting
    useEffect(() => {
        const stored = localStorage.getItem('showFullNames');
        setShowFullNames(stored === null ? true : stored === 'true');

        const handleShowFullNamesChanged = (event: Event) => {
            const customEvent = event as CustomEvent<boolean>;
            setShowFullNames(customEvent.detail);
        };

        window.addEventListener('showFullNamesChanged', handleShowFullNamesChanged);
        return () => window.removeEventListener('showFullNamesChanged', handleShowFullNamesChanged);
    }, []);

    // Memoize date to prevent infinite loop
    const dateTimestamp = useMemo(() => {
        const d = parseDate(match.date);
        return d ? d.getTime() : 0;
    }, [match.date]);

    const dateObj = parseDate(match.date) || new Date(0);
    const isPast = dateTimestamp < Date.now();

    // Countdown timer
    useEffect(() => {
        if (isPast || variant !== 'hero') return;

        const update = () => {
            const diff = Math.max(0, dateTimestamp - Date.now());
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                secs: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [dateTimestamp, isPast, variant]);

    // Get roster with statuses
    const teamPlayers = allPlayers.filter(p => p.teamIds?.includes(match.teamId));
    const roster: RosterPlayer[] = teamPlayers.map(player => {
        const att = match.attendances?.find(a => a.playerId === player.id);
        return { ...player, status: att?.status || 'Unknown' };
    });

    const myStatus = roster.find(p => p.id === currentPlayerId)?.status || 'Unknown';
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const notPresent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    // Date formatting
    const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateNum = dateObj.getDate();
    const monthName = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
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

    // HERO VARIANT - COMPACT
    if (variant === 'hero') {
        const teams = match.name.split('-');
        const team1 = teams[0]?.trim() || match.name;
        const team2 = teams[1]?.trim();

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => { hapticPatterns.tap(); onOpenModal?.(); }}
                whileTap={{ scale: 0.98 }}
                style={{
                    background: 'var(--color-surface)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    borderRadius: 20,
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                }}
            >

                {/* Confetti */}
                <AnimatePresence>
                    {showConfetti && <Confetti />}
                </AnimatePresence>

                {/* Main Content */}
                <div style={{ position: 'relative', zIndex: 1, padding: 14 }}>
                    {/* Meta row: one line of date/time/remaining, buttons in a reserved column */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        alignItems: 'center',
                        columnGap: 8,
                        marginBottom: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                letterSpacing: '-0.01em',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                                {dayName.slice(0, 3)} {dateNum} {monthName}
                            </span>
                            <span style={metaSeparator} aria-hidden>·</span>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}>
                                {timeStr}
                            </span>
                            {!isPast && <TimeRemaining countdown={countdown} />}
                            {match.forfait && (
                                <span style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: 'var(--color-danger)',
                                    background: 'rgb(var(--color-danger-rgb) / 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}>
                                    Forfait
                                </span>
                            )}
                        </div>

                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <HeaderResponseButton type="yes" selected={myStatus === 'Present'} loading={updating === 'Present'} onClick={() => handleStatusUpdate('Present')} />
                            <HeaderResponseButton type="maybe" selected={myStatus === 'Maybe'} loading={updating === 'Maybe'} onClick={() => handleStatusUpdate('Maybe')} />
                            <HeaderResponseButton type="no" selected={myStatus === 'NotPresent'} loading={updating === 'NotPresent'} onClick={() => handleStatusUpdate('NotPresent')} />
                        </div>
                    </div>

                    {/* Teams with VS Badge - Original vertical layout */}
                    {team2 ? (
                        <div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                background: 'var(--color-bg-elevated)',
                                borderRadius: 20,
                                padding: '16px 16px',
                                border: '0.5px solid var(--color-border-subtle)',
                            }}>
                                {/* Team 1 */}
                                <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    textAlign: 'center',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }}>
                                    {team1}
                                </div>

                                {/* VS Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-subtle)' }} />
                                    <span style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 600,
                                        color: 'var(--color-text-tertiary)',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                    }}>
                                        vs
                                    </span>
                                    <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-subtle)' }} />
                                </div>

                                {/* Team 2 */}
                                <div style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    textAlign: 'center',
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }}>
                                    {team2}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            fontSize: '1.3rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            textAlign: 'center',
                            lineHeight: 1.3,
                            padding: '10px 0',
                        }}>
                            {team1}
                        </div>
                    )}

                    {showFullNames ? (
                        <div style={{ marginTop: 12 }}>
                            <SquadNamesList
                                present={present}
                                maybe={maybe}
                                notPresent={notPresent}
                                unknown={unknown}
                                currentPlayerId={currentPlayerId}
                            />
                            <TapForDetails />
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            marginTop: 12,
                        }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <SquadMeter
                                    present={present}
                                    maybe={maybe}
                                    notPresent={notPresent}
                                    unknown={unknown}
                                    currentPlayerId={currentPlayerId}
                                    size="md"
                                />
                            </div>
                            <TapAffordance />
                        </div>
                    )}
                </div>

                {/* Modal */}
                <MatchPage match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} open={!!isModalOpen} onClose={() => onCloseModal?.()} />
            </motion.div>
        );
    }

    // COMPACT VARIANT - OPTIMIZED (with hero card styling)
    const compactDateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

    return (
        <motion.div
            onClick={() => { hapticPatterns.tap(); onOpenModal?.(); }}
            whileTap={{ scale: 0.98 }}
            style={{
                background: 'var(--color-surface)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: 20,
                border: '1px solid var(--color-border)',
                padding: 12,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
            }}
        >
            {/* Header - Compact */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.03em', flexShrink: 0 }}>
                    {compactDateStr} · {timeStr}
                </span>

                {/* Response Buttons - Compact */}
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <HeaderResponseButton type="yes" selected={myStatus === 'Present'} loading={updating === 'Present'} onClick={() => handleStatusUpdate('Present')} />
                    <HeaderResponseButton type="maybe" selected={myStatus === 'Maybe'} loading={updating === 'Maybe'} onClick={() => handleStatusUpdate('Maybe')} />
                    <HeaderResponseButton type="no" selected={myStatus === 'NotPresent'} loading={updating === 'NotPresent'} onClick={() => handleStatusUpdate('NotPresent')} />
                </div>
            </div>

            {/* Title - Compact */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h3 style={{
                    fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                    {match.name.replace(/-/g, ' – ')}
                </h3>
                {match.forfait && (
                    <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: 'var(--color-danger)',
                        background: 'rgb(var(--color-danger-rgb) / 0.15)',
                        padding: '2px 6px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                    }}>
                        Forfait
                    </span>
                )}
            </div>

            {showFullNames ? (
                <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '0.5px solid var(--color-border-subtle)' }}>
                    <SquadNamesList
                        present={present}
                        maybe={maybe}
                        notPresent={notPresent}
                        unknown={unknown}
                        currentPlayerId={currentPlayerId}
                    />
                    <TapForDetails />
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginTop: 'auto',
                    paddingTop: 4,
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <SquadMeter
                            present={present}
                            maybe={maybe}
                            notPresent={notPresent}
                            unknown={unknown}
                            currentPlayerId={currentPlayerId}
                        />
                    </div>
                    <TapAffordance />
                </div>
            )}

            {/* Modal */}
            <MatchPage match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} open={!!isModalOpen} onClose={() => onCloseModal?.()} />
        </motion.div>
    );
}
