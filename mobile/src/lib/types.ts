export interface Player {
  id: number;
  name: string;
  teamIds: number[];
}

export type AttendanceStatus = "Present" | "NotPresent" | "Maybe";

export interface MatchAttendance {
  matchId: number;
  playerId: number;
  player: Player | null;
  status: AttendanceStatus;
}

export interface Match {
  id: number;
  date: string;
  location?: string;
  name: string;
  teamName: string;
  teamId: number;
  attendances: MatchAttendance[];
}

export interface AttendanceUpdateResponse {
  matchId: number;
  playerId: number;
  status: AttendanceStatus;
}

export interface ScraperTeam {
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
  imageBase64?: string;
}

export interface ScraperPlayer {
  externalId: number;
  teamId: number;
  name: string;
  number?: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  fairplayRank?: number;
  teamIds?: number[];
}
