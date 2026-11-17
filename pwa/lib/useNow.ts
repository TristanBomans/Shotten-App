'use client';

import { useEffect, useState } from 'react';

/**
 * Current time that stays pure during render: read once on mount, then
 * refreshed every `intervalMs` so time-based UI (past vs upcoming) moves on.
 */
export function useNow(intervalMs = 60_000): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);
    return now;
}
