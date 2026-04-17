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
