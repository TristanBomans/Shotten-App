'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, Users } from 'lucide-react';
import { useUpdateAttendance } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';
import type { MatchCardProps, RosterPlayer, AttendanceStatus } from './types';
import Confetti from './Confetti';
import { CompactResponse, HeaderResponseButton } from './ResponseButtons';
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

    // HERO VARIANT
    if (variant === 'hero') {
        const teams = match.name.split('-');
        const team1 = teams[0]?.trim() || match.name;
        const team2 = teams[1]?.trim();

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                    background: 'linear-gradient(165deg, rgba(40, 45, 55, 0.9) 0%, rgba(20, 22, 28, 0.95) 100%)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    borderRadius: 28,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Subtle gradient overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(48, 209, 88, 0.08) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }} />

                {/* Confetti */}
                <AnimatePresence>
                    {showConfetti && <Confetti />}
                </AnimatePresence>

                {/* Main Content */}
                <div style={{ position: 'relative', zIndex: 1, padding: 24 }}>
                    {/* Match Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                                    {dayName.slice(0, 3)} {dateNum} {monthName}
                                </span>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
                                    {timeStr}
                                </span>
                            </div>

                            {/* Countdown */}
                            {!isPast && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.8rem', fontWeight: 600, color: '#30d158' }}>
                                    {countdown.days > 0 && <span>{countdown.days}d </span>}
                                    <span>{String(countdown.hours).padStart(2, '0')}:</span>
                                    <span>{String(countdown.mins).padStart(2, '0')}:</span>
                                    <span style={{ opacity: 0.7 }}>{String(countdown.secs).padStart(2, '0')}</span>
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        {match.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MapPin size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{match.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Teams with VS Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                            <div style={{ fontSize: team2 ? '1.3rem' : '1.5rem', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>
                                {team1}
                            </div>
                        </div>

                        {team2 && (
                            <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: 'linear-gradient(135deg, #30d158 0%, #25a847 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                boxShadow: '0 4px 16px rgba(48, 209, 88, 0.3)',
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>VS</span>
                            </div>
                        )}

                        {team2 && (
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{team2}</div>
                            </div>
                        )}
                    </div>

                    {/* Response Buttons */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: 20, padding: 6, marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            <CompactResponse type="yes" selected={myStatus === 'Present'} loading={updating === 'Present'} onClick={() => handleStatusUpdate('Present')} />
                            <CompactResponse type="maybe" selected={myStatus === 'Maybe'} loading={updating === 'Maybe'} onClick={() => handleStatusUpdate('Maybe')} />
                            <CompactResponse type="no" selected={myStatus === 'NotPresent'} loading={updating === 'NotPresent'} onClick={() => handleStatusUpdate('NotPresent')} />
                        </div>
                    </div>

                    {/* Squad Preview */}
                    {showFullNames ? (
                        <SquadNamesList
                            present={present}
                            maybe={maybe}
                            notPresent={roster.filter(p => p.status === 'NotPresent')}
                            unknown={roster.filter(p => p.status === 'Unknown')}
                            currentPlayerId={currentPlayerId}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 0' }}>
                            <PlayerAvatars players={[...present, ...maybe].slice(0, 5)} currentPlayerId={currentPlayerId} size="sm" />
                            {present.length > 0 && (
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{present.length} going</span>
                            )}
                        </div>
                    )}

                    {/* More Info Button */}
                    <motion.button
                        onClick={() => { hapticPatterns.tap(); setShowModal(true); }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%', marginTop: 16, padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.06)', border: '0.5px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', color: 'white',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>View Squad & Details</span>
                        <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </motion.button>
                </div>

                {/* Modal */}
                {showModal && (
                    <MatchModal match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} onClose={() => setShowModal(false)} />
                )}
            </motion.div>
        );
    }

    // COMPACT VARIANT
    const compactDateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

    return (
        <motion.div
            onClick={() => { hapticPatterns.tap(); setShowModal(true); }}
            whileTap={{ scale: 0.98 }}
            style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: 24,
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                padding: 16,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#30d158', letterSpacing: '0.03em', flexShrink: 0 }}>
                    {compactDateStr} · {timeStr}
                </span>

                {/* Response Buttons */}
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <HeaderResponseButton type="yes" selected={myStatus === 'Present'} loading={updating === 'Present'} onClick={() => handleStatusUpdate('Present')} />
                    <HeaderResponseButton type="maybe" selected={myStatus === 'Maybe'} loading={updating === 'Maybe'} onClick={() => handleStatusUpdate('Maybe')} />
                    <HeaderResponseButton type="no" selected={myStatus === 'NotPresent'} loading={updating === 'NotPresent'} onClick={() => handleStatusUpdate('NotPresent')} />
                </div>
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, marginBottom: 8,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {match.name.replace(/-/g, ' – ')}
            </h3>

            {/* Squad count */}
            {showFullNames ? (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
                    <SquadNamesList
                        present={present}
                        maybe={maybe}
                        notPresent={roster.filter(p => p.status === 'NotPresent')}
                        unknown={roster.filter(p => p.status === 'Unknown')}
                        currentPlayerId={currentPlayerId}
                    />
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
                    <Users size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{present.length} in</span>
                    <PlayerAvatars players={present.slice(0, 3)} currentPlayerId={currentPlayerId} size="sm" />
                </div>
            )}

            {/* Tap hint */}
            <div style={{ marginTop: 4, textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Tap for details</span>
            </div>

            {/* Modal */}
            {showModal && (
                <MatchModal match={match} dateObj={dateObj} roster={roster} currentPlayerId={currentPlayerId} onClose={() => setShowModal(false)} />
            )}
        </motion.div>
    );
}
