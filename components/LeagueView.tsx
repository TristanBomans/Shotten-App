'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScraperTeams, useScraperPlayers, type ScraperTeam, type ScraperPlayer } from '@/lib/useConvexData';
import { Loader2, ChevronDown, Trophy, Users, TrendingUp, X } from 'lucide-react';
import TeamDetailModal from './TeamDetailModal';
import LeagueSelector from './LeagueSelector';
import { hapticPatterns } from '@/lib/haptic';

export default function LeagueView() {
    const [activeTab, setActiveTab] = useState<'standings' | 'players'>('standings');
    const [selectedTeam, setSelectedTeam] = useState<{ team: ScraperTeam, players: ScraperPlayer[] } | null>(null);
    const [selectedLeague, setSelectedLeague] = useState<string>('');
    const [visiblePlayers, setVisiblePlayers] = useState(50);
    const [teamSelection, setTeamSelection] = useState<{ player: ScraperPlayer, teams: ScraperTeam[] } | null>(null);

    // Use Convex hooks
    const { teams, loading: teamsLoading } = useScraperTeams();
    const { players: allPlayers, loading: playersLoading } = useScraperPlayers();
    const loading = teamsLoading || playersLoading;

    // Extract unique leagues
    const leagues = useMemo(() => {
        const unique = Array.from(new Set(teams.map(t => t.leagueName).filter(Boolean))) as string[];
        return unique.sort();
    }, [teams]);

    // Set default league on load (check saved preference first, then prefer Mechelen)
    useEffect(() => {
        if (leagues.length > 0 && !selectedLeague) {
            const savedLeague = localStorage.getItem('defaultLeague');
            if (savedLeague && leagues.includes(savedLeague)) {
                setSelectedLeague(savedLeague);
            } else {
                const mechelenLeague = leagues.find(l => l.toLowerCase().includes('mechelen'));
                setSelectedLeague(mechelenLeague || leagues[0]);
            }
        }
    }, [leagues, selectedLeague]);

    // Listen for default league changes from settings
    useEffect(() => {
        const handleDefaultLeagueChanged = (event: Event) => {
            const customEvent = event as CustomEvent<string | null>;
            if (customEvent.detail && leagues.includes(customEvent.detail)) {
                setSelectedLeague(customEvent.detail);
            } else if (customEvent.detail === null) {
                // Reset to auto-select
                const mechelenLeague = leagues.find(l => l.toLowerCase().includes('mechelen'));
                setSelectedLeague(mechelenLeague || leagues[0]);
            }
        };

        window.addEventListener('defaultLeagueChanged', handleDefaultLeagueChanged);
        return () => window.removeEventListener('defaultLeagueChanged', handleDefaultLeagueChanged);
    }, [leagues]);

    // Reset visible players limit when changing tabs or leagues
    useEffect(() => {
        setVisiblePlayers(50);
    }, [activeTab, selectedLeague]);

    const handleTeamClick = (team: ScraperTeam) => {
        hapticPatterns.tap();
        // Filter players who belong to this team
        // Check teamIds array first (multi-team support), fallback to teamId
        const teamPlayers = allPlayers.filter(p => {
            if (p.teamIds && p.teamIds.length > 0) {
                return p.teamIds.includes(team.externalId);
            }
            return p.teamId === team.externalId;
        });
        setSelectedTeam({ team, players: teamPlayers });
    };

    const handlePlayerClick = (player: ScraperPlayer) => {
        hapticPatterns.tap();
        const playerTeamIds = player.teamIds || [player.teamId];
        const playerTeams = teams.filter(t => playerTeamIds.includes(t.externalId));

        if (playerTeams.length === 0) return;

        if (playerTeams.length === 1) {
            handleTeamClick(playerTeams[0]);
        } else {
            setTeamSelection({ player, teams: playerTeams });
        }
    };

    const isOwnTeam = (name: string) => {
        const lower = name.toLowerCase();
        return lower.includes('degrad') || lower.includes('wille ma ni');
    };

    // Filter teams by selected league
    const filteredTeams = useMemo(() => {
        if (!selectedLeague) return [];
        return teams
            .filter(t => t.leagueName === selectedLeague)
            .sort((a, b) => (a.rank || 99) - (b.rank || 99));
    }, [teams, selectedLeague]);

    // Filter players by selected league (teams in that league)
    // Use teamIds array if available (for multi-team players), fallback to teamId
    const filteredPlayers = useMemo(() => {
        if (!selectedLeague) return [];
        const validTeamIds = new Set(filteredTeams.map(t => t.externalId));
        return allPlayers
            .filter(p => {
                // Check teamIds array first (multi-team support)
                if (p.teamIds && p.teamIds.length > 0) {
                    return p.teamIds.some((tid: number) => validTeamIds.has(tid));
                }
                // Fallback to single teamId
                return validTeamIds.has(p.teamId);
            })
            .sort((a, b) => b.goals - a.goals);
    }, [allPlayers, filteredTeams, selectedLeague]);

    const handleShowMore = () => {
        hapticPatterns.tap();
        setVisiblePlayers(prev => prev + 50);
    };

    // Get league stats
    const leagueStats = useMemo(() => {
        const totalGoals = filteredPlayers.reduce((sum, p) => sum + p.goals, 0);
        const totalAssists = filteredPlayers.reduce((sum, p) => sum + p.assists, 0);
        return { totalGoals, totalAssists, teamCount: filteredTeams.length, playerCount: filteredPlayers.length };
    }, [filteredPlayers, filteredTeams]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                background: 'var(--color-surface)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderBottom: '0.5px solid var(--color-border)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                        }}>
                            <Trophy size={16} style={{ color: 'var(--color-warning)' }} />
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--color-warning)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                LZV Cup
                            </span>
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                            League
                        </h1>
                    </div>

                    {/* Mini Stats */}
                    {!loading && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                        }}>
                            <span><strong style={{ color: 'var(--color-text-primary)' }}>{leagueStats.teamCount}</strong> teams</span>
                        </div>
                    )}
                </div>

                {/* League Selector */}
                {leagues.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <LeagueSelector
                            leagues={leagues}
                            selectedLeague={selectedLeague}
                            onSelect={setSelectedLeague}
                            teamsData={teams}
                        />
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'var(--color-surface)',
                    borderRadius: 10,
                    padding: 3,
                    marginTop: 12,
                    border: '0.5px solid var(--color-border)',
                }}>
                    {([
                        { id: 'standings', icon: TrendingUp, label: 'Standings' },
                        { id: 'players', icon: Users, label: 'Top Scorers' },
                    ] as const).map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => {
                                hapticPatterns.tap();
                                setActiveTab(tab.id);
                            }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                flex: 1,
                                border: 'none',
                                background: activeTab === tab.id ? 'var(--color-surface-hover)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                                padding: '8px 0',
                                borderRadius: 8,
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                        <Loader2 className="animate-spin" size={24} color="var(--color-text-secondary)" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'standings' ? (
                            <motion.div
                                key="standings"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.15 }}
                                style={{ padding: 16 }}
                            >
                                <div style={{
                                    background: 'var(--color-surface)',
                                    backdropFilter: 'blur(40px)',
                                    WebkitBackdropFilter: 'blur(40px)',
                                    borderRadius: 20,
                                    border: '0.5px solid var(--color-border)',
                                    overflow: 'hidden',
                                }}>
                                    {/* Table Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '28px 1fr 32px 32px 38px 38px',
                                        gap: 6,
                                        padding: '10px 12px',
                                        borderBottom: '0.5px solid var(--color-border-subtle)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: 'var(--color-text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em',
                                    }}>
                                        <div style={{ textAlign: 'center' }}>#</div>
                                        <div>Team</div>
                                        <div style={{ textAlign: 'center' }}>MP</div>
                                        <div style={{ textAlign: 'center' }}>GD</div>
                                        <div style={{ textAlign: 'center' }}>Pts</div>
                                        <div style={{ textAlign: 'center' }}>Avg</div>
                                    </div>

                                    {/* Table Rows */}
                                    {filteredTeams.length > 0 ? filteredTeams.map((team, index) => {
                                        const isHighlighted = isOwnTeam(team.name);
                                        const isFirst = team.rank === 1;
                                        const isLast = team.rank === filteredTeams.length;
                                        
                                        return (
                                            <motion.div
                                                key={team.externalId}
                                                onClick={() => handleTeamClick(team)}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02, duration: 0.2 }}
                                                whileTap={{ scale: 0.99, background: 'var(--color-surface-hover)' }}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '28px 1fr 32px 32px 38px 38px',
                                                    gap: 6,
                                                    padding: '12px',
                                                    borderBottom: '0.5px solid var(--color-border-subtle)',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--color-text-primary)',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    background: isHighlighted ? 'rgb(var(--color-accent-rgb) / 0.12)' : 'transparent',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Highlight bar */}
                                                {isHighlighted && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: 0, top: 0, bottom: 0,
                                                        width: 3,
                                                        background: 'var(--color-accent)',
                                                        borderRadius: '0 2px 2px 0',
                                                    }} />
                                                )}
                                                
                                                {/* Rank */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    color: isFirst ? 'var(--color-warning)' : isLast ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                                                }}>
                                                    {team.rank}
                                                </div>
                                                
                                                {/* Team */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                    {team.imageBase64 ? (
                                                        <img
                                                            src={team.imageBase64}
                                                            alt=""
                                                            style={{
                                                                width: 26, height: 26,
                                                                borderRadius: 6,
                                                                objectFit: 'cover',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: 26, height: 26,
                                                            borderRadius: 6,
                                                            background: isFirst ? 'linear-gradient(135deg, var(--color-warning), var(--color-warning-secondary))' : 'var(--color-surface-hover)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            color: isFirst ? 'var(--color-bg)' : 'var(--color-text-primary)',
                                                            flexShrink: 0,
                                                        }}>
                                                            {team.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        fontWeight: isHighlighted ? 700 : 500,
                                                    }}>
                                                        {team.name}
                                                    </div>
                                                </div>
                                                
                                                {/* MP */}
                                                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                                                    {team.matchesPlayed}
                                                </div>
                                                
                                                {/* GD */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    color: (team.goalDifference || 0) > 0 ? 'var(--color-success)' : (team.goalDifference || 0) < 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {(team.goalDifference || 0) > 0 ? '+' : ''}{team.goalDifference || 0}
                                                </div>
                                                
                                                {/* Points */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '0.9rem',
                                                }}>
                                                    {team.points}
                                                </div>
                                                
                                                {/* PPM */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    color: 'var(--color-accent)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {team.pointsPerMatch?.toFixed(1)}
                                                </div>
                                            </motion.div>
                                        );
                                    }) : (
                                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                            No teams found for this league
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="players"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.15 }}
                                style={{ padding: 16 }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {filteredPlayers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
                                            No player data available for this league
                                        </div>
                                    ) : (
                                        <>
                                            {filteredPlayers.slice(0, visiblePlayers).map((player, index) => {
                                                // Find all teams this player belongs to in the current league
                                                const playerTeamIds = player.teamIds || [player.teamId];
                                                const playerTeams = teams.filter(t => playerTeamIds.includes(t.externalId));
                                                const primaryTeam = playerTeams[0];
                                                
                                                // Check if player is in any of our teams
                                                const isHighlighted = playerTeams.some(t => isOwnTeam(t.name));
                                                const isMultiTeam = playerTeams.length > 1;
                                                const isTop3 = index < 3;

                                                return (
                                                    <motion.div
                                                        key={player.externalId}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(index * 0.015, 0.3), duration: 0.2 }}
                                                        onClick={() => handlePlayerClick(player)}
                                                        style={{
                                                            background: isHighlighted ? 'var(--color-accent-glow)' :
                                                                       isTop3 ? 'var(--color-top3-bg)' : 'var(--color-surface)',
                                                            backdropFilter: 'blur(40px)',
                                                            WebkitBackdropFilter: 'blur(40px)',
                                                            borderRadius: 14,
                                                            padding: '12px 14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            border: isTop3 ? '1px solid var(--color-top3-border)' : '1px solid var(--color-border)',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                            cursor: playerTeams.length > 0 ? 'pointer' : 'default',
                                                        }}
                                                    >
                                                        {isHighlighted && (
                                                            <div style={{
                                                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                                                width: 3, background: 'var(--color-accent)',
                                                            }} />
                                                        )}
                                                        
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            {/* Rank Badge */}
                                                            <div style={{
                                                                width: 28,
                                                                textAlign: 'center',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 700,
                                                                color: isTop3 ? 'var(--color-warning)' : 'var(--color-text-tertiary)',
                                                            }}>
                                                                {index + 1}
                                                            </div>
                                                            
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <div style={{
                                                                    fontWeight: 600,
                                                                    color: 'var(--color-text-primary)',
                                                                    fontSize: '0.9rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                }}>
                                                                    <span style={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {player.name}
                                                                    </span>
                                                                    {isMultiTeam && (
                                                                        <span style={{
                                                                            fontSize: '0.6rem',
                                                                            padding: '2px 5px',
                                                                            background: 'rgb(var(--color-accent-rgb) / 0.3)',
                                                                            color: 'var(--color-accent-secondary)',
                                                                            borderRadius: 4,
                                                                            fontWeight: 600,
                                                                            whiteSpace: 'nowrap',
                                                                            flexShrink: 0,
                                                                        }}>
                                                                            {playerTeams.length} teams
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--color-text-tertiary)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    flexWrap: 'nowrap',
                                                                }}>
                                                                    <span style={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        maxWidth: isMultiTeam ? 140 : 180,
                                                                    }}>
                                                                        {isMultiTeam
                                                                            ? playerTeams.map(t => t.name).join(' & ')
                                                                            : primaryTeam?.name || 'Unknown Team'
                                                                        }
                                                                    </span>
                                                                    <span style={{ opacity: 0.5, flexShrink: 0 }}>•</span>
                                                                    <span style={{ flexShrink: 0 }}>{player.gamesPlayed}g</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                                                    {player.goals}
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                                                                    Goals
                                                                </div>
                                                            </div>
                                                            <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                                                    {player.assists}
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                                                                    Asts
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Show More Button */}
                                            {visiblePlayers < filteredPlayers.length && (
                                                <motion.button
                                                    onClick={handleShowMore}
                                                    whileTap={{ scale: 0.98 }}
                                                    style={{
                                                        padding: '14px',
                                                        background: 'var(--color-surface)',
                                                        backdropFilter: 'blur(40px)',
                                                        WebkitBackdropFilter: 'blur(40px)',
                                                        border: '0.5px solid var(--color-border)',
                                                        borderRadius: 12,
                                                        color: 'var(--color-text-primary)',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        marginTop: 8,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 8,
                                                    }}
                                                >
                                                    Show More ({filteredPlayers.length - visiblePlayers} remaining)
                                                    <ChevronDown size={16} />
                                                </motion.button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Team Selection Modal */}
            <AnimatePresence>
                {teamSelection && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                hapticPatterns.tap();
                                setTeamSelection(null);
                            }}
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'var(--color-overlay)',
                                backdropFilter: 'blur(10px)',
                                zIndex: 10000,
                            }}
                        />
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            padding: 20,
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                style={{
                                    width: '100%',
                                    maxWidth: 320,
                                    background: 'var(--color-surface)',
                                    backdropFilter: 'blur(40px)',
                                    WebkitBackdropFilter: 'blur(40px)',
                                    borderRadius: 20,
                                    padding: 20,
                                    border: '1px solid var(--color-border)',
                                    boxShadow: 'var(--shadow-lg)',
                                    pointerEvents: 'auto',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        Select Team
                                    </div>
                                    <button
                                        onClick={() => {
                                            hapticPatterns.tap();
                                            setTeamSelection(null);
                                        }}
                                        style={{
                                            background: 'var(--color-surface-hover)',
                                            border: 'none', borderRadius: '50%',
                                            width: 30, height: 30,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--color-text-secondary)', cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {teamSelection.teams.map(team => (
                                        <motion.button
                                            key={team.externalId}
                                            onClick={() => {
                                                handleTeamClick(team);
                                                setTeamSelection(null);
                                            }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '12px 14px',
                                                background: 'var(--color-surface-hover)',
                                                border: '0.5px solid var(--color-border-subtle)',
                                                borderRadius: 14,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {team.imageBase64 ? (
                                                <img src={team.imageBase64} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10,
                                                    background: 'linear-gradient(135deg, var(--color-warning), var(--color-warning-secondary))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-bg)'
                                                }}>
                                                    {team.name.charAt(0)}
                                                </div>
                                            )}
                                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                                                {team.name}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {selectedTeam && (
                    <TeamDetailModal
                        team={selectedTeam.team}
                        players={selectedTeam.players}
                        onClose={() => setSelectedTeam(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
