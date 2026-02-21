'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMatches, useAllPlayers, type ScraperTeam } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import MatchCard from './MatchCard';
import StatsView from './StatsView';
import SettingsView from './SettingsView';
import LeagueView from './LeagueView';
import LeagueSelector from './LeagueSelector';
import PullToRefresh from './PullToRefresh';
import { parseDateToTimestamp } from '@/lib/dateUtils';
import TopOverlayHeader from './TopOverlayHeader';
import NotificationSheet from './NotificationSheet';
import { buildMatchReminders } from '@/lib/notifications';

interface DashboardProps {
    playerId: number;
    currentView: 'home' | 'stats' | 'league' | 'settings';
    onLogout: () => void;
    onViewChange: (view: 'home' | 'stats' | 'league' | 'settings') => void;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
}

// View order for determining slide position
const viewOrder = ['home', 'stats', 'league', 'settings'] as const;
type ViewType = typeof viewOrder[number];
const viewTitles: Record<ViewType, string> = {
    home: 'Matches',
    stats: 'Leaderboard',
    league: 'League',
    settings: 'Settings',
};

const getLeagueAlias = (league: string) => {
    const lower = league.toLowerCase();
    if (lower.includes('mechelen')) return 'Mechelen';
    if (lower.includes('leuven')) return 'Leuven';
    return league;
};

