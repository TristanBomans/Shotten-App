'use client';

import { Check, HelpCircle, X, Ghost } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { RANKS } from '../StatsView';
import FlowPage from '../ui/FlowPage';
import { ListSection } from '../ui/ListSection';

interface RulesPageProps {
    open: boolean;
    onClose: () => void;
}

const attendanceEffects = [
    { icon: Check, label: 'Present', effect: 'Counts toward %', color: 'var(--ok)' },
    { icon: HelpCircle, label: 'Maybe', effect: 'Lowers %', color: 'var(--warn)' },
    { icon: X, label: 'Absent', effect: 'Lowers %', color: 'var(--no)' },
    { icon: Ghost, label: 'Ghost', effect: 'Lowers %', color: 'var(--tbd)' },
];

export default function RulesPage({ open, onClose }: RulesPageProps) {
    return (
        <FlowPage
            open={open}
            title="How it works"
            onBack={() => {
                hapticPatterns.tap();
                onClose();
            }}
        >
            <p className="t-body" style={{ marginBottom: 16, padding: '0 4px' }}>
                Your rank is determined by your attendance rate — the percentage of
                matches you show up for.
            </p>

            <ListSection label="Attendance">
                {attendanceEffects.map(({ icon: Icon, label, effect, color }) => (
                    <div key={label} className="row row-static" style={{ minHeight: 46 }}>
                        <span
                            className="flex-center"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: 'var(--bg-subtle)',
                                color,
                                flexShrink: 0,
                            }}
                            aria-hidden
                        >
                            <Icon size={14} strokeWidth={2.5} />
                        </span>
                        <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color }}>{effect}</span>
                    </div>
                ))}
            </ListSection>

            <ListSection label="Ranks">
                {RANKS.map((rank, index) => (
                    <div key={rank.name} className="row row-static" style={{ minHeight: 46 }}>
                        <span
                            className="flex-center"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: rank.bg,
                                color: rank.color,
                                flexShrink: 0,
                            }}
                            aria-hidden
                        >
                            <rank.icon size={14} />
                        </span>
                        <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: 600, color: rank.color }}>
                            {rank.name}
                        </span>
                        <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)' }}>
                            {index === RANKS.length - 1 ? '< 25%' : `${rank.minPct}%+`}
                        </span>
                    </div>
                ))}
            </ListSection>
        </FlowPage>
    );
}
