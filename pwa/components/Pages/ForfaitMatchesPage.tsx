'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Flag } from 'lucide-react';
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
    const [showPast, setShowPast] = useState(false);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/Matches`);
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data: Match[] = await res.json();
            data.sort((a, b) => matchTime(a) - matchTime(b));
            setMatches(data);
        } catch (e) {
            console.error('Failed to fetch matches for forfait:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMatches();
        }
    }, [isOpen]);

    // Upcoming: soonest first. Past: most recent first, collapsed by default.
    const now = Date.now();
    const upcoming = matches.filter(m => matchTime(m) > now);
    const past = matches.filter(m => matchTime(m) <= now).reverse();

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

    const renderRow = (match: Match) => {
        const matchDate = parseDate(match.date);
        const dateStr = matchDate ? formatMatchDate(matchDate, match.date) : match.date;
        const isUpcoming = matchDate ? matchDate.getTime() > now : false;
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
    };

    return (
        <FlowPage
            open={isOpen}
            title="Forfait matches"
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
                <>
                    {upcoming.length > 0 && (
                        <>
                            <div className="section-label">
                                <span>Upcoming</span>
                                <span className="t-num">{upcoming.length}</span>
                            </div>
                            <div className="list-section">{upcoming.map(renderRow)}</div>
                        </>
                    )}
                    {past.length > 0 && (
                        <div className="list-section" style={{ marginTop: upcoming.length > 0 ? 'var(--sp-6)' : 0 }}>
                            <button
                                className="row"
                                aria-expanded={showPast}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowPast(prev => !prev);
                                }}
                            >
                                <span style={{ flex: 1, fontWeight: 600 }}>Past matches</span>
                                <span className="t-num" style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                                    {past.length}
                                </span>
                                <ChevronDown
                                    size={16}
                                    style={{
                                        color: 'var(--text-3)',
                                        transform: showPast ? 'rotate(180deg)' : undefined,
                                        transition: 'transform var(--t-fast)',
                                    }}
                                />
                            </button>
                            {showPast && past.map(renderRow)}
                        </div>
                    )}
                </>
            )}
        </FlowPage>
    );
}

function matchTime(match: Match): number {
    return parseDate(match.date)?.getTime() ?? 0;
}
