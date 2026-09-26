'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { formatDateSafe, formatTimeSafe } from '@/lib/dateUtils';
import { hapticPatterns } from '@/lib/haptic';
import type { LzvLineupPlayer, LzvMatchDetailResponse } from '@/lib/supabase';
import FlowPage from '../ui/FlowPage';
import { ListSection } from '../ui/ListSection';
import { EmptyState } from '../ui/controls';
import { MatchScoreboard } from '../MatchBoard/MatchResult';

interface LzvMatchDetailPageProps {
    resultId: number | null;
    open: boolean;
    onClose: () => void;
    /** LZV team id whose point of view sets the Win/Loss label. */
    perspectiveTeamId?: number | null;
    /** Shown in the header while the details load. */
    fallbackTitle?: string;
}

type LoadState =
    | { status: 'loading' }
    | { status: 'missing' }
    | { status: 'error' }
    | { status: 'ready'; detail: LzvMatchDetailResponse };

/** LZV stores Belgian wall-clock time as UTC; read it back as local time. */
function toWallClock(dateStr: string): string {
    return dateStr.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
}

function sortLineup(lineup: LzvLineupPlayer[]) {
    return [...lineup].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

/**
 * Result page for any LZV match: final score plus both lineups with goals and
 * assists, as scraped from lzvcup.be/results/detail/{id}.
 */
export default function LzvMatchDetailPage({
    resultId,
    open,
    onClose,
    perspectiveTeamId = null,
    fallbackTitle = 'Match',
}: LzvMatchDetailPageProps) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });

    useEffect(() => {
        if (!open || resultId === null) return;
        let cancelled = false;
        setState({ status: 'loading' });

        fetch(`${API_BASE_URL}/api/lzv/match-detail/${resultId}`)
            .then(async (res) => {
                if (cancelled) return;
                if (res.status === 404) return setState({ status: 'missing' });
                if (!res.ok) throw new Error(`match detail ${res.status}`);
                setState({ status: 'ready', detail: await res.json() });
            })
            .catch((error) => {
                console.warn('Failed to load match detail:', error);
                if (!cancelled) setState({ status: 'error' });
            });

        return () => {
            cancelled = true;
        };
    }, [open, resultId]);

    const detail = state.status === 'ready' ? state.detail : null;
    const title = detail ? `${detail.homeTeam} vs ${detail.awayTeam}` : fallbackTitle;
    const subtitle = detail?.date
        ? [
            formatDateSafe(toWallClock(detail.date), { weekday: 'short', day: 'numeric', month: 'short' }),
            formatTimeSafe(toWallClock(detail.date)),
            detail.location,
        ].filter(Boolean).join(' · ')
        : undefined;

    return (
        <FlowPage
            open={open}
            title={title}
            subtitle={subtitle}
            onBack={() => {
                hapticPatterns.tap();
                onClose();
            }}
            headerActions={resultId !== null && (
                <button
                    className="icon-action press"
                    onClick={() => {
                        hapticPatterns.tap();
                        window.open(`https://www.lzvcup.be/results/detail/${resultId}`, '_blank');
                    }}
                    aria-label="Open on LZV Cup"
                >
                    <ExternalLink size={15} />
                </button>
            )}
        >
            {state.status === 'loading' ? (
                <div className="flex-center" style={{ padding: 40 }}>
                    <div className="spinner" />
                </div>
            ) : state.status !== 'ready' || !detail ? (
                <EmptyState
                    title={state.status === 'missing' ? 'No match details yet' : 'Could not load match details'}
                    description={
                        state.status === 'missing'
                            ? 'Lineups and scorers show up here after the next LZV sync.'
                            : 'Check your connection and try again.'
                    }
                />
            ) : (
                <MatchDetailBody detail={detail} perspectiveTeamId={perspectiveTeamId} />
            )}
        </FlowPage>
    );
}

function MatchDetailBody({
    detail,
    perspectiveTeamId,
}: {
    detail: LzvMatchDetailResponse;
    perspectiveTeamId: number | null;
}) {
    const hasScore = detail.homeScore !== null && detail.awayScore !== null;
    let outcome: 'W' | 'L' | 'D' | undefined;
    if (hasScore && perspectiveTeamId !== null) {
        const isHome = perspectiveTeamId === detail.homeTeamId;
        const isAway = perspectiveTeamId === detail.awayTeamId;
        if (isHome || isAway) {
            const own = isHome ? detail.homeScore! : detail.awayScore!;
            const other = isHome ? detail.awayScore! : detail.homeScore!;
            outcome = own > other ? 'W' : own < other ? 'L' : 'D';
        }
    }

    return (
        <>
            {hasScore && (
                <MatchScoreboard
                    result={{ homeScore: detail.homeScore!, awayScore: detail.awayScore!, outcome }}
                    homeTeam={detail.homeTeam}
                    awayTeam={detail.awayTeam}
                />
            )}
            <LineupSection team={detail.homeTeam} lineup={detail.homeLineup} />
            <LineupSection team={detail.awayTeam} lineup={detail.awayLineup} />
        </>
    );
}

function LineupSection({ team, lineup }: { team: string; lineup: LzvLineupPlayer[] }) {
    return (
        <ListSection label={team}>
            {lineup.length === 0 ? (
                <div className="row row-static">
                    <span className="t-caption">Lineup not filled in yet</span>
                </div>
            ) : (
                sortLineup(lineup).map((player) => (
                    <div
                        key={`${player.playerId ?? player.name}`}
                        className="row row-static"
                        style={{ minHeight: 48 }}
                    >
                        <span
                            className="flex-center t-num"
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-2)',
                                fontSize: 'var(--fs-3xs)',
                                fontWeight: 600,
                                flexShrink: 0,
                            }}
                            aria-label={player.number !== null ? `Number ${player.number}` : undefined}
                        >
                            {player.number ?? '–'}
                        </span>
                        <span
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 'var(--fs-xs)',
                                fontWeight: 500,
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {player.name}
                            </span>
                            {player.captain && (
                                <span className="chip" title="Captain" aria-label="Captain">C</span>
                            )}
                        </span>
                        <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-3)', flexShrink: 0 }}>
                            <span style={{ color: player.goals > 0 ? 'var(--ok)' : undefined, fontWeight: 600 }}>
                                {player.goals}
                            </span> G
                            {' · '}
                            <span style={{ color: player.assists > 0 ? 'var(--accent)' : undefined, fontWeight: 600 }}>
                                {player.assists}
                            </span> A
                        </span>
                    </div>
                ))
            )}
        </ListSection>
    );
}
