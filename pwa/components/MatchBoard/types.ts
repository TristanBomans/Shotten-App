export interface RosterPlayer {
    id: number;
    name: string;
    status: string;
    teamIds?: number[];
    /** "NotPresent" filled in by an absence period. */
    away?: boolean;
}

export interface StatusGroup {
    title: string;
    players: RosterPlayer[];
    color: string;
}

export type AttendanceStatus = 'Present' | 'NotPresent' | 'Maybe';
