'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target, Users, Zap, TrendingUp, Crosshair, Percent } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import type { ScraperPlayer, ScraperTeam } from '@/lib/useData';

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

    useEffect(() => {
        setActiveTeamIndex(0);
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'instant' });
        }
    }, [player?.externalId]);

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
        teamCardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
        return () => observer.disconnect();
    }, [activeTeamIndex, player?.teamStats]);

    const scrollToTeam = (index: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    // Computed stats
    const computed = useMemo(() => {
        if (!player) return null;
        const gp = player.gamesPlayed || 0;
        const goals = player.goals || 0;
        const assists = player.assists || 0;
        const g90 = gp > 0 ? (goals / gp).toFixed(2) : '0.00';
        const a90 = gp > 0 ? (assists / gp).toFixed(2) : '0.00';
        const contrib = gp > 0 ? ((goals + assists) / gp).toFixed(2) : '0.00';
        const goalPct = (goals + assists) > 0 ? Math.round((goals / (goals + assists)) * 100) : 0;

        // Per-team best performer
        const teamStats = player.teamStats || [];
        const bestTeam = teamStats.length > 0
            ? teamStats.reduce((a, b) => (a.goals + a.assists) > (b.goals + b.assists) ? a : b)
            : null;

        return { gp, goals, assists, g90, a90, contrib, goalPct, bestTeam, teamStats };
    }, [player]);

    if (typeof document === 'undefined') return null;
    if (!computed || !player) return null;

    const { gp, goals, assists, g90, a90, contrib, goalPct, teamStats } = computed;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    style={{
                        position: 'fixed', inset: 0, background: 'var(--color-bg)',
                        zIndex: 10020, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}
                >
                    {/* Header: floating glass pills (back + title) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 'calc(var(--safe-top) + 8px) 12px 10px',
                        }}
                    >
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { hapticPatterns.tap(); onClose(); }}
                            aria-label="Back"
                            style={{
                                flexShrink: 0,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '0.5px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-lg)',
                            }}
                        >
                            <ChevronLeft size={22} strokeWidth={2} />
                        </motion.button>

                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '8px 14px',
                                borderRadius: 999,
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '0.5px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-lg)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1.2,
                                    width: '100%',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {player.name}
                            </div>
                            <div
                                style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--color-text-secondary)',
                                    lineHeight: 1.2,
                                    width: '100%',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {goals} goals · {assists} assists · {gp} games
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="scrollbar-hide" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1, paddingTop: 'calc(var(--safe-top) + 72px)' }}>

                        {/* Hero: Goals & Assists split */}
                        <div style={{ padding: '20px 20px 0' }}>
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                                background: 'var(--color-bg-elevated)', borderRadius: 20,
                                border: '0.5px solid var(--color-border)', overflow: 'hidden',
                            }}>
                                <div style={{ padding: '24px 16px', textAlign: 'center', borderRight: '0.5px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgb(var(--color-success-rgb) / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Target size={14} style={{ color: 'var(--color-success)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Goals</span>
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-success)', lineHeight: 1 }}>{goals}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 6 }}>{g90} per game</div>
                                </div>
                                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgb(var(--color-accent-rgb) / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={14} style={{ color: 'var(--color-accent)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Assists</span>
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{assists}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 6 }}>{a90} per game</div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics strip */}
                        <div style={{ padding: '12px 20px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                <MetricCard icon={<Zap size={14} />} label="Contributions" value={String(goals + assists)} sub={`${contrib}/game`} color="var(--color-warning)" />
                                <MetricCard icon={<Crosshair size={14} />} label="Games" value={String(gp)} sub={`${teamStats.length} team${teamStats.length !== 1 ? 's' : ''}`} color="var(--color-text-primary)" />
                                <MetricCard icon={<Percent size={14} />} label="Goal Share" value={`${goalPct}%`} sub="of G+A" color="var(--color-success)" />
                            </div>
                        </div>

                        {/* Goal/Assist ratio bar */}
                        <div style={{ padding: '16px 20px 0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>
                                Goal / Assist Split
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-hover)', overflow: 'hidden', display: 'flex' }}>
                                {goals > 0 && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${goalPct}%` }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                        style={{ height: '100%', background: 'var(--color-success)', borderRadius: '4px 0 0 4px' }}
                                    />
                                )}
                                {assists > 0 && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${100 - goalPct}%` }}
                                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                                        style={{ height: '100%', background: 'var(--color-accent)', borderRadius: '0 4px 4px 0' }}
                                    />
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 600 }}>⚽ {goals} goals</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-accent)', fontWeight: 600 }}>🎯 {assists} assists</span>
                            </div>
                        </div>

                        {/* Team Breakdown */}
                        {teamStats.length > 0 && (
                            <div style={{ padding: '20px 20px 0' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                                    Team Breakdown
                                </div>

                                {/* Carousel */}
                                <div ref={scrollRef} className="scrollbar-hide"
                                    style={{ display: 'flex', width: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', marginBottom: 12 }}>
                                    {teamStats.map((ts, index) => {
                                        const teamName = getTeamName(teams, ts.teamId);
                                        const teamImg = getTeamImage(teams, ts.teamId);
                                        const tGp = ts.gamesPlayed || 0;
                                        const tGoals = ts.goals || 0;
                                        const tAssists = ts.assists || 0;
                                        const tG90 = tGp > 0 ? (tGoals / tGp).toFixed(1) : '0';
                                        const tA90 = tGp > 0 ? (tAssists / tGp).toFixed(1) : '0';

                                        return (
                                            <div key={ts.id} ref={(el) => { teamCardRefs.current[index] = el; }} data-index={index}
                                                style={{ minWidth: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}>
                                                <div style={{
                                                    background: 'linear-gradient(135deg, var(--color-surface-hover) 0%, rgb(var(--color-accent-rgb) / 0.04) 100%)',
                                                    borderRadius: 20, padding: 20, border: '0.5px solid var(--color-border)',
                                                }}>
                                                    {/* Team header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                        {teamImg ? (
                                                            <img src={teamImg} alt={teamName} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                                                        ) : (
                                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                                                                {teamName.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{teamName}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>#{ts.number || '-'} · {tGp} games</div>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                                        <TeamStatCell value={tGoals} label="Goals" color="var(--color-success)" />
                                                        <TeamStatCell value={tAssists} label="Assists" color="var(--color-accent)" />
                                                        <TeamStatCell value={tG90} label="G/G" />
                                                        <TeamStatCell value={tA90} label="A/G" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {teamStats.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        {teamStats.map((_, idx) => (
                                            <button key={idx} onClick={() => { hapticPatterns.tap(); scrollToTeam(idx); }}
                                                style={{ width: idx === activeTeamIndex ? 16 : 6, height: 6, borderRadius: 3, background: idx === activeTeamIndex ? 'var(--color-accent)' : 'var(--color-border)', transition: 'all 0.2s', border: 'none', cursor: 'pointer', padding: 0 }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* No Teams State */}
                        {teamStats.length === 0 && (
                            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>No team statistics available</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Player data may still be syncing</div>
                            </div>
                        )}

                        {/* Bottom padding */}
                        <div style={{ height: 'calc(var(--safe-bottom, 0px) + 32px)' }} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function MetricCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
    return (
        <div style={{
            padding: '14px 8px', background: 'var(--color-bg-elevated)', borderRadius: 14,
            border: '0.5px solid var(--color-border)', textAlign: 'center',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>{icon}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>{sub}</div>
        </div>
    );
}

function TeamStatCell({ value, label, color }: { value: number | string; label: string; color?: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: color || 'var(--color-text-primary)', marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
}
