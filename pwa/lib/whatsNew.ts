'use client';

import { useSyncExternalStore } from 'react';

export interface Release {
    build?: number;
    date: string;
    changes: string[];
}

interface VersionInfo {
    build?: number;
    releases?: Release[];
}

export interface WhatsNewState {
    loaded: boolean;
    build: number | null;
    releases: Release[];
    /** Build the user had seen when this session started; entries above it are new. */
    seenBuild: number;
    unseenCount: number;
    latestDate: string | null;
    /** True once per build, on the first launch after the app updated itself. */
    justUpdated: boolean;
}

const SEEN_BUILD_KEY = 'shotten_whats_new_seen_build';
const LAST_RUN_BUILD_KEY = 'shotten_last_run_build';
const CHIP_SHOWN_KEY = 'shotten_whats_new_chip_build';
const LEGACY_KEYS = ['shotten_last_version_check', 'shotten_update_available', 'shotten_current_version'];

const initialState: WhatsNewState = {
    loaded: false,
    build: null,
    releases: [],
    seenBuild: 0,
    unseenCount: 0,
    latestDate: null,
    justUpdated: false,
};

let state = initialState;
let loadStarted = false;
const listeners = new Set<() => void>();

function emit(next: WhatsNewState) {
    state = next;
    listeners.forEach((listener) => listener());
}

function readNumber(key: string): number | null {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

function write(key: string, value: string | number) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        // Storage unavailable (private mode); signals just won't persist.
    }
}

function countUnseen(releases: Release[], seenBuild: number) {
    return releases.filter((release) => (release.build ?? 0) > seenBuild).length;
}

/**
 * `?whatsnew=demo` rewinds the stored state so the "just updated" flow can be
 * seen on a fresh origin such as a PR preview. Read at module load because the
 * app rewrites the URL before the release notes are fetched.
 */
const demoRequested = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('whatsnew') === 'demo';

function applyDemo(build: number, releases: Release[]) {
    const olderRelease = releases[Math.min(2, releases.length - 1)];
    write(SEEN_BUILD_KEY, Math.max(0, (olderRelease?.build ?? build) - 1));
    write(LAST_RUN_BUILD_KEY, build - 1);
    try {
        localStorage.removeItem(CHIP_SHOWN_KEY);
    } catch {
        // ignore
    }
}

async function load() {
    if (loadStarted || typeof window === 'undefined') return;
    loadStarted = true;

    try {
        LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
        // ignore
    }

    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`version.json ${res.status}`);
        const info: VersionInfo = await res.json();
        const releases = (info.releases ?? []).filter((release) => release.changes?.length);
        const build = info.build ?? releases[0]?.build ?? null;

        if (build === null) {
            emit({ ...initialState, loaded: true, releases });
            return;
        }

        if (demoRequested) applyDemo(build, releases);

        // First launch with this feature: only the latest release counts as new,
        // which quietly introduces the page without flagging the whole history.
        let seenBuild = readNumber(SEEN_BUILD_KEY);
        if (seenBuild === null) {
            seenBuild = releases[1]?.build ?? 0;
            write(SEEN_BUILD_KEY, seenBuild);
        }

        const lastRunBuild = readNumber(LAST_RUN_BUILD_KEY);
        const chipShownFor = readNumber(CHIP_SHOWN_KEY);
        const unseenCount = countUnseen(releases, seenBuild);
        const justUpdated = lastRunBuild !== null
            && lastRunBuild < build
            && chipShownFor !== build
            && unseenCount > 0;

        write(LAST_RUN_BUILD_KEY, build);
        if (justUpdated) write(CHIP_SHOWN_KEY, build);

        emit({
            loaded: true,
            build,
            releases,
            seenBuild,
            unseenCount,
            latestDate: releases[0]?.date ?? null,
            justUpdated,
        });
    } catch (error) {
        console.warn('Could not load release notes:', error);
        emit({ ...initialState, loaded: true });
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    void load();
    return () => listeners.delete(listener);
}

export function useWhatsNew(): WhatsNewState {
    return useSyncExternalStore(subscribe, () => state, () => initialState);
}

/**
 * Clears the unread signals. `seenBuild` in the returned state stays as it was
 * so the open page can keep highlighting what was new.
 */
export function markReleasesSeen() {
    const latestBuild = state.releases[0]?.build;
    if (latestBuild === undefined || state.unseenCount === 0) return;
    write(SEEN_BUILD_KEY, latestBuild);
    emit({ ...state, unseenCount: 0, justUpdated: false });
}

export function dismissUpdateNotice() {
    if (!state.justUpdated) return;
    emit({ ...state, justUpdated: false });
}

export function formatRelativeTime(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Use calendar-day diff for accurate day/week/month counts
    const calendarDaysDiff = Math.floor(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) /
            (1000 * 60 * 60 * 24)
    );
    const calendarWeeksDiff = Math.floor(calendarDaysDiff / 7);
    const calendarMonthsDiff = Math.floor(calendarDaysDiff / 30);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (calendarDaysDiff === 1) return 'Yesterday';
    if (calendarDaysDiff < 7) return `${calendarDaysDiff}d ago`;
    if (calendarWeeksDiff <= 4) return `${calendarWeeksDiff}w ago`;
    return `${Math.max(1, calendarMonthsDiff)}mo ago`;
}
