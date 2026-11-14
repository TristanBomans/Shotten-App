// =============================================================================
// MOCK DATA - Realistic Dutch Futsal Team Data
// =============================================================================

import type { GoalsData, GoalsLineup, GoalsLzvPlayer } from './goals';

export interface Player {
    id: number;
    name: string;
    teamIds: number[];
}

export interface Attendance {
    playerId: number;
    status: 'Present' | 'NotPresent' | 'Maybe';
}

export interface Match {
    id: number;
    name: string;
    date: string;
    location?: string;
    teamId: number;
    teamName?: string | null;
    forfait?: boolean;
    opponentLzvId?: number | null;
    lzvMatchExternalId?: string | null;
    result?: MatchResult | null;
    attendances: Attendance[];
}

export interface MatchResult {
    homeScore: number;
    awayScore: number;
    teamScore: number;
    opponentScore: number;
    outcome: 'W' | 'L' | 'D';
    resultId?: number | null;
    teamLzvId?: number;
}

export interface Team {
    id: number;
    name: string;
    lzvExternalId?: number | null;
}

// Teams
export const MOCK_TEAMS: Team[] = [
    { id: 1, name: 'Shotten FC', lzvExternalId: 501 },
    { id: 2, name: 'Zaalvoetbal Zondag' },
];

// Players - Dutch names
export const MOCK_PLAYERS: Player[] = [
    { id: 1, name: 'Tristan Bomans', teamIds: [1, 2] },
    { id: 2, name: 'Daan de Vries', teamIds: [1] },
    { id: 3, name: 'Sem Bakker', teamIds: [1] },
    { id: 4, name: 'Lucas Jansen', teamIds: [1, 2] },
    { id: 5, name: 'Finn Visser', teamIds: [1] },
    { id: 6, name: 'Jesse Smit', teamIds: [1] },
    { id: 7, name: 'Tim Mulder', teamIds: [1, 2] },
    { id: 8, name: 'Bram Bos', teamIds: [1] },
    { id: 9, name: 'Thijs Dekker', teamIds: [1] },
    { id: 10, name: 'Ruben Peters', teamIds: [1, 2] },
    { id: 11, name: 'Milan Hendriks', teamIds: [2] },
    { id: 12, name: 'Stijn Koning', teamIds: [2] },
];

// Helper to generate dates relative to now
const getRelativeDate = (daysFromNow: number, hour: number = 20, minute: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
};

// LZV result for a past mock match, from our team's point of view.
function mockResult(homeScore: number, awayScore: number, weAreHome: boolean, resultId: number): MatchResult {
    const teamScore = weAreHome ? homeScore : awayScore;
    const opponentScore = weAreHome ? awayScore : homeScore;
    return {
        homeScore,
        awayScore,
        teamScore,
        opponentScore,
        outcome: teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D',
        resultId,
        teamLzvId: 501,
    };
}

