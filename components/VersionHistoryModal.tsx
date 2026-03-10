'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import VersionHistoryContent from './VersionHistoryContent';

interface VersionHistoryModalProps {
    open: boolean;
    onClose: () => void;
}

export default function VersionHistoryModal({ open, onClose }: VersionHistoryModalProps) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hapticPatterns.tap();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--color-overlay)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            zIndex: 10020,
                        }}
                    />

                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10021,
                            display: 'flex',
                            alignItems: 'stretch',
                            justifyContent: 'center',
                            paddingTop: 'max(12px, var(--safe-top))',
                            paddingRight: 12,
                            paddingBottom: 'max(12px, var(--safe-bottom))',
                            paddingLeft: 12,
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 640,
                                height: '100%',
                                maxHeight: 'calc(100dvh - max(24px, var(--safe-top) + var(--safe-bottom)))',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 28,
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                boxShadow: 'var(--shadow-lg)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '16px 16px 14px',
                                    borderBottom: '1px solid var(--color-border-subtle)',
                                }}
                            >
                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onClose();
                                    }}
                                    aria-label="Close version history"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        minWidth: 0,
                                        padding: '8px 12px',
                                        borderRadius: 999,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <ArrowLeft size={16} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Back</span>
                                </button>

                                <div style={{ textAlign: 'center', minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: 'var(--color-accent)',
                                            marginBottom: 2,
                                        }}
                                    >
                                        Release Notes
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        Shotten Updates
                                    </div>
                                </div>
                                <div style={{ width: 82, flexShrink: 0 }} aria-hidden="true" />
                            </div>

                            <div
                                className="scrollbar-hide"
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px 20px calc(28px + var(--safe-bottom))',
                                }}
                            >
                                <VersionHistoryContent />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
