import type { Match, Player } from "./types";

export const POINTS = {
  present: 50,
  maybe: -20,
  notPresent: -50,
  ghost: -100,
  base: 1000,
} as const;

export interface Rank {
  name: string;
  emoji: string;
  minScore: number;
  color: string;
  bgColor: string;
}

export const RANKS: Rank[] = [
  { name: "Club Legend", emoji: "🏆", minScore: 1300, color: "#f7cb61", bgColor: "rgba(247, 203, 97, 0.15)" },
  { name: "Ultra", emoji: "📣", minScore: 1100, color: "#f7cb61", bgColor: "rgba(247, 203, 97, 0.12)" },
  { name: "Plastic Fan", emoji: "✨", minScore: 1000, color: "#3ddc84", bgColor: "rgba(61, 220, 132, 0.15)" },
  { name: "Bench Warmer", emoji: "🪑", minScore: 800, color: "#9aa3b2", bgColor: "rgba(154, 163, 178, 0.12)" },
  { name: "Casual", emoji: "🍺", minScore: 500, color: "#f7cb61", bgColor: "rgba(247, 203, 97, 0.10)" },
  { name: "Professional Ghost", emoji: "👻", minScore: 0, color: "#ff5f85", bgColor: "rgba(255, 95, 133, 0.15)" },
];

export function getRank(score: number): Rank {
  return RANKS.find((r) => score >= r.minScore) ?? RANKS[RANKS.length - 1];
}

export type MatchResultStatus = "present" | "maybe" | "notPresent" | "ghost";

export interface MatchResult {
  matchId: number;
  matchName: string;
  status: MatchResultStatus;
  points: number;
}

export interface PlayerStats {
  score: number;
  presentCount: number;
  maybeCount: number;
  absentCount: number;
  ghostCount: number;
  totalMatches: number;
  rank: Rank;
  recentForm: MatchResultStatus[];
  matchResults: MatchResult[];
}

function isRelevantMatch(match: Match, now = Date.now()): boolean {
  const eventTime = Date.parse(match.date);
  if (!Number.isFinite(eventTime) || eventTime >= now) return false;
  const hasAttendees = match.attendances.some((a) => a.status === "Present");
  return hasAttendees;
}

export function calculatePlayerScore(player: Player, allMatches: Match[]): PlayerStats {
  const relevantMatches = allMatches.filter((m) => {
    if (!isRelevantMatch(m)) return false;
    return player.teamIds.includes(m.teamId);
  });

  const sortedMatches = [...relevantMatches].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );

  let score = POINTS.base;
  let presentCount = 0;
  let maybeCount = 0;
  let absentCount = 0;
  let ghostCount = 0;

  const matchResults: MatchResult[] = [];

  for (const match of sortedMatches) {
    const attendance = match.attendances.find((a) => a.playerId === player.id);

    let status: MatchResultStatus;
    let points: number;

    if (!attendance) {
      status = "ghost";
      points = POINTS.ghost;
      ghostCount++;
    } else if (attendance.status === "Present") {
      status = "present";
      points = POINTS.present;
      presentCount++;
    } else if (attendance.status === "Maybe") {
      status = "maybe";
      points = POINTS.maybe;
      maybeCount++;
    } else {
      status = "notPresent";
      points = POINTS.notPresent;
      absentCount++;
    }

    score += points;
    matchResults.push({
      matchId: match.id,
      matchName: match.name,
      status,
      points,
    });
  }

  const recentForm = matchResults.slice(0, 5).map((r) => r.status);

  return {
    score,
    presentCount,
    maybeCount,
    absentCount,
    ghostCount,
    totalMatches: relevantMatches.length,
    rank: getRank(score),
    recentForm,
    matchResults,
  };
}

export interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

export function buildLeaderboard(players: Player[], matches: Match[]): PlayerWithStats[] {
  return players
    .map((player) => ({
      ...player,
      stats: calculatePlayerScore(player, matches),
    }))
    .sort((a, b) => b.stats.score - a.stats.score);
}