'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { fetchAllScraperTeams, type ScraperTeam } from '@/lib/useData';
import { Loader2 } from 'lucide-react';
import TeamDetailPage from './Pages/TeamDetailPage';
import { hapticPatterns } from '@/lib/haptic';

interface LeagueViewProps {
    selectedLeague: string;
    onSelectedLeagueChange: (league: string) => void;
    onLeagueDataChange?: (data: { leagues: string[]; teams: ScraperTeam[] }) => void;
    selectedTeamId?: number | null;
    onSelectTeam?: (id: number | null) => void;
}

export default function LeagueView({
    selectedLeague,
    onSelectedLeagueChange,
    onLeagueDataChange,
    selectedTeamId,
    onSelectTeam,
}: LeagueViewProps) {
    const [teams, setTeams] = useState<ScraperTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const dataLoadedRef = useRef(false);

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
                onSelectedLeagueChange(savedLeague);
            } else {
                const mechelenLeague = leagues.find(l => l.toLowerCase().includes('mechelen'));
                onSelectedLeagueChange(mechelenLeague || leagues[0]);
            }
        }
    }, [leagues, selectedLeague, onSelectedLeagueChange]);

    // Listen for default league changes from settings
    useEffect(() => {
        const handleDefaultLeagueChanged = (event: Event) => {
            const customEvent = event as CustomEvent<string | null>;
            if (customEvent.detail && leagues.includes(customEvent.detail)) {
                onSelectedLeagueChange(customEvent.detail);
            } else if (customEvent.detail === null) {
                // Reset to auto-select
                const mechelenLeague = leagues.find(l => l.toLowerCase().includes('mechelen'));
                onSelectedLeagueChange(mechelenLeague || leagues[0]);
            }
        };

        window.addEventListener('defaultLeagueChanged', handleDefaultLeagueChanged);
        return () => window.removeEventListener('defaultLeagueChanged', handleDefaultLeagueChanged);
    }, [leagues, onSelectedLeagueChange]);

    useEffect(() => {
        onLeagueDataChange?.({ leagues, teams });
    }, [leagues, teams, onLeagueDataChange]);

    useEffect(() => {
        if (dataLoadedRef.current) {
            setLoading(false);
            return;
        }
        const loadData = async () => {
            try {
                const teamsData = await fetchAllScraperTeams();
                setTeams(teamsData);
                dataLoadedRef.current = true;
            } catch (err) {
                console.error('Failed to load league data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleTeamClick = (team: ScraperTeam) => {
        hapticPatterns.tap();
        onSelectTeam?.(team.externalId);
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

    const selectedTeam = selectedTeamId != null
        ? (() => {
            const team = teams.find(t => t.externalId === selectedTeamId);
            if (!team) return null;
            return { team, players: [] as never[] };
        })()
        : null;

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                className="container content-under-top-overlay scrollbar-hide"
                style={{ flex: 1, overflowY: 'auto' }}
            >
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                        <Loader2 className="animate-spin" size={24} color="var(--color-text-secondary)" />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
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
                                        whileTap={{ scale: 0.99, backgroundColor: 'var(--color-surface-hover)' }}
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
                                            backgroundColor: isHighlighted ? 'rgb(var(--color-accent-rgb) / 0.12)' : 'transparent',
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
                )}
            </div>
            {/* Page */}
            <TeamDetailPage
                team={selectedTeam?.team || ({} as ScraperTeam)}
                players={selectedTeam?.players || []}
                open={Boolean(selectedTeam)}
                onClose={() => onSelectTeam?.(null)}
            />
        </div>
    );
}
