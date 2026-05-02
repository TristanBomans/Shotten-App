'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import VersionHistoryContent from '@/components/VersionHistoryContent';

interface VersionHistoryPageProps {
    open: boolean;
    onClose: () => void;
}

export default function VersionHistoryPage({ open, onClose }: VersionHistoryPageProps) {
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
                            Version History
                        </span>
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 24px)',
                        }}
                    >
                        <VersionHistoryContent />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
