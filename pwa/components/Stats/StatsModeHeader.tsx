'use client';

import { ChevronRight, Sparkles } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';

export type StatsMode = 'attendance' | 'goals';

/** Left-to-right order of the switch; drives the content transition direction. */
export const STATS_MODE_ORDER: readonly StatsMode[] = ['attendance', 'goals'];

interface StatsModeHeaderProps {
    /** Undefined while the season is still running: no Wrapped entry then. */
    onOpenWrapped?: () => void;
}

/** Season Wrapped entry above the leaderboards (only once the season is over). */
export default function StatsModeHeader({ onOpenWrapped }: StatsModeHeaderProps) {
    if (!onOpenWrapped) return null;
    return (
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
    );
}
