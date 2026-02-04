'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
import { usePlayers } from '@/lib/useConvexData';
import type { Player } from '@/lib/mockData';

interface PlayerSelectProps {
    onSelect: (id: string) => void;
}

export default function PlayerSelect({ onSelect }: PlayerSelectProps) {
    const { players, loading } = usePlayers();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filteredPlayers = useMemo(() => {
        return players.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [players, search]);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setTimeout(() => onSelect(id), 500);
    };

    return (
        <div className="container" style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingBottom: 'var(--space-2xl)',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ maxWidth: '28rem', margin: '0 auto', width: '100%' }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    {/* Logo */}
                    <motion.div
                        className="animate-float"
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 'var(--radius-xl)',
                            background: 'linear-gradient(135deg, var(--color-accent), var(--color-success))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--space-lg)',
                            boxShadow: '0 0 40px var(--color-accent-glow)',
                        }}
                    >
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>S</span>
                    </motion.div>

                    <span className="text-label" style={{
                        display: 'inline-block',
                        padding: 'var(--space-xs) var(--space-md)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: 'var(--space-md)',
                    }}>
                        Team Tracker
                    </span>

                    <h1 className="text-display" style={{ marginBottom: 'var(--space-sm)' }}>
                        Welcome to Shotten
                    </h1>
                    <p className="text-body">
                        Select your profile to continue
                    </p>
                </div>

                {/* Search */}
                <div className="glass-panel" style={{
                    padding: 'var(--space-sm)',
                    marginBottom: 'var(--space-lg)',
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search
                            size={20}
                            style={{
                                position: 'absolute',
                                left: 'var(--space-md)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-tertiary)',
                                pointerEvents: 'none',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: 'calc(var(--space-md) + 28px)' }}
                        />
                    </div>
                </div>

                {/* Player List */}
                <div style={{
                    maxHeight: 'calc(100dvh - 420px)',
                    overflowY: 'auto',
                    paddingRight: 'var(--space-xs)',
                }} className="scrollbar-hide">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="glass-panel skeleton"
                                    style={{ height: 72, opacity: 1 - i * 0.15 }}
                                />
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredPlayers.map((player, i) => (
                                <PlayerCard
                                    key={player.id}
                                    player={player}
                                    index={i}
                                    isSelected={selectedId === player.id}
                                    isDisabled={selectedId !== null && selectedId !== player.id}
                                    onSelect={() => handleSelect(player.id)}
                                />
                            ))}

                            {filteredPlayers.length === 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-caption"
                                    style={{ textAlign: 'center', padding: 'var(--space-xl)' }}
                                >
                                    No players found
                                </motion.p>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

interface PlayerCardProps {
    player: Player;
    index: number;
    isSelected: boolean;
    isDisabled: boolean;
    onSelect: () => void;
}

const PlayerCard = React.forwardRef<HTMLButtonElement, PlayerCardProps>(
    ({ player, index, isSelected, isDisabled, onSelect }, ref) => {
        return (
            <motion.button
                ref={ref}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{
                    opacity: isDisabled ? 0.3 : 1,
                    x: 0,
                    scale: isSelected ? 1.02 : 1,
                    filter: isDisabled ? 'blur(2px)' : 'none',
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                    delay: index * 0.03,
                    layout: { type: 'spring', stiffness: 400, damping: 30 }
                }}
                onClick={onSelect}
                disabled={isSelected || isDisabled}
                className={`glass-panel touch-target ${isSelected ? 'animate-pulse-glow status-present' : ''}`}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md) var(--space-lg)',
                    marginBottom: 'var(--space-sm)',
                    border: isSelected ? '1px solid var(--color-accent)' : undefined,
                    boxShadow: isSelected ? 'var(--shadow-glow)' : undefined,
                    cursor: isSelected || isDisabled ? 'default' : 'pointer',
                }}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                {/* Avatar */}
                <div
                    className="avatar avatar-md"
                    style={{
                        background: isSelected
                            ? 'var(--color-accent)'
                            : 'var(--color-surface)',
                        color: isSelected ? 'white' : 'var(--color-text-secondary)',
                    }}
                >
                    {player.name.charAt(0)}
                </div>

                {/* Name */}
                <span className="text-headline" style={{
                    color: isSelected ? 'white' : 'var(--color-text-primary)'
                }}>
                    {player.name}
                </span>
            </div>

            {/* Arrow / Check */}
            {isSelected ? (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--color-text-primary)',
                        color: 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <ChevronRight size={20} />
                </motion.div>
            ) : (
                <ChevronRight size={20} style={{ color: 'var(--color-text-tertiary)' }} />
            )}
        </motion.button>
        );
    }
);
PlayerCard.displayName = 'PlayerCard';
