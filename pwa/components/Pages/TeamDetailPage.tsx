'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ElementType, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, UserCircle, Trophy, Calendar, Users, TrendingUp, X, MoreHorizontal, ExternalLink, Home, Navigation } from 'lucide-react';
import { parseDate, parseDateToTimestamp, formatDateSafe, formatTimeSafe } from '@/lib/dateUtils';
import { isHomeTeamForMatch } from '@/lib/teamNameMatching';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { hapticPatterns } from '@/lib/haptic';

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
    players: ScraperPlayer[];
    open: boolean;
    onClose: () => void;
}

const SectionCard = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
    <div style={{
        background: 'var(--color-bg-elevated)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 16,
        border: '0.5px solid var(--color-border)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        ...style,
    }}>
        {children}
    </div>
);

const SectionHeader = ({ icon: Icon, title, color = 'var(--color-text-tertiary)' }: {
    icon: ElementType;
    title: string;
    color?: string;
}) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    }}>
        <Icon size={14} style={{ color }} />
        <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}>
            {title}
        </span>
    </div>
);

export default function TeamDetailPage({ team, players, open, onClose }: TeamDetailPageProps) {
    const [showImage, setShowImage] = useState(false);
    const [activeTab, setActiveTab] = useState<TeamDetailTab>('overview');
    const [matches, setMatches] = useState<ScraperMatch[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const overviewRef = useRef<HTMLDivElement>(null);
    const matchesRef = useRef<HTMLDivElement>(null);
    const squadRef = useRef<HTMLDivElement>(null);

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
                let coreMatches: any[] = [];
                
                if (lzvRes.ok) {
                    lzvMatches = await lzvRes.json();
                }
                
                if (coreRes.ok) {
                    coreMatches = await coreRes.json();
                }
                
                // Merge CoreMatch forfait data into LZV matches
                // Match on calendar day (same logic as RecentMatchesSheet)
                const mergedMatches = lzvMatches.map((lzvMatch: ScraperMatch) => {
                    const lzvDate = new Date(lzvMatch.date);
                    
                    const coreMatch = coreMatches.find((core: any) => {
                        const coreDate = new Date(core.date);
                        // Match on calendar day
                        const sameCalendarDay = 
                            lzvDate.getUTCFullYear() === coreDate.getUTCFullYear() &&
                            lzvDate.getUTCMonth() === coreDate.getUTCMonth() &&
                            lzvDate.getUTCDate() === coreDate.getUTCDate();
                        return sameCalendarDay;
                    });
                    
                    if (coreMatch) {
                        return {
                            ...lzvMatch,
                            forfait: coreMatch.forfait
                        };
                    }
                    
                    return lzvMatch;
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
            const viewIndex = view === 'overview' ? 0 : view === 'matches' ? 1 : 2;
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

    if (typeof document === 'undefined') return null;

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

    // Split matches into upcoming and past
    const now = Date.now();
    const upcomingMatches = matches
        .filter(m => parseDateToTimestamp(m.date) > now || m.status === 'Scheduled')
        .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
    const pastMatches = matches
        .filter(m => parseDateToTimestamp(m.date) <= now && m.status === 'Played')
        .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
    const winRate = team.matchesPlayed && team.matchesPlayed > 0
        ? Math.round(((team.wins || 0) / team.matchesPlayed) * 100)
        : 0;

    // Sort players by goals
    // Extract per-team stats for THIS team specifically
    const sortedPlayers = hasTeam
        ? players
            .map(p => {
                // Find stats for this specific team
                const teamStats = p.teamStats?.find(ts => ts.teamId === team.externalId);

                // Use team-specific stats if available, otherwise fall back to aggregated
                return {
                    ...p,
                    // Override with per-team stats
                    goals: teamStats?.goals ?? p.goals,
                    assists: teamStats?.assists ?? p.assists,
                    gamesPlayed: teamStats?.gamesPlayed ?? p.gamesPlayed,
                    number: teamStats?.number ?? p.number,
                };
            })
            .sort((a, b) => b.goals - a.goals)
        : [];

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--color-bg)',
                        zIndex: 10020,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header: floating glass pills (back + title) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 'calc(var(--safe-top) + 20px) 12px 10px',
                        }}
                    >
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                onClose();
                            }}
                            aria-label="Back"
                            style={{
                                flexShrink: 0,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '0.5px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-lg)',
                            }}
                        >
                            <ChevronLeft size={22} strokeWidth={2} />
                        </motion.button>

                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '8px 14px',
                                borderRadius: 999,
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '0.5px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-lg)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1.2,
                                    width: '100%',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {team?.name || ''}
                            </div>
                            {team?.leagueName && (
                                <div
                                    style={{
                                        fontSize: '0.72rem',
                                        color: 'var(--color-text-secondary)',
                                        lineHeight: 1.2,
                                        width: '100%',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {team.leagueName}
                                </div>
                            )}
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                setMenuOpen(o => !o);
                            }}
                            aria-label="More options"
                            style={{
                                flexShrink: 0,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'var(--color-glass-heavy)',
                                backdropFilter: 'blur(40px)',
                                WebkitBackdropFilter: 'blur(40px)',
                                border: '0.5px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-lg)',
                            }}
                        >
                            <MoreHorizontal size={20} strokeWidth={2} />
                        </motion.button>
                    </div>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                        {menuOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setMenuOpen(false);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        zIndex: 6,
                                    }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(var(--safe-top) + 68px)',
                                        right: 12,
                                        zIndex: 7,
                                        minWidth: 220,
                                        padding: 6,
                                        borderRadius: 14,
                                        background: 'var(--color-glass-heavy)',
                                        backdropFilter: 'blur(40px)',
                                        WebkitBackdropFilter: 'blur(40px)',
                                        border: '0.5px solid var(--color-border)',
                                        boxShadow: 'var(--shadow-lg)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                    }}
                                >
                                    <a
                                        href={`https://www.lzvcup.be/teams/detail/${team?.externalId || ''}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            setMenuOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            color: 'var(--color-text-primary)',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <ExternalLink size={16} style={{ color: 'var(--color-text-secondary)' }} />
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
                        <div
                            ref={overviewRef}
                            data-view="overview"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 100px)',
                                overflowY: 'auto',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <SectionCard style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                        {team?.imageBase64 ? (
                                            <img
                                                src={team.imageBase64}
                                                alt={team?.name || ''}
                                                onClick={() => {
                                                    hapticPatterns.tap();
                                                    setShowImage(true);
                                                }}
                                                style={{
                                                    width: 72, height: 72,
                                                    borderRadius: 14,
                                                    objectFit: 'cover',
                                                    border: '1px solid var(--color-border)',
                                                    cursor: 'zoom-in',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 72, height: 72,
                                                borderRadius: 14,
                                                background: 'var(--color-surface-hover)',
                                                border: '1px solid var(--color-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent)',
                                                flexShrink: 0,
                                            }}>
                                                {team?.name?.charAt(0) || ''}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '1.25rem',
                                                fontWeight: 700,
                                                color: 'var(--color-text-primary)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {team?.name || ''}
                                            </div>
                                            {team?.leagueName && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginTop: 4,
                                                }}>
                                                    <Trophy size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                        {team.leagueName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </SectionCard>

                                {team.rank !== undefined && (
                                    <SectionCard>
                                        <SectionHeader
                                            icon={TrendingUp}
                                            title="Season Stats"
                                            color="var(--color-accent)"
                                        />
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 0',
                                        }}>
                                            <StatItem label="Rank" value={`#${team.rank}`} color={team.rank === 1 ? 'var(--color-warning)' : 'var(--color-text-primary)'} />
                                            <StatItem label="Points" value={team.points || 0} />
                                            <StatItem label="Record" value={`${team.wins || 0}-${team.draws || 0}-${team.losses || 0}`} />
                                            <StatItem
                                                label="Goal Diff"
                                                value={`${(team.goalDifference || 0) >= 0 ? '+' : ''}${team.goalDifference || 0}`}
                                                color={(team.goalDifference || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                                            />
                                        </div>
                                    </SectionCard>
                                )}

                                {(loadingMatches || recentForm.length > 0) && (
                                    <SectionCard>
                                        <SectionHeader
                                            icon={TrendingUp}
                                            title="Recent Form"
                                            color="var(--color-success)"
                                        />
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {loadingMatches ? (
                                                // Skeleton loading state
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            width: 36, height: 36,
                                                            borderRadius: 10,
                                                            background: 'var(--color-surface-hover)',
                                                            animation: 'pulse 1.5s ease-in-out infinite',
                                                        }}
                                                    />
                                                ))
                                            ) : (
                                                recentForm.map((result, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        style={{
                                                            width: 36, height: 36,
                                                            borderRadius: 10,
                                                            background: result === 'W' ? 'rgb(var(--color-success-rgb) / 0.2)' :
                                                                result === 'L' ? 'rgb(var(--color-danger-rgb) / 0.2)' :
                                                                    'rgb(var(--color-warning-rgb) / 0.2)',
                                                            border: `1px solid ${result === 'W' ? 'rgb(var(--color-success-rgb) / 0.3)' :
                                                                result === 'L' ? 'rgb(var(--color-danger-rgb) / 0.3)' :
                                                                    'rgb(var(--color-warning-rgb) / 0.3)'}`,
                                                            color: result === 'W' ? 'var(--color-success)' :
                                                                result === 'L' ? 'var(--color-danger)' : 'var(--color-warning)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.9rem',
                                                            fontWeight: 800,
                                                        }}
                                                    >
                                                        {result}
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </SectionCard>
                                )}

                                <SectionCard>
                                    <SectionHeader
                                        icon={Trophy}
                                        title="Goal Profile"
                                        color="var(--color-warning)"
                                    />
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                        gap: 12,
                                    }}>
                                        <CompactStat label="Played" value={team.matchesPlayed || 0} />
                                        <CompactStat label="For" value={team.goalsFor || 0} color="var(--color-success)" />
                                        <CompactStat label="Against" value={team.goalsAgainst || 0} color="var(--color-danger)" />
                                    </div>
                                </SectionCard>

                                <SectionCard>
                                    <SectionHeader
                                        icon={TrendingUp}
                                        title="Win Rate"
                                        color="var(--color-success)"
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 96,
                                            height: 96,
                                            borderRadius: 24,
                                            background: 'linear-gradient(135deg, rgb(var(--color-success-rgb) / 0.16), var(--color-surface-hover))',
                                            border: '1px solid rgb(var(--color-success-rgb) / 0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <div style={{
                                                fontSize: '2rem',
                                                fontWeight: 900,
                                                color: 'var(--color-success)',
                                                lineHeight: 1,
                                            }}>
                                                {winRate}%
                                            </div>
                                            <div style={{
                                                fontSize: '0.62rem',
                                                color: 'var(--color-text-tertiary)',
                                                marginTop: 5,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}>
                                                Wins
                                            </div>
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                    {team.wins || 0}/{team.matchesPlayed || 0} matches won
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                                                    {team.draws || 0} draws · {team.losses || 0} losses
                                                </div>
                                            </div>
                                            <div style={{
                                                height: 7,
                                                borderRadius: 999,
                                                background: 'var(--color-surface-hover)',
                                                overflow: 'hidden',
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${winRate}%` }}
                                                    transition={{ duration: 0.55, ease: 'easeOut' }}
                                                    style={{
                                                        height: '100%',
                                                        borderRadius: 999,
                                                        background: 'var(--color-success)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>

                                {(team.colors || team.manager || team.description) && (
                                    <SectionCard>
                                        <SectionHeader
                                            icon={UserCircle}
                                            title="Team Info"
                                            color="var(--color-accent)"
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {team.colors && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: '1rem' }}>🎨</span>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                                                        {team.colors}
                                                    </span>
                                                </div>
                                            )}
                                            {team.manager && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <UserCircle size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                                                        {team.manager}
                                                    </span>
                                                </div>
                                            )}
                                            {team.description && (
                                                <div style={{
                                                    fontSize: '0.85rem',
                                                    color: 'var(--color-text-secondary)',
                                                    fontStyle: 'italic',
                                                    lineHeight: 1.5,
                                                    paddingTop: team.manager || team.colors ? 8 : 0,
                                                    borderTop: team.manager || team.colors ? '1px solid var(--color-border-subtle)' : 'none',
                                                }}>
                                                    "{team.description}"
                                                </div>
                                            )}
                                        </div>
                                    </SectionCard>
                                )}
                            </div>
                        </div>

                        {/* Matches Tab */}
                        <div
                            ref={matchesRef}
                            data-view="matches"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 100px)',
                                overflowY: 'auto',
                            }}
                        >
                            {loadingMatches ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 40, color: 'var(--color-text-secondary)',
                                }}>
                                    <div className="spinner" style={{ width: 24, height: 24 }} />
                                </div>
                            ) : matches.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: 40,
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    No matches available
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {matches
                                        .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date))
                                        .map(match => (
                                            <MatchRow key={match.externalId} match={match} teamName={team?.name || ''} />
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Squad Tab */}
                        <div
                            ref={squadRef}
                            data-view="squad"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 'calc(var(--safe-top) + 84px) 16px calc(var(--safe-bottom, 0px) + 100px)',
                                overflowY: 'auto',
                            }}
                        >
                            {sortedPlayers.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {sortedPlayers.map((player, i) => (
                                        <div key={player.externalId} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 12px',
                                            background: i < 3 ? 'rgb(var(--color-warning-rgb) / 0.08)' : 'var(--color-surface-hover)',
                                            borderRadius: 12,
                                            border: '0.5px solid var(--color-border-subtle)',
                                        }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: i < 3 ? 'var(--color-warning)' : 'var(--color-surface-hover)',
                                                color: i < 3 ? 'var(--color-bg)' : 'var(--color-text-primary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {player.number || i + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 500,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {player.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                                    {player.gamesPlayed} games
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, fontSize: '0.9rem' }}>
                                                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>⚽ {player.goals}</span>
                                                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>🎯 {player.assists}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center', padding: 40,
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    No player stats available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs (liquid glass pill) at bottom */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 5,
                        padding: '8px 20px calc(var(--safe-bottom, 0px) + 8px)',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 2,
                            padding: 4,
                            background: 'var(--color-glass-heavy)',
                            backdropFilter: 'blur(60px)',
                            WebkitBackdropFilter: 'blur(60px)',
                            border: '0.5px solid var(--color-border)',
                            borderRadius: 999,
                            boxShadow: 'var(--shadow-lg)',
                            maxWidth: 320,
                            margin: '0 auto',
                        }}>
                            {([
                                { id: 'overview', icon: TrendingUp, label: 'Overview' },
                                { id: 'matches', icon: Calendar, label: 'Matches' },
                                { id: 'squad', icon: Users, label: 'Squad' },
                            ] as const).map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <motion.button
                                        key={tab.id}
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            setActiveTab(tab.id);
                                            scrollToView(tab.id);
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            background: isActive ? 'var(--color-surface-hover)' : 'transparent',
                                            border: 'none',
                                            borderRadius: 999,
                                            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 2,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <tab.icon size={18} strokeWidth={1.75} />
                                        <span style={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1 }}>
                                            {tab.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Full Image Overlay */}
                    <AnimatePresence>
                        {showImage && team?.imageBase64 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(false);
                                }}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 10021,
                                    background: 'var(--color-overlay)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 20,
                                }}
                            >
                                <motion.img
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.8 }}
                                    src={team.imageBase64}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80vh',
                                        borderRadius: 16,
                                        objectFit: 'contain',
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        hapticPatterns.tap();
                                        setShowImage(false);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 20, right: 20,
                                        background: 'var(--color-surface-hover)',
                                        border: 'none', borderRadius: '50%',
                                        width: 40, height: 40,
                                        color: 'var(--color-text-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={24} />
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

// Sub-components
function StatItem({ label, value, color = 'var(--color-text-primary)' }: {
    label: string;
    value: ReactNode;
    color?: string;
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
        }}>
            <div style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color,
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-tertiary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                {label}
            </div>
        </div>
    );
}

function CompactStat({ label, value, color = 'var(--color-text-primary)' }: {
    label: string;
    value: ReactNode;
    color?: string;
}) {
    return (
        <div style={{
            padding: '12px 8px',
            minHeight: 72,
            background: 'var(--color-surface-hover)',
            borderRadius: 12,
            border: '0.5px solid var(--color-border-subtle)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
        }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-tertiary)',
                marginTop: 4,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
            }}>
                {label}
            </div>
        </div>
    );
}

function MatchRow({ match, teamName }: { match: ScraperMatch; teamName: string }) {
    if (!teamName || !match) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--color-surface)',
                borderRadius: 12,
                border: '1px solid var(--color-border-subtle)',
                opacity: 0.5,
            }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Loading match...</span>
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
    const resultColor = result === 'W' ? 'var(--color-success)' : result === 'L' ? 'var(--color-danger)' : 'var(--color-warning)';
    const forfaitColor = 'var(--color-text-tertiary)';

    const dateStr = formatDateSafe(match.date, { day: 'numeric', month: 'short' }, 'TBD');
    const timeStr = formatTimeSafe(match.date, { hour: '2-digit', minute: '2-digit' }, 'TBD');

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: isPlayed && !isForfait ? 'var(--color-surface-hover)' : 'var(--color-surface)',
            borderRadius: 12,
            border: `1px solid ${isPlayed && !isForfait ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
            opacity: isForfait ? 0.6 : 1,
        }}>
            {/* Result indicator for played matches */}
            {isPlayed && (
                <div style={{
                    width: 28, height: 28,
                    borderRadius: 8,
                    background: isForfait ? `${forfaitColor}15` : `${resultColor}20`,
                    color: isForfait ? forfaitColor : resultColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                }}>
                    {isForfait ? 'F' : result}
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opponent}
                    </span>
                    {isForfait && (
                        <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '1px 4px',
                            borderRadius: 4,
                            background: 'rgb(var(--color-danger-rgb) / 0.15)',
                            color: 'var(--color-danger)',
                            flexShrink: 0,
                            marginLeft: 6,
                        }}>
                            Forfait
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.5 }}>
                        {isHome ? <Home size={10} strokeWidth={2} /> : <Navigation size={10} strokeWidth={2} />}
                    </span>
                    <span>{dateStr} • {timeStr}</span>
                    {match.location && <span>• {match.location}</span>}
                </div>
            </div>

            {/* Score for played matches */}
            {isPlayed && (
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: isForfait ? forfaitColor : resultColor,
                }}>
                    {isForfait ? 'Forfait' : `${teamScore} - ${opponentScore}`}
                </div>
            )}
        </div>
    );
}
