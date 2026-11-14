'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface GlassMenuProps {
    open: boolean;
    /** Called for a tap outside the menu. */
    onDismiss: () => void;
    /** z-index of the dismiss layer; the menu sits one above it. */
    zIndex: number;
    children: ReactNode;
}

/**
 * Overflow (⋯) menu with an iOS 26 Liquid Glass feel: it grows out of the ⋯
 * button (transform-origin is pinned to it in CSS), with a light spring
 * overshoot, a translucent blurred surface and items fading in one after
 * another. Closing is a quick reverse. Reduced motion: a plain fade.
 * Open state (and so back-button handling via useBackClose) stays with the caller.
 */
export default function GlassMenu({ open, onDismiss, zIndex, children }: GlassMenuProps) {
    const reduce = useReducedMotion();

    return (
        <AnimatePresence>
            {open && (
                <>
                    <div onClick={onDismiss} style={{ position: 'fixed', inset: 0, zIndex }} />
                    <motion.div
                        className="menu flow-menu glass-menu"
                        style={{ zIndex: zIndex + 1 }}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.28, scaleY: 0.14 }}
                        animate={{
                            opacity: 1,
                            scaleX: 1,
                            scaleY: 1,
                            transition: reduce
                                ? { duration: 0.15 }
                                : {
                                      opacity: { duration: 0.12, ease: 'easeOut' },
                                      scaleX: { type: 'spring', stiffness: 520, damping: 26, mass: 0.8 },
                                      scaleY: { type: 'spring', stiffness: 440, damping: 24, mass: 0.8 },
                                  },
                        }}
                        exit={
                            reduce
                                ? { opacity: 0, transition: { duration: 0.12 } }
                                : {
                                      opacity: 0,
                                      scaleX: 0.4,
                                      scaleY: 0.2,
                                      transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
                                  }
                        }
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
