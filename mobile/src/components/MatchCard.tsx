import { StyleSheet, Text, View } from "react-native";
import { ResponseButtons } from "./ResponseButtons";
import { formatMatchDate, resolveAttendanceState } from "../lib/matches";
import type { AttendanceStatus, Match } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

interface MatchCardProps {
  match: Match;
  currentStatus: AttendanceStatus | null;
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  variant?: "default" | "hero";
  currentPlayerId?: number;
}

type SquadSection = {
  label: string;
  count: number;
  color: string;
  nameColor: string;
  players: { id: number; name: string }[];
};

function buildSquadSections(
  attendances: Match["attendances"],
  currentPlayerId?: number,
): SquadSection[] {
  const present: { id: number; name: string }[] = [];
  const maybe: { id: number; name: string }[] = [];
  const notPresent: { id: number; name: string }[] = [];
  const unknown: { id: number; name: string }[] = [];

  for (const att of attendances) {
    const name = att.player?.name ?? `Player ${att.playerId}`;
    if (att.status === "Present") {
      present.push({ id: att.playerId, name });
    } else if (att.status === "Maybe") {
      maybe.push({ id: att.playerId, name });
    } else if (att.status === "NotPresent") {
      notPresent.push({ id: att.playerId, name });
    } else {
      unknown.push({ id: att.playerId, name });
    }
  }

  const sections: SquadSection[] = [];

  if (present.length > 0) {
    sections.push({ label: "In", count: present.length, color: "#3ddc84", nameColor: androidDarkTheme.colors.onSurfaceMuted, players: present });
  }
  if (maybe.length > 0) {
    sections.push({ label: "Maybe", count: maybe.length, color: "#f7cb61", nameColor: androidDarkTheme.colors.onSurfaceMuted, players: maybe });
  }
  if (notPresent.length > 0) {
    sections.push({ label: "Out", count: notPresent.length, color: "#ff5f85", nameColor: androidDarkTheme.colors.onSurfaceMuted, players: notPresent });
  }
  if (unknown.length > 0) {
    sections.push({ label: "TBD", count: unknown.length, color: androidDarkTheme.colors.onSurfaceMuted, nameColor: androidDarkTheme.colors.onSurfaceMuted, players: unknown });
  }

  return sections;
}

function formatPlayerNames(players: { id: number; name: string }[], currentPlayerId?: number): string {
  return players.map((p) => {
    if (currentPlayerId && p.id === currentPlayerId) {
      return "you";
    }
    return p.name;
  }).join(" \u00B7 ");
}

export function MatchCard({ match, currentStatus, isUpdating, onYes, onNo, variant = "default", currentPlayerId }: MatchCardProps) {
  const isHero = variant === "hero";
  const sections = buildSquadSections(match.attendances, currentPlayerId);
  const hasResponses = sections.length > 0;

  return (
    <View style={[styles.card, isHero && styles.heroCard]}>
      <Text style={styles.title}>{match.name}</Text>
      <Text style={styles.meta}>{formatMatchDate(match.date)}</Text>
      {match.location ? <Text style={styles.meta}>{match.location}</Text> : null}

      {hasResponses ? (
        <View style={styles.squadSection}>
          {sections.map((section) => (
            <View key={section.label} style={styles.squadRow}>
              <Text style={[styles.squadLabel, { color: section.color }]}>
                {section.label}
              </Text>
              <Text style={[styles.squadNames, { color: section.nameColor }]} numberOfLines={2}>
                {formatPlayerNames(section.players, currentPlayerId)}
              </Text>
              <Text style={[styles.squadCount, { color: section.color }]}>
                {section.count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!hasResponses ? (
        <Text style={styles.noResponses}>No responses yet</Text>
      ) : null}

      <ResponseButtons
        currentState={resolveAttendanceState(currentStatus)}
        isUpdating={isUpdating}
        onYes={onYes}
        onNo={onNo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 12,
    padding: 14,
  },
  heroCard: {
    borderColor: androidDarkTheme.colors.primary,
    borderWidth: 1.5,
    marginBottom: 0,
  },
  title: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 4,
  },
  squadSection: {
    gap: 4,
    marginTop: 12,
  },
  squadRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
  },
  squadLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    minWidth: 38,
    paddingTop: 1,
  },
  squadNames: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  squadCount: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 16,
    paddingTop: 1,
    textAlign: "right",
  },
  noResponses: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
  },
});