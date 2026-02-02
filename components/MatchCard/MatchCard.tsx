'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, Users } from 'lucide-react';
import { useUpdateAttendance } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import type { MatchCardProps, RosterPlayer, AttendanceStatus } from './types';
import Confetti from './Confetti';
import { HeaderResponseButton } from './ResponseButtons';
import { PlayerAvatars, SquadNamesList } from './SquadDisplay';
import MatchModal from './MatchModal';

export default function MatchCard({
    match,
    currentPlayerId,
    allPlayers,
    onUpdate,
    variant
}: MatchCardProps) {
    const { updating, updateAttendance } = useUpdateAttendance();
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
    const [showConfetti, setShowConfetti] = useState(false);
    const [showModal, setShowModal] = useState(false);
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
                onClick={() => { hapticPatterns.tap(); setShowModal(true); }}
                whileTap={{ scale: 0.98 }}
                style={{
                    background: 'var(--color-surface)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    borderRadius: 20,
                    border: '0.5px solid var(--color-border)',
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
                <div style={{ position: 'relative', zIndex: 1, padding: 12 }}>
                    {/* Match Header - Same layout as compact: date left, buttons right */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                {dayName.slice(0, 3)} {dateNum} {monthName}
                            </span>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-text-tertiary)' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                {timeStr}
                            </span>
                        </div>

                        {/* Response Buttons - Top right like compact variant */}
                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <HeaderResponseButton type="yes" selected={myStatus === 'Present'} loading={updating === 'Present'} onClick={() => handleStatusUpdate('Present')} />
                            <HeaderResponseButton type="maybe" selected={myStatus === 'Maybe'} loading={updating === 'Maybe'} onClick={() => handleStatusUpdate('Maybe')} />
                            <HeaderResponseButton type="no" selected={myStatus === 'NotPresent'} loading={updating === 'NotPresent'} onClick={() => handleStatusUpdate('NotPresent')} />
                        </div>
                    </div>

                    {/* Teams with VS Badge - Original vertical layout */}
                    {team2 ? (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                background: 'var(--color-bg-elevated)',
                                borderRadius: 20,
                                padding: '10px 14px',
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
                                    <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border)' }} />
                                    <div style={{
                                        padding: '5px 12px',
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #30d158 0%, #25a847 100%)',
                                        boxShadow: '0 2px 6px rgba(48, 209, 88, 0.25)',
                                    }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>VS</span>
                                    </div>
                                    <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border)' }} />
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
                            marginBottom: 16,
                            fontSize: '1.3rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            textAlign: 'center',
                            lineHeight: 1.3,
                        }}>
                            {team1}
                        </div>
                    )}

                    {/* Countdown - Centered where buttons used to be */}
                    {!isPast && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 4,
                            marginBottom: 12,
                            padding: '8px 16px',
                            background: 'rgba(48, 209, 88, 0.1)',
                            borderRadius: 12,
                            border: '1px solid rgba(48, 209, 88, 0.15)',
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#30d158', letterSpacing: '0.02em' }}>
                                {countdown.days > 0 ? (
                                    // More than 1 day: show days and hours
                                    <>{countdown.days}d {countdown.hours}h</>
                                ) : countdown.hours > 0 ? (
                                    // Less than 1 day: show hours and minutes
                                    <>{countdown.hours}h {countdown.mins}m</>
                                ) : (
                                    // Less than 1 hour: show minutes and seconds
                                    <>{countdown.mins}m {countdown.secs}s</>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Squad Preview - Conditional based on showFullNames setting */}
                    {showFullNames ? (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--color-border-subtle)' }}>
                            <SquadNamesList
                                present={present}
                                maybe={maybe}
                                notPresent={roster.filter(p => p.status === 'NotPresent')}
                                unknown={roster.filter(p => p.status === 'Unknown')}
                                currentPlayerId={currentPlayerId}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--color-border-subtle)' }}>
                            <PlayerAvatars players={[...present, ...maybe].slice(0, 4)} currentPlayerId={currentPlayerId} size="sm" />
                            {present.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{present.length} in</span>
                            )}
                            {maybe.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>+{maybe.length}</span>
                            )}
                        </div>
                    )}

                    {/* Tap hint - Bottom right like compact variant */}
                    <div style={{ marginTop: 4, textAlign: 'right' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Tap for details</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <MatchModal match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} onClose={() => setShowModal(false)} />
                )}
            </motion.div>
        );
    }

    // COMPACT VARIANT - OPTIMIZED (with hero card styling)
    const compactDateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

    return (
        <motion.div
            onClick={() => { hapticPatterns.tap(); setShowModal(true); }}
            whileTap={{ scale: 0.98 }}
            style={{
                background: 'var(--color-surface)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
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
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-success)', letterSpacing: '0.03em', flexShrink: 0 }}>
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
            <h3 style={{
                fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, marginBottom: 6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {match.name.replace(/-/g, ' – ')}
            </h3>

            {/* Squad count - Compact (with showFullNames support) */}
            {showFullNames ? (
                <div style={{ marginTop: 4, paddingTop: 6, borderTop: '0.5px solid var(--color-border-subtle)' }}>
                    <SquadNamesList
                        present={present}
                        maybe={maybe}
                        notPresent={roster.filter(p => p.status === 'NotPresent')}
                        unknown={roster.filter(p => p.status === 'Unknown')}
                        currentPlayerId={currentPlayerId}
                    />
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingTop: 6, borderTop: '0.5px solid var(--color-border-subtle)' }}>
                    <PlayerAvatars players={present.slice(0, 3)} currentPlayerId={currentPlayerId} size="sm" />
                    {present.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{present.length} in</span>
                    )}
                    {maybe.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>+{maybe.length}</span>
                    )}
                </div>
            )}

            {/* Tap hint - Compact */}
            <div style={{ marginTop: 4, textAlign: 'right' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Tap for details</span>
            </div>

            {/* Modal */}
            {showModal && (
                <MatchModal match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} onClose={() => setShowModal(false)} />
            )}
        </motion.div>
    );
}
