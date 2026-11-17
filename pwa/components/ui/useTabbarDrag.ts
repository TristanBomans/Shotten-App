'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { triggerHaptic } from '@/lib/haptic';
import { prefersReducedMotion } from '@/lib/motion';

interface TabbarDragOptions {
    rootRef: RefObject<HTMLElement | null>;
    /** CSS selector for the tab buttons inside the root. */
    itemSelector: string;
    activeIndex: number;
    /** From useLiveThumb: pin the pill to a fractional slot. */
    track: (pos: number) => void;
    /** From useLiveThumb: hand the pill back once the index catches up. */
    release: (index: number) => void;
    /** Called when the lens is dropped on another tab. */
    onCommit: (index: number) => void;
}

const HOLD_MS = 240; // press-and-hold lifts the lens without moving
const MOVE_SLOP = 8; // px of horizontal travel that also starts a drag
const EDGE_RUBBER = 0.25; // resistance past the first/last tab

/**
 * Liquid-glass tab drag (iOS 26 style): press and hold the active tab, or
 * slide off it, and the glass lens lifts and follows the finger across the
 * other icons. Dropping it on another tab navigates there; dropping it back
 * on the active tab does nothing. A plain tap still goes through as a click.
 *
 * Everything runs on native pointer events and CSS variables, so a drag
 * causes no React renders until the drop.
 */
export function useTabbarDrag({ rootRef, itemSelector, activeIndex, track, release, onCommit }: TabbarDragOptions) {
    const activeIndexRef = useRef(activeIndex);
    const onCommitRef = useRef(onCommit);

    useEffect(() => {
        activeIndexRef.current = activeIndex;
        onCommitRef.current = onCommit;
    }, [activeIndex, onCommit]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        let drag: null | {
            pointerId: number;
            startX: number;
            startIndex: number;
            lifted: boolean;
            pos: number;
            slot: number;
            holdTimer: ReturnType<typeof setTimeout>;
        } = null;
        let swallowClick = false;
        let swallowTimer: ReturnType<typeof setTimeout> | undefined;

        const items = () => Array.from(root.querySelectorAll<HTMLElement>(itemSelector));

        const slotWidth = (list: HTMLElement[]) =>
            list.length > 1 ? list[1].offsetLeft - list[0].offsetLeft : list[0]?.offsetWidth || 1;

        // How close the lens is to each icon (1 = right on top), for the magnify effect.
        const setNear = (pos: number | null) => {
            items().forEach((el, i) => {
                if (pos === null) el.style.removeProperty('--lens-near');
                else el.style.setProperty('--lens-near', Math.max(0, 1 - Math.abs(i - pos)).toFixed(3));
            });
        };

        const lift = () => {
            if (!drag || drag.lifted) return;
            drag.lifted = true;
            try {
                root.setPointerCapture(drag.pointerId);
            } catch {
                // Pointer already gone; the up/cancel handler cleans up.
            }
            root.dataset.dragging = '';
            triggerHaptic('light');
            track(drag.pos);
            setNear(drag.pos);
        };

        const onPointerDown = (event: PointerEvent) => {
            if (drag || event.button !== 0 || prefersReducedMotion()) return;
            const list = items();
            const target = event.target instanceof Element ? event.target.closest(itemSelector) : null;
            const index = target ? list.indexOf(target as HTMLElement) : -1;
            // Only the active tab picks the lens up, like iOS.
            if (index < 0 || index !== activeIndexRef.current) return;
            drag = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startIndex: index,
                lifted: false,
                pos: index,
                slot: index,
                holdTimer: setTimeout(lift, HOLD_MS),
            };
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            const dx = event.clientX - drag.startX;
            if (!drag.lifted) {
                if (Math.abs(dx) < MOVE_SLOP) return;
                clearTimeout(drag.holdTimer);
                lift();
            }
            const list = items();
            const max = list.length - 1;
            const raw = drag.startIndex + dx / slotWidth(list);
            const pos = raw < 0 ? raw * EDGE_RUBBER : raw > max ? max + (raw - max) * EDGE_RUBBER : raw;
            drag.pos = pos;
            track(pos);
            setNear(pos);
            const slot = Math.min(max, Math.max(0, Math.round(pos)));
            if (slot !== drag.slot) {
                drag.slot = slot;
                triggerHaptic('light');
            }
            event.preventDefault();
        };

        const finish = (commit: boolean) => {
            if (!drag) return;
            const done = drag;
            drag = null;
            clearTimeout(done.holdTimer);
            if (!done.lifted) return; // a plain tap: let the click through

            // The click that follows pointerup must not count as a tap.
            swallowClick = true;
            clearTimeout(swallowTimer);
            swallowTimer = setTimeout(() => {
                swallowClick = false;
            }, 400);

            delete root.dataset.dragging;
            setNear(null);
            const landed = commit ? done.slot : done.startIndex;
            release(landed);
            if (landed !== done.startIndex) onCommitRef.current(landed);
        };

        const onPointerUp = (event: PointerEvent) => {
            if (drag && event.pointerId === drag.pointerId) finish(true);
        };
        const onPointerCancel = (event: PointerEvent) => {
            if (drag && event.pointerId === drag.pointerId) finish(false);
        };
        const onClickCapture = (event: MouseEvent) => {
            if (!swallowClick) return;
            swallowClick = false;
            event.preventDefault();
            event.stopPropagation();
        };
        // Long-press on a button would otherwise open the iOS/Android context menu.
        const onContextMenu = (event: Event) => {
            if (drag || swallowClick) event.preventDefault();
        };

        root.addEventListener('pointerdown', onPointerDown);
        root.addEventListener('pointermove', onPointerMove);
        root.addEventListener('pointerup', onPointerUp);
        root.addEventListener('pointercancel', onPointerCancel);
        root.addEventListener('click', onClickCapture, true);
        root.addEventListener('contextmenu', onContextMenu);
        return () => {
            if (drag) clearTimeout(drag.holdTimer);
            clearTimeout(swallowTimer);
            delete root.dataset.dragging;
            root.removeEventListener('pointerdown', onPointerDown);
            root.removeEventListener('pointermove', onPointerMove);
            root.removeEventListener('pointerup', onPointerUp);
            root.removeEventListener('pointercancel', onPointerCancel);
            root.removeEventListener('click', onClickCapture, true);
            root.removeEventListener('contextmenu', onContextMenu);
        };
    }, [rootRef, itemSelector, track, release]);
}
