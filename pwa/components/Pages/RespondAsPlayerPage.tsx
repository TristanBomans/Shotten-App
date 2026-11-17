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
import AwayChip from '../Absences/AwayChip';
import { isAutoDeclined } from '@/lib/absences';
import { ListSection, Row } from '../ui/ListSection';
import { Avatar, EmptyState, ResponseControl, type AttendanceStatus } from '../ui/controls';

interface RespondAsPlayerPageProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Scope the page to one match: list that match's squad with a response
     * control per player (captain tool from the match menu).
     */
    match?: Match | null;
}

type Step = 'player' | 'matches';

/** Only upcoming matches (future + 2 hours buffer). Called from event handlers. */
function filterUpcoming(matches: Match[]): Match[] {
    const now = Date.now();
    const buffer = 2 * 60 * 60 * 1000;
    return matches.filter((m) => parseDateToTimestamp(m.date) > now - buffer);
}

export default function RespondAsPlayerPage({ isOpen, onClose, match: scopedMatch = null }: RespondAsPlayerPageProps) {
    const [step, setStep] = useState<Step>('player');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [localMatches, setLocalMatches] = useState<Match[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

    const { players, loading: playersLoading, fetchAllPlayers } = useAllPlayers();
    const { updating, updateAttendance } = useUpdateAttendance();

    // Reset state when closing (adjusted during render)
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (!isOpen) {
            setStep('player');
            setSelectedPlayer(null);
            setLocalMatches([]);
            setMatchesLoading(false);
            setUpdatingMatchId(null);
        }
    }

    // Load players when dialog opens
    useEffect(() => {
        if (isOpen) fetchAllPlayers();
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
            setLocalMatches(filterUpcoming(data));
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
                            updatedAttendances[existingIdx] = { ...updatedAttendances[existingIdx], status, autoAbsenceId: null };
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

    if (scopedMatch) {
        return (
            <ScopedResponses
                isOpen={isOpen}
                onClose={onClose}
                match={scopedMatch}
                players={players}
                playersLoading={playersLoading}
                subtitle={formatDate(scopedMatch.date)}
            />
        );
    }

    return (
        <FlowPage
            open={isOpen}
            title={step === 'player' ? 'Respond as player' : selectedPlayer?.name || ''}
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
                                                        {selectedPlayer && isAutoDeclined(match, selectedPlayer.id) && <AwayChip />}
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

function ScopedResponses({
    isOpen,
    onClose,
    match,
    players,
    playersLoading,
    subtitle,
}: {
    isOpen: boolean;
    onClose: () => void;
    match: Match;
    players: Player[];
    playersLoading: boolean;
    subtitle: string;
}) {
    // Optimistic responses on top of what the match already had.
    const [overrides, setOverrides] = useState<Record<number, AttendanceStatus>>({});
    const [updatingPlayerId, setUpdatingPlayerId] = useState<number | null>(null);
    const { updating, updateAttendance } = useUpdateAttendance();

    const squad = players
        .filter(p => p.teamIds?.includes(match.teamId))
        .sort((a, b) => a.name.localeCompare(b.name));

    const statusOf = (playerId: number): AttendanceStatus | 'Unknown' =>
        overrides[playerId]
        ?? (match.attendances?.find(a => a.playerId === playerId)?.status as AttendanceStatus | undefined)
        ?? 'Unknown';

    const isAway = (playerId: number) =>
        overrides[playerId] === undefined
        && match.attendances?.some(a => a.playerId === playerId && a.status === 'NotPresent' && a.autoAbsenceId != null);

    const handleResponse = async (playerId: number, status: AttendanceStatus) => {
        hapticPatterns.tap();
        setUpdatingPlayerId(playerId);
        try {
            await updateAttendance(match.id, playerId, status, () => {
                hapticPatterns.success();
                setOverrides(prev => ({ ...prev, [playerId]: status }));
                window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { matchId: match.id, playerId, status } }));
            });
        } catch {
            hapticPatterns.error();
        } finally {
            setUpdatingPlayerId(null);
        }
    };

    return (
        <FlowPage
            open={isOpen}
            title={`Respond for players`}
            subtitle={`${match.name.replace(/-/g, ' vs ')} · ${subtitle}`}
            onBack={onClose}
        >
            {playersLoading && squad.length === 0 ? (
                <div className="flex-center" style={{ gap: 8, padding: '40px 0', color: 'var(--text-3)' }}>
                    <div className="spinner" />
                    Loading players...
                </div>
            ) : squad.length === 0 ? (
                <EmptyState title="No players in this team" />
            ) : (
                <ListSection label="Squad">
                    {squad.map(player => (
                        <div key={player.id} className="row row-static" style={{ minHeight: 52 }}>
                            <Avatar name={player.name} size="xs" />
                            <span
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 'var(--fs-sm)',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {player.name}
                            </span>
                            {isAway(player.id) && <AwayChip />}
                            <ResponseControl
                                status={statusOf(player.id)}
                                updating={updatingPlayerId === player.id ? (updating as AttendanceStatus | null) : null}
                                onSelect={(status) => handleResponse(player.id, status)}
                                size="sm"
                            />
                        </div>
                    ))}
                </ListSection>
            )}
        </FlowPage>
    );
}
