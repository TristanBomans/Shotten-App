'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MapPin, Calendar, Check, X, HelpCircle, Users, ChevronRight, CalendarPlus, Loader2, Trophy, Target, UserCircle, Map } from 'lucide-react';
import { useUpdateAttendance, findScraperTeamByName, fetchScraperPlayers, type ScraperTeam, type ScraperPlayer } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import type { Match, Player } from '@/lib/mockData';
import { API_BASE_URL } from '@/lib/config';
import { parseDate, parseDateToTimestamp } from '@/lib/dateUtils';

interface MatchCardProps {
    match: Match;
    currentPlayerId: number;
    allPlayers: Player[];
    onUpdate: (matchId: number, newStatus: 'Present' | 'NotPresent' | 'Maybe') => void;
    variant: 'hero' | 'compact';
}

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

        // Listen for changes to showFullNames setting
        const handleShowFullNamesChanged = (event: Event) => {
            const customEvent = event as CustomEvent<boolean>;
            setShowFullNames(customEvent.detail);
        };

        window.addEventListener('showFullNamesChanged', handleShowFullNamesChanged);

        return () => {
            window.removeEventListener('showFullNamesChanged', handleShowFullNamesChanged);
        };
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
    const roster = teamPlayers.map(player => {
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
    const timeStr = dateObj.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const handleStatusUpdate = async (status: 'Present' | 'NotPresent' | 'Maybe') => {
        if (myStatus === status) return;

        // Trigger haptic feedback on status change
        if (status === 'Present') {
            hapticPatterns.success();
        } else {
            hapticPatterns.tap();
        }

        try {
            await updateAttendance(match.id, currentPlayerId, status, () => {
                if (status === 'Present') {
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 1500);
                }
                onUpdate(match.id, status);
            });
        } catch {
            // Error handled in hook
        }
    };

    const mapUrl = match.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`
        : null;

    // HERO VARIANT - Completely redesigned from scratch
    // =========================================================================
    if (variant === 'hero') {
        // Parse team names
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

                    {/* Match Header - Date, Time, Location, Countdown */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 24,
                    }}>
                        {/* Top row: Date/Time + Countdown */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: 'white',
                                }}>
                                    {dayName.slice(0, 3)} {dateNum} {monthName}
                                </span>
                                <span style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.3)',
                                }} />
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    color: 'rgba(255,255,255,0.6)',
                                }}>
                                    {timeStr}
                                </span>
                            </div>

                            {/* Countdown - compact */}
                            {!isPast && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#30d158',
                                }}>
                                    {countdown.days > 0 && <span>{countdown.days}d </span>}
                                    <span>{String(countdown.hours).padStart(2, '0')}:</span>
                                    <span>{String(countdown.mins).padStart(2, '0')}:</span>
                                    <span style={{ opacity: 0.7 }}>{String(countdown.secs).padStart(2, '0')}</span>
                                </div>
                            )}
                        </div>

                        {/* Location row */}
                        {match.location && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}>
                                <MapPin size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255,255,255,0.4)',
                                }}>
                                    {match.location}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Teams with VS Badge - Centerpiece */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        marginBottom: 20,
                    }}>
                        {/* Team 1 */}
                        <div style={{
                            flex: 1,
                            textAlign: 'right',
                        }}>
                            <div style={{
                                fontSize: team2 ? '1.3rem' : '1.5rem',
                                fontWeight: 700,
                                color: 'white',
                                lineHeight: 1.1,
                            }}>
                                {team1}
                            </div>
                        </div>

                        {/* VS Badge */}
                        {team2 && (
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #30d158 0%, #25a847 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 4px 16px rgba(48, 209, 88, 0.3)',
                            }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    color: 'white',
                                    letterSpacing: '-0.02em',
                                }}>
                                    VS
                                </span>
                            </div>
                        )}

                        {/* Team 2 */}
                        {team2 && (
                            <div style={{
                                flex: 1,
                                textAlign: 'left',
                            }}>
                                <div style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    lineHeight: 1.1,
                                }}>
                                    {team2}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Response Section - Compact Pill Buttons */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 20,
                        padding: 6,
                        marginBottom: 16,
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 6,
                        }}>
                            <CompactResponse
                                type="yes"
                                selected={myStatus === 'Present'}
                                loading={updating === 'Present'}
                                onClick={() => handleStatusUpdate('Present')}
                            />
                            <CompactResponse
                                type="maybe"
                                selected={myStatus === 'Maybe'}
                                loading={updating === 'Maybe'}
                                onClick={() => handleStatusUpdate('Maybe')}
                            />
                            <CompactResponse
                                type="no"
                                selected={myStatus === 'NotPresent'}
                                loading={updating === 'NotPresent'}
                                onClick={() => handleStatusUpdate('NotPresent')}
                            />
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
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 0 0',
                        }}>
                            <PlayerAvatars
                                players={[...present, ...maybe].slice(0, 5)}
                                currentPlayerId={currentPlayerId}
                                size="sm"
                            />
                            {present.length > 0 && (
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255,255,255,0.5)',
                                }}>
                                    {present.length} going
                                </span>
                            )}
                        </div>
                    )}

                    {/* More Info Button - Opens unified modal */}
                    <motion.button
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowModal(true);
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%',
                            marginTop: 16,
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '0.5px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            color: 'white',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>View Squad & Details</span>
                        <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </motion.button>
                </div>

                {/* Unified Match Modal */}
                {showModal && (
                    <MatchModal
                        match={match}
                        dateObj={dateObj}
                        roster={roster}
                        currentPlayerId={currentPlayerId}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </motion.div>
        );
    }

    // =========================================================================
    // COMPACT VARIANT
    // =========================================================================
    const compactDateStr = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).toUpperCase();

    const handleCardClick = () => {
        hapticPatterns.tap();
        setShowModal(true);
    };

    return (
        <motion.div
            onClick={handleCardClick}
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
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
            }}>
                {/* Date/Time */}
                <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#30d158',
                    letterSpacing: '0.03em',
                    flexShrink: 0,
                }}>
                    {compactDateStr} · {timeStr}
                </span>

                {/* Response Buttons */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                    }}
                >
                    <HeaderResponseButton
                        type="yes"
                        selected={myStatus === 'Present'}
                        loading={updating === 'Present'}
                        onClick={() => handleStatusUpdate('Present')}
                    />
                    <HeaderResponseButton
                        type="maybe"
                        selected={myStatus === 'Maybe'}
                        loading={updating === 'Maybe'}
                        onClick={() => handleStatusUpdate('Maybe')}
                    />
                    <HeaderResponseButton
                        type="no"
                        selected={myStatus === 'NotPresent'}
                        loading={updating === 'NotPresent'}
                        onClick={() => handleStatusUpdate('NotPresent')}
                    />
                </div>
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'white',
                margin: 0,
                marginBottom: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {match.name.replace(/-/g, ' – ')}
            </h3>

            {/* Squad count display */}
            {showFullNames ? (
                <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <SquadNamesList
                        present={present}
                        maybe={maybe}
                        notPresent={roster.filter(p => p.status === 'NotPresent')}
                        unknown={roster.filter(p => p.status === 'Unknown')}
                        currentPlayerId={currentPlayerId}
                    />
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <Users size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        {present.length} in
                    </span>
                    <PlayerAvatars
                        players={present.slice(0, 3)}
                        currentPlayerId={currentPlayerId}
                        size="sm"
                    />
                </div>
            )}

            {/* Tap hint */}
            <div style={{
                marginTop: 4,
                textAlign: 'right',
            }}>
                <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.25)',
                    fontStyle: 'italic',
                }}>
                    Tap for details
                </span>
            </div>

            {/* Unified Match Modal */}
            {showModal && (
                <MatchModal
                    match={match}
                    dateObj={dateObj}
                    roster={roster}
                    currentPlayerId={currentPlayerId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </motion.div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

function CountdownPill({ value, unit, accent }: { value: number; unit: string; accent?: boolean }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            background: accent ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255,255,255,0.08)',
            padding: '4px 8px',
            borderRadius: 8,
        }}>
            <span style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: accent ? '#30d158' : 'white',
            }}>
                {String(value).padStart(2, '0')}
            </span>
            <span style={{
                fontSize: '0.65rem',
                color: accent ? '#30d158' : 'rgba(255,255,255,0.4)',
                fontWeight: 500,
            }}>
                {unit}
            </span>
        </div>
    );
}

function ResponseButton({
    type,
    selected,
    loading,
    onClick,
    compact = false
}: {
    type: 'yes' | 'maybe' | 'no';
    selected: boolean;
    loading: boolean;
    onClick: () => void;
    compact?: boolean;
}) {
    const config = {
        yes: {
            icon: <Check size={compact ? 18 : 22} />,
            color: '#30d158',
            bgSelected: 'rgba(48, 209, 88, 0.25)',
            borderSelected: 'rgba(48, 209, 88, 0.5)',
        },
        maybe: {
            icon: <HelpCircle size={compact ? 18 : 22} />,
            color: '#ffd60a',
            bgSelected: 'rgba(255, 214, 10, 0.15)',
            borderSelected: 'rgba(255, 214, 10, 0.4)',
        },
        no: {
            icon: <X size={compact ? 18 : 22} />,
            color: '#ff453a',
            bgSelected: 'rgba(255, 69, 58, 0.15)',
            borderSelected: 'rgba(255, 69, 58, 0.4)',
        },
    };

    const { icon, color, bgSelected, borderSelected } = config[type];

    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
            disabled={loading}
            style={{
                height: compact ? 48 : 56,
                border: 'none',
                borderRadius: 14,
                background: selected ? bgSelected : 'rgba(255, 255, 255, 0.06)',
                color: selected ? color : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: selected
                    ? `inset 0 0 0 1.5px ${borderSelected}`
                    : 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)',
            }}
        >
            {loading ? (
                <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icon}
        </motion.button>
    );
}

// Compact response button for new hero card design
function CompactResponse({ type, selected, loading, onClick }: {
    type: 'yes' | 'maybe' | 'no';
    selected: boolean;
    loading: boolean;
    onClick: () => void;
}) {
    const config = {
        yes: {
            icon: <Check size={18} />,
            color: '#30d158',
            bg: 'rgba(48, 209, 88, 0.2)',
        },
        maybe: {
            icon: <HelpCircle size={18} />,
            color: '#ffd60a',
            bg: 'rgba(255, 214, 10, 0.15)',
        },
        no: {
            icon: <X size={18} />,
            color: '#ff453a',
            bg: 'rgba(255, 69, 58, 0.15)',
        },
    };

    const { icon, color, bg } = config[type];

    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
            disabled={loading}
            style={{
                height: 44,
                border: 'none',
                borderRadius: 12,
                background: selected ? bg : 'rgba(255, 255, 255, 0.06)',
                color: selected ? color : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: selected
                    ? `inset 0 0 0 1.5px ${color}40`
                    : 'none',
            }}
        >
            {loading ? (
                <div style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icon}
        </motion.button>
    );
}

// Small inline button for compact card header
function HeaderResponseButton({
    type,
    selected,
    loading,
    onClick
}: {
    type: 'yes' | 'maybe' | 'no';
    selected: boolean;
    loading: boolean;
    onClick: () => void;
}) {
    const config = {
        yes: {
            icon: <Check size={14} />,
            color: '#30d158',
            bg: 'rgba(48, 209, 88, 0.25)',
        },
        maybe: {
            icon: <HelpCircle size={14} />,
            color: '#ffd60a',
            bg: 'rgba(255, 214, 10, 0.2)',
        },
        no: {
            icon: <X size={14} />,
            color: '#ff453a',
            bg: 'rgba(255, 69, 58, 0.2)',
        },
    };

    const { icon, color, bg } = config[type];

    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.9 }}
            disabled={loading}
            style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: 8,
                background: selected ? bg : 'rgba(255, 255, 255, 0.08)',
                color: selected ? color : 'rgba(255, 255, 255, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: selected ? `inset 0 0 0 1.5px ${color}50` : 'none',
            }}
        >
            {loading ? (
                <div style={{
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: color,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            ) : icon}
        </motion.button>
    );
}

function StatusText({ status }: { status: string }) {
    const config: Record<string, { text: string; color: string }> = {
        Present: { text: "You're in! 🔥", color: '#30d158' },
        Maybe: { text: 'On the fence 🤔', color: '#ffd60a' },
        NotPresent: { text: "Can't make it", color: '#ff453a' },
    };

    const cfg = config[status];
    if (!cfg) return null;

    return (
        <span style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: cfg.color
        }}>
            {cfg.text}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: React.ReactNode; color: string }> = {
        Present: { icon: <Check size={12} />, color: '#30d158' },
        Maybe: { icon: <HelpCircle size={12} />, color: '#ffd60a' },
        NotPresent: { icon: <X size={12} />, color: '#ff453a' },
    };

    const cfg = config[status];
    if (!cfg) return (
        <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
        }} />
    );

    return (
        <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: cfg.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: status === 'Present' ? 'black' : 'white',
        }}>
            {cfg.icon}
        </div>
    );
}

function PlayerAvatars({
    players,
    currentPlayerId,
    size = 'md',
}: {
    players: { id: number; name: string; status: string }[];
    currentPlayerId: number;
    size?: 'sm' | 'md';
}) {
    const dimensions = size === 'sm' ? 26 : 34;
    const fontSize = size === 'sm' ? '0.65rem' : '0.8rem';

    return (
        <div style={{ display: 'flex', marginLeft: 4 }}>
            {players.map((player, i) => {
                const color = player.status === 'Present' ? '#30d158' : '#ffd60a';
                const isMe = player.id === currentPlayerId;

                return (
                    <motion.div
                        key={player.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                            width: dimensions,
                            height: dimensions,
                            borderRadius: '50%',
                            background: color,
                            color: 'black',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize,
                            fontWeight: 700,
                            marginLeft: i > 0 ? -10 : 0,
                            border: isMe ? '2px solid white' : '2px solid rgba(20,20,25,0.9)',
                            boxShadow: isMe ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
                        }}
                        title={player.name}
                    >
                        {player.name.charAt(0)}
                    </motion.div>
                );
            })}
        </div>
    );
}

// Compact squad names list for when showFullNames is enabled
function SquadNamesList({
    present,
    maybe,
    notPresent,
    unknown,
    currentPlayerId,
}: {
    present: { id: number; name: string; status: string }[];
    maybe: { id: number; name: string; status: string }[];
    notPresent: { id: number; name: string; status: string }[];
    unknown: { id: number; name: string; status: string }[];
    currentPlayerId: number;
}) {
    const formatName = (player: { id: number; name: string }) => {
        const isMe = player.id === currentPlayerId;
        return isMe ? `${player.name} (you)` : player.name;
    };

    const formatList = (players: { id: number; name: string }[]) => {
        if (players.length === 0) return null;
        return players.map(formatName).join(', ');
    };

    return (
        <div style={{
            padding: '12px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }}>
            {present.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#30d158',
                        minWidth: 50,
                    }}>
                        Coming
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.7)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(present)}
                    </span>
                </div>
            )}
            {maybe.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#ffd60a',
                        minWidth: 50,
                    }}>
                        Maybe
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(maybe)}
                    </span>
                </div>
            )}
            {notPresent.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#ff453a',
                        minWidth: 50,
                    }}>
                        Out
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.4)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(notPresent)}
                    </span>
                </div>
            )}
            {unknown.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        minWidth: 50,
                    }}>
                        TBD
                    </span>
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.35)',
                        flex: 1,
                        lineHeight: 1.4,
                    }}>
                        {formatList(unknown)}
                    </span>
                </div>
            )}
            {present.length === 0 && maybe.length === 0 && notPresent.length === 0 && unknown.length === 0 && (
                <span style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.4)',
                }}>
                    No responses yet
                </span>
            )}
        </div>
    );
}

function Confetti() {
    const colors = ['#30d158', '#0a84ff', '#5e5ce6', '#ff453a', '#ffd60a'];

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 50,
        }}>
            {[...Array(25)].map((_, i) => {
                const angle = (i / 25) * Math.PI * 2;
                const distance = 100 + Math.random() * 150;

                return (
                    <motion.div
                        key={i}
                        initial={{
                            x: '50%',
                            y: '60%',
                            scale: 0,
                            opacity: 1
                        }}
                        animate={{
                            x: `calc(50% + ${Math.cos(angle) * distance}px)`,
                            y: `calc(60% + ${Math.sin(angle) * distance}px)`,
                            scale: [0, 1.5, 0],
                            opacity: [1, 1, 0],
                            rotate: Math.random() * 720,
                        }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: 8 + Math.random() * 6,
                            height: 8 + Math.random() * 6,
                            borderRadius: Math.random() > 0.5 ? '50%' : 2,
                            background: colors[i % colors.length],
                        }}
                    />
                );
            })}
        </div>
    );
}

function SquadModal({
    matchName,
    roster,
    currentPlayerId,
    onClose,
}: {
    matchName: string;
    roster: { id: number; name: string; status: string }[];
    currentPlayerId: number;
    onClose: () => void;
}) {
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const absent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    const statusGroups = [
        { title: 'Coming', players: present, color: '#30d158', emoji: '✅' },
        { title: 'Maybe', players: maybe, color: '#ffd60a', emoji: '🤔' },
        { title: 'Not Coming', players: absent, color: '#ff453a', emoji: '❌' },
        { title: 'No Response', players: unknown, color: 'rgba(255,255,255,0.4)', emoji: '❓' },
    ];

    // Use portal to render modal at document body level
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />

            {/* Modal Container */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    zIndex: 10001,
                    pointerEvents: 'none',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    style={{
                        width: '100%',
                        maxWidth: 360,
                        maxHeight: 'calc(100dvh - 100px)',
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: 'auto',
                        background: 'rgba(25, 25, 30, 0.98)',
                        backdropFilter: 'blur(60px)',
                        WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24,
                        border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header - Fixed at top */}
                    <div style={{
                        padding: '20px 20px 16px',
                        borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(25, 25, 30, 0.98)',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                margin: 0,
                                color: 'white',
                            }}>
                                Squad
                            </h2>
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 9999,
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                        <span style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255,255,255,0.4)',
                        }}>
                            {matchName.replace(/-/g, ' – ')}
                        </span>
                    </div>

                    {/* Player Groups - Scrollable */}
                    <div style={{
                        padding: '12px 20px 20px',
                        overflowY: 'auto',
                        flex: 1,
                    }}>
                        {statusGroups.map(({ title, players, color, emoji }) => (
                            players.length > 0 && (
                                <div key={title} style={{ marginBottom: 16 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 8,
                                    }}>
                                        <span>{emoji}</span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: color,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.03em',
                                        }}>
                                            {title} ({players.length})
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}>
                                        {players.map((player: { id: number; name: string; status: string }) => (
                                            <div
                                                key={player.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '10px 12px',
                                                    background: player.id === currentPlayerId
                                                        ? 'rgba(255, 255, 255, 0.08)'
                                                        : 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: 12,
                                                    border: player.id === currentPlayerId
                                                        ? '0.5px solid rgba(255, 255, 255, 0.15)'
                                                        : '0.5px solid transparent',
                                                }}
                                            >
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: color,
                                                    color: title === 'No Response' ? 'white' : 'black',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                }}>
                                                    {player.name.charAt(0)}
                                                </div>
                                                <span style={{
                                                    fontSize: '0.95rem',
                                                    fontWeight: player.id === currentPlayerId ? 600 : 400,
                                                    color: 'white',
                                                }}>
                                                    {player.name}
                                                    {player.id === currentPlayerId && (
                                                        <span style={{
                                                            marginLeft: 6,
                                                            fontSize: '0.75rem',
                                                            color: 'rgba(255,255,255,0.4)',
                                                        }}>
                                                            (you)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </motion.div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

// Match Details Modal - Calendar and Maps options
function MatchDetailsModal({ match, dateObj, onClose }: {
    match: Match;
    dateObj: Date;
    onClose: () => void;
}) {
    if (typeof document === 'undefined') return null;

    const mapUrl = match.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`
        : null;

    const appleMapUrl = match.location
        ? `https://maps.apple.com/?q=${encodeURIComponent(match.location)}`
        : null;

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(match.name)}&dates=${dateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(match.location || '')}`;

    const generateICS = () => {
        const startDate = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${match.name}
LOCATION:${match.location || ''}
END:VEVENT
END:VCALENDAR`;
        const blob = new Blob([ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${match.name.replace(/\s/g, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: 340, pointerEvents: 'auto',
                        background: 'rgba(25, 25, 30, 0.98)',
                        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24, border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)', overflow: 'hidden',
                    }}
                >
                    <div style={{ padding: 20, borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'white', marginBottom: 4 }}>
                                    Match Details
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{match.name}</p>
                            </div>
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32, height: 32, borderRadius: 9999, border: 'none',
                                    background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                    </div>

                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {match.location && (
                            <>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Location</div>
                                <ActionButton icon="📍" title="Apple Maps" subtitle={match.location} href={appleMapUrl!} />
                                <ActionButton icon="🗺️" title="Google Maps" subtitle="Get directions" href={mapUrl!} />
                            </>
                        )}
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 }}>Calendar</div>
                        <ActionButton icon="📅" title="Add to Calendar" subtitle="Download .ics file" onClick={generateICS} />
                        <ActionButton icon="📆" title="Google Calendar" subtitle="Opens in browser" href={calendarUrl} />
                    </div>
                </motion.div>
            </div>
        </>
    );
    return createPortal(modalContent, document.body);
}

