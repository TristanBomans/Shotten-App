'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shirt, CalendarDays, Target, Shield, X, HandHelping } from 'lucide-react';
import { createPortal } from 'react-dom';
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

function StatChip({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string | number;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--color-bg-elevated)',
                border: '0.5px solid var(--color-border-subtle)',
            }}
        >
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgb(var(--color-accent-rgb) / 0.1)',
                    color: 'var(--color-accent)',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

function TeamStatsCard({ stats, teams }: { stats: ScraperTeamStats; teams: ScraperTeam[] }) {
    return (
        <div
            style={{
                borderRadius: 16,
                background: 'var(--color-bg-elevated)',
                border: '0.5px solid var(--color-border-subtle)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-surface-hover)',
                        color: 'var(--color-accent)',
                        flexShrink: 0,
                    }}
                >
                    <Shield size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {getTeamName(teams, stats.teamId)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <StatChip icon={<Shirt size={14} />} label="Number" value={stats.number ?? '-'} />
                <StatChip icon={<CalendarDays size={14} />} label="Matches" value={stats.gamesPlayed} />
                <StatChip icon={<Target size={14} />} label="Goals" value={stats.goals} />
                <StatChip icon={<HandHelping size={14} />} label="Assists" value={stats.assists} />
            </div>
        </div>
    );
}

export default function PlayerStatsDialog({ open, player, teams, onClose }: PlayerStatsDialogProps) {
    if (typeof document === 'undefined') return null;

    const playerStats = player?.teamStats || [];

    return createPortal(
        <AnimatePresence>
            {open && player && (
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
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
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
                            padding: 20,
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            style={{
                                width: '100%',
                                maxWidth: 400,
                                maxHeight: 'calc(100dvh - 80px)',
                                pointerEvents: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 24,
                                border: '0.5px solid var(--color-border)',
                                background: 'var(--color-surface)',
                                backdropFilter: 'blur(60px)',
                                WebkitBackdropFilter: 'blur(60px)',
                                boxShadow: '0 24px 80px var(--color-overlay)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    padding: '20px 20px 16px',
                                    borderBottom: '0.5px solid var(--color-border-subtle)',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase',
                                                color: 'var(--color-accent)',
                                                marginBottom: 4,
                                            }}
                                        >
                                            Player Statistics
                                        </div>
                                        <h2
                                            style={{
                                                fontSize: '1.4rem',
                                                fontWeight: 700,
                                                margin: 0,
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            {player.name}
                                        </h2>
                                    </div>

                                    <motion.button
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            onClose();
                                        }}
                                        whileTap={{ scale: 0.9 }}
                                        aria-label="Close player stats"
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 9999,
                                            border: 'none',
                                            background: 'var(--color-surface-hover)',
                                            color: 'var(--color-text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <X size={16} />
                                    </motion.button>
                                </div>

                                {/* Aggregated Stats */}
                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: 16,
                                        background: 'linear-gradient(135deg, rgb(var(--color-accent-rgb) / 0.15), rgb(var(--color-accent-rgb) / 0.05))',
                                        borderRadius: 14,
                                        border: '0.5px solid rgb(var(--color-accent-rgb) / 0.2)',
                                    }}
                                >
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>
                                                {player.goals}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Goals
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                                                {player.assists}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Assists
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                                {player.gamesPlayed}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Matches
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div
                                className="scrollbar-hide"
                                style={{
                                    overflowY: 'auto',
                                    padding: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                    flex: 1,
                                }}
                            >
                                {playerStats.length === 0 ? (
                                    <div
                                        style={{
                                            padding: 24,
                                            borderRadius: 16,
                                            background: 'var(--color-bg-elevated)',
                                            border: '0.5px solid var(--color-border-subtle)',
                                            color: 'var(--color-text-secondary)',
                                            textAlign: 'center',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        No team statistics found for this player.
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-tertiary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            By Team
                                        </div>
                                        {playerStats.map((stats) => (
                                            <TeamStatsCard key={stats.id} stats={stats} teams={teams} />
                                        ))}
                                    </>
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