// Matches with realistic future and past dates
export const MOCK_MATCHES: Match[] = [
    // Upcoming matches
    {
        id: 101,
        name: 'Shotten FC - De Zwaluwen',
        date: getRelativeDate(3, 20, 30),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Maybe' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'NotPresent' },
            { playerId: 8, status: 'Present' },
        ],
    },
    {
        id: 102,
        name: 'FC Eindhoven - Shotten FC',
        date: getRelativeDate(10, 19, 0),
        location: 'Indoor Arena Eindhoven',
        teamId: 1,
        teamName: 'Shotten FC',
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 4, status: 'Maybe' },
            { playerId: 7, status: 'Present' },
        ],
    },
    {
        id: 103,
        name: 'Shotten FC - Sportclub West',
        date: getRelativeDate(17, 21, 0),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        attendances: [
            { playerId: 2, status: 'Present' },
        ],
    },
    {
        id: 104,
        name: 'Training Session',
        date: getRelativeDate(5, 18, 30),
        location: 'Sporthal Zuid',
        teamId: 1,
        teamName: 'Shotten FC',
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'Maybe' },
            { playerId: 9, status: 'Present' },
            { playerId: 10, status: 'Present' },
        ],
    },
    {
        id: 105,
        name: 'Zaalvoetbal - Open Avond',
        date: getRelativeDate(7, 20, 0),
        location: 'Sportcentrum Noord, Amsterdam',
        teamId: 2,
        teamName: 'Zaalvoetbal Zondag',
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 11, status: 'Present' },
            { playerId: 12, status: 'Maybe' },
        ],
    },
    // Past matches
    {
        // Played yesterday: man of the match voting is still open.
        id: 204,
        name: 'Shotten FC - Real Rotterdam',
        date: getRelativeDate(-1, 20, 0),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(6, 2, true, 7208),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'NotPresent' },
            { playerId: 8, status: 'Present' },
            { playerId: 9, status: 'Present' },
            { playerId: 10, status: 'Present' },
        ],
    },
    {
        id: 201,
        name: 'Ajax Zaal - Shotten FC',
        date: getRelativeDate(-7, 20, 0),
        location: 'Johan Cruijff Arena (Zaal)',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(3, 5, false, 7201),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 5, status: 'NotPresent' },
            { playerId: 6, status: 'Present' },
            { playerId: 7, status: 'Present' },
            { playerId: 8, status: 'Present' },
            { playerId: 9, status: 'NotPresent' },
            { playerId: 10, status: 'Present' },
        ],
    },
    {
        id: 202,
        name: 'Shotten FC - PSV Futsal',
        date: getRelativeDate(-14, 19, 30),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(4, 4, true, 7202),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'NotPresent' },
            { playerId: 3, status: 'Present' },
            { playerId: 6, status: 'Present' },
            { playerId: 7, status: 'Present' },
            { playerId: 8, status: 'Present' },
        ],
    },
    {
        id: 209,
        name: 'Shotten FC - Real Ronse',
        date: getRelativeDate(-28, 20, 30),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(6, 2, true, 7204),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 4, status: 'NotPresent' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'Present' },
            { playerId: 7, status: 'Maybe' },
            { playerId: 8, status: 'Present' },
            { playerId: 10, status: 'Present' },
        ],
    },
    {
        id: 205,
        name: 'FC Kortrijk - Shotten FC',
        date: getRelativeDate(-35, 21, 0),
        location: 'Sportcentrum Lange Munte, Kortrijk',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(4, 3, false, 7205),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'NotPresent' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'Present' },
            { playerId: 7, status: 'Present' },
            { playerId: 8, status: 'NotPresent' },
            { playerId: 10, status: 'Present' },
        ],
    },
    {
        id: 206,
        name: 'Shotten FC - De Kampioenen',
        date: getRelativeDate(-42, 20, 0),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(4, 3, true, 7206),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 5, status: 'Present' },
            { playerId: 6, status: 'NotPresent' },
            { playerId: 8, status: 'Present' },
            { playerId: 9, status: 'Maybe' },
        ],
    },
    {
        id: 207,
        name: 'Shotten FC - Futsal Gent',
        date: getRelativeDate(-49, 19, 30),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
        teamName: 'Shotten FC',
        result: mockResult(9, 1, true, 7207),
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 2, status: 'Present' },
            { playerId: 3, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 6, status: 'Present' },
            { playerId: 7, status: 'Present' },
            { playerId: 8, status: 'Present' },
            { playerId: 10, status: 'NotPresent' },
        ],
    },
    {
        id: 208,
        name: 'Sporting Lede - Shotten FC',
        date: getRelativeDate(-56, 20, 0),
        location: 'Sporthal Ter Elst, Lede',
        teamId: 1,
        teamName: 'Shotten FC',
        forfait: true,
        attendances: [
            { playerId: 1, status: 'NotPresent' },
            { playerId: 2, status: 'NotPresent' },
            { playerId: 3, status: 'Maybe' },
            { playerId: 6, status: 'NotPresent' },
        ],
    },
    {
        id: 203,
        name: 'Vrienden Toernooi',
        date: getRelativeDate(-21, 14, 0),
        location: 'Sportpark Oost',
        teamId: 2,
        teamName: 'Zaalvoetbal Zondag',
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 7, status: 'NotPresent' },
            { playerId: 10, status: 'Present' },
            { playerId: 11, status: 'Present' },
            { playerId: 12, status: 'Present' },
        ],
    },
];

// =============================================================================
// MOCK LZV GOALS - lineups with scorers for the past Shotten FC matches
// =============================================================================

