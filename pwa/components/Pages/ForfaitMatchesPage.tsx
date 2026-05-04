'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Flag } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { API_BASE_URL } from '@/lib/config';
import type { Match } from '@/lib/mockData';
import { parseDate } from '@/lib/dateUtils';

interface ForfaitMatchesPageProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForfaitMatchesPage({ isOpen, onClose }: ForfaitMatchesPageProps) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchMatches();
        }
    }, [isOpen]);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches`);
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data = await res.json();
            data.sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMatches(data);
        } catch (e) {
            console.error('Failed to fetch matches for forfait:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleForfait = async (matchId: number, currentForfait: boolean) => {
        const newForfait = !currentForfait;

        // Optimistic update: update UI immediately
        setMatches(prev => prev.map(m =>
            m.id === matchId ? { ...m, forfait: newForfait } : m
        ));

        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forfait: newForfait }),
            });
            if (!res.ok) throw new Error('Failed to update forfait');

            hapticPatterns.success();
        } catch (e) {
            console.error('Failed to toggle forfait:', e);
            // Revert on error
            setMatches(prev => prev.map(m =>
                m.id === matchId ? { ...m, forfait: currentForfait } : m
            ));
            hapticPatterns.error();
        }
    };

    const handleClose = () => {
        hapticPatterns.tap();
        onClose();
    };

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
                    {/* Top fade gradient */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 'calc(var(--safe-top) + 92px)',
                            background: 'linear-gradient(to bottom, var(--color-bg) 25%, transparent 100%)',
                            pointerEvents: 'none',
                            zIndex: 4,
                        }}
                    />

                    {/* Back button */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClose}
                        aria-label="Back"
                        style={{
                            position: 'absolute',
                            top: 'calc(var(--safe-top) + 20px)',
                            left: 12,
                            zIndex: 5,
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

                    {/* Centered title */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 'calc(var(--safe-top) + 20px)',
                            left: 64,
                            right: 64,
                            height: 40,
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Forfait Matches
                        </span>
                    </div>

                    {/* Scrollable content */}
                    <div
                        className="scrollbar-hide"
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            paddingTop: 'calc(var(--safe-top) + 80px)',
                            paddingLeft: 16,
                            paddingRight: 16,
                            paddingBottom: 'calc(var(--safe-bottom) + 24px)',
                        }}
                    >
                        {loading ? (
                            <div
                                style={{
                                    padding: '40px 0',
                                    textAlign: 'center',
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Loading matches...
                            </div>
                        ) : matches.length === 0 ? (
                            <div
                                style={{
                                    padding: '40px 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                <Flag size={32} style={{ opacity: 0.4 }} />
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                    No matches found
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {matches.map((match) => {
                                    const matchDate = parseDate(match.date);
                                    const dateStr = matchDate
                                        ? matchDate.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                                        : match.date;
                                    const isUpcoming = matchDate ? matchDate.getTime() > Date.now() : false;

                                    return (
                                        <motion.div
                                            key={match.id}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => toggleForfait(match.id, match.forfait || false)}
                                            style={{
                                                padding: '14px 16px',
                                                background: match.forfait
                                                    ? 'rgb(var(--color-danger-rgb) / 0.12)'
                                                    : 'var(--color-glass)',
                                                backdropFilter: 'blur(20px)',
                                                WebkitBackdropFilter: 'blur(20px)',
                                                border: `0.5px solid ${match.forfait ? 'rgb(var(--color-danger-rgb) / 0.25)' : 'var(--color-border)'}`,
                                                borderRadius: 16,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: match.forfait ? 'var(--color-danger)' : 'var(--color-text-primary)',
                                                        fontSize: '0.95rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {match.name || 'Unnamed Match'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        color: 'var(--color-text-secondary)',
                                                        marginTop: 3,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span style={{
                                                        color: isUpcoming ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                                        fontWeight: isUpcoming ? 500 : 400,
                                                    }}>
                                                        {dateStr}
                                                    </span>
                                                    {isUpcoming && (
                                                        <span
                                                            style={{
                                                                fontSize: '0.6rem',
                                                                fontWeight: 700,
                                                                color: 'var(--color-accent)',
                                                                background: 'rgb(var(--color-accent-rgb) / 0.15)',
                                                                padding: '1px 5px',
                                                                borderRadius: 4,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.04em',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            Upcoming
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div
                                                style={{
                                                    width: 48,
                                                    height: 28,
                                                    borderRadius: 9999,
                                                    background: match.forfait ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                                                    opacity: match.forfait ? 1 : 0.35,
                                                    padding: 2,
                                                    flexShrink: 0,
                                                    transition: 'background 0.2s, opacity 0.2s',
                                                }}
                                            >
                                                <motion.div
                                                    animate={{ x: match.forfait ? 20 : 0 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        background: 'var(--color-bg)',
                                                        boxShadow: '0 2px 4px var(--color-overlay)',
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
