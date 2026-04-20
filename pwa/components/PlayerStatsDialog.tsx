'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Target, Users, Calendar, TrendingUp, Award, ChevronRight } from 'lucide-react';
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const teamCardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Reset carousel index when player changes
    useEffect(() => {
        setActiveTeamIndex(0);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'instant' });
        }
    }, [player?.externalId]);

    // Intersection Observer to track active team card
    useEffect(() => {
        if (!player?.teamStats || player.teamStats.length <= 1) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find(e => e.isIntersecting);
                if (visible) {
                    const index = parseInt(visible.target.getAttribute('data-index') || '0', 10);
                    if (index !== activeTeamIndex) {
                        hapticPatterns.tap();
                        setActiveTeamIndex(index);
                    }
                }
            },
            { root: scrollRef.current, threshold: 0.6 }
        );

        teamCardRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [activeTeamIndex, player?.teamStats]);

    const scrollToTeam = (index: number) => {
        if (scrollRef.current) {
            const left = index * scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    };

    const nextTeam = () => {
        if (activeTeamIndex < (player?.teamStats?.length || 0) - 1) {
            hapticPatterns.swipe();
            scrollToTeam(activeTeamIndex + 1);
        }
    };

    const prevTeam = () => {
        if (activeTeamIndex > 0) {
            hapticPatterns.swipe();
            scrollToTeam(activeTeamIndex - 1);
        }
    };

    if (typeof document === 'undefined') return null;

    const playerStats = player?.teamStats || [];
    const hasTeams = playerStats.length > 0;

    const avgGoals = player && player.gamesPlayed > 0 ? (player.goals / player.gamesPlayed).toFixed(2) : '0.00';
    const avgAssists = player && player.gamesPlayed > 0 ? (player.assists / player.gamesPlayed).toFixed(2) : '0.00';
    const contribution = player && player.gamesPlayed > 0 ? ((player.goals + player.assists) / player.gamesPlayed).toFixed(2) : '0.00';

    return createPortal(
        <AnimatePresence>
            {open && (
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
                                onClose();
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
                            Back
                        </motion.button>
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '1.05rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {player?.name || ''}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div
                        className="scrollbar-hide"
                        style={{
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                        }}
                    >
{/* Hero Section */}
                            <div
                                style={{
                                    padding: '20px 24px 16px',
                                }}
                            >
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                    {playerStats.length} Team{playerStats.length !== 1 ? 's' : ''} • {player?.gamesPlayed ?? 0} Games
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
                                        {player?.goals ?? 0}
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
                                        {player?.assists ?? 0}
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
                                {/* Team Breakdown Header */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 12,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: 'var(--color-text-tertiary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                        }}
                                    >
                                        Team Breakdown
                                    </div>
                                </div>

                                {/* Horizontal Scrollable Team Cards */}
                                <div
                                    ref={scrollRef}
                                    className="scrollbar-hide"
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        overflowX: 'auto',
                                        overflowY: 'hidden',
                                        scrollSnapType: 'x mandatory',
                                        scrollBehavior: 'smooth',
                                        marginBottom: 16,
                                    }}
                                >
                                    {playerStats.map((teamStat, index) => (
                                        <div
                                            key={teamStat.id}
                                            ref={(el) => { teamCardRefs.current[index] = el; }}
                                            data-index={index}
                                            style={{
                                                minWidth: '100%',
                                                scrollSnapAlign: 'center',
                                                scrollSnapStop: 'always',
                                                paddingRight: index < playerStats.length - 1 ? 12 : 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    background: 'linear-gradient(135deg, var(--color-surface-hover) 0%, rgb(var(--color-accent-rgb) / 0.05) 100%)',
                                                    borderRadius: 20,
                                                    padding: 20,
                                                    border: '0.5px solid var(--color-border)',
                                                }}
                                            >
                                                {/* Team Header */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                    {getTeamImage(teams, teamStat.teamId) ? (
                                                        <img
                                                            src={getTeamImage(teams, teamStat.teamId)}
                                                            alt={getTeamName(teams, teamStat.teamId)}
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
                                                                background: 'var(--color-accent)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '1.25rem',
                                                                fontWeight: 700,
                                                                color: '#ffffff',
                                                                boxShadow: '0 4px 12px rgb(var(--color-accent-rgb) / 0.25)',
                                                            }}
                                                        >
                                                            {getTeamName(teams, teamStat.teamId).charAt(0)}
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
                                                            {getTeamName(teams, teamStat.teamId)}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                                                            Jersey #{teamStat.number || '-'}
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
                                                    <TeamStat value={teamStat.gamesPlayed || 0} label="Games" />
                                                    <TeamStat value={teamStat.goals || 0} label="Goals" color="var(--color-success)" />
                                                    <TeamStat value={teamStat.assists || 0} label="Assists" color="var(--color-accent)" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Navigation */}
                                {playerStats.length > 1 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
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
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        hapticPatterns.tap();
                                                        scrollToTeam(idx);
                                                    }}
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        background: idx === activeTeamIndex ? 'var(--color-accent)' : 'var(--color-border)',
                                                        transition: 'all 0.2s',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
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
