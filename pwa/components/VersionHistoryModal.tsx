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
                            What&apos;s New
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
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
