'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useMatches, useAllPlayers } from '@/lib/useConvexData';
import type { Match } from '@/lib/mockData';
import { hapticPatterns } from '@/lib/haptic';
import MatchCard from './MatchCard';
import StatsView from './StatsView';
import SettingsView from './SettingsView';
import LeagueView from './LeagueView';
import PullToRefresh from './PullToRefresh';
import { parseDateToTimestamp } from '@/lib/dateUtils';

interface DashboardProps {
    playerId: string;
    currentView: 'home' | 'stats' | 'league' | 'settings';
    onLogout: () => void;
    onViewChange: (view: 'home' | 'stats' | 'league' | 'settings') => void;
    onPlayerManagementOpenChange?: (isOpen: boolean) => void;
}

// View order for determining slide position
const viewOrder = ['home', 'stats', 'league', 'settings'] as const;
type ViewType = typeof viewOrder[number];

export default function Dashboard({ playerId, currentView, onLogout, onViewChange, onPlayerManagementOpenChange }: DashboardProps) {
    const { matches: convexMatches, loading, error } = useMatches(playerId);
    const { players } = useAllPlayers();
    const [matches, setMatches] = useState<Match[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sync local matches with Convex data (only when data actually changes)
    useEffect(() => {
        setMatches(prev => {
            // Deep compare to prevent unnecessary updates
            if (prev.length !== convexMatches.length) return convexMatches;
            // Check if any match has different attendance
            const hasChanges = convexMatches.some((m, i) => {
                const prevM = prev[i];
                if (!prevM) return true;
                if (m.id !== prevM.id) return true;
                const prevAtt = JSON.stringify(prevM.attendances?.sort((a, b) => a.playerId.localeCompare(b.playerId)));
                const newAtt = JSON.stringify(m.attendances?.sort((a, b) => a.playerId.localeCompare(b.playerId)));
                return prevAtt !== newAtt;
            });
            return hasChanges ? convexMatches : prev;
        });
    }, [convexMatches]);

    const upcomingRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Sync control refs - simplified approach
    const scrollSourceRef = useRef<'nav' | 'swipe' | null>(null);
    const lastViewRef = useRef<ViewType>(currentView);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);

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
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Convex auto-refetches, just give haptic feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        hapticPatterns.success();
        setIsRefreshing(false);
    }, []);

    const handleUpdate = async (matchId?: string, newStatus?: 'Present' | 'NotPresent' | 'Maybe') => {
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
        }
        // Convex auto-refetches after mutations
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

    // Loading state
    if (loading) {
        return (
            <div className="container">
                <div className="glass-panel-heavy skeleton" style={{ height: 320, marginBottom: 'var(--space-xl)' }} />
                <div className="grid-cards">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="glass-panel skeleton" style={{ height: 200 }} />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container flex-center" style={{ minHeight: '80dvh' }}>
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
                    <button className="btn btn-primary touch-target" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </motion.div>
            </div>
        );
    }

    // Skeleton loading component for refresh
    const SkeletonContent = (
        <div className="container">
            {/* Header - Keep visible during refresh */}
            <div style={{ marginBottom: 20 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                }}>
                    <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-accent)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Schedule
                    </span>
                </div>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                }}>
                    Matches
                </h1>
            </div>

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
        <div className="container">
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                }}>
                    <Calendar size={16} style={{ color: 'var(--color-accent)' }} />
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-accent)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Schedule
                    </span>
                </div>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                }}>
                    Matches
                </h1>
            </div>

            {/* Hero Section */}
            {heroMatch ? (
                <section style={{ marginBottom: 'var(--space-2xl)', position: 'relative' }}>
                    <h2 className="text-label" style={{ marginBottom: 'var(--space-md)' }}>
                        Next Match
                    </h2>
                    <MatchCard
                        match={heroMatch}
                        currentPlayerId={playerId}
                        allPlayers={players}
                        onUpdate={handleUpdate}
                        variant="hero"
                    />
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
                            <div key={match.id} style={{ height: '100%', width: '100%' }}>
                                <MatchCard
                                    match={match}
                                    currentPlayerId={playerId}
                                    allPlayers={players}
                                    onUpdate={handleUpdate}
                                    variant="compact"
                                />
                            </div>
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
                            <div key={match.id} style={{ height: '100%', width: '100%' }}>
                                <MatchCard
                                    match={match}
                                    currentPlayerId={playerId}
                                    allPlayers={players}
                                    onUpdate={handleUpdate}
                                    variant="compact"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );

    return (
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
                <StatsView matches={matches} players={players} currentPlayerId={playerId} />
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
                <LeagueView />
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
    );
}
