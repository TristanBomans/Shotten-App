'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { RANKS } from '../StatsView';

interface RulesPageProps {
    open: boolean;
    onClose: () => void;
}

export default function RulesPage({ open, onClose }: RulesPageProps) {
    if (typeof document === 'undefined') return null;

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
                    onClick={() => {
                        hapticPatterns.tap();
                        onClose();
                    }}
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

                {/* Centered bold title */}
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
                            fontSize: '1.0625rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                        }}
                    >
                        How it works
                    </span>
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 'calc(var(--safe-top) + 84px) 20px calc(var(--safe-bottom, 0px) + 24px)',
                    }}
                >
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Points
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                            Start with <strong style={{ color: 'var(--color-text-primary)' }}>1000</strong> points.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <PointRow emoji="✅" label="Present" points="+50" color="var(--color-success)" />
                            <PointRow emoji="⚠️" label="Maybe" points="-20" color="var(--color-warning)" />
                            <PointRow emoji="❌" label="Absent" points="-50" color="var(--color-danger)" />
                            <PointRow emoji="👻" label="Ghost" points="-100" color="var(--color-text-tertiary)" />
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 10 }}>
                            Ranks
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {RANKS.map(rank => (
                                <div key={rank.name} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 10px', background: rank.bg, borderRadius: 8,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <rank.icon size={16} style={{ color: rank.color }} />
                                        <span style={{ color: rank.color, fontWeight: 500, fontSize: '0.85rem' }}>{rank.name}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{rank.minScore}+</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>,
        document.body
    );
}

function PointRow({ emoji, label, points, color }: { emoji: string; label: string; points: string; color: string }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px',
            background: 'var(--color-bg-elevated)',
            borderRadius: 8,
            border: '0.5px solid var(--color-border-subtle)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{emoji}</span>
                <span style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{label}</span>
            </div>
            <span style={{ fontWeight: 700, color, fontSize: '0.85rem' }}>{points}</span>
        </div>
    );
}
