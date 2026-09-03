'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fetchRecentMatchesData, useMatches, useAllPlayers, type ScraperTeam } from '@/lib/useData';
import { hapticPatterns } from '@/lib/haptic';
import type { RecentMatchesResponse } from '@/lib/recentMatches';
import MatchSummary from './MatchBoard/MatchSummary';
import StatsView from './StatsView';
import SettingsView from './SettingsView';
import LeagueView from './LeagueView';
import LeagueSelector from './LeagueSelector';
import PullToRefresh from './PullToRefresh';
import { parseDateToTimestamp } from '@/lib/dateUtils';
import ScreenHeader from './ui/ScreenHeader';
import { EmptyState } from './ui/controls';
import NotificationSheet from './NotificationSheet';
import RecentMatchesSheet from './RecentMatchesSheet';
import UnlockDialog from './UnlockDialog';
import { buildMatchReminders } from '@/lib/notifications';
import { syncMatchPush } from '@/lib/pushSettings';

type Modal = 'version' | 'match' | 'players' | 'respond' | 'admin' | 'team' | 'rules' | 'playerDetail' | 'forfait' | null;

interface DashboardProps {
    playerId: number;
    currentView: 'home' | 'stats' | 'league' | 'settings';
    onLogout: () => void;
    onViewChange: (view: 'home' | 'stats' | 'league' | 'settings') => void;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
    onOpenVersion: () => void;
    isVersionOpen: boolean;
    onCloseVersion: () => void;
    currentModal: Modal;
    currentModalId: string | null;
    onOpenModal: (modal: Modal, modalId?: string | null) => void;
    onCloseModal: () => void;
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

const EMPTY_RECENT_MATCHES: RecentMatchesResponse = {
    matches: [],
    recentCount: 0,
    hasRecentWithin3Days: false,
};

export default function Dashboard({
    playerId,
    currentView,
    onLogout,
    onViewChange,
    onPlayerManagementOpenChange,
    onOpenVersion,
    isVersionOpen,
    onCloseVersion,
    currentModal,
    currentModalId,
    onOpenModal,
    onCloseModal,
}: DashboardProps) {
    const { matches, loading, error, fetchMatches, setMatches } = useMatches(playerId);
    const { players, fetchAllPlayers } = useAllPlayers();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isNotificationSheetOpen, setIsNotificationSheetOpen] = useState(false);
    const [isRecentMatchesSheetOpen, setIsRecentMatchesSheetOpen] = useState(false);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [leagueOptions, setLeagueOptions] = useState<string[]>([]);
    const [leagueTeams, setLeagueTeams] = useState<ScraperTeam[]>([]);
    const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
    const [highlightedMatchId, setHighlightedMatchId] = useState<number | null>(null);
    const [recentMatches, setRecentMatches] = useState<RecentMatchesResponse>(EMPTY_RECENT_MATCHES);
    const [loadingRecentMatches, setLoadingRecentMatches] = useState(true);
    const [showPastMatches, setShowPastMatches] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = localStorage.getItem('showPastMatches');
        return stored === null ? true : stored === 'true';
    });
    const [isHiddenAdminUnlocked, setIsHiddenAdminUnlocked] = useState(
        () => typeof window !== 'undefined' && localStorage.getItem('hiddenAdminUnlocked') === 'true'
    );
    const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
    const bellClickTimestampsRef = useRef<number[]>([]);
    const upcomingRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const matchCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollToNextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Sync control refs - simplified approach
    const scrollSourceRef = useRef<'nav' | 'swipe' | null>(null);
    const lastViewRef = useRef<ViewType>(currentView);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);
    const hasEverLoaded = useRef(false);

    const setMatchCardRef = useCallback((matchId: number, node: HTMLDivElement | null) => {
        if (!node) {
            matchCardRefs.current.delete(matchId);
            return;
        }
        matchCardRefs.current.set(matchId, node);
    }, []);

    const fetchRecentMatches = useCallback(async () => {
        setLoadingRecentMatches(true);
        try {
            const data = await fetchRecentMatchesData();
            setRecentMatches(data);
        } catch (recentMatchesError) {
            console.warn('Failed to fetch recent matches:', recentMatchesError);
            setRecentMatches(EMPTY_RECENT_MATCHES);
        } finally {
            setLoadingRecentMatches(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
        fetchAllPlayers();
        fetchRecentMatches();
    }, [fetchMatches, fetchAllPlayers, fetchRecentMatches]);

    // Track whether initial data has ever loaded to prevent skeleton flash on remount
    useEffect(() => {
        if (!loading && matches.length > 0) {
            hasEverLoaded.current = true;
        }
    }, [loading, matches.length]);

    useEffect(() => {
        if (currentView !== 'league') {
            setIsLeagueSelectorOpen(false);
        }
        if (currentView !== 'home') {
            setIsRecentMatchesSheetOpen(false);
        }
    }, [currentView]);

    useEffect(() => {
        if (selectedLeague && !leagueOptions.includes(selectedLeague)) {
            setSelectedLeague(leagueOptions[0] || '');
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

    // Listen for attendance updates from RespondAsPlayerPage
    useEffect(() => {
        const handleAttendanceUpdate = () => {
            // Refresh match attendance in the background so the current UI stays intact.
            fetchMatches({ silent: true });
        };
        window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
        return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    }, [fetchMatches]);

    useEffect(() => {
        const handleShowPastMatchesChanged = (event: Event) => {
            setShowPastMatches((event as CustomEvent<boolean>).detail);
        };
        window.addEventListener('showPastMatchesChanged', handleShowPastMatchesChanged);
        return () => window.removeEventListener('showPastMatchesChanged', handleShowPastMatchesChanged);
    }, []);

    useEffect(() => {
        const enabled = localStorage.getItem('notificationsEnabled') === 'true';
        void syncMatchPush(playerId, enabled).catch(() => {
            // Keep the toggle as-is; the next Settings visit can retry.
        });
    }, [playerId]);

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
            if (scrollToNextTimeoutRef.current) {
                clearTimeout(scrollToNextTimeoutRef.current);
            }
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchMatches(), fetchAllPlayers(), fetchRecentMatches()]);
            hapticPatterns.success();
        } catch (err) {
            hapticPatterns.error();
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchMatches, fetchAllPlayers, fetchRecentMatches]);

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

    // Split matches: chronological board, optional past history above the next kick-off.
    const matchesByDate = useMemo(
        () => [...matches].sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)),
        [matches]
    );
    const { pastMatches, heroMatch, boardMatches } = useMemo(() => {
        const threshold = Date.now() - 2 * 60 * 60 * 1000;
        const past = matchesByDate.filter(m => parseDateToTimestamp(m.date) <= threshold);
        const upcoming = matchesByDate.filter(m => parseDateToTimestamp(m.date) > threshold);
        return {
            pastMatches: past,
            heroMatch: upcoming[0],
            boardMatches: showPastMatches ? matchesByDate : upcoming,
        };
    }, [matchesByDate, showPastMatches]);
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

        if (currentView !== 'settings') {
            bellClickTimestampsRef.current = [];
            return;
        }

        const now = Date.now();
        bellClickTimestampsRef.current = bellClickTimestampsRef.current.filter(
            (t) => now - t <= 10_000
        );
        bellClickTimestampsRef.current.push(now);

        if (bellClickTimestampsRef.current.length >= 5 && !isHiddenAdminUnlocked) {
            bellClickTimestampsRef.current = [];
            fetch('http://192.168.129.250:8094/health')
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.status === 'ok') {
                        setIsUnlockDialogOpen(true);
                    }
                })
                .catch(() => {
                    // silently fail
                });
        }
    };

    const handleConfirmUnlock = () => {
        hapticPatterns.success();
        localStorage.setItem('hiddenAdminUnlocked', 'true');
        setIsHiddenAdminUnlocked(true);
        setIsUnlockDialogOpen(false);
    };

    const handleCancelUnlock = () => {
        hapticPatterns.tap();
        setIsUnlockDialogOpen(false);
    };

    const closeNotificationSheet = () => {
        setIsNotificationSheetOpen(false);
    };

    const openRecentMatchesSheet = () => {
        hapticPatterns.tap();
        setIsRecentMatchesSheetOpen(true);
    };

    const closeRecentMatchesSheet = () => {
        setIsRecentMatchesSheetOpen(false);
    };

    const handleLeagueDataChange = useCallback((data: { leagues: string[]; teams: ScraperTeam[] }) => {
        const targetLeagues = data.leagues;

        setLeagueOptions(prev => (
            prev.length === targetLeagues.length &&
            prev.every((league, index) => league === targetLeagues[index])
        ) ? prev : targetLeagues);

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
        onOpenModal('rules');
    }, [onOpenModal]);

    const topLeagueControls = currentView === 'league'
        ? {
            selectedLeague: selectedLeagueAlias,
            hasLeagues: leagueOptions.length > 1,
            onCycleLeague: handleCycleLeague,
            onOpenLeagueSelector: openLeagueSelector,
        }
        : undefined;
    const topStatsControls = currentView === 'stats'
        ? { onOpenRules: openStatsRules }
        : undefined;
    const topHomeControls = currentView === 'home'
        ? {
            recentCount: recentMatches.recentCount,
            hasRecentHighlight: recentMatches.hasRecentWithin3Days,
            onOpenRecentMatches: openRecentMatchesSheet,
        }
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

    // When past matches are shown, land on the next upcoming match after load/toggle.
    useEffect(() => {
        if (loading || isRefreshing || currentView !== 'home') return;
        if (!showPastMatches || !heroMatch || pastMatches.length === 0) return;

        if (scrollToNextTimeoutRef.current) {
            clearTimeout(scrollToNextTimeoutRef.current);
        }

        scrollToNextTimeoutRef.current = setTimeout(() => {
            const targetNode = matchCardRefs.current.get(heroMatch.id);
            if (!targetNode) {
                scrollToNextTimeoutRef.current = null;
                return;
            }

            targetNode.scrollIntoView({
                behavior: 'auto',
                block: 'start',
                inline: 'nearest',
            });
            scrollToNextTimeoutRef.current = null;
        }, 80);

        return () => {
            if (scrollToNextTimeoutRef.current) {
                clearTimeout(scrollToNextTimeoutRef.current);
                scrollToNextTimeoutRef.current = null;
            }
        };
    }, [
        loading,
        isRefreshing,
        currentView,
        showPastMatches,
        heroMatch,
        pastMatches.length,
        boardMatches.length,
    ]);

    // Loading state - only show skeleton on initial load when no data yet
    if (loading && matches.length === 0 && !hasEverLoaded.current) {
        return (
            <>
                <ScreenHeader
                    title={currentTitle}
                    notificationCount={notificationSummary.count}
                    onNotificationPress={openNotificationSheet}
                    homeControls={topHomeControls}
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
                <RecentMatchesSheet
                    open={isRecentMatchesSheetOpen}
                    loading={loadingRecentMatches}
                    matches={recentMatches.matches}
                    recentCount={recentMatches.recentCount}
                    hasRecentWithin3Days={recentMatches.hasRecentWithin3Days}
                    playerId={playerId}
                    internalMatches={matches}
                    onClose={closeRecentMatchesSheet}
                />
                <div className="app-frame">
                    <div className="screen">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="panel skeleton" style={{ height: 148 }} />
                            ))}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Error state
    if (error) {
        return (
            <>
                <ScreenHeader
                    title={currentTitle}
                    notificationCount={notificationSummary.count}
                    onNotificationPress={openNotificationSheet}
                    homeControls={topHomeControls}
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
                <RecentMatchesSheet
                    open={isRecentMatchesSheetOpen}
                    loading={loadingRecentMatches}
                    matches={recentMatches.matches}
                    recentCount={recentMatches.recentCount}
                    hasRecentWithin3Days={recentMatches.hasRecentWithin3Days}
                    playerId={playerId}
                    internalMatches={matches}
                    onClose={closeRecentMatchesSheet}
                />
                <div className="app-frame">
                    <div className="screen flex-center" style={{ minHeight: '80dvh' }}>
                        <motion.div
                            className="panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ padding: 28, textAlign: 'center', maxWidth: 360, width: '100%' }}
                        >
                            <h2 className="t-title" style={{ marginBottom: 6 }}>
                                Connection lost
                            </h2>
                            <p className="t-body" style={{ marginBottom: 18 }}>
                                Unable to reach the server. Check your connection.
                            </p>
                            <button className="btn btn-primary press" onClick={() => fetchMatches()}>
                                Try Again
                            </button>
                        </motion.div>
                    </div>
                </div>
            </>
        );
    }

    // Skeleton loading component for refresh
    const SkeletonContent = (
        <div className="screen">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="panel skeleton" style={{ height: 148 }} />
                ))}
            </div>
        </div>
    );

    // Home content: the one-page availability board for all upcoming matches.
    const HomeContent = (
        <div className="screen">
            {boardMatches.length === 0 ? (
                <EmptyState
                    title={showPastMatches ? 'No matches yet' : 'No upcoming matches'}
                    description="Check back later or contact the admin."
                />
            ) : (
                <section ref={upcomingRef}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {boardMatches.map((match) => (
                            <motion.div
                                key={match.id}
                                ref={(node) => setMatchCardRef(match.id, node)}
                                className={highlightedMatchId === match.id ? 'match-focus-pulse' : undefined}
                                style={{
                                    borderRadius: 'var(--r-md)',
                                    scrollMarginTop: 'calc(var(--safe-top) + var(--header-h) + var(--sp-3))',
                                }}
                                animate={highlightedMatchId === match.id ? { scale: [1, 1.01, 1] } : { scale: 1 }}
                                transition={highlightedMatchId === match.id
                                    ? { duration: 0.8, times: [0, 0.35, 1], ease: 'easeOut' }
                                    : { duration: 0.2 }}
                            >
                                <MatchSummary
                                    match={match}
                                    currentPlayerId={playerId}
                                    allPlayers={players}
                                    onUpdate={handleUpdate}
                                    isNext={match.id === heroMatch?.id}
                                    isModalOpen={currentModal === 'match' && currentModalId === match.id.toString()}
                                    onOpenModal={() => onOpenModal('match', match.id.toString())}
                                    onCloseModal={onCloseModal}
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
            <ScreenHeader
                title={currentTitle}
                notificationCount={notificationSummary.count}
                onNotificationPress={openNotificationSheet}
                homeControls={topHomeControls}
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
            <RecentMatchesSheet
                open={isRecentMatchesSheetOpen}
                loading={loadingRecentMatches}
                matches={recentMatches.matches}
                recentCount={recentMatches.recentCount}
                hasRecentWithin3Days={recentMatches.hasRecentWithin3Days}
                playerId={playerId}
                internalMatches={matches}
                onClose={closeRecentMatchesSheet}
            />
            <UnlockDialog
                open={isUnlockDialogOpen}
                onConfirm={handleConfirmUnlock}
                onCancel={handleCancelUnlock}
            />
            {currentView === 'league' && leagueOptions.length > 1 && (
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
            <div className="app-frame">
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="scrollbar-hide"
                style={{
                    display: 'flex',
                    width: '100%',
                    height: '100dvh',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    // Hide scrollbar
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {/* Home View */}
                <div
                    data-view="home"
                    style={{
                        width: '100%',
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
                        width: '100%',
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
                        showRules={currentModal === 'rules'}
                        onShowRulesChange={(open) => open ? onOpenModal('rules') : onCloseModal()}
                        selectedPlayerId={currentModal === 'playerDetail' ? (currentModalId ? parseInt(currentModalId, 10) : null) : null}
                        onSelectPlayer={(id) => id !== null ? onOpenModal('playerDetail', id.toString()) : onCloseModal()}
                    />
                </div>

                {/* League View */}
                <div
                    data-view="league"
                    style={{
                        width: '100%',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'auto',
                    }}
                >
                    <LeagueView
                        selectedLeague={selectedLeague}
                        onSelectedLeagueChange={setSelectedLeague}
                        onLeagueDataChange={handleLeagueDataChange}
                        selectedTeamId={currentModal === 'team' ? (currentModalId ? parseInt(currentModalId, 10) : null) : null}
                        onSelectTeam={(id) => id !== null ? onOpenModal('team', id.toString()) : onCloseModal()}
                    />
                </div>

                {/* Settings View */}
                <div
                    data-view="settings"
                    style={{
                        width: '100%',
                        height: '100dvh',
                        flexShrink: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        overflowY: 'auto',
                    }}
                >
                    <SettingsView
                        playerId={playerId}
                        playerName={players.find(p => p.id === playerId)?.name}
                        onLogout={onLogout}
                        onPlayerManagementOpenChange={onPlayerManagementOpenChange}
                        onOpenVersion={onOpenVersion}
                        isVersionOpen={isVersionOpen}
                        onCloseVersion={onCloseVersion}
                        isHiddenAdminUnlocked={isHiddenAdminUnlocked}
                        isPlayerManagementOpen={currentModal === 'players'}
                        onOpenPlayerManagement={() => onOpenModal('players')}
                        onClosePlayerManagement={onCloseModal}
                        isRespondAsPlayerOpen={currentModal === 'respond'}
                        onOpenRespondAsPlayer={() => onOpenModal('respond')}
                        onCloseRespondAsPlayer={onCloseModal}
                        isHiddenAdminOpen={currentModal === 'admin'}
                        onOpenHiddenAdmin={() => onOpenModal('admin')}
                        onCloseHiddenAdmin={onCloseModal}
                        isForfaitOpen={currentModal === 'forfait'}
                        onOpenForfait={() => onOpenModal('forfait')}
                        onCloseForfait={onCloseModal}
                    />
                </div>
            </div>
            </div>
        </>
    );
}
