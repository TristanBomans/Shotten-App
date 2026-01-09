'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useMatches, useAllPlayers } from '@/lib/useData';
import MatchCard from './MatchCard';
import StatsView from './StatsView';
import SettingsView from './SettingsView';
import LeagueView from './LeagueView';

interface DashboardProps {
    playerId: number;
    currentView: 'home' | 'stats' | 'league' | 'settings';
    onLogout: () => void;
    onViewChange: (view: 'home' | 'stats' | 'league' | 'settings') => void;
}

// View order for determining slide position
const viewOrder = ['home', 'stats', 'league', 'settings'] as const;

export default function Dashboard({ playerId, currentView, onLogout, onViewChange }: DashboardProps) {
    const { matches, loading, error, fetchMatches, setMatches } = useMatches(playerId);
    const { players, fetchAllPlayers } = useAllPlayers();
    const upcomingRef = useRef<HTMLElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);

    useEffect(() => {
        fetchMatches();
        fetchAllPlayers();
    }, [fetchMatches, fetchAllPlayers]);

    // Refs for observing intersection
    const homeRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const leagueRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Scroll to current view when it changes programmatically OR when loading finishes
    useEffect(() => {
        if (!loading && scrollContainerRef.current && !isScrollingRef.current) {
            // Small timeout to ensure layout is stable
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    const viewIndex = viewOrder.indexOf(currentView);
                    const scrollTarget = viewIndex * window.innerWidth;
                    scrollContainerRef.current.scrollTo({
                        left: scrollTarget,
                        behavior: 'auto', // Instant jump on load/refresh
                    });
                }
            });
        }
    }, [loading, currentView]); // Added loading dependency

    // Intersection Observer for updating the pill during swipe
    useEffect(() => {
        if (loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the entry that is most visible
                const visibleEntry = entries.find(entry => entry.isIntersecting);

                if (visibleEntry) {
                    const viewName = visibleEntry.target.getAttribute('data-view') as 'home' | 'stats' | 'league' | 'settings';
                    if (viewName && viewName !== currentView) {
                        onViewChange(viewName);
                    }
                }
            },
            {
                root: scrollContainerRef.current,
                threshold: 0.6, // Trigger when 60% visible
            }
        );

        if (homeRef.current) observer.observe(homeRef.current);
        if (statsRef.current) observer.observe(statsRef.current);
        if (leagueRef.current) observer.observe(leagueRef.current);
        if (settingsRef.current) observer.observe(settingsRef.current);

        return () => observer.disconnect();
    }, [loading, currentView, onViewChange]);

    // Mark as manual scrolling when user touches (to prevent auto-scroll interference)
    const handleTouchStart = () => {
        isScrollingRef.current = true;
    };

    const handleTouchEnd = () => {
        // Reset after a delay to allow snap to finish
        setTimeout(() => {
            isScrollingRef.current = false;
        }, 500);
    };

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
    const now = new Date();
    const threshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const heroMatch = matches.find(m => new Date(m.date) > threshold);
    const remainingMatches = matches.filter(m => m.id !== heroMatch?.id);
    const upcomingMatches = remainingMatches.filter(m => new Date(m.date) > threshold);
    const pastMatches = remainingMatches
        .filter(m => new Date(m.date) <= threshold)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                    <button className="btn btn-primary touch-target" onClick={() => fetchMatches()}>
                        Try Again
                    </button>
                </motion.div>
            </div>
        );
    }

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
                    <Calendar size={16} style={{ color: '#0a84ff' }} />
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#0a84ff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Schedule
                    </span>
                </div>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'white',
                    margin: 0,
                }}>
                    Matches
                </h1>
            </div>

            {/* Hero Section */}
            {heroMatch ? (
                <section style={{ marginBottom: 'var(--space-2xl)', position: 'relative' }}>
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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
                ref={homeRef}
                data-view="home"
                style={{
                    width: '100vw',
                    height: '100dvh',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                    overflowY: 'auto',
                }}
            >
                {HomeContent}
            </div>

            {/* Stats View */}
            <div
                ref={statsRef}
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
                ref={leagueRef}
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
                ref={settingsRef}
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
                <SettingsView onLogout={onLogout} />
            </div>
        </div>
    );
}
