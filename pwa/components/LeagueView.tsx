'use client';

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { fetchAllScraperTeams, type ScraperTeam } from '@/lib/useData';
import { Loader2 } from 'lucide-react';
import TeamDetailPage from './Pages/TeamDetailPage';
import { hapticPatterns } from '@/lib/haptic';
import { EmptyState } from './ui/controls';

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
    if (rank === 1) return 'var(--warn)';
    if (rank === total && total > 1) return 'var(--no)';
    return 'var(--text-3)';
}

function gdColor(gd: number) {
    if (gd > 0) return 'var(--ok)';
    if (gd < 0) return 'var(--no)';
    return 'var(--text-3)';
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

    return (
        <div
            style={{
                marginTop: 2,
                fontSize: 'var(--fs-3xs)',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 5,
                whiteSpace: 'nowrap',
                ...TABULAR,
            }}
        >
            <span>{played} played</span>
            <span style={{ opacity: 0.5 }} aria-hidden>·</span>
            <span>
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{w}</span>
                <span style={{ color: 'var(--ok)', fontWeight: 600 }}>W</span>
                {'\u00A0'}
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{d}</span>
                <span style={{ fontWeight: 600 }}>D</span>
                {'\u00A0'}
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{l}</span>
                <span style={{ color: 'var(--no)', fontWeight: 600 }}>L</span>
            </span>
            <span style={{ opacity: 0.5 }} aria-hidden>·</span>
            <span>
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
            <div className="screen flex-center" style={{ minHeight: '60dvh' }}>
                <Loader2 className="animate-spin" size={22} color="var(--text-2)" />
            </div>
        );
    }

    const gridTemplate = '24px minmax(0, 1fr) 40px 40px';

    return (
        <>
            <div className="screen">
                <div className="section-label">
                    <span>Standings{selectedLeague ? ` — ${selectedLeague}` : ''}</span>
                    <span className="t-num">{filteredTeams.length}</span>
                </div>
                <div className="list-section">
                    {/* Table header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: gridTemplate,
                            gap: 10,
                            padding: '10px 14px 9px',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.09em',
                        }}
                        aria-hidden
                    >
                        <div>#</div>
                        <div>Team</div>
                        <div style={{ textAlign: 'right' }}>GD</div>
                        <div style={{ textAlign: 'right' }}>Pts</div>
                    </div>

                    {filteredTeams.length > 0 ? filteredTeams.map((team, index) => {
                        const rank = team.rank ?? index + 1;
                        const highlighted = isOwnTeam(team.name);
                        const gd = team.goalDifference ?? 0;

                        return (
                            <button
                                key={team.externalId}
                                type="button"
                                className="row"
                                onClick={() => handleTeamClick(team)}
                                aria-label={`${team.name}, position ${rank}, ${team.points ?? 0} points`}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: gridTemplate,
                                    gap: 10,
                                    padding: '13px 14px',
                                    minHeight: 56,
                                    alignItems: 'center',
                                    background: highlighted ? 'rgb(var(--accent-rgb) / 0.08)' : undefined,
                                    boxShadow: highlighted ? 'inset 3px 0 0 var(--accent)' : undefined,
                                }}
                            >
                                <span
                                    className="t-num"
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 'var(--fs-2xs)',
                                        color: rankColor(rank, filteredTeams.length),
                                    }}
                                >
                                    {rank}
                                </span>

                                <span style={{ minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontWeight: highlighted ? 700 : 600,
                                            fontSize: 'var(--fs-xs)',
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {team.name}
                                    </span>
                                    <TeamMeta team={team} />
                                </span>

                                <span
                                    className="t-num"
                                    style={{
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        fontSize: 'var(--fs-2xs)',
                                        color: gdColor(gd),
                                    }}
                                >
                                    {gd > 0 ? `+${gd}` : gd}
                                </span>

                                <span
                                    className="t-num"
                                    style={{
                                        textAlign: 'right',
                                        fontWeight: 800,
                                        fontSize: 'var(--fs-sm)',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    {team.points ?? 0}
                                </span>
                            </button>
                        );
                    }) : (
                        <EmptyState title="No teams found" description="No teams found for this league." compact />
                    )}
                </div>
            </div>

            <TeamDetailPage
                team={selectedTeam || ({} as ScraperTeam)}
                open={Boolean(selectedTeam)}
                onClose={() => onSelectTeam?.(null)}
            />
        </>
    );
}
