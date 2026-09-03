'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { usePlayers, useTeams, createPlayer } from '@/lib/useData';
import type { Player } from '@/lib/mockData';
import { Avatar, EmptyState } from './ui/controls';

interface PlayerSelectProps {
    onSelect: (id: number) => void;
}

export default function PlayerSelect({ onSelect }: PlayerSelectProps) {
    const { players, loading, fetchPlayers } = usePlayers();
    const { teams, fetchTeams } = useTeams();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerTeamIds, setNewPlayerTeamIds] = useState<number[]>([]);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        fetchPlayers();
        fetchTeams();
    }, [fetchPlayers, fetchTeams]);

    // Default: assign the first player to all teams once teams are loaded
    useEffect(() => {
        if (teams.length > 0 && newPlayerTeamIds.length === 0) {
            setNewPlayerTeamIds(teams.map((t) => t.id));
        }
    }, [teams, newPlayerTeamIds.length]);

    const isFirstUser = !loading && players.length === 0;

    const handleCreateFirstPlayer = async () => {
        const name = newPlayerName.trim();
        if (!name) {
            setCreateError('Vul je naam in.');
            return;
        }
        setCreating(true);
        setCreateError(null);
        try {
            const player = await createPlayer(name, newPlayerTeamIds);
            onSelect(player.id);
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : 'Aanmaken mislukt');
            setCreating(false);
        }
    };

    const filteredPlayers = useMemo(() => {
        return players.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [players, search]);

    const handleSelect = (id: number) => {
        setSelectedId(id);
        setTimeout(() => onSelect(id), 500);
    };

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                paddingTop: 'calc(var(--safe-top) + 48px)',
                paddingBottom: 'calc(var(--safe-bottom) + 24px)',
                paddingLeft: 'var(--screen-x)',
                paddingRight: 'var(--screen-x)',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                    maxWidth: 440,
                    margin: '0 auto',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {/* Wordmark */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <span
                        className="flex-center"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontWeight: 800,
                            fontSize: '1rem',
                        }}
                        aria-hidden
                    >
                        S
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', letterSpacing: '-0.01em' }}>
                        Shotten
                    </span>
                </div>

                <h1 className="t-display" style={{ marginBottom: 6 }}>
                    Who are you?
                </h1>
                <p className="t-body" style={{ marginBottom: 20 }}>
                    Select your profile to continue.
                </p>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-3)',
                            pointerEvents: 'none',
                        }}
                        aria-hidden
                    />
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="field"
                        aria-label="Search players"
                        style={{ paddingLeft: 40 }}
                    />
                </div>

                {/* Player list */}
                <div
                    className="scrollbar-hide"
                    style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
                >
                    {loading && players.length === 0 ? (
                        <div className="list-section">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="row row-static" style={{ minHeight: 56 }}>
                                    <div className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%' }} />
                                    <div className="skeleton" style={{ width: `${55 - i * 5}%`, height: 13, borderRadius: 4 }} />
                                </div>
                            ))}
                        </div>
                    ) : isFirstUser ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                            <EmptyState
                                title="Nog geen spelers"
                                description="Maak het eerste profiel aan om te starten."
                                compact
                            />
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Je naam</span>
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder="bv. Jan Janssens"
                                    className="field"
                                    aria-label="Je naam"
                                />
                            </label>
                            {teams.length > 1 && (
                                <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 8, border: 'none', padding: 0, margin: 0 }}>
                                    <legend style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 4 }}>
                                        Teams
                                    </legend>
                                    {teams.map((team) => (
                                        <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
                                            <input
                                                type="checkbox"
                                                checked={newPlayerTeamIds.includes(team.id)}
                                                onChange={(e) =>
                                                    setNewPlayerTeamIds((prev) =>
                                                        e.target.checked
                                                            ? [...prev, team.id]
                                                            : prev.filter((id) => id !== team.id)
                                                    )
                                                }
                                            />
                                            {team.name}
                                        </label>
                                    ))}
                                </fieldset>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCreateFirstPlayer}
                                disabled={creating}
                            >
                                {creating ? 'Aanmaken…' : 'Profiel aanmaken'}
                            </button>
                            {createError && (
                                <p style={{ color: 'var(--danger, #e11d48)', fontSize: 'var(--fs-sm)' }}>
                                    {createError}
                                </p>
                            )}
                        </div>
                    ) : filteredPlayers.length === 0 ? (
                        <EmptyState title="No players found" description="Try a different search." compact />
                    ) : (
                        <div className="list-section">
                            <AnimatePresence initial={false}>
                                {filteredPlayers.map((player) => (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        isSelected={selectedId === player.id}
                                        isDisabled={selectedId !== null && selectedId !== player.id}
                                        onSelect={() => handleSelect(player.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

interface PlayerRowProps {
    player: Player;
    isSelected: boolean;
    isDisabled: boolean;
    onSelect: () => void;
}

function PlayerRow({ player, isSelected, isDisabled, onSelect }: PlayerRowProps) {
    return (
        <motion.button
            layout
            exit={{ opacity: 0 }}
            animate={{ opacity: isDisabled ? 0.35 : 1 }}
            onClick={onSelect}
            disabled={isSelected || isDisabled}
            className="row"
            style={{
                minHeight: 56,
                background: isSelected ? 'var(--bg-subtle)' : undefined,
            }}
        >
            <Avatar name={player.name} size="sm" highlight={isSelected} />
            <span
                style={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    fontSize: 'var(--fs-sm)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                }}
            >
                {player.name}
            </span>
            {isSelected ? (
                <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex-center"
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--ok)',
                        color: '#000',
                        flexShrink: 0,
                    }}
                >
                    <Check size={13} strokeWidth={3} />
                </motion.span>
            ) : (
                <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
            )}
        </motion.button>
    );
}
