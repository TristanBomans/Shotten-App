'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { ScraperTeam } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import Sheet from './ui/Sheet';

interface LeagueSelectorProps {
    leagues: string[];
    selectedLeague: string;
    onSelect: (league: string) => void;
    teamsData: ScraperTeam[];
    showTrigger?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function LeagueSelector({
    leagues,
    selectedLeague,
    onSelect,
    teamsData,
    showTrigger = true,
    open,
    onOpenChange,
}: LeagueSelectorProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const showModal = isControlled ? open : internalOpen;

    const setModalOpen = (next: boolean) => {
        if (!isControlled) {
            setInternalOpen(next);
        }
        onOpenChange?.(next);
    };

    // Calculate stats per league
    const leagueStats = useMemo(() => {
        const stats: Record<string, { teamCount: number }> = {};
        leagues.forEach(league => {
            const teamCount = teamsData.filter(t => t.leagueName === league).length;
            stats[league] = { teamCount };
        });
        return stats;
    }, [leagues, teamsData]);

    const handleSelect = (league: string) => {
        hapticPatterns.tap();
        onSelect(league);
        setModalOpen(false);
    };

    return (
        <>
            {/* Trigger Button */}
            {showTrigger && (
                <button
                    className="row panel press"
                    onClick={() => {
                        hapticPatterns.tap();
                        setModalOpen(true);
                    }}
                    style={{ justifyContent: 'space-between', borderRadius: 'var(--r-sm)' }}
                >
                    <span style={{ fontWeight: 600 }}>{selectedLeague || 'Select League'}</span>
                    <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
                </button>
            )}

            <Sheet
                open={!!showModal}
                onClose={() => {
                    hapticPatterns.tap();
                    setModalOpen(false);
                }}
                title="Select League"
            >
                <div className="list-section" role="listbox" aria-label="Leagues">
                    {leagues.map((league) => {
                        const isSelected = league === selectedLeague;
                        const stats = leagueStats[league];

                        return (
                            <button
                                key={league}
                                className="row"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelect(league)}
                            >
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontWeight: 600,
                                            fontSize: 'var(--fs-sm)',
                                            color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                                        }}
                                    >
                                        {league}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                        {stats.teamCount} {stats.teamCount === 1 ? 'team' : 'teams'}
                                    </span>
                                </span>
                                {isSelected ? (
                                    <Check size={17} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                ) : (
                                    <ChevronRight size={17} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Sheet>
        </>
    );
}
