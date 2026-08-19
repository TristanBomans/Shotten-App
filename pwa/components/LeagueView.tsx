'use client';

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
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

function isOwnTeam(name: string) {
    return name.toLowerCase().includes('wille ma ni');
}

function rankColor(rank: number, total: number) {
    if (rank === 1) return 'var(--color-warning)';
    if (rank === total && total > 1) return 'var(--color-danger)';
    return 'var(--color-text-tertiary)';
}

function gdColor(gd: number) {
    if (gd > 0) return 'var(--color-success)';
    if (gd < 0) return 'var(--color-danger)';
    return 'var(--color-text-tertiary)';
}

const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function TeamMeta({ team }: { team: ScraperTeam }) {
    const played = team.matchesPlayed ?? 0;
    if (played === 0) return null;

    const w = team.wins ?? 0;
    const d = team.draws ?? 0;
    const l = team.losses ?? 0;
    const gf = team.goalsFor ?? 0;
    const ga = team.goalsAgainst ?? 0;

    const letter: CSSProperties = { fontStyle: 'normal', fontWeight: 600 };
    const num: CSSProperties = { fontWeight: 600, color: 'var(--color-text-secondary)', ...TABULAR };

    return (
        <div
            style={{
                marginTop: 3,
                fontSize: '0.72rem',
                letterSpacing: '0.01em',
                color: 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 5,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={TABULAR}>{played} played</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={TABULAR}>
                <span style={num}>{w}</span>
                <i style={{ ...letter, color: 'var(--color-success)' }}>W</i>
                {'\u00A0'}
                <span style={num}>{d}</span>
                <i style={{ ...letter, color: 'var(--color-text-tertiary)' }}>D</i>
                {'\u00A0'}
                <span style={num}>{l}</span>
                <i style={{ ...letter, color: 'var(--color-danger)' }}>L</i>
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={TABULAR}>
                {gf}<span style={{ opacity: 0.6 }}>–</span>{ga}
            </span>
        </div>
    );
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

    const allLeagues = useMemo(() => {
        const unique = Array.from(new Set(teams.map(t => t.leagueName).filter(Boolean))) as string[];
        return unique.sort();
    }, [teams]);

    const leagues = useMemo(() => {
        const ourTeams = teams.filter(t => isOwnTeam(t.name));
        const ourLeagues = Array.from(new Set(ourTeams.map(t => t.leagueName).filter(Boolean))) as string[];
        return ourLeagues.length > 0 ? ourLeagues.sort() : allLeagues;
    }, [allLeagues, teams]);

    useEffect(() => {
        if (leagues.length === 0) return;
        if (!selectedLeague || !leagues.includes(selectedLeague)) {
            onSelectedLeagueChange(leagues[0]);
        }
    }, [leagues, selectedLeague, onSelectedLeagueChange]);

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

    const filteredTeams = useMemo(() => {
        if (!selectedLeague) return [];
        return teams
            .filter(t => t.leagueName === selectedLeague)
            .sort((a, b) => (a.rank || 99) - (b.rank || 99));
    }, [teams, selectedLeague]);

    const selectedTeam = selectedTeamId != null
        ? teams.find(t => t.externalId === selectedTeamId) || null
        : null;

    const handleTeamClick = (team: ScraperTeam) => {
        hapticPatterns.tap();
        onSelectTeam?.(team.externalId);
    };

    if (loading) {
        return (
            <div className="container content-under-top-overlay flex-center" style={{ minHeight: '60dvh' }}>
                <Loader2 className="animate-spin" size={24} color="var(--color-text-secondary)" />
            </div>
        );
    }

    return (
        <>
            <div className="container content-under-top-overlay">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)',
                        borderRadius: 16,
                        border: '0.5px solid var(--color-border)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '26px 1fr 38px 42px',
                            gap: 12,
                            padding: '12px 18px 11px',
                            borderBottom: '0.5px solid var(--color-border-subtle)',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            color: 'var(--color-text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.09em',
                        }}
                    >
                        <div>#</div>
                        <div>Team</div>
                        <div style={{ textAlign: 'right' }}>GD</div>
                        <div style={{ textAlign: 'right' }}>Pts</div>
                    </div>

                    {filteredTeams.length > 0 ? filteredTeams.map((team, index) => {
                        const rank = team.rank ?? index + 1;
                        const highlighted = isOwnTeam(team.name);
                        const isLast = index === filteredTeams.length - 1;
                        const gd = team.goalDifference ?? 0;

                        return (
                            <motion.button
                                key={team.externalId}
                                type="button"
                                onClick={() => handleTeamClick(team)}
                                whileTap={{ scale: 0.99 }}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02, duration: 0.18 }}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'grid',
                                    gridTemplateColumns: '26px 1fr 38px 42px',
                                    gap: 12,
                                    padding: '18px 18px',
                                    alignItems: 'center',
                                    textAlign: 'left',
                                    background: highlighted
                                        ? 'rgb(var(--color-accent-rgb) / 0.055)'
                                        : 'transparent',
                                    boxShadow: highlighted
                                        ? 'inset 2px 0 0 var(--color-accent)'
                                        : 'inset 2px 0 0 transparent',
                                    borderBottom: isLast
                                        ? 'none'
                                        : '0.5px solid var(--color-border-subtle)',
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        ...TABULAR,
                                        color: rankColor(rank, filteredTeams.length),
                                    }}
                                >
                                    {rank}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontWeight: highlighted ? 700 : 600,
                                            fontSize: '0.92rem',
                                            color: 'var(--color-text-primary)',
                                            lineHeight: 1.25,
                                            letterSpacing: '-0.005em',
                                        }}
                                    >
                                        {team.name}
                                    </div>
                                    <TeamMeta team={team} />
                                </div>

                                <div
                                    style={{
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        ...TABULAR,
                                        color: gdColor(gd),
                                    }}
                                >
                                    {gd > 0 ? `+${gd}` : gd}
                                </div>

                                <div
                                    style={{
                                        textAlign: 'right',
                                        fontWeight: 700,
                                        fontSize: '1.02rem',
                                        ...TABULAR,
                                        letterSpacing: '-0.01em',
                                        color: 'var(--color-text-primary)',
                                    }}
                                >
                                    {team.points ?? 0}
                                </div>
                            </motion.button>
                        );
                    }) : (
                        <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                            No teams found for this league
                        </div>
                    )}
                </motion.div>
            </div>

            <TeamDetailPage
                team={selectedTeam || ({} as ScraperTeam)}
                open={Boolean(selectedTeam)}
                onClose={() => onSelectTeam?.(null)}
            />
        </>
    );
}
