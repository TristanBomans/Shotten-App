'use client';

import { useEffect, useState } from 'react';

/**
 * Reduce-motion preference.
 * On top of the OS-level `prefers-reduced-motion`, the user can force less
 * motion from Settings. When enabled we set `data-reduce-motion="true"` on
 * <html> (CSS kills transitions/animations) and framer-motion is configured
 * with MotionConfig reducedMotion="always" (see app/page.tsx).
 */

export const REDUCE_MOTION_STORAGE_KEY = 'reduceMotion';
export const REDUCE_MOTION_EVENT = 'reduceMotionChanged';

export function getReduceMotion(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    return localStorage.getItem(REDUCE_MOTION_STORAGE_KEY) === 'true';
}

export function setReduceMotion(reduce: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, reduce ? 'true' : 'false');
    document.documentElement.setAttribute('data-reduce-motion', reduce ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent<boolean>(REDUCE_MOTION_EVENT, { detail: reduce }));
}

/** True when the user asked for less motion, here or at the OS level. Safe during SSR. */
export function prefersReducedMotion(): boolean {
    if (getReduceMotion()) return true;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** React state mirroring the in-app toggle (not the OS setting). */
export function useReduceMotionPref() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        setReduced(getReduceMotion());
        const onChange = () => setReduced(getReduceMotion());
        window.addEventListener(REDUCE_MOTION_EVENT, onChange);
        return () => window.removeEventListener(REDUCE_MOTION_EVENT, onChange);
    }, []);

    return { reduced, setReduceMotion };
}
