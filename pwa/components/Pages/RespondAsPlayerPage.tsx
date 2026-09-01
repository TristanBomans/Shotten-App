'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { useAllPlayers, useUpdateAttendance } from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { hapticPatterns } from '@/lib/haptic';
import type { Player, Match } from '@/lib/mockData';
import { parseDateToTimestamp, formatMatchDate, formatTimeSafe } from '@/lib/dateUtils';
import FlowPage from '../ui/FlowPage';
import { ListSection, Row } from '../ui/ListSection';
import { Avatar, EmptyState, ResponseControl, type AttendanceStatus } from '../ui/controls';

interface RespondAsPlayerPageProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'player' | 'matches';

export default function RespondAsPlayerPage({ isOpen, onClose }: RespondAsPlayerPageProps) {
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
        fetchMatchesForPlayer(player.id);
    };

    const handleBackToPlayers = () => {
        hapticPatterns.tap();
        setStep('player');
        setSelectedPlayer(null);
        setLocalMatches([]);
    };

    const handleResponse = async (matchId: number, status: AttendanceStatus) => {
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

    const getPlayerStatus = (match: Match): AttendanceStatus | null => {
        if (!selectedPlayer) return null;
        const attendance = match.attendances?.find(a => a.playerId === selectedPlayer.id);
        return (attendance?.status as AttendanceStatus | undefined) ?? null;
    };

    const formatDate = (dateStr: string) => {
        return `${formatMatchDate(dateStr)} · ${formatTimeSafe(dateStr)}`;
    };

    return (
        <FlowPage
            open={isOpen}
            title={step === 'player' ? 'Respond as Player' : selectedPlayer?.name || ''}
            subtitle={step === 'player' ? 'Pick who you are answering for' : 'Upcoming matches'}
            onBack={step === 'matches' ? handleBackToPlayers : onClose}
            onClose={step === 'matches' ? onClose : undefined}
        >
            <AnimatePresence mode="wait">
                {step === 'player' ? (
                    <motion.div
                        key="player-step"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.16 }}
                    >
                        {playersLoading ? (
                            <div className="flex-center" style={{ gap: 8, padding: '40px 0', color: 'var(--text-3)' }}>
                                <div className="spinner" />
                                Loading players...
                            </div>
                        ) : (
                            <ListSection label="Players">
                                {players.map(player => (
                                    <Row
                                        key={player.id}
                                        icon={<Avatar name={player.name} size="xs" />}
                                        title={player.name}
                                        chevron
                                        onClick={() => handleSelectPlayer(player)}
                                    />
                                ))}
                            </ListSection>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="matches-step"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.16 }}
                    >
                        {matchesLoading ? (
                            <div className="flex-center" style={{ gap: 8, padding: '40px 0', color: 'var(--text-3)' }}>
                                <div className="spinner" />
                                Loading matches...
                            </div>
                        ) : localMatches.length === 0 ? (
                            <EmptyState
                                icon={<Calendar size={20} />}
                                title="No upcoming matches"
                                description="This player has no matches to respond to."
                            />
                        ) : (
                            <div className="list-section">
                                {localMatches.map(match => {
                                    const status = getPlayerStatus(match);
                                    return (
                                        <div key={match.id} className="row row-static" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <p style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                                        {match.name}
                                                    </p>
                                                    <p
                                                        className="t-num"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 5,
                                                            marginTop: 3,
                                                            fontSize: 'var(--fs-2xs)',
                                                            color: 'var(--text-3)',
                                                        }}
                                                    >
                                                        <Calendar size={11} />
                                                        {formatDate(match.date)}
                                                    </p>
                                                    {match.location && (
                                                        <p
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 5,
                                                                marginTop: 2,
                                                                fontSize: 'var(--fs-2xs)',
                                                                color: 'var(--text-3)',
                                                            }}
                                                        >
                                                            <MapPin size={11} />
                                                            {match.location}
                                                        </p>
                                                    )}
                                                </div>
                                                <ResponseControl
                                                    status={status ?? 'Unknown'}
                                                    updating={updatingMatchId === match.id ? (updating as AttendanceStatus | null) : null}
                                                    onSelect={(s) => handleResponse(match.id, s)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </FlowPage>
    );
}
