'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, Calendar, MapPin, UserCheck, X } from 'lucide-react';
import { useAllPlayers, useUpdateAttendance, getUseMockData } from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { hapticPatterns } from '@/lib/haptic';
import HeaderResponseButton from './MatchCard/ResponseButtons/HeaderResponseButton';
import type { Player, Match } from '@/lib/mockData';
import { parseDateToTimestamp } from '@/lib/dateUtils';

interface RespondAsPlayerSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'player' | 'matches';

export default function RespondAsPlayerSheet({ isOpen, onClose }: RespondAsPlayerSheetProps) {
    const [step, setStep] = useState<Step>('player');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [localMatches, setLocalMatches] = useState<Match[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

    const { players, loading: playersLoading, fetchAllPlayers } = useAllPlayers();
    const { updating, updateAttendance } = useUpdateAttendance();

    // Load players when dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchAllPlayers();
        } else {
            // Reset state when closing
            setStep('player');
            setSelectedPlayer(null);
            setLocalMatches([]);
            setMatchesLoading(false);
            setUpdatingMatchId(null);
        }
    }, [isOpen, fetchAllPlayers]);

    const fetchMatchesForPlayer = async (playerId: number) => {
        setMatchesLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches?playerId=${playerId}`);
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data = await res.json();
            data.sort((a: Match, b: Match) =>
                parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
            );
            // Filter to only upcoming matches (future + 2 hours buffer)
            const now = Date.now();
            const buffer = 2 * 60 * 60 * 1000;
            const upcoming = data.filter((m: Match) => parseDateToTimestamp(m.date) > now - buffer);
            setLocalMatches(upcoming);
        } catch {
            setLocalMatches([]);
        } finally {
            setMatchesLoading(false);
        }
    };

    const handleSelectPlayer = (player: Player) => {
        hapticPatterns.tap();
        setSelectedPlayer(player);
        setStep('matches');
        // Fetch matches for this player directly
        fetchMatchesForPlayer(player.id);
    };

    const handleBackToPlayers = () => {
        hapticPatterns.tap();
        setStep('player');
        setSelectedPlayer(null);
        setLocalMatches([]);
    };

    const handleResponse = async (matchId: number, status: 'Present' | 'NotPresent' | 'Maybe') => {
        if (!selectedPlayer) return;

        hapticPatterns.tap();
        setUpdatingMatchId(matchId);

        try {
            await updateAttendance(matchId, selectedPlayer.id, status, () => {
                hapticPatterns.success();
                // Update local state for immediate feedback
                setLocalMatches(prev =>
                    prev.map(match => {
                        if (match.id !== matchId) return match;
                        const updatedAttendances = match.attendances ? [...match.attendances] : [];
                        const existingIdx = updatedAttendances.findIndex(a => a.playerId === selectedPlayer.id);
                        if (existingIdx >= 0) {
                            updatedAttendances[existingIdx] = { ...updatedAttendances[existingIdx], status };
                        } else {
                            updatedAttendances.push({ playerId: selectedPlayer.id, status });
                        }
                        return { ...match, attendances: updatedAttendances };
                    })
                );
                // Notify other components that attendance was updated
                window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { matchId, playerId: selectedPlayer.id, status } }));
            });
        } catch {
            hapticPatterns.error();
        } finally {
            setUpdatingMatchId(null);
        }
    };

    const getPlayerStatus = (match: Match): 'Present' | 'NotPresent' | 'Maybe' | null => {
        if (!selectedPlayer) return null;
        const attendance = match.attendances?.find(a => a.playerId === selectedPlayer.id);
        return attendance?.status ?? null;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--color-bg)',
                        zIndex: 10020,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header with iOS-style back button */}
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 'calc(var(--safe-top) + 8px) 16px 12px',
                            borderBottom: '0.5px solid var(--color-border-subtle)',
                            background: 'var(--color-surface)',
                        }}
                    >
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                if (step === 'matches') {
                                    handleBackToPlayers();
                                } else {
                                    onClose();
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-accent)',
                                fontSize: '1.05rem',
                                fontWeight: 400,
                                cursor: 'pointer',
                                padding: '4px 8px 4px 0',
                                marginLeft: -4,
                            }}
                        >
                            <ChevronLeft size={28} strokeWidth={1.5} />
                            {step === 'matches' ? 'Back' : 'Close'}
                        </motion.button>
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '1.05rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                maxWidth: '55%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'center',
                                pointerEvents: 'none',
                            }}
                        >
                            {step === 'player' ? 'Select Player' : selectedPlayer?.name}
                        </div>
                        {step === 'matches' && (
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                style={{
                                    position: 'absolute',
                                    right: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-text-tertiary)',
                                    cursor: 'pointer',
                                    padding: 4,
                                    top: 'calc(var(--safe-top) + 12px)',
                                }}
                            >
                                <X size={22} strokeWidth={1.5} />
                            </motion.button>
                        )}
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px 20px',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'player' ? (
                                <motion.div
                                    key="player-step"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}
                                >
                                    {playersLoading ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                padding: '40px 0',
                                                color: 'var(--color-text-tertiary)',
                                            }}
                                        >
                                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                            Loading players...
                                        </div>
                                    ) : (
                                        players.map(player => (
                                            <motion.button
                                                key={player.id}
                                                onClick={() => handleSelectPlayer(player)}
                                                whileTap={{ scale: 0.98 }}
                                                style={{
                                                    padding: '14px 16px',
                                                    background: 'var(--color-surface-hover)',
                                                    border: '1px solid var(--color-border-subtle)',
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '50%',
                                                        background: 'var(--color-accent)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                            fontSize: '0.95rem',
                                                        }}
                                                    >
                                                        {player.name}
                                                    </div>
                                                </div>
                                                <UserCheck size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                                            </motion.button>
                                        ))
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="matches-step"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                    }}
                                >
                                    {matchesLoading ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                padding: '40px 0',
                                                color: 'var(--color-text-tertiary)',
                                            }}
                                        >
                                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                            Loading matches...
                                        </div>
                                    ) : localMatches.length === 0 ? (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                padding: '40px 0',
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚽</div>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                No upcoming matches
                                            </div>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                This player has no matches to respond to
                                            </div>
                                        </div>
                                    ) : (
                                        localMatches.map(match => {
                                            const status = getPlayerStatus(match);
                                            return (
                                                <div
                                                    key={match.id}
                                                    style={{
                                                        padding: '14px 16px',
                                                        background: 'var(--color-surface-hover)',
                                                        border: '1px solid var(--color-border-subtle)',
                                                        borderRadius: 12,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'flex-start',
                                                            marginBottom: 12,
                                                        }}
                                                    >
                                                        <div style={{ flex: 1 }}>
                                                            <div
                                                                style={{
                                                                    fontWeight: 600,
                                                                    color: 'var(--color-text-primary)',
                                                                    fontSize: '0.95rem',
                                                                    marginBottom: 6,
                                                                }}
                                                            >
                                                                {match.name}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    fontSize: '0.8rem',
                                                                    color: 'var(--color-text-secondary)',
                                                                    marginBottom: 4,
                                                                }}
                                                            >
                                                                <Calendar size={12} />
                                                                {formatDate(match.date)}
                                                            </div>
                                                            {match.location && (
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                        fontSize: '0.8rem',
                                                                        color: 'var(--color-text-secondary)',
                                                                    }}
                                                                >
                                                                    <MapPin size={12} />
                                                                    {match.location}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            gap: 16,
                                                            paddingTop: 8,
                                                            borderTop: '1px solid var(--color-border-subtle)',
                                                        }}
                                                    >
                                                        <HeaderResponseButton
                                                            type="yes"
                                                            selected={status === 'Present'}
                                                            loading={updatingMatchId === match.id && updating === 'Present'}
                                                            onClick={() => handleResponse(match.id, 'Present')}
                                                        />
                                                        <HeaderResponseButton
                                                            type="maybe"
                                                            selected={status === 'Maybe'}
                                                            loading={updatingMatchId === match.id && updating === 'Maybe'}
                                                            onClick={() => handleResponse(match.id, 'Maybe')}
                                                        />
                                                        <HeaderResponseButton
                                                            type="no"
                                                            selected={status === 'NotPresent'}
                                                            loading={updatingMatchId === match.id && updating === 'NotPresent'}
                                                            onClick={() => handleResponse(match.id, 'NotPresent')}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
