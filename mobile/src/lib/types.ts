export interface Player {
  id: number;
  name: string;
  teamIds: number[];
}

export interface Team {
  id: number;
  name: string;
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
  form?: string[];
  colors?: string;
  manager?: string;
  description?: string;
  imageBase64?: string;
}

export interface ScraperTeamStats {
  id: number;
  playerId: number;
  teamId: number;
  number?: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  fairplayRank?: number;
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
  teamStats?: ScraperTeamStats[];
}

export interface ScraperMatch {
  _id: string;
  externalId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  location?: string;
  teamId: number;
  status: "Scheduled" | "Played" | "Postponed";
}

export interface VersionRelease {
  date: string;
  changes: string[];
}

export interface VersionInfo {
  releases: VersionRelease[];
}
