import type { Match, Player } from '@/lib/mockData';
import type { ScraperTeam, ScraperPlayer } from '@/lib/useConvexData';

export interface MatchCardProps {
    match: Match;
    currentPlayerId: string;
    allPlayers: Player[];
    onUpdate: (matchId: string, newStatus: AttendanceStatus) => void;
    variant: 'hero' | 'compact';
}

export interface RosterPlayer {
    id: string;
    name: string;
    status: string;
    teamIds?: string[];
}

export interface StatusGroup {
    title: string;
    players: RosterPlayer[];
    color: string;
    emoji: string;
}

export type ResponseType = 'yes' | 'maybe' | 'no';
export type AttendanceStatus = 'Present' | 'NotPresent' | 'Maybe';

export const STATUS_COLORS = {
    present: '#30d158',
    maybe: '#ffd60a',
    notPresent: '#ff453a',
    unknown: 'rgba(255,255,255,0.4)',
} as const;

export const RESPONSE_CONFIG = {
    yes: {
        color: '#30d158',
        bg: 'rgba(48, 209, 88, 0.2)',
        bgSelected: 'rgba(48, 209, 88, 0.25)',
        borderSelected: 'rgba(48, 209, 88, 0.5)',
    },
    maybe: {
        color: '#ffd60a',
        bg: 'rgba(255, 214, 10, 0.15)',
        bgSelected: 'rgba(255, 214, 10, 0.15)',
        borderSelected: 'rgba(255, 214, 10, 0.4)',
    },
    no: {
        color: '#ff453a',
        bg: 'rgba(255, 69, 58, 0.15)',
        bgSelected: 'rgba(255, 69, 58, 0.15)',
        borderSelected: 'rgba(255, 69, 58, 0.4)',
    },
} as const;

export interface MatchModalProps {
    matchName: string;
    roster: RosterPlayer[];
    currentPlayerId: string;
    match: Match;
    onClose: () => void;
}

export { ScraperTeam, ScraperPlayer };
