// =============================================================================
// MOCK DATA - Realistic Dutch Futsal Team Data
// =============================================================================

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
    attendances: Attendance[];
}

export interface Team {
    id: number;
    name: string;
}

// Teams
export const MOCK_TEAMS: Team[] = [
    { id: 1, name: 'Shotten FC' },
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

// Matches with realistic future and past dates
export const MOCK_MATCHES: Match[] = [
    // Upcoming matches
    {
        id: 101,
        name: 'Shotten FC - De Zwaluwen',
        date: getRelativeDate(3, 20, 30),
        location: 'Sporthal De Wielewaal, Rotterdam',
        teamId: 1,
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
        attendances: [
            { playerId: 1, status: 'Present' },
            { playerId: 4, status: 'Present' },
            { playerId: 11, status: 'Present' },
            { playerId: 12, status: 'Maybe' },
        ],
    },
    // Past matches
    {
        id: 201,
        name: 'Ajax Zaal - Shotten FC',
        date: getRelativeDate(-7, 20, 0),
        location: 'Johan Cruijff Arena (Zaal)',
        teamId: 1,
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
        id: 203,
        name: 'Vrienden Toernooi',
        date: getRelativeDate(-21, 14, 0),
        location: 'Sportpark Oost',
        teamId: 2,
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

// Get all matches for a specific player (based on their teams)
export function getMatchesForPlayer(playerId: number): Match[] {
    const player = MOCK_PLAYERS.find(p => p.id === playerId);
    if (!player) return [];

    return MOCK_MATCHES
        .filter(m => player.teamIds.includes(m.teamId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
