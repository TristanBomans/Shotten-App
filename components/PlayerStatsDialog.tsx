'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Users, Calendar, TrendingUp, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import type { ScraperPlayer, ScraperTeam, ScraperTeamStats } from '@/lib/useData';

interface PlayerStatsDialogProps {
    open: boolean;
    player: ScraperPlayer | null;
    teams: ScraperTeam[];
    onClose: () => void;
}

function getTeamName(teams: ScraperTeam[], teamId: number): string {
    return teams.find((team) => team.externalId === teamId)?.name || `Team ${teamId}`;
}

function getTeamImage(teams: ScraperTeam[], teamId: number): string | undefined {
    return teams.find((team) => team.externalId === teamId)?.imageBase64;
}

export default function PlayerStatsDialog({ open, player, teams, onClose }: PlayerStatsDialogProps) {
    const [activeTeamIndex, setActiveTeamIndex] = useState(0);

    // Reset carousel index when player changes
    useEffect(() => {
        setActiveTeamIndex(0);
    }, [player?.externalId]);

    if (typeof document === 'undefined') return null;
    if (!player) return null;

    const playerStats = player.teamStats || [];
    const hasTeams = playerStats.length > 0;
    
    // Reset index if out of bounds
    const safeIndex = hasTeams && activeTeamIndex < playerStats.length ? activeTeamIndex : 0;
    const activeTeam = hasTeams ? playerStats[safeIndex] : null;
    
    const avgGoals = player.gamesPlayed > 0 ? (player.goals / player.gamesPlayed).toFixed(2) : '0.00';
    const avgAssists = player.gamesPlayed > 0 ? (player.assists / player.gamesPlayed).toFixed(2) : '0.00';
    const contribution = player.gamesPlayed > 0 ? ((player.goals + player.assists) / player.gamesPlayed).toFixed(2) : '0.00';

    const nextTeam = () => {
        if (activeTeamIndex < playerStats.length - 1) {
            hapticPatterns.swipe();
            setActiveTeamIndex(prev => prev + 1);
        }
    };

    const prevTeam = () => {
        if (activeTeamIndex > 0) {
            hapticPatterns.swipe();
            setActiveTeamIndex(prev => prev - 1);
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--color-overlay)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            zIndex: 10020,
                        }}
                    />

                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10021,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            padding: 16,
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            style={{
                                width: '100%',
                                maxWidth: 380,
                                maxHeight: 'calc(100dvh - 60px)',
                                display: 'flex',
                                flexDirection: 'column',
                                pointerEvents: 'auto',
                                background: 'var(--color-surface)',
                                borderRadius: 28,
                                border: '1px solid var(--color-border)',
                                boxShadow: '0 32px 96px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            {/* Close Button - Floating */}
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 12,
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'var(--color-text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <X size={18} />
                            </motion.button>

                            {/* Scrollable Content */}
                            <div
                                className="scrollbar-hide"
                                style={{
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {/* Hero Section */}
                                <div
                                    style={{
                                        padding: '32px 24px 24px',
                                        background: 'linear-gradient(180deg, rgb(var(--color-accent-rgb) / 0.12) 0%, transparent 100%)',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Player Initial Badge */}
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 24,
                                            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-secondary) 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2.5rem',
                                            fontWeight: 800,
                                            color: 'var(--color-bg)',
                                            marginBottom: 16,
                                            boxShadow: '0 8px 32px rgb(var(--color-accent-rgb) / 0.3)',
                                        }}
                                    >
                                        {player.name.charAt(0)}
                                    </div>

                                    {/* Player Name */}
                                    <h2
                                        style={{
                                            fontSize: '1.6rem',
                                            fontWeight: 800,
                                            color: 'var(--color-text-primary)',
                                            margin: 0,
                                            marginBottom: 4,
                                            letterSpacing: '-0.02em',
                                        }}
                                    >
                                        {player.name}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                        {playerStats.length} Team{playerStats.length !== 1 ? 's' : ''} • {player.gamesPlayed} Games
                                    </p>
                                </div>

                                {/* Big Stats */}
                                <div style={{ padding: '0 24px 24px' }}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1px 1fr',
                                            gap: 0,
                                            background: 'var(--color-surface-hover)',
                                            borderRadius: 20,
                                            padding: '24px 0',
                                            border: '0.5px solid var(--color-border)',
                                        }}
                                    >
                                        {/* Goals */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div
                                                style={{
                                                    fontSize: '3rem',
                                                    fontWeight: 900,
                                                    color: 'var(--color-success)',
                                                    lineHeight: 1,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {player.goals}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                <Target size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Goals</span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ background: 'var(--color-border)', width: 1 }} />

                                        {/* Assists */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div
                                                style={{
                                                    fontSize: '3rem',
                                                    fontWeight: 900,
                                                    color: 'var(--color-accent)',
                                                    lineHeight: 1,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {player.assists}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                <Users size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Assists</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Metrics */}
                                <div style={{ padding: '0 24px 24px' }}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: 8,
                                        }}
                                    >
                                        <MetricBox icon={<TrendingUp size={14} />} label="G/G" value={avgGoals} />
                                        <MetricBox icon={<Award size={14} />} label="A/G" value={avgAssists} />
                                        <MetricBox icon={<Calendar size={14} />} label="Contrib" value={contribution} />
                                    </div>
                                </div>

                                {/* Team Breakdown Section */}
                                {hasTeams && (
                                    <div style={{ padding: '0 24px 24px' }}>
                                        <div
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: 'var(--color-text-tertiary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                marginBottom: 12,
                                            }}
                                        >
                                            Team Breakdown
                                        </div>

                                        {/* Team Card */}
                                        <motion.div
                                            key={activeTeam?.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                background: 'linear-gradient(135deg, var(--color-surface-hover) 0%, rgb(var(--color-accent-rgb) / 0.05) 100%)',
                                                borderRadius: 20,
                                                padding: 20,
                                                border: '0.5px solid var(--color-border)',
                                            }}
                                        >
                                            {/* Team Header */}
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                {activeTeam && getTeamImage(teams, activeTeam.teamId) ? (
                                                    <img
                                                        src={getTeamImage(teams, activeTeam.teamId)}
                                                        alt={getTeamName(teams, activeTeam.teamId)}
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 14,
                                                            objectFit: 'cover',
                                                            border: '1px solid var(--color-border)',
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 14,
                                                            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '1.25rem',
                                                            fontWeight: 700,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {activeTeam ? getTeamName(teams, activeTeam.teamId).charAt(0) : '?'}
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontSize: '1.1rem',
                                                            fontWeight: 700,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {activeTeam ? getTeamName(teams, activeTeam.teamId) : 'Unknown Team'}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                                                        Jersey #{activeTeam?.number || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Team Stats Grid */}
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: 12,
                                                }}
                                            >
                                                <TeamStat value={activeTeam?.gamesPlayed || 0} label="Games" />
                                                <TeamStat value={activeTeam?.goals || 0} label="Goals" color="var(--color-success)" />
                                                <TeamStat value={activeTeam?.assists || 0} label="Assists" color="var(--color-accent)" />
                                            </div>
                                        </motion.div>

                                        {/* Navigation */}
                                        {playerStats.length > 1 && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginTop: 16,
                                                    gap: 12,
                                                }}
                                            >
                                                <motion.button
                                                    onClick={prevTeam}
                                                    disabled={activeTeamIndex === 0}
                                                    whileTap={activeTeamIndex > 0 ? { scale: 0.95 } : undefined}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 12,
                                                        border: 'none',
                                                        background: activeTeamIndex === 0 ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                                                        color: activeTeamIndex === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: activeTeamIndex === 0 ? 'not-allowed' : 'pointer',
                                                        opacity: activeTeamIndex === 0 ? 0.5 : 1,
                                                    }}
                                                >
                                                    <ChevronLeft size={20} />
                                                </motion.button>

                                                {/* Dots */}
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {playerStats.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                background: idx === activeTeamIndex ? 'var(--color-accent)' : 'var(--color-border)',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                <motion.button
                                                    onClick={nextTeam}
                                                    disabled={activeTeamIndex === playerStats.length - 1}
                                                    whileTap={activeTeamIndex < playerStats.length - 1 ? { scale: 0.95 } : undefined}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 12,
                                                        border: 'none',
                                                        background: activeTeamIndex === playerStats.length - 1 ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                                                        color: activeTeamIndex === playerStats.length - 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: activeTeamIndex === playerStats.length - 1 ? 'not-allowed' : 'pointer',
                                                        opacity: activeTeamIndex === playerStats.length - 1 ? 0.5 : 1,
                                                    }}
                                                >
                                                    <ChevronRight size={20} />
                                                </motion.button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* No Teams State */}
                                {!hasTeams && (
                                    <div
                                        style={{
                                            padding: '32px 24px',
                                            textAlign: 'center',
                                            color: 'var(--color-text-tertiary)',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>No team statistics available</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Player data may still be syncing</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div
            style={{
                padding: '14px 8px',
                background: 'var(--color-surface-hover)',
                borderRadius: 14,
                border: '0.5px solid var(--color-border-subtle)',
                textAlign: 'center',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{icon}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{value}</div>
        </div>
    );
}

function TeamStat({ value, label, color }: { value: number; label: string; color?: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--color-text-primary)', marginBottom: 2 }}>
                {value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                {label}
            </div>
        </div>
    );
}
