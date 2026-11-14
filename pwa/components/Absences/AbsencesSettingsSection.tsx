'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { fetchAbsences, formatAbsenceRange, todayKey, type Absence } from '@/lib/absences';
import { ListSection, Row } from '../ui/ListSection';
import { StatusChip } from '../ui/controls';
import AbsencesPage from './AbsencesPage';

/** Settings entry for away periods, with the current or next one as subtitle. */
export default function AbsencesSettingsSection({ playerId }: { playerId: number }) {
    const [open, setOpen] = useState(false);
    const [absences, setAbsences] = useState<Absence[] | null>(null);

    const refresh = useCallback(() => {
        fetchAbsences(playerId).then(setAbsences).catch(() => setAbsences(null));
    }, [playerId]);

    useEffect(() => {
        if (!open) refresh();
    }, [open, refresh]);

    const today = todayKey();
    const upcoming = (absences ?? []).filter(a => a.endDate >= today);
    const next = upcoming[0];
    const awayNow = next ? next.startDate <= today : false;
    const subtitle = next
        ? `${awayNow ? 'Away now' : 'Next'}: ${formatAbsenceRange(next.startDate, next.endDate)}${upcoming.length > 1 ? ` · +${upcoming.length - 1} more` : ''}`
        : 'Holiday? Auto-answer Can\'t for those matches';

    return (
        <>
            <ListSection label="Availability">
                <Row
                    icon={<CalendarOff size={16} />}
                    title="Away periods"
                    subtitle={subtitle}
                    trailing={awayNow ? <StatusChip tone="accent">Away</StatusChip> : undefined}
                    chevron
                    onClick={() => {
                        hapticPatterns.tap();
                        setOpen(true);
                    }}
                />
            </ListSection>
            <AbsencesPage open={open} onClose={() => setOpen(false)} playerId={playerId} />
        </>
    );
}
