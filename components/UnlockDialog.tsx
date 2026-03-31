'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { hapticPatterns } from '@/lib/haptic';

interface UnlockDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function UnlockDialog({ open, onConfirm, onCancel }: UnlockDialogProps) {
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
                            onCancel();
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
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20,
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                maxWidth: 320,
                                background: 'var(--color-surface)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                borderRadius: 20,
                                border: '0.5px solid var(--color-border)',
                                padding: 20,
                                boxShadow: 'var(--shadow-lg)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    marginBottom: 8,
                                }}
                            >
                                Hidden Admin Features
                            </div>
                            <div
                                style={{
                                    fontSize: '0.95rem',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: 20,
                                    lineHeight: 1.4,
                                }}
                            >
                                Want to unlock the secret feature?
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                }}
                            >
                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        onCancel();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 12,
                                        border: '1px solid var(--color-border)',
                                        background: 'transparent',
                                        color: 'var(--color-text-secondary)',
                                        fontWeight: 600,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    No
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: 'var(--color-accent)',
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Yes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
