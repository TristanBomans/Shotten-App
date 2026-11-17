'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBackClose } from '@/lib/navHistory';

interface SheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** The caller already keeps this sheet in the URL/history (e.g. a stack page). */
    historyManaged?: boolean;
    /** Stack the sheet above a full-screen page (pass that page's z-index + offset). */
    zIndex?: number;
}

/**
 * Bottom sheet on mobile, centered panel on desktop (via CSS).
 * Backdrop tap, close button, Escape and the system back gesture all dismiss.
 */
export default function Sheet({ open, onClose, title, subtitle, children, historyManaged = false, zIndex }: SheetProps) {
    useBackClose(open && !historyManaged, onClose);

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="backdrop"
                        style={zIndex !== undefined ? { zIndex } : undefined}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="sheet-root"
                        style={zIndex !== undefined ? { zIndex: zIndex + 1 } : undefined}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                    >
                        <div
                            className="sheet"
                            role="dialog"
                            aria-modal="true"
                            aria-label={title}
                        >
                            <div className="sheet-grabber" aria-hidden />
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 16px 12px',
                                    borderBottom: '1px solid var(--separator)',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <h2 style={{ fontSize: 'var(--fs-base)', fontWeight: 600, letterSpacing: '-0.01em' }}>
                                        {title}
                                    </h2>
                                    {subtitle && (
                                        <p className="t-caption" style={{ marginTop: 1 }}>
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                <button className="icon-action press" onClick={onClose} aria-label="Close">
                                    <X size={16} />
                                </button>
                            </div>
                            <div
                                className="scrollbar-hide"
                                style={{
                                    overflowY: 'auto',
                                    WebkitOverflowScrolling: 'touch',
                                    padding: 16,
                                }}
                            >
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
