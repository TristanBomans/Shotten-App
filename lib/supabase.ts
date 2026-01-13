import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// DATABASE TYPES (matching schema.sql)
// ============================================================================

export interface CoreTeam {
    id: number;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface CorePlayer {
    id: number;
    name: string;
    team_ids: number[];
    created_at?: string;
    updated_at?: string;
}

export interface CoreMatch {
    id: number;
    date: string;
    location: string | null;
    name: string | null;
    team_name: string | null;
    team_id: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Attendance {
    id?: number;
    match_id: number;
    player_id: number;
    status: 'Present' | 'NotPresent' | 'Maybe';
    created_at?: string;
    updated_at?: string;
}

export interface LzvTeam {
    id?: number;
    external_id: number;
    name: string;
    league_id: number | null;
    league_name: string | null;
    rank: number | null;
    points: number;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points_per_match: number;
    form: string[];
    colors: string | null;
    manager: string | null;
    description: string | null;
    image_base64: string | null;
    last_updated: string;
}

export interface LzvMatch {
    id?: number;
    external_id: string;
    date: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    location: string | null;
    team_id: number;
    status: 'Scheduled' | 'Played' | 'Postponed';
}

export interface LzvPlayer {
    id?: number;
    external_id: number;
    name: string;
    last_updated: string;
}

export interface LzvPlayerTeamStats {
    id?: number;
    player_id: number;
    team_id: number;
    jersey_number: number | null;
    games_played: number;
    goals: number;
    assists: number;
    fairplay_rank: number | null;
}

// ============================================================================
// API RESPONSE TYPES (matching original backend format)
// ============================================================================

export interface PlayerResponse {
    id: number;
    name: string;
    teamIds: number[];
}

export interface TeamResponse {
    id: number;
    name: string;
}

export interface AttendanceResponse {
    matchId: number;
    playerId: number;
    player: PlayerResponse | null;
    status: 'Present' | 'NotPresent' | 'Maybe';
}

export interface MatchResponse {
    id: number;
    date: string;
    location: string | null;
    name: string | null;
    teamName: string | null;
    teamId: number | null;
    attendances: AttendanceResponse[];
}

export interface ScraperTeamResponse {
    externalId: number;
    name: string;
    leagueId?: number;
    leagueName?: string;
    rank?: number;
    points?: number;
    matchesPlayed?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    pointsPerMatch?: number;
    form?: string[];
    colors?: string;
    manager?: string;
    description?: string;
    imageBase64?: string;
}

export interface ScraperPlayerResponse {
    externalId: number;
    name: string;
    teamId: number;
    number?: number;
    gamesPlayed: number;
    goals: number;
    assists: number;
    fairplayRank?: number;
    teamIds?: number[];
    teamStats?: {
        teamId: number;
        number?: number;
        gamesPlayed: number;
        goals: number;
        assists: number;
        fairplayRank?: number;
    }[];
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bvwjoptvnxpttwkstiue.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YaWg2zCaLJqZrVYv0K-9sQ_vXXYEImm';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Client for read operations (uses anon key)
let anonClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!anonClient) {
        anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return anonClient;
}

// Client for write operations (uses service key)
let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
    if (!serviceClient) {
        const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
        serviceClient = createClient(SUPABASE_URL, key);
    }
    return serviceClient;
}

// ============================================================================
// CORE DATA FUNCTIONS
// ============================================================================

export async function getCorePlayers(): Promise<CorePlayer[]> {
    const { data, error } = await getSupabaseClient()
        .from('core_players')
        .select('*')
        .order('id');
    
    if (error) throw error;
    return data || [];
}

export async function getCorePlayer(id: number): Promise<CorePlayer | null> {
    const { data, error } = await getSupabaseClient()
        .from('core_players')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) return null;
    return data;
}

