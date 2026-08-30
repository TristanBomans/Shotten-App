'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, UserCircle, Trophy, Calendar, X, MoreHorizontal, ExternalLink, Home, Navigation, Palette } from 'lucide-react';
import { parseDateToTimestamp, formatDateSafe, formatTimeSafe } from '@/lib/dateUtils';
import { isHomeTeamForMatch } from '@/lib/teamNameMatching';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';
import { fetchScraperPlayers } from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { hapticPatterns } from '@/lib/haptic';
import { ListSection, Row, MetricRow } from '../ui/ListSection';
import { EmptyState } from '../ui/controls';

const teamDetailTabs = ['overview', 'matches', 'squad'] as const;
type TeamDetailTab = typeof teamDetailTabs[number];

interface ScraperMatch {
    _id: string;
    externalId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    location?: string;
    teamId: number;
    status: 'Scheduled' | 'Played' | 'Postponed';
    forfait?: boolean;
}

interface TeamDetailPageProps {
    team: ScraperTeam;
    open: boolean;
    onClose: () => void;
}

interface CoreMatchLike {
    date: string;
    forfait?: boolean;
}

export default function TeamDetailPage({ team, open, onClose }: TeamDetailPageProps) {
    const [showImage, setShowImage] = useState(false);
    const [activeTab, setActiveTab] = useState<TeamDetailTab>('overview');
    const [matches, setMatches] = useState<ScraperMatch[]>([]);
    const [players, setPlayers] = useState<ScraperPlayer[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch matches for this team (LZV + CoreMatches merged)
    useEffect(() => {
        if (!open || !team.externalId) return;
        const fetchMatches = async () => {
            setLoadingMatches(true);
            try {
                const [lzvRes, coreRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/lzv/matches?teamId=${team.externalId}`),
                    fetch(`${API_BASE_URL}/api/Matches?teamName=${encodeURIComponent(team.name)}`)
                ]);

                let lzvMatches: ScraperMatch[] = [];
                let coreMatches: CoreMatchLike[] = [];

                if (lzvRes.ok) {
                    lzvMatches = await lzvRes.json();
                }

                if (coreRes.ok) {
                    coreMatches = await coreRes.json();
                }

                // Fix LZV dates: stored as UTC but represent Belgian local time
                // Strip timezone to treat them as local dates
                const fixLzvDate = (dateStr: string): string => {
                    return dateStr.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
                };

                // Merge CoreMatch forfait data into LZV matches (match on calendar day)
                const mergedMatches = lzvMatches.map((lzvMatch: ScraperMatch) => {
                    const fixedDate = fixLzvDate(lzvMatch.date);
                    const lzvDate = new Date(fixedDate);

                    const coreMatch = coreMatches.find((core) => {
                        const coreDate = new Date(core.date);
                        return (
                            lzvDate.getFullYear() === coreDate.getFullYear() &&
                            lzvDate.getMonth() === coreDate.getMonth() &&
                            lzvDate.getDate() === coreDate.getDate()
                        );
                    });

                    if (coreMatch) {
                        return {
                            ...lzvMatch,
                            date: fixedDate,
                            forfait: coreMatch.forfait,
                        };
                    }

                    return {
                        ...lzvMatch,
                        date: fixedDate,
                    };
                });

                setMatches(mergedMatches);
            } catch (error) {
                console.warn('Failed to fetch team matches:', error);
            } finally {
                setLoadingMatches(false);
            }
        };
        fetchMatches();
    }, [open, team.externalId, team.name]);

    // Fetch players for this team
    useEffect(() => {
        if (!open || !team.externalId) return;
        const loadPlayers = async () => {
            setLoadingPlayers(true);
            try {
                const data = await fetchScraperPlayers(team.externalId);
                setPlayers(data);
            } catch (error) {
                console.warn('Failed to fetch team players:', error);
            } finally {
                setLoadingPlayers(false);
            }
        };
        loadPlayers();
    }, [open, team.externalId]);

    const getTabFromScroll = useCallback((): TeamDetailTab => {
        if (!scrollRef.current) return 'overview';

        const scrollLeft = scrollRef.current.scrollLeft;
        const viewWidth = scrollRef.current.clientWidth || 1;
        const tabIndex = Math.round(scrollLeft / viewWidth);

        return teamDetailTabs[tabIndex] || 'overview';
    }, []);

    const handleScroll = useCallback(() => {
        const nextTab = getTabFromScroll();
        if (nextTab !== activeTab) {
            hapticPatterns.swipe();
            setActiveTab(nextTab);
        }
    }, [activeTab, getTabFromScroll]);

    const scrollToView = (view: TeamDetailTab) => {
        if (scrollRef.current) {
            const viewIndex = teamDetailTabs.indexOf(view);
            const left = viewIndex * scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    };

    // Reset tab state when modal opens so indicator and content stay aligned
    useEffect(() => {
        if (open) {
            setActiveTab('overview');
            setMenuOpen(false);
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = 0;
            }
        }
    }, [open]);

    const hasTeam = !!team?.externalId;

    // Calculate recent form from matches - memoized to prevent unnecessary re-renders
    const recentForm = useMemo(() => {
        if (!hasTeam || !team?.name || matches.length === 0) return [];
        const playedMatches = matches
            .filter(m => m.status === 'Played')
            .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date))
            .slice(0, 5);

        return playedMatches.map(m => {
            const isHome = isHomeTeamForMatch(team.name, m.homeTeam, m.awayTeam);
            const teamScore = isHome ? m.homeScore : m.awayScore;
            const opponentScore = isHome ? m.awayScore : m.homeScore;

            if (teamScore > opponentScore) return 'W';
            if (teamScore < opponentScore) return 'L';
            return 'D';
        });
    }, [hasTeam, team?.name, matches]);

    if (typeof document === 'undefined') return null;

    const winRate = team.matchesPlayed && team.matchesPlayed > 0
        ? Math.round(((team.wins || 0) / team.matchesPlayed) * 100)
        : 0;

    // Sort players by goals, using per-team stats for THIS team when available
    const sortedPlayers = hasTeam
        ? players
            .map(p => {
                const teamStats = p.teamStats?.find(ts => ts.teamId === team.externalId);
                return {
                    ...p,
                    goals: teamStats?.goals ?? p.goals,
                    assists: teamStats?.assists ?? p.assists,
                    gamesPlayed: teamStats?.gamesPlayed ?? p.gamesPlayed,
                    number: teamStats?.number ?? p.number,
                };
            })
            .sort((a, b) => b.goals - a.goals)
        : [];

    const paneStyle: CSSProperties = {
        minWidth: '100%',
        scrollSnapAlign: 'center',
        scrollSnapStop: 'always',
        overflowY: 'auto',
    };

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="flow-page"
                    role="dialog"
                    aria-modal="true"
                    aria-label={team?.name || 'Team detail'}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                >
                    {/* Header */}
                    <div className="flow-header">
                        <div className="flow-header-inner">
                            <button
                                className="icon-action press"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    onClose();
                                }}
                                aria-label="Back"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <h2
                                    style={{
                                        fontSize: 'var(--fs-sm)',
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {team?.name || ''}
                                </h2>
                                {team?.leagueName && (
                                    <p
                                        className="t-caption"
                                        style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginTop: -1,
                                        }}
                                    >
                                        {team.leagueName}
                                    </p>
                                )}
                            </div>
                            <button
                                className="icon-action press"
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setMenuOpen(o => !o);
                                }}
                                aria-label="More options"
                                aria-expanded={menuOpen}
                                style={menuOpen ? { background: 'var(--bg-subtle-strong)', color: 'var(--text-1)' } : undefined}
                            >
                                <MoreHorizontal size={17} />
                            </button>
                        </div>

                        {/* Segmented tabs */}
                        <div
                            style={{
                                maxWidth: 'calc(var(--content-max) + 2 * var(--screen-x))',
                                margin: '0 auto',
                                padding: '0 var(--screen-x) 10px',
                                width: '100%',
                            }}
                        >
                            <div className="seg" role="tablist" aria-label="Team views">
                                {([
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'matches', label: 'Matches' },
                                    { id: 'squad', label: 'Squad' },
                                ] as const).map(tab => (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        className="seg-item"
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            setActiveTab(tab.id);
                                            scrollToView(tab.id);
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                        {menuOpen && (
                            <>
                                <div
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setMenuOpen(false);
                                    }}
                                    style={{ position: 'fixed', inset: 0, zIndex: 10024 }}
                                />
                                <motion.div
                                    className="menu"
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.14, ease: 'easeOut' }}
                                    style={{
                                        top: 'calc(var(--safe-top) + var(--header-h))',
                                        right: 'var(--screen-x)',
                                        zIndex: 10025,
                                        transformOrigin: 'top right',
                                    }}
                                >
                                    <a
                                        className="menu-item"
                                        href={`https://www.lzvcup.be/teams/detail/${team?.externalId || ''}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            setMenuOpen(false);
                                        }}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <ExternalLink size={16} style={{ color: 'var(--text-2)' }} />
                                        View on LZV Cup
                                    </a>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Scrollable Tab Content */}
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="scrollbar-hide"
                        style={{
                            display: 'flex',
                            width: '100%',
                            flex: 1,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            scrollSnapType: 'x mandatory',
                            scrollBehavior: 'smooth',
                        }}
                    >
                        {/* Overview Tab */}
                        <div data-view="overview" className="scrollbar-hide" style={paneStyle}>
                            <div className="flow-body-inner">
                                {/* Team header */}
                                <div className="panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
                                    {team?.imageBase64 ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={team.imageBase64}
                                            alt={team?.name || ''}
                                            onClick={() => {
                                                hapticPatterns.tap();
                                                setShowImage(true);
                                            }}
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 12,
                                                objectFit: 'cover',
                                                border: '1px solid var(--border-hairline)',
                                                cursor: 'zoom-in',
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="flex-center"
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 12,
                                                background: 'var(--bg-subtle)',
                                                border: '1px solid var(--border-hairline)',
                                                fontSize: '1.4rem',
                                                fontWeight: 700,
                                                color: 'var(--text-2)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {team?.name?.charAt(0) || ''}
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3
                                            style={{
                                                fontSize: 'var(--fs-base)',
                                                fontWeight: 700,
                                                letterSpacing: '-0.01em',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {team?.name || ''}
                                        </h3>
                                        {team?.leagueName && (
                                            <p style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 'var(--fs-2xs)', color: 'var(--text-3)' }}>
                                                <Trophy size={11} />
                                                {team.leagueName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Season stats */}
                                {team.rank !== undefined && (
                                    <ListSection label="Season stats">
                                        <MetricRow
                                            label="Rank"
                                            value={
                                                <span style={{ color: team.rank === 1 ? 'var(--warn)' : undefined }}>
                                                    #{team.rank}
                                                </span>
                                            }
                                        />
                                        <MetricRow label="Points" value={team.points || 0} />
                                        <MetricRow
                                            label="Record (W-D-L)"
                                            value={`${team.wins || 0}-${team.draws || 0}-${team.losses || 0}`}
                                        />
                                        <MetricRow
                                            label="Goal difference"
                                            value={
                                                <span style={{ color: (team.goalDifference || 0) >= 0 ? 'var(--ok)' : 'var(--no)' }}>
                                                    {(team.goalDifference || 0) >= 0 ? '+' : ''}
                                                    {team.goalDifference || 0}
                                                </span>
                                            }
                                        />
                                    </ListSection>
                                )}

                                {/* Recent form */}
                                {(loadingMatches || recentForm.length > 0) && (
                                    <ListSection label="Recent form">
                                        <div className="row row-static" style={{ gap: 7 }}>
                                            {loadingMatches
                                                ? Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={i} className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                                                ))
                                                : recentForm.map((result, i) => (
                                                    <span
                                                        key={i}
                                                        className="flex-center t-num"
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            fontSize: 'var(--fs-2xs)',
                                                            fontWeight: 800,
                                                            color: result === 'W' ? 'var(--ok)' : result === 'L' ? 'var(--no)' : 'var(--warn)',
                                                            background: `rgb(var(--${result === 'W' ? 'ok' : result === 'L' ? 'no' : 'warn'}-rgb) / 0.13)`,
                                                            border: `1px solid rgb(var(--${result === 'W' ? 'ok' : result === 'L' ? 'no' : 'warn'}-rgb) / 0.26)`,
                                                        }}
                                                    >
                                                        {result}
                                                    </span>
                                                ))}
                                        </div>
                                    </ListSection>
                                )}

                                {/* Goal profile */}
                                <ListSection label="Goal profile">
                                    <MetricRow label="Played" value={team.matchesPlayed || 0} />
                                    <MetricRow
                                        label="Goals for"
                                        value={<span style={{ color: 'var(--ok)' }}>{team.goalsFor || 0}</span>}
                                    />
                                    <MetricRow
                                        label="Goals against"
                                        value={<span style={{ color: 'var(--no)' }}>{team.goalsAgainst || 0}</span>}
                                    />
                                </ListSection>

                                {/* Win rate */}
                                <ListSection label="Win rate">
                                    <div className="row row-static" style={{ alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 12 }}>
                                        <span
                                            className="t-num"
                                            style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--ok)', flexShrink: 0 }}
                                        >
                                            {winRate}%
                                        </span>
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                                                {team.wins || 0}/{team.matchesPlayed || 0} matches won
                                            </span>
                                            <span style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 1 }}>
                                                {team.wins || 0} wins · {team.draws || 0} draws · {team.losses || 0} losses
                                            </span>
                                            <span style={{ display: 'block', marginTop: 6, height: 5, borderRadius: 'var(--r-full)', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                                                <motion.span
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${winRate}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    style={{ display: 'block', height: '100%', background: 'var(--ok)', borderRadius: 'var(--r-full)' }}
                                                />
                                            </span>
                                        </span>
                                    </div>
                                </ListSection>

                                {/* Team info */}
                                {(team.colors || team.manager || team.description) && (
                                    <ListSection label="Team info">
                                        {team.colors && <Row icon={<Palette size={15} />} title={team.colors} />}
                                        {team.manager && (
                                            <Row icon={<UserCircle size={15} />} title={team.manager} subtitle="Manager" />
                                        )}
                                        {team.description && (
                                            <div className="row row-static">
                                                <p style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                                    &ldquo;{team.description}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                    </ListSection>
                                )}
                            </div>
                        </div>

                        {/* Matches Tab */}
                        <div data-view="matches" className="scrollbar-hide" style={paneStyle}>
                            <div className="flow-body-inner">
                                {loadingMatches ? (
                                    <div className="flex-center" style={{ padding: 40 }}>
                                        <div className="spinner" />
                                    </div>
                                ) : matches.length === 0 ? (
                                    <EmptyState title="No matches available" compact />
                                ) : (
                                    <div className="list-section">
                                        {[...matches]
                                            .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date))
                                            .map(match => (
                                                <MatchRow key={match.externalId} match={match} teamName={team?.name || ''} />
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Squad Tab */}
                        <div data-view="squad" className="scrollbar-hide" style={paneStyle}>
                            <div className="flow-body-inner">
                                {loadingPlayers ? (
                                    <div className="flex-center" style={{ padding: 40 }}>
                                        <div className="spinner" />
                                    </div>
                                ) : sortedPlayers.length > 0 ? (
                                    <div className="list-section">
                                        {sortedPlayers.map((player, i) => (
                                            <div key={player.externalId} className="row row-static" style={{ minHeight: 52 }}>
                                                <span
                                                    className="flex-center t-num"
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '50%',
                                                        background: i < 3 ? 'rgb(var(--warn-rgb) / 0.14)' : 'var(--bg-subtle)',
                                                        color: i < 3 ? 'var(--warn)' : 'var(--text-2)',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {player.number || i + 1}
                                                </span>
                                                <span style={{ flex: 1, minWidth: 0 }}>
                                                    <span
                                                        style={{
                                                            display: 'block',
                                                            fontSize: 'var(--fs-xs)',
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {player.name}
                                                    </span>
                                                    <span className="t-num" style={{ display: 'block', fontSize: 'var(--fs-3xs)', color: 'var(--text-3)', marginTop: 1 }}>
                                                        {player.gamesPlayed} games
                                                    </span>
                                                </span>
                                                <span className="t-num" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text-2)', flexShrink: 0 }}>
                                                    <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{player.goals}</span> G
                                                    {' · '}
                                                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{player.assists}</span> A
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState title="No player stats available" compact />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Full Image Overlay */}
                    <AnimatePresence>
                        {showImage && team?.imageBase64 && (
                            <motion.div
                                className="backdrop flex-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(false);
                                }}
                                style={{ zIndex: 10026, padding: 20 }}
                            >
                                <motion.img
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    src={team.imageBase64}
                                    alt={team?.name || 'Team'}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80vh',
                                        borderRadius: 'var(--r-lg)',
                                        objectFit: 'contain',
                                    }}
                                />
                                <button
                                    className="icon-action press"
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setShowImage(false);
                                    }}
                                    aria-label="Close image"
                                    style={{ position: 'absolute', top: 'calc(var(--safe-top) + 16px)', right: 16 }}
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

function MatchRow({ match, teamName }: { match: ScraperMatch; teamName: string }) {
    if (!teamName || !match) {
        return (
            <div className="row row-static" style={{ opacity: 0.5 }}>
                <span className="t-caption">Loading match...</span>
            </div>
        );
    }

    const isPlayed = match.status === 'Played';
    const isHome = isHomeTeamForMatch(teamName, match.homeTeam, match.awayTeam);
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    const isForfait = match.forfait === true;

    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
    const resultColor = result === 'W' ? 'var(--ok)' : result === 'L' ? 'var(--no)' : 'var(--warn)';
    const resultToken = result === 'W' ? 'ok' : result === 'L' ? 'no' : 'warn';

    const dateStr = formatDateSafe(match.date, { day: 'numeric', month: 'short' }, 'TBD');
    const timeStr = formatTimeSafe(match.date, { hour: '2-digit', minute: '2-digit' }, 'TBD');

    return (
        <div className="row row-static" style={{ minHeight: 52, opacity: isForfait ? 0.6 : 1 }}>
            <span
                className="flex-center t-num"
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: !isPlayed
                        ? 'rgb(var(--accent-rgb) / 0.12)'
                        : isForfait
                            ? 'rgb(var(--tbd-rgb) / 0.12)'
                            : `rgb(var(--${resultToken}-rgb) / 0.12)`,
                    color: !isPlayed ? 'var(--accent)' : isForfait ? 'var(--tbd)' : resultColor,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    flexShrink: 0,
                }}
                aria-label={!isPlayed ? 'Scheduled' : isForfait ? 'Forfait' : `Result ${result}`}
            >
                {!isPlayed ? <Calendar size={13} /> : isForfait ? 'F' : result}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
                <span
                    style={{
                        display: 'block',
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {opponent}
                </span>
                <span
                    className="t-num"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 1,
                        fontSize: 'var(--fs-3xs)',
                        color: 'var(--text-3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.6 }} aria-label={isHome ? 'Home' : 'Away'}>
                        {isHome ? <Home size={10} strokeWidth={2} /> : <Navigation size={10} strokeWidth={2} />}
                    </span>
                    <span>{dateStr} · {timeStr}</span>
                    {match.location && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>· {match.location}</span>}
                </span>
            </span>

            {isPlayed && (
                <span
                    className="t-num"
                    style={{
                        fontSize: isForfait ? 'var(--fs-3xs)' : 'var(--fs-sm)',
                        fontWeight: 800,
                        color: isForfait ? 'var(--tbd)' : resultColor,
                        textTransform: isForfait ? 'uppercase' : 'none',
                        flexShrink: 0,
                    }}
                >
                    {isForfait ? 'Forfait' : `${teamScore} - ${opponentScore}`}
                </span>
            )}
        </div>
    );
}
