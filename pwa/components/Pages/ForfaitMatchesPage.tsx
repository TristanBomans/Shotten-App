'use client';

import { useState, useEffect } from 'react';
import { Flag } from 'lucide-react';
import { hapticPatterns } from '@/lib/haptic';
import { API_BASE_URL } from '@/lib/config';
import type { Match } from '@/lib/mockData';
import { parseDate, formatMatchDate } from '@/lib/dateUtils';
import FlowPage from '../ui/FlowPage';
import { Switch, StatusChip, EmptyState } from '../ui/controls';

interface ForfaitMatchesPageProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForfaitMatchesPage({ isOpen, onClose }: ForfaitMatchesPageProps) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchMatches();
        }
    }, [isOpen]);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches`);
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data = await res.json();
            data.sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMatches(data);
        } catch (e) {
            console.error('Failed to fetch matches for forfait:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleForfait = async (matchId: number, currentForfait: boolean) => {
        const newForfait = !currentForfait;

        // Optimistic update: update UI immediately
        setMatches(prev => prev.map(m =>
            m.id === matchId ? { ...m, forfait: newForfait } : m
        ));

        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forfait: newForfait }),
            });
            if (!res.ok) throw new Error('Failed to update forfait');

            hapticPatterns.success();
        } catch (e) {
            console.error('Failed to toggle forfait:', e);
            // Revert on error
            setMatches(prev => prev.map(m =>
                m.id === matchId ? { ...m, forfait: currentForfait } : m
            ));
            hapticPatterns.error();
        }
    };

    return (
        <FlowPage
            open={isOpen}
            title="Forfait Matches"
            subtitle="Toggle a match to mark it as forfait"
            onBack={onClose}
        >
            {loading ? (
                <div className="flex-center" style={{ padding: 48 }}>
                    <div className="spinner" />
                </div>
            ) : matches.length === 0 ? (
                <EmptyState icon={<Flag size={20} />} title="No matches found" />
            ) : (
                <div className="list-section">
                    {matches.map((match) => {
                        const matchDate = parseDate(match.date);
                        const dateStr = matchDate ? formatMatchDate(matchDate, match.date) : match.date;
                        const isUpcoming = matchDate ? matchDate.getTime() > Date.now() : false;
                        const isForfait = match.forfait || false;

                        return (
                            <div key={match.id} className="row row-static" style={{ minHeight: 56 }}>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontWeight: 600,
                                            fontSize: 'var(--fs-sm)',
                                            color: isForfait ? 'var(--no)' : 'var(--text-1)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {match.name || 'Unnamed Match'}
                                    </span>
                                    <span
                                        className="t-num"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 7,
                                            marginTop: 2,
                                            fontSize: 'var(--fs-2xs)',
                                            color: isUpcoming ? 'var(--accent)' : 'var(--text-3)',
                                        }}
                                    >
                                        {dateStr}
                                        {isUpcoming && <StatusChip tone="accent">Upcoming</StatusChip>}
                                    </span>
                                </span>
                                <Switch
                                    checked={isForfait}
                                    onChange={() => toggleForfait(match.id, isForfait)}
                                    aria-label={`Forfait ${match.name || 'match'}`}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </FlowPage>
    );
}
