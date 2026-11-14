import type { Match, Player } from '@/lib/mockData';
import type { RosterPlayer } from './types';

/** The match team's players, each with their response for this match. */
export function buildRoster(match: Match, allPlayers: Player[]): RosterPlayer[] {
    return allPlayers
        .filter(p => p.teamIds?.includes(match.teamId))
        .map(player => {
            const att = match.attendances?.find(a => a.playerId === player.id);
            return { ...player, status: att?.status || 'Unknown' };
        });
}
