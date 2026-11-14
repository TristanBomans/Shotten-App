'use client';

import { Goal, Sparkles } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { formatGoalsPerMatch, type PlayerGoalStats } from '@/lib/goals';
import { ListSection, Row } from '../ui/ListSection';

interface PlayerGoalsSectionProps {
    playerName: string;
    goals?: PlayerGoalStats;
    showAssists: boolean;
}

/** Goals block on the player detail page (LZV-linked players only). */
export function PlayerGoalsSection({ playerName, goals, showAssists }: PlayerGoalsSectionProps) {
    if (!goals?.link) return null;

    const cells: [string, string][] = [
        ['Goals', String(goals.goals)],
        ...(showAssists ? [['Assists', String(goals.assists)] as [string, string]] : []),
        ['Per match', formatGoalsPerMatch(goals.goalsPerMatch)],
        ['Played', String(goals.gamesPlayed)],
    ];

    return (
        <ListSection
            label="Goals"
            footer={goals.lzvName && goals.lzvName !== playerName ? `As ${goals.lzvName} on lzvcup.be` : undefined}
        >
            <div
                className="row row-static"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, gap: 8, paddingTop: 12, paddingBottom: 12 }}
            >
                {cells.map(([label, value]) => {
                    const isZero = value === '0';
                    return (
                        <span key={label} style={{ textAlign: 'center' }}>
                            <span
                                className="t-num"
                                style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: 600, color: isZero ? 'var(--text-3)' : 'var(--text-1)' }}
                            >
                                {value}
                            </span>
                            <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', fontWeight: 500, color: 'var(--text-3)' }}>
                                {label}
                            </span>
                        </span>
                    );
                })}
            </div>
        </ListSection>
    );
}

/** Goals/assists in one match, shown next to the attendance status. */
export function MatchGoalsBadge({ goals, assists, showAssists }: { goals: number; assists: number; showAssists: boolean }) {
    if (goals === 0 && (!showAssists || assists === 0)) return null;
    const label = [
        goals > 0 ? `${goals} ${goals === 1 ? 'goal' : 'goals'}` : null,
        showAssists && assists > 0 ? `${assists} ${assists === 1 ? 'assist' : 'assists'}` : null,
    ].filter(Boolean).join(', ');
    return (
        <span
            className="t-num"
            aria-label={label}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}
        >
            {goals > 0 && (
                <>
                    <Goal size={12} aria-hidden />
                    {goals}
                </>
            )}
            {showAssists && assists > 0 && (
                <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: goals > 0 ? 4 : 0 }}>
                    +{assists}a
                </span>
            )}
        </span>
    );
}

export function WrappedEntrySection({ onOpen }: { onOpen?: () => void }) {
    if (!onOpen) return null;
    return (
        <ListSection>
            <Row
                icon={<Sparkles size={16} />}
                title="Season Wrapped"
                subtitle="This season on one shareable card"
                chevron
                onClick={() => {
                    hapticPatterns.tap();
                    onOpen();
                }}
            />
        </ListSection>
    );
}
