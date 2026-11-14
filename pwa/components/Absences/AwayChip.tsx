'use client';

import { CalendarOff } from 'lucide-react';

/** Small "Away" marker for an answer that an absence period filled in. */
export default function AwayChip({ label = 'Away', subtle = false }: { label?: string; subtle?: boolean }) {
    return (
        <span className="away-chip" data-subtle={subtle || undefined} title="Marked Can't by an away period">
            <CalendarOff size={10} strokeWidth={2.25} aria-hidden />
            {label}
        </span>
    );
}
