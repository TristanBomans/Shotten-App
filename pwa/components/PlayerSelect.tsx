'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { usePlayers, useTeams, createPlayer } from '@/lib/useData';
import type { Player } from '@/lib/mockData';
import { useLanguage } from '@/lib/i18n';
import { hapticPatterns } from '@/lib/haptic';
import { Avatar, EmptyState } from './ui/controls';

interface PlayerSelectProps {
    onSelect: (id: number) => void;
}

export default function PlayerSelect({ onSelect }: PlayerSelectProps) {
    const { players, loading, fetchPlayers } = usePlayers();
    const { teams, fetchTeams } = useTeams();
    const { t } = useLanguage();
    // The last profile used on this device, remembered across sign-outs so the
    // picker can pin it at the top of the list.
    const [lastPlayerId, setLastPlayerId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerTeamIds, setNewPlayerTeamIds] = useState<number[]>([]);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        fetchPlayers();
        fetchTeams();
        const storedLast = localStorage.getItem('lastPlayerId');
        if (storedLast) setLastPlayerId(parseInt(storedLast, 10));
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
            setCreateError(t('ps.enterNameError'));
            return;
        }
        setCreating(true);
        setCreateError(null);
        try {
            const player = await createPlayer(name, newPlayerTeamIds);
            onSelect(player.id);
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : t('ps.createFailed'));
            setCreating(false);
        }
    };

    const filteredPlayers = useMemo(() => {
        const matching = players.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
        // Keep the original order, but float the last-used profile to the top.
        if (lastPlayerId === null) return matching;
        return [...matching].sort((a, b) => {
            if (a.id === lastPlayerId) return -1;
            if (b.id === lastPlayerId) return 1;
            return 0;
        });
    }, [players, search, lastPlayerId]);

    const handleSelect = (id: number) => {
        hapticPatterns.success();
        setSelectedId(id);
        // Short beat so the check + welcome confirmation is visible before we move on.
        setTimeout(() => onSelect(id), 800);
    };

    // Confirmation: once a row is tapped, the header greets the chosen player.
    const selectedPlayerName = players.find(p => p.id === selectedId)?.name;

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
                            fontWeight: 600,
                            fontSize: '1rem',
                        }}
                        aria-hidden
                    >
                        S
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-base)', letterSpacing: '-0.01em' }}>
                        Shotten
                    </span>
                </div>

                {selectedPlayerName ? (
                    <>
                        <h1 className="t-display" style={{ marginBottom: 6 }}>
                            {t('ps.welcome', { name: selectedPlayerName })}
                        </h1>
                        <p className="t-body" style={{ marginBottom: 20 }}>
                            {t('ps.selectToContinue')}
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="t-display" style={{ marginBottom: 6 }}>
                            {t('ps.whoAreYou')}
                        </h1>
                        <p className="t-body" style={{ marginBottom: 20 }}>
                            {t('ps.selectToContinue')}
                        </p>
                    </>
                )}

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
                        placeholder={t('ps.search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="field"
                        aria-label={t('ps.search')}
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
                                title={t('ps.firstPlayerTitle')}
                                description={t('ps.firstPlayerDesc')}
                                compact
                            />
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{t('ps.yourName')}</span>
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    placeholder={t('ps.namePlaceholder')}
                                    className="field"
                                    aria-label={t('ps.yourName')}
                                />
                            </label>
                            {teams.length > 1 && (
                                <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 8, border: 'none', padding: 0, margin: 0 }}>
                                    <legend style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 4 }}>
                                        {t('ps.teams')}
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
                                {creating ? t('ps.creating') : t('ps.createProfile')}
                            </button>
                            {createError && (
                                <p style={{ color: 'var(--no)', fontSize: 'var(--fs-sm)' }}>
                                    {createError}
                                </p>
                            )}
                        </div>
                    ) : filteredPlayers.length === 0 ? (
                        <EmptyState title={t('ps.noPlayersFound')} description={t('ps.noPlayersDesc')} compact />
                    ) : (
                        <div className="list-section">
                            <AnimatePresence initial={false}>
                                {filteredPlayers.map((player) => (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        isSelected={selectedId === player.id}
                                        isDisabled={selectedId !== null && selectedId !== player.id}
                                        isLastUsed={player.id === lastPlayerId && selectedId === null}
                                        lastUsedLabel={t('ps.lastUsed')}
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
    isLastUsed: boolean;
    lastUsedLabel: string;
    onSelect: () => void;
}

function PlayerRow({ player, isSelected, isDisabled, isLastUsed, lastUsedLabel, onSelect }: PlayerRowProps) {
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
            {isLastUsed && (
                <span className="chip" data-tone="accent" style={{ flexShrink: 0 }}>{lastUsedLabel}</span>
            )}
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
