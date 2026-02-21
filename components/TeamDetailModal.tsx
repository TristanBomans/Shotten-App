'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCircle, ChevronRight, Trophy, Calendar, Users, TrendingUp } from 'lucide-react';
import { parseDate, parseDateToTimestamp, formatDateSafe, formatTimeSafe } from '@/lib/dateUtils';
import { isHomeTeamForMatch } from '@/lib/teamNameMatching';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useData';
import { API_BASE_URL } from '@/lib/config';
import { hapticPatterns } from '@/lib/haptic';

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
}

interface TeamDetailModalProps {
    team: ScraperTeam;
    players: ScraperPlayer[];
    onClose: () => void;
}

export default function TeamDetailModal({ team, players, onClose }: TeamDetailModalProps) {
    const [showImage, setShowImage] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'squad'>('overview');
    const [matches, setMatches] = useState<ScraperMatch[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const overviewRef = useRef<HTMLDivElement>(null);
    const matchesRef = useRef<HTMLDivElement>(null);
    const squadRef = useRef<HTMLDivElement>(null);

    // Fetch matches for this team
    useEffect(() => {
        const fetchMatches = async () => {
            setLoadingMatches(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/lzv/matches?teamId=${team.externalId}`);
                if (res.ok) {
                    const data = await res.json();
                    setMatches(data);
                }
            } catch (error) {
                console.warn('Failed to fetch team matches:', error);
            } finally {
                setLoadingMatches(false);
            }
        };
        fetchMatches();
    }, [team.externalId]);

    // Intersection Observer for tab sync
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find(e => e.isIntersecting);
                if (visible) {
                    const view = visible.target.getAttribute('data-view') as 'overview' | 'matches' | 'squad';
                    if (view && view !== activeTab) {
                        hapticPatterns.tap();
                        setActiveTab(view);
                    }
                }
            },
            { root: scrollRef.current, threshold: 0.6 }
        );

        if (overviewRef.current) observer.observe(overviewRef.current);
        if (matchesRef.current) observer.observe(matchesRef.current);
        if (squadRef.current) observer.observe(squadRef.current);

        return () => observer.disconnect();
    }, [activeTab]);

    const scrollToView = (view: 'overview' | 'matches' | 'squad') => {
        if (scrollRef.current) {
            const viewIndex = view === 'overview' ? 0 : view === 'matches' ? 1 : 2;
            const left = viewIndex * scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left, behavior: 'smooth' });
        }
    };

    // Calculate recent form from matches
    const getRecentForm = () => {
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
    };

    const recentForm = getRecentForm();

    // Split matches into upcoming and past
    const now = Date.now();
    const upcomingMatches = matches
        .filter(m => parseDateToTimestamp(m.date) > now || m.status === 'Scheduled')
        .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
    const pastMatches = matches
        .filter(m => parseDateToTimestamp(m.date) <= now && m.status === 'Played')
        .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));

    // Sort players by goals
    // Extract per-team stats for THIS team specifically
    const sortedPlayers = players
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
        .sort((a, b) => b.goals - a.goals);

    if (typeof document === 'undefined') return null;

    const modalContent = (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                    hapticPatterns.tap();
                    onClose();
                }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'var(--color-overlay)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 10000,
                }}
            />

            {/* Modal Container */}
            <div style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                zIndex: 10001,
                pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 420,
                        height: '85vh',
                        maxHeight: 'calc(100dvh - 80px)',
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: 'auto',
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(60px)',
                        WebkitBackdropFilter: 'blur(60px)',
                        borderRadius: 24,
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '0.5px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}>
                        {team.imageBase64 ? (
                            <img
                                src={team.imageBase64}
                                alt={team.name}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    setShowImage(true);
                                }}
                                style={{
                                    width: 48, height: 48,
                                    borderRadius: 12,
                                    objectFit: 'cover',
                                    border: '1px solid var(--color-border)',
                                    cursor: 'zoom-in',
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div style={{
                                width: 48, height: 48,
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)',
                                flexShrink: 0,
                            }}>
                                {team.name.charAt(0)}
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {team.name}
                            </div>
                            {team.leagueName && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                    {team.leagueName}
                                </div>
                            )}
                        </div>
                        <button onClick={() => {
                            hapticPatterns.tap();
                            onClose();
                        }} style={{
                            background: 'var(--color-surface-hover)', border: 'none',
                            borderRadius: '50%', width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--color-text-primary)', cursor: 'pointer', flexShrink: 0,
                        }}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        padding: '10px 16px',
                        gap: 6,
                        borderBottom: '0.5px solid var(--color-border-subtle)',
                    }}>
                        {([
                            { id: 'overview', icon: TrendingUp, label: 'Overview' },
                            { id: 'matches', icon: Calendar, label: 'Matches' },
                            { id: 'squad', icon: Users, label: 'Squad' },
                        ] as const).map(tab => (
                            <motion.button
                                key={tab.id}
                                onClick={() => {
                                    hapticPatterns.tap();
                                    scrollToView(tab.id);
                                }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: activeTab === tab.id ? 'var(--color-surface-hover)' : 'transparent',
                                    border: 'none',
                                    borderRadius: 10,
                                    color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Scrollable Tab Content */}
                    <div
                        ref={scrollRef}
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
                                padding: 16,
                                overflowY: 'auto',
                            }}
                        >
                            {/* Recent Form */}
                            {recentForm.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 600,
                                        color: 'var(--color-text-tertiary)',
                                        textTransform: 'uppercase',
                                        marginBottom: 8,
                                    }}>
                                        Recent Form
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {recentForm.map((result, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: 32, height: 32,
                                                    borderRadius: 8,
                                                    background: result === 'W' ? 'rgb(var(--color-success-rgb) / 0.25)' :
                                                        result === 'L' ? 'rgb(var(--color-danger-rgb) / 0.25)' :
                                                            'rgb(var(--color-warning-rgb) / 0.25)',
                                                    color: result === 'W' ? 'var(--color-success)' :
                                                        result === 'L' ? 'var(--color-danger)' : 'var(--color-warning)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {result}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            {team.rank !== undefined && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 1,
                                    background: 'var(--color-surface-hover)',
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    marginBottom: 16,
                                }}>
                                    <StatBox label="RANK" value={`#${team.rank}`} color="var(--color-warning)" />
                                    <StatBox label="PTS" value={team.points || 0} />
                                    <StatBox
                                        label="W/D/L"
                                        value={
                                            <span>
                                                <span style={{ color: 'var(--color-success)' }}>{team.wins || 0}</span>
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
                                                <span style={{ color: 'var(--color-warning)' }}>{team.draws || 0}</span>
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
                                                <span style={{ color: 'var(--color-danger)' }}>{team.losses || 0}</span>
                                            </span>
                                        }
                                    />
                                    <StatBox
                                        label="GD"
                                        value={`${(team.goalDifference || 0) >= 0 ? '+' : ''}${team.goalDifference || 0}`}
                                        color={(team.goalDifference || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                                    />
                                </div>
                            )}

                            {/* Additional Stats */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 8,
                                marginBottom: 16,
                            }}>
                                <MiniStat label="Played" value={team.matchesPlayed || 0} />
                                <MiniStat label="Goals For" value={team.goalsFor || 0} color="var(--color-success)" />
                                <MiniStat label="Goals Agst" value={team.goalsAgainst || 0} color="var(--color-danger)" />
                            </div>

                            {/* Team Info */}
                            {(team.colors || team.manager || team.description) && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderTop: '0.5px solid var(--color-border-subtle)',
                                    borderBottom: '0.5px solid var(--color-border-subtle)',
                                    marginBottom: 16,
                                }}>
                                    {team.colors && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            marginBottom: (team.manager || team.description) ? 10 : 0,
                                        }}>
                                            <span style={{ fontSize: '0.9rem' }}>🎨</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                {team.colors}
                                            </span>
                                        </div>
                                    )}
                                    {team.manager && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            marginBottom: team.description ? 10 : 0,
                                        }}>
                                            <UserCircle size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
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
                                        }}>
                                            "{team.description}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LZV Link */}
                            <a
                                href={`https://www.lzvcup.be/teams/detail/${team.externalId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 14, gap: 8,
                                    background: 'rgb(var(--color-accent-rgb) / 0.15)',
                                    borderRadius: 12,
                                    color: 'var(--color-accent)', fontSize: '0.9rem', fontWeight: 600,
                                    textDecoration: 'none',
                                }}
                            >
                                View on LZV Cup <ChevronRight size={16} />
                            </a>
                        </div>

                        {/* Matches Tab */}
                        <div
                            ref={matchesRef}
                            data-view="matches"
                            style={{
                                minWidth: '100%',
                                scrollSnapAlign: 'center',
                                scrollSnapStop: 'always',
                                padding: 16,
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
                                <>
                                    {/* Upcoming Matches */}
                                    {upcomingMatches.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{
                                                fontSize: '0.7rem', fontWeight: 600,
                                                color: 'var(--color-text-tertiary)',
                                                textTransform: 'uppercase',
                                                marginBottom: 10,
                                            }}>
                                                Upcoming ({upcomingMatches.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {upcomingMatches.slice(0, 5).map(match => (
                                                    <MatchRow key={match.externalId} match={match} teamName={team.name} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Past Matches */}
                                    {pastMatches.length > 0 && (
                                        <div>
                                            <div style={{
                                                fontSize: '0.7rem', fontWeight: 600,
                                                color: 'var(--color-text-tertiary)',
                                                textTransform: 'uppercase',
                                                marginBottom: 10,
                                            }}>
                                                Recent Results ({pastMatches.length})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {pastMatches.slice(0, 10).map(match => (
                                                    <MatchRow key={match.externalId} match={match} teamName={team.name} isPlayed />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                padding: 16,
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
                </motion.div>
            </div>

            {/* Full Image Overlay */}
            <AnimatePresence>
                {showImage && team.imageBase64 && (
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
                            zIndex: 10002,
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
        </>
    );

    return createPortal(modalContent, document.body);
}

// Sub-components
function StatBox({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <div style={{ background: 'var(--color-surface-hover)', padding: 12, textAlign: 'center' }}>
            <div style={{
                fontSize: '1.1rem', fontWeight: 700,
                color: color || 'var(--color-text-primary)',
            }}>
                {value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div style={{
            padding: '10px 12px',
            background: 'var(--color-surface-hover)',
            borderRadius: 10,
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--color-text-primary)' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}

function MatchRow({ match, teamName, isPlayed }: { match: ScraperMatch; teamName: string; isPlayed?: boolean }) {
    const isHome = isHomeTeamForMatch(teamName, match.homeTeam, match.awayTeam);
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;

    const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D';
    const resultColor = result === 'W' ? 'var(--color-success)' : result === 'L' ? 'var(--color-danger)' : 'var(--color-warning)';

    const dateStr = formatDateSafe(match.date, { day: 'numeric', month: 'short' }, 'TBD');
    const timeStr = formatTimeSafe(match.date, { hour: '2-digit', minute: '2-digit' }, 'TBD');

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: isPlayed ? 'var(--color-surface-hover)' : 'var(--color-surface)',
            borderRadius: 12,
            border: `1px solid ${isPlayed ? 'var(--color-border)' : 'var(--color-border-subtle)'}`
        }}>
            {/* Result indicator for played matches */}
            {isPlayed && (
                <div style={{
                    width: 28, height: 28,
                    borderRadius: 8,
                    background: `${resultColor}20`,
                    color: resultColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                }}>
                    {result}
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {isHome ? 'vs' : '@'} {opponent}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                    {dateStr} • {timeStr}
                    {match.location && ` • ${match.location}`}
                </div>
            </div>

            {/* Score for played matches */}
            {isPlayed && (
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: resultColor,
                }}>
                    {teamScore} - {opponentScore}
                </div>
            )}
        </div>
    );
}