export async function createCorePlayer(name: string, teamIds: number[] = []): Promise<CorePlayer> {
    const { data, error } = await getSupabaseServiceClient()
        .from('core_players')
        .insert({ name, team_ids: teamIds })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateCorePlayer(id: number, name: string, teamIds: number[]): Promise<CorePlayer> {
    const { data, error } = await getSupabaseServiceClient()
        .from('core_players')
        .update({ name, team_ids: teamIds })
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function deleteCorePlayer(id: number): Promise<void> {
    // First delete attendance records
    await getSupabaseServiceClient()
        .from('attendances')
        .delete()
        .eq('player_id', id);
    
    const { error } = await getSupabaseServiceClient()
        .from('core_players')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

export async function getCoreTeams(): Promise<CoreTeam[]> {
    const { data, error } = await getSupabaseClient()
        .from('core_teams')
        .select('*')
        .order('id');
    
    if (error) throw error;
    return data || [];
}

export async function getCoreMatches(playerId?: number): Promise<CoreMatch[]> {
    let query = getSupabaseClient()
        .from('core_matches')
        .select('*')
        .order('date');
    
    if (playerId) {
        // Get player's team IDs first
        const player = await getCorePlayer(playerId);
        if (!player || player.team_ids.length === 0) {
            return [];
        }
        query = query.in('team_id', player.team_ids);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getCoreMatch(id: number): Promise<CoreMatch | null> {
    const { data, error } = await getSupabaseClient()
        .from('core_matches')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) return null;
    return data;
}

export async function createCoreMatch(match: Omit<CoreMatch, 'id' | 'created_at' | 'updated_at'>): Promise<CoreMatch> {
    const { data, error } = await getSupabaseServiceClient()
        .from('core_matches')
        .insert(match)
        .select()
        .single();
    
    if (error) throw error;
    
    // Create attendance records for all players
    const players = await getCorePlayers();
    if (players.length > 0) {
        const attendances = players.map(p => ({
            match_id: data.id,
            player_id: p.id,
            status: 'NotPresent' as const
        }));
        await getSupabaseServiceClient()
            .from('attendances')
            .insert(attendances);
    }
    
    return data;
}

export async function updateCoreMatch(id: number, updates: Partial<CoreMatch>): Promise<CoreMatch> {
    const { data, error } = await getSupabaseServiceClient()
        .from('core_matches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function deleteCoreMatch(id: number): Promise<void> {
    // First delete attendance records
    await getSupabaseServiceClient()
        .from('attendances')
        .delete()
        .eq('match_id', id);
    
    const { error } = await getSupabaseServiceClient()
        .from('core_matches')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

export async function getAttendances(matchIds: number[]): Promise<Attendance[]> {
    const { data, error } = await getSupabaseClient()
        .from('attendances')
        .select('*')
        .in('match_id', matchIds);
    
    if (error) throw error;
    return data || [];
}

export async function updateAttendance(matchId: number, playerId: number, status: Attendance['status']): Promise<Attendance> {
    const { data, error } = await getSupabaseServiceClient()
        .from('attendances')
        .upsert(
            { match_id: matchId, player_id: playerId, status },
            { onConflict: 'match_id,player_id' }
        )
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================================================
// LZV SCRAPER DATA FUNCTIONS
// ============================================================================

export async function getLzvTeams(): Promise<LzvTeam[]> {
    const { data, error } = await getSupabaseClient()
        .from('lzv_teams')
        .select('*')
        .order('rank');
    
    if (error) throw error;
    return data || [];
}

export async function getLzvTeam(externalId: number): Promise<LzvTeam | null> {
    const { data, error } = await getSupabaseClient()
        .from('lzv_teams')
        .select('*')
        .eq('external_id', externalId)
        .single();
    
    if (error) return null;
    return data;
}

export async function getLzvMatches(teamId?: number): Promise<LzvMatch[]> {
    let query = getSupabaseClient()
        .from('lzv_matches')
        .select('*')
        .order('date');
    
    if (teamId) {
        query = query.eq('team_id', teamId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getLzvPlayers(teamId?: number): Promise<ScraperPlayerResponse[]> {
    // Get all players with their team stats
    const { data: players, error: playersError } = await getSupabaseClient()
        .from('lzv_players')
        .select('*');
    
    if (playersError) throw playersError;
    if (!players) return [];
    
    // Get all team stats
    const playerIds = players.map(p => p.id);
    const { data: allStats, error: statsError } = await getSupabaseClient()
        .from('lzv_player_team_stats')
        .select('*')
        .in('player_id', playerIds);
    
    if (statsError) throw statsError;
    
    // Group stats by player
    const statsByPlayer = new Map<number, LzvPlayerTeamStats[]>();
    for (const stat of allStats || []) {
        if (!statsByPlayer.has(stat.player_id)) {
            statsByPlayer.set(stat.player_id, []);
        }
        statsByPlayer.get(stat.player_id)!.push(stat);
    }
    
    // Build response
    const result: ScraperPlayerResponse[] = [];
    
    for (const player of players) {
        const stats = statsByPlayer.get(player.id) || [];
        
        if (teamId) {
            // Filter: only include players with stats for this team
            const teamStats = stats.find(s => s.team_id === teamId);
            if (teamStats) {
                result.push({
                    externalId: player.external_id,
                    name: player.name,
                    teamId: teamStats.team_id,
                    number: teamStats.jersey_number ?? undefined,
                    gamesPlayed: teamStats.games_played,
                    goals: teamStats.goals,
                    assists: teamStats.assists,
                    fairplayRank: teamStats.fairplay_rank ?? undefined,
                    teamIds: stats.map(s => s.team_id)
                });
            }
        } else {
            // No filter: aggregate stats
            const totalGoals = stats.reduce((sum, s) => sum + s.goals, 0);
            const totalAssists = stats.reduce((sum, s) => sum + s.assists, 0);
            const totalGames = stats.reduce((sum, s) => sum + s.games_played, 0);
            
            result.push({
                externalId: player.external_id,
                name: player.name,
                teamId: stats[0]?.team_id || 0,
                number: stats[0]?.jersey_number ?? undefined,
                gamesPlayed: totalGames,
                goals: totalGoals,
                assists: totalAssists,
                teamIds: stats.map(s => s.team_id),
                teamStats: stats.map(s => ({
                    teamId: s.team_id,
                    number: s.jersey_number ?? undefined,
                    gamesPlayed: s.games_played,
                    goals: s.goals,
                    assists: s.assists,
                    fairplayRank: s.fairplay_rank ?? undefined
                }))
            });
        }
    }
    
    // Sort by goals descending
    result.sort((a, b) => b.goals - a.goals);
    
    return result;
}

// ============================================================================
// HELPER FUNCTIONS FOR API RESPONSES
// ============================================================================

export function toPlayerResponse(player: CorePlayer): PlayerResponse {
    return {
        id: player.id,
        name: player.name,
        teamIds: player.team_ids
    };
}

export function toTeamResponse(team: CoreTeam): TeamResponse {
    return {
        id: team.id,
        name: team.name
    };
}

export async function toMatchResponse(match: CoreMatch): Promise<MatchResponse> {
    const attendances = await getAttendances([match.id]);
    const players = await getCorePlayers();
    const playerMap = new Map(players.map(p => [p.id, p]));
    
    return {
        id: match.id,
        date: match.date,
        location: match.location,
        name: match.name,
        teamName: match.team_name,
        teamId: match.team_id,
        attendances: attendances.map(a => {
            const player = playerMap.get(a.player_id);
            return {
                matchId: a.match_id,
                playerId: a.player_id,
                player: player ? toPlayerResponse(player) : null,
                status: a.status
            };
        })
    };
}

export async function toMatchesResponse(matches: CoreMatch[]): Promise<MatchResponse[]> {
    if (matches.length === 0) return [];
    
    const matchIds = matches.map(m => m.id);
    const attendances = await getAttendances(matchIds);
    const players = await getCorePlayers();
    const playerMap = new Map(players.map(p => [p.id, p]));
    
    // Group attendances by match
    const attendancesByMatch = new Map<number, Attendance[]>();
    for (const att of attendances) {
        if (!attendancesByMatch.has(att.match_id)) {
            attendancesByMatch.set(att.match_id, []);
        }
        attendancesByMatch.get(att.match_id)!.push(att);
    }
    
    return matches.map(match => ({
        id: match.id,
        date: match.date,
        location: match.location,
        name: match.name,
        teamName: match.team_name,
        teamId: match.team_id,
        attendances: (attendancesByMatch.get(match.id) || []).map(a => {
            const player = playerMap.get(a.player_id);
            return {
                matchId: a.match_id,
                playerId: a.player_id,
                player: player ? toPlayerResponse(player) : null,
                status: a.status
            };
        })
    }));
}

export function toScraperTeamResponse(team: LzvTeam): ScraperTeamResponse {
    return {
        externalId: team.external_id,
        name: team.name,
        leagueId: team.league_id ?? undefined,
        leagueName: team.league_name ?? undefined,
        rank: team.rank ?? undefined,
        points: team.points ?? undefined,
        matchesPlayed: team.matches_played ?? undefined,
        wins: team.wins ?? undefined,
        draws: team.draws ?? undefined,
        losses: team.losses ?? undefined,
        goalsFor: team.goals_for ?? undefined,
        goalsAgainst: team.goals_against ?? undefined,
        goalDifference: team.goal_difference ?? undefined,
        pointsPerMatch: team.points_per_match ?? undefined,
        form: team.form ?? undefined,
        colors: team.colors ?? undefined,
        manager: team.manager ?? undefined,
        description: team.description ?? undefined,
        imageBase64: team.image_base64 ?? undefined
    };
}
