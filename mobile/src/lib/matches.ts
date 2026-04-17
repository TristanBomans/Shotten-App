import type { AttendanceStatus, Match, MatchAttendance } from "./types";

export type ResolvedAttendanceState = "yes" | "no" | "undecided" | "unanswered";

export function isUpcomingMatch(match: Match, nowTimestamp = Date.now()): boolean {
  const eventTime = Date.parse(match.date);
  return Number.isFinite(eventTime) && eventTime >= nowTimestamp;
}

export function filterUpcomingMatches(matches: Match[], nowTimestamp = Date.now()): Match[] {
  return [...matches]
    .filter((match) => isUpcomingMatch(match, nowTimestamp))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function getPlayerAttendanceStatus(match: Match, playerId: number): AttendanceStatus | null {
  const attendance = match.attendances.find((item) => item.playerId === playerId);
  return attendance?.status ?? null;
}

export function resolveAttendanceState(status: AttendanceStatus | null): ResolvedAttendanceState {
  if (status === "Present") {
    return "yes";
  }

  if (status === "NotPresent") {
    return "no";
  }

  if (status === "Maybe") {
    return "undecided";
  }

  return "unanswered";
}

export function resolveAttendanceLabel(status: AttendanceStatus | null): string {
  if (status === "Present") {
    return "Ja";
  }

  if (status === "NotPresent") {
    return "Nee";
  }

  if (status === "Maybe") {
    return "Nog niet beslist";
  }

  return "Nog geen antwoord";
}

export function withPlayerAttendance(
  match: Match,
  playerId: number,
  nextStatus: AttendanceStatus
): Match {
  const existingIndex = match.attendances.findIndex((item) => item.playerId === playerId);

  if (existingIndex >= 0) {
    const updatedAttendances = [...match.attendances];
    updatedAttendances[existingIndex] = {
      ...updatedAttendances[existingIndex],
      status: nextStatus
    };

    return {
      ...match,
      attendances: updatedAttendances
    };
  }

  const nextAttendance: MatchAttendance = {
    matchId: match.id,
    playerId,
    player: null,
    status: nextStatus
  };

  return {
    ...match,
    attendances: [...match.attendances, nextAttendance]
  };
}

export function formatMatchDate(dateIso: string): string {
  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return "Onbekende datum";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
