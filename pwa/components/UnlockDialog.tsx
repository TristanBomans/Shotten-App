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
                        className="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ zIndex: 10030 }}
                        onClick={() => {
                            hapticPatterns.tap();
                            onCancel();
                        }}
                    />
                    <motion.div
                        className="dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-label="Hidden admin features"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={{ zIndex: 10031, textAlign: 'center' }}
                    >
                        <h2 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 6 }}>
                            Hidden Admin Features
                        </h2>
                        <p className="t-body" style={{ marginBottom: 18 }}>
                            Want to unlock the secret feature?
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                className="btn btn-quiet press"
                                style={{ flex: 1 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onCancel();
                                }}
                            >
                                No
                            </button>
                            <button
                                className="btn btn-primary press"
                                style={{ flex: 1 }}
                                onClick={onConfirm}
                            >
                                Yes
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
