'use client';

import { hapticPatterns } from '@/lib/haptic';
import { SegmentedControl } from '../ui/controls';
import type { StatsMode } from './StatsModeHeader';

interface StatsModeDockProps {
    mode: StatsMode;
    onModeChange: (mode: StatsMode) => void;
}

/**
 * Attendance/Goals switch docked at the bottom of the stats page, just above
 * the tab bar, so it sits in thumb reach. It is sticky inside the stats page
 * (not fixed), so it slides away with the page when you swipe to another tab.
 */
export default function StatsModeDock({ mode, onModeChange }: StatsModeDockProps) {
    return (
        <div className="stats-mode-dock">
            <SegmentedControl<StatsMode>
                aria-label="Leaderboard"
                value={mode}
                onChange={next => {
                    hapticPatterns.toggle();
                    onModeChange(next);
                }}
                options={[
                    { value: 'attendance', label: 'Attendance' },
                    { value: 'goals', label: 'Goals' },
                ]}
            />
        </div>
    );
}
