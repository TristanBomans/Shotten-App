'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, X } from 'lucide-react';

interface FlowPageProps {
    open: boolean;
    title: string;
    subtitle?: string;
    onBack: () => void;
    /** Extra close action (e.g. close a multi-step flow entirely). */
    onClose?: () => void;
    headerActions?: ReactNode;
    /** Disable the default body scroller when the flow manages its own scrolling. */
    unpadded?: boolean;
    children: ReactNode;
}

/**
 * Full-screen flow surface: slides in from the right with a compact
 * safe-area-aware header (back chevron, title, optional actions).
 */
export default function FlowPage({
    open,
    title,
    subtitle,
    onBack,
    onClose,
    headerActions,
    unpadded = false,
    children,
}: FlowPageProps) {
    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onBack();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onBack]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="flow-page"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                >
                    <div className="flow-header">
                        <div className="flow-header-inner">
                            <button className="icon-action press" onClick={onBack} aria-label="Back">
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <h2
                                    style={{
                                        fontSize: 'var(--fs-base)',
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p
                                        className="t-caption"
                                        style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginTop: -1,
                                        }}
                                    >
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            {headerActions}
                            {onClose && (
                                <button className="icon-action press" onClick={onClose} aria-label="Close">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    {unpadded ? (
                        children
                    ) : (
                        <div className="flow-body scrollbar-hide">
                            <div className="flow-body-inner">{children}</div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
