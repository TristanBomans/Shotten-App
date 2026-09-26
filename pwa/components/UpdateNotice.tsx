'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { dismissUpdateNotice, useWhatsNew } from '@/lib/whatsNew';

const VISIBLE_MS = 5000;

interface UpdateNoticeProps {
    /** Hold the notice back while something else has the user's attention. */
    suppressed: boolean;
    onOpen: () => void;
}

/**
 * Shown once, on the first launch after the app updated itself, and only when
 * that update has user-facing release notes. Fades out on its own.
 */
export default function UpdateNotice({ suppressed, onOpen }: UpdateNoticeProps) {
    const { justUpdated } = useWhatsNew();
    const visible = justUpdated && !suppressed;

    useEffect(() => {
        if (!visible) return;
        const timeout = setTimeout(dismissUpdateNotice, VISIBLE_MS);
        return () => clearTimeout(timeout);
    }, [visible]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    type="button"
                    className="update-notice press"
                    initial={{ opacity: 0, y: -8, x: '-50%' }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        x: '-50%',
                        transition: { type: 'spring', stiffness: 420, damping: 34, delay: 0.6 },
                    }}
                    exit={{ opacity: 0, y: -8, x: '-50%', transition: { duration: 0.2 } }}
                    onClick={() => {
                        hapticPatterns.tap();
                        dismissUpdateNotice();
                        onOpen();
                    }}
                >
                    <Sparkles size={13} style={{ color: 'var(--accent)' }} aria-hidden />
                    <span>
                        <strong>Updated</strong> · See what&apos;s new
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}