// Icon Action Button for Modal Header
function IconActionButton({
    icon: Icon,
    label,
    onClick
}: {
    icon: any;
    label: string;
    onClick: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.9 }}
            aria-label={label}
            title={label}
            style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
            }}
        >
            <Icon size={18} />
        </motion.button>
    );
}

// Action Button Component for Modal
function ActionButton({ icon, title, subtitle, href, onClick }: { icon: string; title: string; subtitle: React.ReactNode; href?: string; onClick?: () => void }) {
    const content = (
        <motion.div whileTap={{ scale: 0.98 }} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14,
            background: 'rgba(255, 255, 255, 0.04)', borderRadius: 14,
            border: '0.5px solid rgba(255, 255, 255, 0.08)', cursor: 'pointer', textDecoration: 'none',
        }}>
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </motion.div>
    );
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{content}</a>;
    return <div onClick={onClick}>{content}</div>;
}

// Unified Match Modal with Tabs
function MatchModal({ match, dateObj, roster, currentPlayerId, onClose }: {
    match: Match;
    dateObj: Date;
    roster: { id: number; name: string; status: string }[];
    currentPlayerId: number;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'squad' | 'opponent'>('squad');
    const [showImage, setShowImage] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const squadRef = useRef<HTMLDivElement>(null);
    const opponentRef = useRef<HTMLDivElement>(null);

    // Intersection Observer to update tabs on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((e) => e.isIntersecting);
                if (visible) { // Allow update even during scroll for responsiveness
                    const view = visible.target.getAttribute('data-view') as 'squad' | 'opponent';
                    if (view && view !== activeTab) {
                        hapticPatterns.tap();
                        setActiveTab(view);
                    }
                }
            },
            {
                root: scrollRef.current,
                threshold: 0.6,
            }
        );

        if (squadRef.current) observer.observe(squadRef.current);
        if (opponentRef.current) observer.observe(opponentRef.current);

        return () => observer.disconnect();
    }, [activeTab]);

    const scrollToView = (view: 'squad' | 'opponent') => {
        if (scrollRef.current) {
            const left = view === 'squad' ? 0 : scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    };

    if (typeof document === 'undefined') return null;

    // Squad data
    const present = roster.filter(p => p.status === 'Present');
    const maybe = roster.filter(p => p.status === 'Maybe');
    const absent = roster.filter(p => p.status === 'NotPresent');
    const unknown = roster.filter(p => p.status === 'Unknown');

    const statusGroups = [
        { title: 'Coming', players: present, color: '#30d158', emoji: '✅' },
        { title: 'Maybe', players: maybe, color: '#ffd60a', emoji: '🤔' },
        { title: 'Not Coming', players: absent, color: '#ff453a', emoji: '❌' },
        { title: 'No Response', players: unknown, color: 'rgba(255,255,255,0.4)', emoji: '❓' },
    ];

    // Current user status for calendar
    const myStatus = roster.find(p => p.id === currentPlayerId)?.status;
    const calendarTitle = myStatus === 'Present' ? `${match.name} (Confirmed ✅)` : match.name;

    // Determine opponent team (the team that isn't ours)
    const ownTeams = ['FC Degradé', 'Wille ma ni kunne']; // Our teams
    const teams = match.name.split('-').map(t => t.trim());
    const opponentTeam = teams.find(t => !ownTeams.some(own =>
        t.toLowerCase().includes(own.toLowerCase()) || own.toLowerCase().includes(t.toLowerCase())
    )) || teams[1] || null;
    const ownTeam = teams.find(t => ownTeams.some(own =>
        t.toLowerCase().includes(own.toLowerCase()) || own.toLowerCase().includes(t.toLowerCase())
    )) || teams[0] || null;

    // State for opponent team data from scraper API
    const [opponentData, setOpponentData] = useState<ScraperTeam | null>(null);
    const [opponentPlayers, setOpponentPlayers] = useState<ScraperPlayer[]>([]);
    const [opponentMatches, setOpponentMatches] = useState<any[]>([]);
    const [loadingOpponent, setLoadingOpponent] = useState(false);
    const [ownTeamData, setOwnTeamData] = useState<ScraperTeam | null>(null);

    // Fetch opponent and own team data from our scraper API
    useEffect(() => {
        if (opponentTeam && activeTab === 'opponent') {
            setLoadingOpponent(true);

            const fetchTeamData = async () => {
                try {
                    // Fetch opponent team
                    const team = await findScraperTeamByName(opponentTeam);
                    if (team) {
                        setOpponentData(team);
                        // Fetch players
                        const players = await fetchScraperPlayers(team.externalId);
                        setOpponentPlayers(players.slice(0, 5)); // Top 5 players

                        // Fetch matches for recent form
                        const matchesRes = await fetch(`${API_BASE_URL}/api/lzv/matches?teamId=${team.externalId}`);
                        if (matchesRes.ok) {
                            const matchesData = await matchesRes.json();
                            setOpponentMatches(matchesData);
                        }
                    }

                    // Fetch own team data for comparison
                    if (ownTeam) {
                        const ownTeamResult = await findScraperTeamByName(ownTeam);
                        if (ownTeamResult) {
                            setOwnTeamData(ownTeamResult);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to fetch team data:', error);
                } finally {
                    setLoadingOpponent(false);
                }
            };

            fetchTeamData();
        }
    }, [opponentTeam, ownTeam, activeTab]);

    // Details data
    const mapUrl = match.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}` : null;
    const appleMapUrl = match.location ? `https://maps.apple.com/?q=${encodeURIComponent(match.location)}` : null;
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${dateObj.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(match.location || '')}`;

    // Calculate recent form from opponent matches
    const getRecentForm = () => {
        if (!opponentData || opponentMatches.length === 0) return [];

        const playedMatches = opponentMatches
            .filter((m: any) => m.status === 'Played')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return playedMatches.map((m: any) => {
            const isHome = m.homeTeam.toLowerCase().includes(opponentData.name.toLowerCase().slice(0, 5)) ||
                opponentData.name.toLowerCase().includes(m.homeTeam.toLowerCase().slice(0, 5));
            const teamScore = isHome ? m.homeScore : m.awayScore;
            const opponentScore = isHome ? m.awayScore : m.homeScore;

            if (teamScore > opponentScore) return 'W';
            if (teamScore < opponentScore) return 'L';
            return 'D';
        });
    };

    const recentForm = getRecentForm();

    const generateICS = () => {
        const startDate = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${startDate}\nDTEND:${endDate}\nSUMMARY:${calendarTitle}\nLOCATION:${match.location || ''}\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${match.name.replace(/\s/g, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const modalContent = (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    e.stopPropagation();
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, zIndex: 10001, pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: 360,
                        height: '90vh', maxHeight: 'calc(100dvh - 60px)',
                        display: 'flex', flexDirection: 'column',
                        pointerEvents: 'auto',
                        background: 'rgba(25, 25, 30, 0.98)',
                        backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24, border: '0.5px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)', overflow: 'hidden',
                    }}
                >
                    {/* Header - Clean, title-focused */}
                    <div style={{
                        padding: '20px 20px 16px',
                        borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'white', marginBottom: 6 }}>
                                    {match.name.replace(/-/g, ' vs ')}
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                    {dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {match.location && (
                                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: 4 }}>
                                        {match.location}
                                    </p>
                                )}
                            </div>
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32, height: 32, borderRadius: 9999, border: 'none',
                                    background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', padding: '12px 16px', gap: 8,
                        borderBottom: '0.5px solid rgba(255, 255, 255, 0.08)',
                    }}>
                        {(['squad', 'opponent'] as const).map(tab => (
                            <motion.button
                                key={tab}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    scrollToView(tab);
                                }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    flex: 1, padding: '10px 16px',
                                    background: activeTab === tab ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                    border: 'none', borderRadius: 10,
                                    color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.5)',
                                    fontSize: '0.85rem', fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {tab === 'squad' ? `Squad (${present.length + maybe.length})` : 'Opponent'}
                            </motion.button>
                        ))}
                    </div>

                    {/* Scrollable Container */}
                    <div
                        ref={scrollRef}
                        className="scrollbar-hide"
                        style={{
                            display: 'flex',
                            width: '100%',
                            flex: 1,
                            overflowX: 'auto',
                            scrollSnapType: 'x mandatory',
                            scrollBehavior: 'smooth',
                        }}
                    >
                        {/* Squad View */}
                        <div
                            ref={squadRef}
                            data-view="squad"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 16,
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {statusGroups.map(({ title, players, color, emoji }) => (
                                    players.length > 0 && (
                                        <div key={title}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <span>{emoji}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    {title} ({players.length})
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {players.map((player) => (
                                                    <div key={player.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        padding: '10px 12px',
                                                        background: player.id === currentPlayerId ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: 12,
                                                        border: player.id === currentPlayerId ? '0.5px solid rgba(255, 255, 255, 0.15)' : '0.5px solid transparent',
                                                    }}>
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            background: color,
                                                            color: title === 'No Response' ? 'white' : 'black',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                                                        }}>
                                                            {player.name.charAt(0)}
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: player.id === currentPlayerId ? 600 : 400,
                                                            color: 'white',
                                                        }}>
                                                            {player.name}
                                                            {player.id === currentPlayerId && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>(you)</span>}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                        {/* Opponent View */}
                        <div
                            ref={opponentRef}
                            data-view="opponent"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 16,
                                overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {opponentTeam && (
                                    <>
                                        {loadingOpponent ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: 'rgba(255,255,255,0.5)' }}>
                                                <Loader2 className="animate-spin" size={20} style={{ marginRight: 8 }} /> Loading team data...
                                            </div>
                                        ) : opponentData ? (
                                            <div style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 16,
                                                border: '0.5px solid rgba(255,255,255,0.1)',
                                                overflow: 'hidden',
                                            }}>
                                                {/* Team Header with Image */}
                                                <div style={{ display: 'flex', gap: 12, padding: 12 }}>
                                                    {opponentData.imageBase64 ? (
                                                        <img
                                                            src={opponentData.imageBase64}
                                                            alt={opponentData.name}
                                                            onClick={() => {
                                                                hapticPatterns.tap();
                                                                setShowImage(true);
                                                            }}
                                                            style={{
                                                                width: 64, height: 64,
                                                                borderRadius: 12,
                                                                objectFit: 'cover',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: 64, height: 64,
                                                            borderRadius: 12,
                                                            background: 'linear-gradient(135deg, #5e5ce6, #0a84ff)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '1.5rem', fontWeight: 700, color: 'white'
                                                        }}>
                                                            {opponentData.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                                                            {opponentData.name}
                                                        </div>
                                                        {opponentData.leagueName && (
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                                                {opponentData.leagueName}
                                                            </div>
                                                        )}
                                                        {opponentData.colors && (
                                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                                                🎨 {opponentData.colors}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Recent Form */}
                                                {recentForm.length > 0 && (
                                                    <div style={{ padding: '0 12px 12px 12px' }}>
                                                        <div style={{
                                                            fontSize: '0.7rem', fontWeight: 600,
                                                            color: 'rgba(255,255,255,0.4)',
                                                            textTransform: 'uppercase',
                                                            marginBottom: 8,
                                                        }}>
                                                            Recent Form
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {recentForm.map((result, i) => (
                                                                <div
                                                                    key={i}
                                                                    style={{
                                                                        width: 32, height: 32,
                                                                        borderRadius: 8,
                                                                        background: result === 'W' ? 'rgba(48, 209, 88, 0.2)' :
                                                                            result === 'L' ? 'rgba(255, 69, 58, 0.2)' :
                                                                                'rgba(255, 214, 10, 0.2)',
                                                                        color: result === 'W' ? '#30d158' :
                                                                            result === 'L' ? '#ff453a' : '#ffd60a',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    {result}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stats Grid */}
                                                {opponentData.rank !== undefined && (
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                                        gap: 1,
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: 1
                                                    }}>
                                                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffd60a' }}>#{opponentData.rank}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>RANK</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{opponentData.points || 0}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>PTS</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                                                                <span style={{ color: '#30d158' }}>{opponentData.wins || 0}</span>
                                                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                                                                <span style={{ color: '#ffd60a' }}>{opponentData.draws || 0}</span>
                                                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
                                                                <span style={{ color: '#ff453a' }}>{opponentData.losses || 0}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>W/D/L</div>
                                                        </div>
                                                        <div style={{ background: 'rgba(25,25,30,0.9)', padding: 10, textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (opponentData.goalDifference || 0) >= 0 ? '#30d158' : '#ff453a' }}>
                                                                {(opponentData.goalDifference || 0) >= 0 ? '+' : ''}{opponentData.goalDifference || 0}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>GD</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Manager & Description */}
                                                {(opponentData.manager || opponentData.description) && (
                                                    <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                                                        {opponentData.manager && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: opponentData.description ? 8 : 0 }}>
                                                                <UserCircle size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                                                    {opponentData.manager}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {opponentData.description && (
                                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                                                "{opponentData.description}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Top Players */}
                                                {opponentPlayers.length > 0 && (
                                                    <div style={{ padding: 12, borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase' }}>
                                                            Top Scorers
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {opponentPlayers.map((player, i) => (
                                                                <div key={player.externalId} style={{
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    padding: '6px 8px',
                                                                    background: i === 0 ? 'rgba(255,214,10,0.1)' : 'transparent',
                                                                    borderRadius: 8,
                                                                }}>
                                                                    <div style={{
                                                                        width: 24, height: 24, borderRadius: '50%',
                                                                        background: i === 0 ? '#ffd60a' : 'rgba(255,255,255,0.1)',
                                                                        color: i === 0 ? 'black' : 'white',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
                                                                    }}>
                                                                        {player.number || i + 1}
                                                                    </div>
                                                                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'white' }}>
                                                                        {player.name}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem' }}>
                                                                        <span style={{ color: '#30d158' }}>⚽ {player.goals}</span>
                                                                        <span style={{ color: '#0a84ff' }}>🎯 {player.assists}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Head-to-Head Comparison */}
                                                {ownTeamData && opponentData.rank !== undefined && ownTeamData.rank !== undefined && (() => {
                                                    const comparisons = [
                                                        { label: 'Rank', us: ownTeamData.rank, them: opponentData.rank, lowerIsBetter: true },
                                                        { label: 'Points', us: ownTeamData.points || 0, them: opponentData.points || 0, lowerIsBetter: false },
                                                        { label: 'Wins', us: ownTeamData.wins || 0, them: opponentData.wins || 0, lowerIsBetter: false },
                                                        { label: 'Goal Diff', us: ownTeamData.goalDifference || 0, them: opponentData.goalDifference || 0, lowerIsBetter: false },
                                                    ];

                                                    let usWins = 0;
                                                    let themWins = 0;
                                                    comparisons.forEach(c => {
                                                        const usAhead = c.lowerIsBetter ? c.us < c.them : c.us > c.them;
                                                        const themAhead = c.lowerIsBetter ? c.them < c.us : c.them > c.us;
                                                        if (usAhead) usWins++;
                                                        if (themAhead) themWins++;
                                                    });

                                                    let verdict = { text: 'Even match', emoji: '🤝', color: '#ffd60a', bg: 'rgba(255, 214, 10, 0.15)' };
                                                    if (usWins === 4) {
                                                        verdict = { text: 'Easy pickings', emoji: '🔥', color: '#30d158', bg: 'rgba(48, 209, 88, 0.2)' };
                                                    } else if (usWins >= 3) {
                                                        verdict = { text: 'Looking good', emoji: '💪', color: '#30d158', bg: 'rgba(48, 209, 88, 0.15)' };
                                                    } else if (themWins === 4) {
                                                        verdict = { text: 'Major challenge', emoji: '🚨', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.15)' };
                                                    } else if (themWins >= 3) {
                                                        verdict = { text: 'Tough match', emoji: '⚠️', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.15)' };
                                                    }

                                                    return (
                                                        <div style={{ padding: '12px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                                                            {/* Section Title + Verdict */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                marginBottom: 10,
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    color: 'rgba(255,255,255,0.4)',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                }}>
                                                                    Head to Head
                                                                </div>
                                                                <div style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: 12,
                                                                    background: verdict.bg,
                                                                    color: verdict.color,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                }}>
                                                                    <span>{verdict.emoji}</span>
                                                                    <span>{verdict.text}</span>
                                                                </div>
                                                            </div>

                                                            {/* Comparison Table */}
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: '1fr auto auto',
                                                                gap: '6px 8px',
                                                            }}>
                                                                {comparisons.map((stat) => {
                                                                    const usAhead = stat.lowerIsBetter ? stat.us < stat.them : stat.us > stat.them;
                                                                    const themAhead = stat.lowerIsBetter ? stat.them < stat.us : stat.them > stat.us;

                                                                    return (
                                                                        <div key={stat.label} style={{ display: 'contents' }}>
                                                                            <div
                                                                                style={{
                                                                                    fontSize: '0.8rem',
                                                                                    color: 'rgba(255,255,255,0.5)',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                }}
                                                                            >
                                                                                {stat.label}
                                                                            </div>
                                                                            <div
                                                                                style={{
                                                                                    padding: '6px 12px',
                                                                                    borderRadius: 8,
                                                                                    background: usAhead ? 'rgba(48, 209, 88, 0.15)' : 'transparent',
                                                                                    border: usAhead ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid transparent',
                                                                                    fontSize: '0.85rem',
                                                                                    fontWeight: 600,
                                                                                    color: usAhead ? '#30d158' : 'rgba(255,255,255,0.6)',
                                                                                    textAlign: 'center',
                                                                                    minWidth: 50,
                                                                                }}
                                                                            >
                                                                                {stat.label === 'Goal Diff' && stat.us > 0 ? '+' : ''}{stat.us}
                                                                            </div>
                                                                            <div
                                                                                style={{
                                                                                    padding: '6px 12px',
                                                                                    borderRadius: 8,
                                                                                    background: themAhead ? 'rgba(255, 69, 58, 0.15)' : 'transparent',
                                                                                    border: themAhead ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid transparent',
                                                                                    fontSize: '0.85rem',
                                                                                    fontWeight: 600,
                                                                                    color: themAhead ? '#ff453a' : 'rgba(255,255,255,0.6)',
                                                                                    textAlign: 'center',
                                                                                    minWidth: 50,
                                                                                }}
                                                                            >
                                                                                {stat.label === 'Goal Diff' && stat.them > 0 ? '+' : ''}{stat.them}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Link to LZV */}
                                                <a
                                                    href={`https://www.lzvcup.be/teams/detail/${opponentData.externalId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        padding: 12, gap: 6,
                                                        background: 'rgba(10,132,255,0.15)',
                                                        borderTop: '0.5px solid rgba(255,255,255,0.05)',
                                                        color: '#0a84ff', fontSize: '0.8rem', fontWeight: 600,
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    View on LZV Cup <ChevronRight size={14} />
                                                </a>
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: 16, textAlign: 'center',
                                                color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem'
                                            }}>
                                                Team data not available
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar + Close */}
                    <div style={{ padding: '12px 16px 16px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
                        {/* Quick Actions */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            {match.location && (
                                <motion.button
                                    onClick={() => window.open(mapUrl!, '_blank')}
                                    whileTap={{ scale: 0.96 }}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        padding: '10px 12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '0.5px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 10,
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <MapPin size={14} />
                                    Maps
                                </motion.button>
                            )}
                            <motion.button
                                onClick={() => window.open(calendarUrl, '_blank')}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 10,
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                <Calendar size={14} />
                                Add to Calendar
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
            {/* Full Screen Image Overlay */}
            <AnimatePresence>
                {showImage && opponentData?.imageBase64 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            setShowImage(false);
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10002, // Higher than modal (10001)
                            background: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            padding: 20
                        }}
                    >
                        <motion.img
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            src={opponentData.imageBase64}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                borderRadius: 16,
                                objectFit: 'contain'
                            }}
                        />
                        <button
                            onClick={() => {
                                hapticPatterns.tap();
                                setShowImage(false);
                            }}
                            style={{
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 36,
                                height: 36,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return createPortal(modalContent, document.body);
}
