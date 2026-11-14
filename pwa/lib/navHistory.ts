'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Thin layer over window.history so every in-app screen and overlay owns one
 * history entry. Android back / iOS swipe-back then unwinds exactly one step.
 *
 * - `appDepth` in history.state counts in-app entries below the current one,
 *   so closing can use history.back() instead of leaving the app.
 * - Overlays (sheets, menus, image viewers) push an entry with the same URL and
 *   an `overlayKey`. Back pops it and the overlay closes.
 * - history.back() is async. Calls made while a back is in flight are queued
 *   until its popstate arrives, so "close overlay, then open page" cannot have
 *   the page entry undone by the overlay's back.
 */

interface AppHistoryState {
    appDepth?: number;
    overlayKey?: string;
}

interface OverlayRecord {
    depth: number | null;
    close: () => void;
}

const overlays = new Map<string, OverlayRecord>();
let pendingBack = false;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let queue: Array<() => void> = [];
let listening = false;
let overlayCounter = 0;

function readState(): AppHistoryState {
    return (window.history.state as AppHistoryState | null) ?? {};
}

export function getHistoryDepth(): number {
    const depth = readState().appDepth;
    return typeof depth === 'number' && depth > 0 ? depth : 0;
}

function currentUrl(): string {
    return `${window.location.pathname}${window.location.search}`;
}

function flushQueue() {
    pendingBack = false;
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    const tasks = queue;
    queue = [];
    for (const task of tasks) {
        if (pendingBack) {
            queue.push(task);
        } else {
            task();
        }
    }
}

function handlePopState() {
    const depth = getHistoryDepth();
    const key = readState().overlayKey;
    // Close every overlay whose entry is no longer at or below the current one.
    for (const [overlayKey, record] of Array.from(overlays.entries())) {
        if (record.depth === null) continue;
        if (record.depth > depth || (record.depth === depth && key !== overlayKey)) {
            overlays.delete(overlayKey);
            record.close();
        }
    }
    if (pendingBack) flushQueue();
}

function ensureListener() {
    if (listening || typeof window === 'undefined') return;
    listening = true;
    window.addEventListener('popstate', handlePopState);
}

function run(task: () => void) {
    ensureListener();
    if (pendingBack) {
        queue.push(task);
        return;
    }
    task();
}

/** The overlay entry currently on top, if it is still registered. */
function topOverlayKey(): string | null {
    const key = readState().overlayKey;
    return key && overlays.has(key) ? key : null;
}

/** Drop the overlay sitting on top: its entry is about to be replaced. */
function consumeTopOverlay() {
    const key = topOverlayKey();
    if (!key) return;
    const record = overlays.get(key);
    overlays.delete(key);
    record?.close();
}

/**
 * Push a new in-app entry. If an overlay entry is on top (a sheet or menu that
 * started this navigation), it is replaced instead so back does not land on
 * a closed overlay.
 */
export function navPush(url: string) {
    run(() => {
        const state = readState();
        if (state.overlayKey) {
            consumeTopOverlay();
            window.history.replaceState({ appDepth: getHistoryDepth() }, '', url);
            return;
        }
        window.history.pushState({ appDepth: getHistoryDepth() + 1 }, '', url);
    });
}

/** Replace the current entry's URL, keeping its depth and overlay marker. */
export function navReplace(url: string) {
    run(() => {
        window.history.replaceState({ ...readState() }, '', url);
    });
}

/**
 * Go back one in-app entry, or, when there is none (deep link, refresh),
 * replace the current entry with `fallbackUrl`.
 */
export function navBack(fallbackUrl: string) {
    run(() => {
        if (getHistoryDepth() > 0) {
            pendingBack = true;
            pendingTimer = setTimeout(flushQueue, 600);
            window.history.back();
            return;
        }
        window.history.replaceState({ appDepth: 0 }, '', fallbackUrl);
    });
}

function pushOverlay(key: string) {
    run(() => {
        const record = overlays.get(key);
        if (!record) return; // closed again before the queue ran
        const depth = getHistoryDepth() + 1;
        record.depth = depth;
        window.history.pushState({ appDepth: depth, overlayKey: key }, '', currentUrl());
    });
}

function popOverlay(key: string) {
    const record = overlays.get(key);
    overlays.delete(key);
    if (!record || record.depth === null) return;
    run(() => {
        if (readState().overlayKey !== key) return; // already replaced or popped
        pendingBack = true;
        pendingTimer = setTimeout(flushQueue, 600);
        window.history.back();
    });
}

/**
 * Give an overlay its own history entry while `open` is true: back closes it
 * (calls `onClose`), and closing it from the UI pops the entry again.
 */
export function useBackClose(open: boolean, onClose: () => void) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        overlayCounter += 1;
        const key = `o${Date.now().toString(36)}${overlayCounter}`;
        overlays.set(key, { depth: null, close: () => closeRef.current() });
        pushOverlay(key);
        return () => popOverlay(key);
    }, [open]);
}

/**
 * Stack level of the page being rendered. Full-screen pages read it to sit
 * above the page that opened them, whatever order they mounted in.
 */
export const NavLevelContext = createContext(0);

export function useNavLevel(): number {
    return useContext(NavLevelContext);
}

/** z-index for a stacked full-screen page; overlays use small offsets on top. */
export function pageZIndex(level: number): number {
    return 10020 + level * 10;
}
