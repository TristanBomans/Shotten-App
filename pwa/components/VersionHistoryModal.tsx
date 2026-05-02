'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import VersionHistoryContent from '@/components/VersionHistoryContent';

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
                            onClick={() => {
                                hapticPatterns.tap();
                                onClose();
                            }}
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
                                Version History
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: 'calc(var(--safe-top) + 72px) 16px calc(var(--safe-bottom, 0px) + 24px)',
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
