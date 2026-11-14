'use client';

import { ChevronRight, Sparkles } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { SegmentedControl } from '../ui/controls';

export type StatsMode = 'attendance' | 'goals';

interface StatsModeHeaderProps {
    mode: StatsMode;
    onModeChange: (mode: StatsMode) => void;
    /** Hide the Goals tab until there's scraped LZV data for our teams. */
    showGoals: boolean;
    /** Undefined while the season is still running: no Wrapped entry then. */
    onOpenWrapped?: () => void;
}

/** Season Wrapped entry + Attendance/Goals switch above the leaderboards. */
export default function StatsModeHeader({ mode, onModeChange, showGoals, onOpenWrapped }: StatsModeHeaderProps) {
    return (
        <>
            {onOpenWrapped && (
                <div className="list-section" style={{ marginBottom: 'var(--sp-4)' }}>
                    <button
                        className="row"
                        onClick={() => {
                            hapticPatterns.tap();
                            onOpenWrapped();
                        }}
                        style={{ minHeight: 52 }}
                    >
                        <span
                            className="flex-center"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'rgb(var(--accent-rgb) / 0.13)',
                                color: 'var(--accent)',
                                flexShrink: 0,
                            }}
                            aria-hidden
                        >
                            <Sparkles size={15} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Season Wrapped</span>
                            <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 2 }}>
                                The team&apos;s season on one shareable card
                            </span>
                        </span>
                        <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} aria-hidden />
                    </button>
                </div>
            )}

            {showGoals && (
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
                    style={{ marginBottom: 'var(--sp-4)' }}
                />
            )}
        </>
    );
}
