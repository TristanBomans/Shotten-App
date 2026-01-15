'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { ScraperTeam } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';

interface LeagueSelectorProps {
    leagues: string[];
    selectedLeague: string;
    onSelect: (league: string) => void;
    teamsData: ScraperTeam[];
}

export default function LeagueSelector({ leagues, selectedLeague, onSelect, teamsData }: LeagueSelectorProps) {
    const [showModal, setShowModal] = useState(false);

    // Calculate stats per league
    const leagueStats = useMemo(() => {
        const stats: Record<string, { teamCount: number }> = {};
        leagues.forEach(league => {
            const teamCount = teamsData.filter(t => t.leagueName === league).length;
            stats[league] = { teamCount };
        });
        return stats;
    }, [leagues, teamsData]);

    const handleSelect = (league: string) => {
        hapticPatterns.tap();
        onSelect(league);
        setShowModal(false);
    };

    // ESC key to close modal
    useEffect(() => {
        if (!showModal) return;

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowModal(false);
            }
        };

        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [showModal]);

    if (typeof document === 'undefined') return null;

    return (
        <>
            {/* Trigger Button */}
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                    hapticPatterns.tap();
                    setShowModal(true);
                }}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
            >
                <span>{selectedLeague || 'Select League'}</span>
                <ChevronDown size={16} />
            </motion.button>

            {/* Modal */}
            {showModal && createPortal(
                <AnimatePresence>
                    <div>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                setShowModal(false);
                            }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.85)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                zIndex: 10000,
                            }}
                        />

                        {/* Modal Container */}
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            zIndex: 10001,
                            pointerEvents: 'none',
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: 420,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    pointerEvents: 'auto',
                                    background: 'rgba(25, 25, 30, 0.98)',
                                    backdropFilter: 'blur(60px)',
                                    WebkitBackdropFilter: 'blur(60px)',
                                    borderRadius: 24,
                                    border: '0.5px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8)',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    padding: '20px 20px 16px',
                                    borderBottom: '0.5px solid rgba(255,255,255,0.1)',
                                }}>
                                    <h2 style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        margin: 0,
                                        color: 'white',
                                    }}>
                                        Select League
                                    </h2>
                                </div>

                                {/* League List */}
                                <div
                                    className="scrollbar-hide"
                                    style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: '12px 16px',
                                    }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {leagues.map((league, index) => {
                                            const isSelected = league === selectedLeague;
                                            const stats = leagueStats[league];

                                            return (
                                                <motion.button
                                                    key={league}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{
                                                        delay: index * 0.02,
                                                        duration: 0.2,
                                                    }}
                                                    onClick={() => handleSelect(league)}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    style={{
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '14px 16px',
                                                        marginBottom: 8,
                                                        background: isSelected
                                                            ? 'rgba(255,255,255,0.1)'
                                                            : 'rgba(255,255,255,0.04)',
                                                        border: isSelected
                                                            ? '0.5px solid rgba(255,255,255,0.2)'
                                                            : '0.5px solid rgba(255,255,255,0.08)',
                                                        borderRadius: 12,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                                        <div style={{
                                                            fontSize: '0.95rem',
                                                            fontWeight: 600,
                                                            color: isSelected ? 'white' : 'rgba(255,255,255,0.9)',
                                                            marginBottom: 4,
                                                        }}>
                                                            {league}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: 'rgba(255,255,255,0.5)',
                                                        }}>
                                                            {stats.teamCount} {stats.teamCount === 1 ? 'team' : 'teams'}
                                                        </div>
                                                    </div>

                                                    {isSelected ? (
                                                        <Check size={20} style={{ color: 'white' }} />
                                                    ) : (
                                                        <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
