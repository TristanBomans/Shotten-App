'use client';

import { useEffect } from 'react';

/**
 * Sets the browser tab title to the (first) core team name once loaded.
 * Falls back to the default title from metadata when no team exists yet.
 */
export default function TeamTitle() {
    useEffect(() => {
        let cancelled = false;

        fetch('/api/Teams')
            .then((res) => (res.ok ? res.json() : []))
            .then((teams: { id: number; name: string }[]) => {
                if (!cancelled && teams.length > 0 && teams[0]?.name) {
                    document.title = teams[0].name;
                }
            })
            .catch(() => {
                // Keep the default title on failure
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
