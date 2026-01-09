'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllScraperTeams, fetchAllScraperPlayers, type ScraperTeam, type ScraperPlayer } from '@/lib/useData';
import { Loader2, ChevronDown, Trophy, Users, TrendingUp } from 'lucide-react';
import TeamDetailModal from './TeamDetailModal';

export default function LeagueView() {
    const [activeTab, setActiveTab] = useState<'standings' | 'players'>('standings');
    const [teams, setTeams] = useState<ScraperTeam[]>([]);
    const [allPlayers, setAllPlayers] = useState<ScraperPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<{ team: ScraperTeam, players: ScraperPlayer[] } | null>(null);
    const [selectedLeague, setSelectedLeague] = useState<string>('');
    const [visiblePlayers, setVisiblePlayers] = useState(50);

    // Extract unique leagues
    const leagues = useMemo(() => {
        const unique = Array.from(new Set(teams.map(t => t.leagueName).filter(Boolean))) as string[];
        return unique.sort();
    }, [teams]);

    // Set default league on load
    useEffect(() => {
        if (leagues.length > 0 && !selectedLeague) {
            setSelectedLeague(leagues[0]);
        }
    }, [leagues, selectedLeague]);

    // Reset visible players limit when changing tabs or leagues
    useEffect(() => {
        setVisiblePlayers(50);
    }, [activeTab, selectedLeague]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [teamsData, playersData] = await Promise.all([
                    fetchAllScraperTeams(),
                    fetchAllScraperPlayers()
                ]);
                setTeams(teamsData);
                setAllPlayers(playersData);
            } catch (err) {
                console.error('Failed to load league data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleTeamClick = (team: ScraperTeam) => {
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
                    return p.teamIds.some(tid => validTeamIds.has(tid));
                }
                // Fallback to single teamId
                return validTeamIds.has(p.teamId);
            })
            .sort((a, b) => b.goals - a.goals);
    }, [allPlayers, filteredTeams, selectedLeague]);

    const handleShowMore = () => {
        setVisiblePlayers(prev => prev + 50);
    };

    // Get league stats
    const leagueStats = useMemo(() => {
        const totalGoals = filteredPlayers.reduce((sum, p) => sum + p.goals, 0);
        const totalAssists = filteredPlayers.reduce((sum, p) => sum + p.assists, 0);
        return { totalGoals, totalAssists, teamCount: filteredTeams.length, playerCount: filteredPlayers.length };
    }, [filteredPlayers, filteredTeams]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                background: 'rgba(28, 28, 30, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                        }}>
                            <Trophy size={16} style={{ color: '#ffd60a' }} />
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#ffd60a',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                LZV Cup
                            </span>
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white' }}>
                            League
                        </h1>
                    </div>
                    
                    {/* Mini Stats */}
                    {!loading && (
                        <div style={{
                            display: 'flex',
                            gap: 12,
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.5)',
                        }}>
                            <span><strong style={{ color: 'white' }}>{leagueStats.teamCount}</strong> teams</span>
                            <span><strong style={{ color: '#30d158' }}>{leagueStats.totalGoals}</strong> goals</span>
                        </div>
                    )}
                </div>

                {/* League Selector */}
                {leagues.length > 0 && (
                    <div style={{ marginTop: 12, position: 'relative' }}>
                        <select
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            style={{
                                width: '100%',
                                appearance: 'none',
                                background: 'rgba(255,255,255,0.08)',
                                border: '0.5px solid rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                paddingRight: 36,
                                color: 'white',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            {leagues.map(league => (
                                <option key={league} value={league} style={{ color: 'black', background: '#1c1c1e' }}>
                                    {league}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={16}
                            color="rgba(255,255,255,0.5)"
                            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                        />
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(118, 118, 128, 0.2)',
                    borderRadius: 10,
                    padding: 3,
                    marginTop: 12,
                }}>
                    {([
                        { id: 'standings', icon: TrendingUp, label: 'Standings' },
                        { id: 'players', icon: Users, label: 'Top Scorers' },
                    ] as const).map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                flex: 1,
                                border: 'none',
                                background: activeTab === tab.id ? 'rgba(99, 99, 102, 0.8)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
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
                        <Loader2 className="animate-spin" size={24} color="rgba(255,255,255,0.5)" />
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
                                    background: '#1c1c1e',
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    border: '0.5px solid rgba(255,255,255,0.08)',
                                }}>
                                    {/* Table Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '28px 1fr 32px 32px 38px 38px',
                                        gap: 6,
                                        padding: '10px 12px',
                                        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: 'rgba(255,255,255,0.35)',
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
                                                whileTap={{ scale: 0.99, background: 'rgba(255,255,255,0.06)' }}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '28px 1fr 32px 32px 38px 38px',
                                                    gap: 6,
                                                    padding: '12px',
                                                    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                                                    fontSize: '0.85rem',
                                                    color: 'white',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    background: isHighlighted ? 'rgba(10, 132, 255, 0.12)' : 'transparent',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Highlight bar */}
                                                {isHighlighted && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: 0, top: 0, bottom: 0,
                                                        width: 3,
                                                        background: '#0a84ff',
                                                        borderRadius: '0 2px 2px 0',
                                                    }} />
                                                )}
                                                
                                                {/* Rank */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    color: isFirst ? '#ffd60a' : isLast ? '#ff453a' : 'rgba(255,255,255,0.4)',
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
                                                            background: isFirst ? 'linear-gradient(135deg, #ffd60a, #ff9500)' : '#3a3a3c',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            color: isFirst ? 'black' : 'white',
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
                                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                                    {team.matchesPlayed}
                                                </div>
                                                
                                                {/* GD */}
                                                <div style={{
                                                    textAlign: 'center',
                                                    color: (team.goalDifference || 0) > 0 ? '#30d158' : (team.goalDifference || 0) < 0 ? '#ff453a' : 'rgba(255,255,255,0.4)',
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
                                                    color: '#0a84ff',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {team.pointsPerMatch?.toFixed(1)}
                                                </div>
                                            </motion.div>
                                        );
                                    }) : (
                                        <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
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
                                        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
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
                                                        onClick={() => primaryTeam && handleTeamClick(primaryTeam)}
                                                        style={{
                                                            background: isHighlighted ? 'rgba(10, 132, 255, 0.12)' :
                                                                       isTop3 ? 'rgba(255, 214, 10, 0.06)' : '#1c1c1e',
                                                            borderRadius: 14,
                                                            padding: '12px 14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            border: isTop3 ? '0.5px solid rgba(255, 214, 10, 0.15)' : '0.5px solid rgba(255,255,255,0.05)',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                            cursor: primaryTeam ? 'pointer' : 'default',
                                                        }}
                                                    >
                                                        {isHighlighted && (
                                                            <div style={{
                                                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                                                width: 3, background: '#0a84ff',
                                                            }} />
                                                        )}
                                                        
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            {/* Rank Badge */}
                                                            <div style={{
                                                                width: 28,
                                                                textAlign: 'center',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 700,
                                                                color: isTop3 ? '#ffd60a' : 'rgba(255,255,255,0.35)',
                                                            }}>
                                                                {index + 1}
                                                            </div>
                                                            
                                                            <div>
                                                                <div style={{
                                                                    fontWeight: 600,
                                                                    color: 'white',
                                                                    fontSize: '0.9rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                }}>
                                                                    {player.name}
                                                                    {isMultiTeam && (
                                                                        <span style={{
                                                                            fontSize: '0.6rem',
                                                                            padding: '2px 5px',
                                                                            background: 'rgba(94, 92, 230, 0.3)',
                                                                            color: '#a5a4f3',
                                                                            borderRadius: 4,
                                                                            fontWeight: 600,
                                                                        }}>
                                                                            {playerTeams.length} teams
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: 'rgba(255,255,255,0.4)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                }}>
                                                                    {isMultiTeam 
                                                                        ? playerTeams.map(t => t.name).join(' & ')
                                                                        : primaryTeam?.name || 'Unknown Team'
                                                                    }
                                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                                    <span>{player.gamesPlayed}g</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#30d158' }}>
                                                                    {player.goals}
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                                                    Goals
                                                                </div>
                                                            </div>
                                                            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0a84ff' }}>
                                                                    {player.assists}
                                                                </div>
                                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
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
                                                        background: 'rgba(255,255,255,0.06)',
                                                        border: '0.5px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 12,
                                                        color: 'white',
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
