'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 10020,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 600,
                            maxHeight: '85vh',
                            background: 'var(--color-bg)',
                            borderRadius: '24px 24px 0 0',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Drag Handle */}
                        <div
                            style={{
                                padding: '12px 0 8px',
                                display: 'flex',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 4,
                                    borderRadius: 2,
                                    background: 'var(--color-border)',
                                }}
                            />
                        </div>

                        {/* Header */}
                        <div
                            style={{
                                padding: '0 20px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid var(--color-border-subtle)',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                }}
                            >
                                What&apos;s New
                            </span>
                            <motion.button
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={18} />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '20px',
                            }}
                        >
                            <VersionHistoryContent />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