export default function Dashboard({ playerId, currentView, onLogout, onViewChange, onPlayerManagementOpenChange }: DashboardProps) {
    const { matches, loading, error, fetchMatches, setMatches } = useMatches(playerId);
    const { players, fetchAllPlayers } = useAllPlayers();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
    const [isStatsRulesOpen, setIsStatsRulesOpen] = useState(false);
    const [leagueTab, setLeagueTab] = useState<'standings' | 'players'>('standings');
    const [selectedLeague, setSelectedLeague] = useState('');
    const [leagueOptions, setLeagueOptions] = useState<string[]>([]);
    const [leagueTeams, setLeagueTeams] = useState<ScraperTeam[]>([]);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [highlightedMatchId, setHighlightedMatchId] = useState<number | null>(null);
    const upcomingRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const matchCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Sync control refs - simplified approach
    const scrollSourceRef = useRef<'nav' | 'swipe' | null>(null);
    const lastViewRef = useRef<ViewType>(currentView);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);

    const setMatchCardRef = useCallback((matchId: number, node: HTMLDivElement | null) => {
        if (!node) {
            matchCardRefs.current.delete(matchId);
            return;
        }
        matchCardRefs.current.set(matchId, node);
    }, []);

    useEffect(() => {
        fetchMatches();
        fetchAllPlayers();
    }, [fetchMatches, fetchAllPlayers]);

    useEffect(() => {
        if (currentView !== 'league') {
            setIsLeagueSelectorOpen(false);
        }
        if (currentView !== 'stats') {
            setIsStatsRulesOpen(false);
        }
    }, [currentView]);

    useEffect(() => {
        if (selectedLeague && !leagueOptions.includes(selectedLeague)) {
            setSelectedLeague('');
        }
    }, [selectedLeague, leagueOptions]);

    // Get current view index from scroll position
    const getViewIndexFromScroll = useCallback((): number => {
        if (!scrollContainerRef.current) return 0;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const viewWidth = scrollContainerRef.current.clientWidth || window.innerWidth;
        return Math.round(scrollLeft / viewWidth);
    }, []);

    // Scroll to a specific view
    const scrollToView = useCallback((view: ViewType, instant = false) => {
        if (!scrollContainerRef.current) return;
        
        const viewIndex = viewOrder.indexOf(view);
        const viewWidth = scrollContainerRef.current.clientWidth || window.innerWidth;
        const scrollTarget = viewIndex * viewWidth;
        
        scrollContainerRef.current.scrollTo({
            left: scrollTarget,
            behavior: instant ? 'auto' : 'smooth',
        });
    }, []);

    // Initial scroll to correct view when component mounts (handles URL params like ?view=settings)
    useEffect(() => {
        if (loading) return;
        if (!scrollContainerRef.current) return;
        if (!isInitialMount.current) return;
        
        // On initial mount, always scroll to the current view (instantly)
        const currentScrollIndex = getViewIndexFromScroll();
        const targetIndex = viewOrder.indexOf(currentView);
        
        if (currentScrollIndex !== targetIndex) {
            scrollSourceRef.current = 'nav';
            scrollToView(currentView, true); // instant scroll on initial mount
        }
        
        lastViewRef.current = currentView;
        isInitialMount.current = false;
    }, [loading, currentView, getViewIndexFromScroll, scrollToView]);

    // Sync scroll position when currentView changes from nav click (after initial mount)
    useEffect(() => {
        if (loading) return;
        if (!scrollContainerRef.current) return;
        if (isInitialMount.current) return; // Skip on initial mount, handled above
        
        // If the view changed and we're not currently swiping, scroll to it
        if (currentView !== lastViewRef.current) {
            const currentScrollIndex = getViewIndexFromScroll();
            const targetIndex = viewOrder.indexOf(currentView);
            
            // Only scroll if we're not already at the target (prevents fighting with swipe)
            if (currentScrollIndex !== targetIndex) {
                scrollSourceRef.current = 'nav';
                scrollToView(currentView, false); // smooth scroll after initial
            }
            
            lastViewRef.current = currentView;
        }
    }, [loading, currentView, getViewIndexFromScroll, scrollToView]);

    // Handle scroll events to detect swipe and update view
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        
        // Clear any pending end timeout
        if (scrollEndTimeoutRef.current) {
            clearTimeout(scrollEndTimeoutRef.current);
        }
        
        // If this scroll was triggered by nav click, ignore updates
        if (scrollSourceRef.current === 'nav') {
            // Reset after scroll settles
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                scrollSourceRef.current = null;
            }, 150);
            return;
        }
        
        // Calculate which view is most visible RIGHT NOW (no delay)
        const viewIndex = getViewIndexFromScroll();
        const newView = viewOrder[viewIndex];
        
        // Update immediately if view changed - this makes the pill feel responsive
        if (newView && newView !== lastViewRef.current) {
            hapticPatterns.swipe();
            lastViewRef.current = newView;
            onViewChange(newView);
        }
        
        // Set a fallback timeout for final sync after scroll completely stops
        scrollEndTimeoutRef.current = setTimeout(() => {
            const finalViewIndex = getViewIndexFromScroll();
            const finalView = viewOrder[finalViewIndex];
            
            if (finalView && finalView !== lastViewRef.current) {
                lastViewRef.current = finalView;
                onViewChange(finalView);
            }
            
            scrollSourceRef.current = null;
        }, 150);
    }, [getViewIndexFromScroll, onViewChange]);

    // Sync on app resume (visibility change)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && scrollContainerRef.current) {
                // App resumed - sync scroll position to current view
                requestAnimationFrame(() => {
                    const currentScrollIndex = getViewIndexFromScroll();
                    const stateIndex = viewOrder.indexOf(currentView);
                    
                    if (currentScrollIndex !== stateIndex) {
                        // Scroll position doesn't match state - resync
                        scrollSourceRef.current = 'nav';
                        scrollToView(currentView, true);
                    }
                });
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [currentView, getViewIndexFromScroll, scrollToView]);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (scrollEndTimeoutRef.current) {
                clearTimeout(scrollEndTimeoutRef.current);
            }
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
            }
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchMatches(), fetchAllPlayers()]);
            hapticPatterns.success();
        } catch (err) {
            hapticPatterns.error();
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchMatches, fetchAllPlayers]);

    const handleUpdate = async (matchId?: number, newStatus?: 'Present' | 'NotPresent' | 'Maybe') => {
        if (matchId !== undefined && newStatus !== undefined) {
            setMatches(prevMatches =>
                prevMatches.map(match => {
                    if (match.id === matchId) {
                        const updatedAttendances = match.attendances ? [...match.attendances] : [];
                        const existingIndex = updatedAttendances.findIndex(att => att.playerId === playerId);

                        if (existingIndex >= 0) {
                            updatedAttendances[existingIndex] = { ...updatedAttendances[existingIndex], status: newStatus };
                        } else {
                            updatedAttendances.push({ playerId, status: newStatus });
                        }

                        return { ...match, attendances: updatedAttendances };
                    }
                    return match;
                })
            );
        } else {
            await fetchMatches();
        }
    };

    // Split matches
    const now = Date.now();
    const threshold = now - 2 * 60 * 60 * 1000;

    const heroMatch = matches.find(m => parseDateToTimestamp(m.date) > threshold);
    const remainingMatches = matches.filter(m => m.id !== heroMatch?.id);
    const upcomingMatches = remainingMatches.filter(m => parseDateToTimestamp(m.date) > threshold);
    const pastMatches = remainingMatches
        .filter(m => parseDateToTimestamp(m.date) <= threshold)
        .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
    const notificationSummary = useMemo(
        () => buildMatchReminders(matches, playerId),
        [matches, playerId]
    );
    const currentTitle = viewTitles[currentView];
    const selectedLeagueAlias = useMemo(
        () => (selectedLeague ? getLeagueAlias(selectedLeague) : ''),
        [selectedLeague]
    );

    const openNotificationSheet = () => {
        hapticPatterns.tap();
        setIsNotificationSheetOpen(true);
    };

    const closeNotificationSheet = () => {
        setIsNotificationSheetOpen(false);
    };

    const handleLeagueDataChange = useCallback((data: { leagues: string[]; teams: ScraperTeam[] }) => {
        setLeagueOptions(prev => (
            prev.length === data.leagues.length &&
            prev.every((league, index) => league === data.leagues[index])
        ) ? prev : data.leagues);

        setLeagueTeams(prev => (prev === data.teams ? prev : data.teams));
    }, []);

    const handleCycleLeague = useCallback(() => {
        if (leagueOptions.length === 0) return;

        hapticPatterns.tap();

        if (!selectedLeague || !leagueOptions.includes(selectedLeague)) {
            setSelectedLeague(leagueOptions[0]);
            return;
        }

        const currentIndex = leagueOptions.indexOf(selectedLeague);
        const nextIndex = (currentIndex + 1) % leagueOptions.length;
        setSelectedLeague(leagueOptions[nextIndex]);
    }, [leagueOptions, selectedLeague]);

    const openLeagueSelector = useCallback(() => {
        if (leagueOptions.length === 0) return;
        hapticPatterns.tap();
        setIsLeagueSelectorOpen(true);
    }, [leagueOptions.length]);

    const openStatsRules = useCallback(() => {
        hapticPatterns.tap();
        setIsStatsRulesOpen(true);
    }, []);

    const topLeagueControls = currentView === 'league'
        ? {
            activeTab: leagueTab,
            selectedLeague: selectedLeagueAlias,
            hasLeagues: leagueOptions.length > 0,
            onCycleLeague: handleCycleLeague,
            onOpenLeagueSelector: openLeagueSelector,
            onSelectTab: setLeagueTab,
        }
        : undefined;
    const topStatsControls = currentView === 'stats'
        ? { onOpenRules: openStatsRules }
        : undefined;

    const handleReminderSelect = useCallback((matchId: number) => {
        setIsNotificationSheetOpen(false);

        if (currentView !== 'home') {
            onViewChange('home');
        }

        const focusDelay = currentView === 'home' ? 220 : 520;

        if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
        }

        focusTimeoutRef.current = setTimeout(() => {
            const targetNode = matchCardRefs.current.get(matchId);
            if (!targetNode) return;

            targetNode.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });

            setHighlightedMatchId(null);
            requestAnimationFrame(() => setHighlightedMatchId(matchId));

            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
            highlightTimeoutRef.current = setTimeout(() => {
                setHighlightedMatchId(null);
            }, 1200);

            focusTimeoutRef.current = null;
        }, focusDelay);
    }, [currentView, onViewChange]);

    // Loading state
    if (loading) {
        return (
            <>
                <TopOverlayHeader
                    title={currentTitle}
                    notificationCount={notificationSummary.count}
                    onNotificationPress={openNotificationSheet}
                    leagueControls={topLeagueControls}
                    statsControls={topStatsControls}
                />
                <NotificationSheet
                    open={isNotificationSheetOpen}
                    reminders={notificationSummary.items}
                    totalCount={notificationSummary.count}
                    onReminderSelect={handleReminderSelect}
                    onClose={closeNotificationSheet}
                />
                <div className="container content-under-top-overlay">
                    <div className="glass-panel-heavy skeleton" style={{ height: 320, marginBottom: 'var(--space-xl)' }} />
                    <div className="grid-cards">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="glass-panel skeleton" style={{ height: 200 }} />
                        ))}
                    </div>
                </div>
            </>
        );
    }

    // Error state
    if (error) {
        return (
            <>
                <TopOverlayHeader
                    title={currentTitle}
                    notificationCount={notificationSummary.count}
                    onNotificationPress={openNotificationSheet}
                    leagueControls={topLeagueControls}
                    statsControls={topStatsControls}
                />
                <NotificationSheet
                    open={isNotificationSheetOpen}
                    reminders={notificationSummary.items}
                    totalCount={notificationSummary.count}
                    onReminderSelect={handleReminderSelect}
                    onClose={closeNotificationSheet}
                />
                <div className="container content-under-top-overlay flex-center" style={{ minHeight: '80dvh' }}>
                    <motion.div
                        className="glass-panel-heavy"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            padding: 'var(--space-2xl)',
                            textAlign: 'center',
                            maxWidth: 400,
                        }}
                    >
                        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>👻</div>
                        <h2 className="text-title" style={{ marginBottom: 'var(--space-sm)' }}>
                            Connection Lost
                        </h2>
                        <p className="text-body" style={{ marginBottom: 'var(--space-lg)' }}>
                            Unable to reach the server. Check your connection.
                        </p>
                        <button className="btn btn-primary touch-target" onClick={() => fetchMatches()}>
                            Try Again
                        </button>
                    </motion.div>
                </div>
            </>
        );
    }

    // Skeleton loading component for refresh
    const SkeletonContent = (
        <div className="container content-under-top-overlay">
            {/* Skeleton for hero match */}
            <div className="glass-panel-heavy skeleton" style={{ height: 320, marginBottom: 'var(--space-xl)' }} />

            {/* Skeleton for upcoming matches */}
            <h2 className="text-label" style={{ marginBottom: 'var(--space-md)' }}>
                Upcoming Matches
            </h2>
            <div className="grid-cards">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-panel skeleton" style={{ height: 200 }} />
                ))}
            </div>
        </div>
    );

    // Home content component
    const HomeContent = (
        <div className="container content-under-top-overlay">
            {/* Hero Section */}
            {heroMatch ? (
                <section style={{ marginBottom: 'var(--space-2xl)', position: 'relative' }}>
                    <h2 className="text-label" style={{ marginBottom: 'var(--space-md)' }}>
                        Next Match
                    </h2>
                    <motion.div
                        ref={(node) => setMatchCardRef(heroMatch.id, node)}
                        className={highlightedMatchId === heroMatch.id ? 'match-focus-pulse' : undefined}
                        style={{ borderRadius: 'var(--radius-xl)' }}
                        animate={highlightedMatchId === heroMatch.id ? { scale: [1, 1.01, 1] } : { scale: 1 }}
                        transition={highlightedMatchId === heroMatch.id
                            ? { duration: 0.8, times: [0, 0.35, 1], ease: 'easeOut' }
                            : { duration: 0.2 }}
                    >
                        <MatchCard
                            match={heroMatch}
                            currentPlayerId={playerId}
                            allPlayers={players}
                            onUpdate={handleUpdate}
                            variant="hero"
                        />
                    </motion.div>
                </section>
            ) : (
                <div
                    className="glass-panel-heavy flex-center"
                    style={{
                        minHeight: 300,
                        flexDirection: 'column',
                        textAlign: 'center',
                        padding: 'var(--space-2xl)',
                        marginBottom: 'var(--space-2xl)',
                    }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚽</div>
                    <h2 className="text-title">No Upcoming Matches</h2>
                    <p className="text-body">Time to schedule the next game!</p>
                </div>
            )}

            {/* Upcoming Matches */}
            {upcomingMatches.length > 0 && (
                <section ref={upcomingRef} style={{ marginBottom: 'var(--space-2xl)' }}>
                    <h2 className="text-label" style={{ marginBottom: 'var(--space-md)' }}>
                        Upcoming Matches
                    </h2>
                    <div className="grid-cards">
                        {upcomingMatches.map((match) => (
                            <motion.div
                                key={match.id}
                                ref={(node) => setMatchCardRef(match.id, node)}
                                className={highlightedMatchId === match.id ? 'match-focus-pulse' : undefined}
                                style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)' }}
                                animate={highlightedMatchId === match.id ? { scale: [1, 1.01, 1] } : { scale: 1 }}
                                transition={highlightedMatchId === match.id
                                    ? { duration: 0.8, times: [0, 0.35, 1], ease: 'easeOut' }
                                    : { duration: 0.2 }}
                            >
                                <MatchCard
                                    match={match}
                                    currentPlayerId={playerId}
                                    allPlayers={players}
                                    onUpdate={handleUpdate}
                                    variant="compact"
                                />
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Past Matches */}
            {pastMatches.length > 0 && (
                <section>
                    <h2 className="text-label" style={{ marginBottom: 'var(--space-md)' }}>
                        Past Matches
                    </h2>
                    <div className="grid-cards" style={{ opacity: 0.6 }}>
                        {pastMatches.slice(0, 4).map((match) => (
                            <motion.div
                                key={match.id}
                                ref={(node) => setMatchCardRef(match.id, node)}
                                className={highlightedMatchId === match.id ? 'match-focus-pulse' : undefined}
                                style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)' }}
                                animate={highlightedMatchId === match.id ? { scale: [1, 1.01, 1] } : { scale: 1 }}
                                transition={highlightedMatchId === match.id
                                    ? { duration: 0.8, times: [0, 0.35, 1], ease: 'easeOut' }
                                    : { duration: 0.2 }}
                            >
                                <MatchCard
                                    match={match}
                                    currentPlayerId={playerId}
                                    allPlayers={players}
                                    onUpdate={handleUpdate}
                                    variant="compact"
                                />
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );

    return (
        <>
            <TopOverlayHeader
                title={currentTitle}
                notificationCount={notificationSummary.count}
                onNotificationPress={openNotificationSheet}
                leagueControls={topLeagueControls}
                statsControls={topStatsControls}
            />
            <NotificationSheet
                open={isNotificationSheetOpen}
                reminders={notificationSummary.items}
                totalCount={notificationSummary.count}
                onReminderSelect={handleReminderSelect}
                onClose={closeNotificationSheet}
            />
            {currentView === 'league' && leagueOptions.length > 0 && (
                <LeagueSelector
                    leagues={leagueOptions}
                    selectedLeague={selectedLeague}
                    onSelect={setSelectedLeague}
                    teamsData={leagueTeams}
                    showTrigger={false}
                    open={isLeagueSelectorOpen}
                    onOpenChange={setIsLeagueSelectorOpen}
                />
            )}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                    display: 'flex',
                    width: '100vw',
                    height: '100dvh',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    // Hide scrollbar
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
                className="scrollbar-hide"
            >
                {/* Home View */}
                <div
                    data-view="home"
                    style={{
                        width: '100vw',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'hidden', // Changed to hidden because PullToRefresh handles scrolling
                    }}
                >
                    <PullToRefresh onRefresh={handleRefresh}>
                        {isRefreshing ? SkeletonContent : HomeContent}
                    </PullToRefresh>
                </div>

                {/* Stats View */}
                <div
                    data-view="stats"
                    style={{
                        width: '100vw',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'auto',
                    }}
                >
                    <StatsView
                        matches={matches}
                        players={players}
                        currentPlayerId={playerId}
                        showRules={isStatsRulesOpen}
                        onShowRulesChange={setIsStatsRulesOpen}
                    />
                </div>

                {/* League View */}
                <div
                    data-view="league"
                    style={{
                        width: '100vw',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'hidden', // LeagueView handles its own scrolling
                    }}
                >
                    <LeagueView
                        activeTab={leagueTab}
                        selectedLeague={selectedLeague}
                        onSelectedLeagueChange={setSelectedLeague}
                        onLeagueDataChange={handleLeagueDataChange}
                    />
                </div>

                {/* Settings View */}
                <div
                    data-view="settings"
                    style={{
                        width: '100vw',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'auto',
                    }}
                >
                    <SettingsView onLogout={onLogout} onPlayerManagementOpenChange={onPlayerManagementOpenChange} />
                </div>
            </div>
        </>
    );
}