// App player id -> LZV player as scraped from lzvcup.be. Names differ on
// purpose to exercise the name-match fallback ("Bakker Sem", "Daan De Vries");
// Ruben is only reachable through an explicit (manual) link.
const MOCK_LZV_PLAYERS: { appId: number | null; externalId: number; name: string; number: number }[] = [
    { appId: 1, externalId: 9001, name: 'Tristan Bomans', number: 7 },
    { appId: 2, externalId: 9002, name: 'Daan De Vries', number: 10 },
    { appId: 3, externalId: 9003, name: 'Bakker Sem', number: 4 },
    { appId: 4, externalId: 9004, name: 'Lucas Jansen', number: 2 },
    { appId: 5, externalId: 9005, name: 'Finn Visser', number: 9 },
    { appId: 6, externalId: 9006, name: 'Jesse Smit', number: 1 },
    { appId: 7, externalId: 9007, name: 'Tim Mulder', number: 5 },
    { appId: 8, externalId: 9008, name: 'Bram Bos', number: 11 },
    { appId: 10, externalId: 9010, name: 'R. Peters', number: 8 },
    { appId: null, externalId: 9100, name: 'Kevin Claes', number: 14 },
];

// result id -> [lzv player id, goals, assists] for everyone on the lineup
const MOCK_LINEUPS: Record<number, [number, number, number][]> = {
    7208: [[9001, 2, 1], [9002, 1, 2], [9003, 0, 1], [9005, 2, 0], [9008, 1, 1], [9010, 0, 0]],
    7201: [[9001, 2, 1], [9002, 1, 1], [9003, 0, 0], [9004, 0, 1], [9006, 0, 0], [9007, 1, 0], [9008, 1, 1], [9010, 0, 0]],
    7202: [[9001, 2, 0], [9003, 0, 1], [9006, 0, 0], [9007, 1, 1], [9008, 1, 0], [9100, 0, 0]],
    7204: [[9001, 1, 2], [9002, 2, 0], [9003, 0, 1], [9005, 1, 0], [9006, 0, 0], [9008, 2, 1], [9010, 0, 1]],
    7205: [[9001, 0, 1], [9002, 2, 0], [9005, 1, 0], [9006, 0, 0], [9007, 0, 1], [9010, 0, 0]],
    7206: [[9001, 1, 0], [9002, 0, 1], [9003, 1, 0], [9004, 0, 0], [9005, 1, 1], [9008, 1, 1]],
    7207: [[9001, 3, 1], [9002, 2, 2], [9003, 0, 1], [9004, 1, 0], [9006, 0, 0], [9007, 1, 1], [9008, 1, 2], [9100, 1, 0]],
};

/** Manual links in the mock "database" (core_players.lzv_player_external_id). */
export const MOCK_LZV_LINKS = new Map<number, number>([[10, 9010]]);

export function getMockGoalsData(): GoalsData {
    const nameById = new Map(MOCK_LZV_PLAYERS.map(p => [p.externalId, p.name]));
    const lineups: GoalsLineup[] = Object.entries(MOCK_LINEUPS).map(([resultId, rows]) => ({
        resultId: Number(resultId),
        lzvTeamId: 501,
        players: rows.map(([externalId, goals, assists]) => ({
            lzvPlayerExternalId: externalId,
            name: nameById.get(externalId) ?? '',
            goals,
            assists,
        })),
    }));

    const lzvPlayers: GoalsLzvPlayer[] = MOCK_LZV_PLAYERS.map(p => {
        const rows = lineups.flatMap(l => l.players.filter(r => r.lzvPlayerExternalId === p.externalId));
        return {
            externalId: p.externalId,
            name: p.name,
            teams: [{
                lzvTeamId: 501,
                number: p.number,
                gamesPlayed: rows.length,
                goals: rows.reduce((sum, r) => sum + r.goals, 0),
                assists: rows.reduce((sum, r) => sum + r.assists, 0),
            }],
        };
    });

    return {
        teams: [{ teamId: 1, lzvTeamId: 501 }],
        lzvPlayers,
        links: [...MOCK_LZV_LINKS].map(([playerId, lzvPlayerExternalId]) => ({ playerId, lzvPlayerExternalId })),
        lineups,
    };
}

// Get all matches for a specific player (based on their teams)
export function getMatchesForPlayer(playerId: number): Match[] {
    const player = MOCK_PLAYERS.find(p => p.id === playerId);
    if (!player) return [];

    return MOCK_MATCHES
        .filter(m => player.teamIds.includes(m.teamId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
