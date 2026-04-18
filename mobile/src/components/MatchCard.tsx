import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ResponseButtons } from "./ResponseButtons";
import { formatMatchDate, resolveAttendanceState } from "../lib/matches";
import type { AttendanceStatus, Match } from "../lib/types";
import { usePreferences } from "../state/preferences-context";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface MatchCardProps {
  match: Match;
  currentStatus: AttendanceStatus | null;
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  onMaybe?: () => void;
  onPress?: () => void;
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
    sections.push({ label: "In", count: present.length, color: t.colors.primary, nameColor: t.colors.onSurfaceMuted, players: present });
  }
  if (maybe.length > 0) {
    sections.push({ label: "Maybe", count: maybe.length, color: t.colors.warningAccent, nameColor: t.colors.onSurfaceMuted, players: maybe });
  }
  if (notPresent.length > 0) {
    sections.push({ label: "Out", count: notPresent.length, color: t.colors.errorAccent, nameColor: t.colors.onSurfaceMuted, players: notPresent });
  }
  if (unknown.length > 0) {
    sections.push({ label: "TBD", count: unknown.length, color: t.colors.onSurfaceDim, nameColor: t.colors.onSurfaceDim, players: unknown });
  }

  return sections;
}

function formatPlayerNames(players: { id: number; name: string }[], currentPlayerId?: number, showFullNames?: boolean): string {
  if (!showFullNames) {
    return String(players.length);
  }
  return players.map((p) => {
    if (currentPlayerId && p.id === currentPlayerId) {
      return "you";
    }
    return p.name;
  }).join(" · ");
}

export function MatchCard({ match, currentStatus, isUpdating, onYes, onNo, onMaybe, onPress, variant = "default", currentPlayerId }: MatchCardProps) {
  const { preferences } = usePreferences();
  const isHero = variant === "hero";
  const sections = buildSquadSections(match.attendances, currentPlayerId);
  const hasResponses = sections.length > 0;

  const cardContent = (
    <View style={[styles.card, isHero && styles.heroCard]}>
      {isHero ? <View style={styles.heroAccent} /> : null}
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.title, isHero && styles.heroTitle]}>{match.name}</Text>
            <Text style={styles.meta}>{formatMatchDate(match.date)}</Text>
            {match.location ? <Text style={styles.metaLocation}>{match.location}</Text> : null}
          </View>
          {onPress ? (
            <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} style={styles.chevron} />
          ) : null}
        </View>

        {hasResponses ? (
          <View style={styles.squadSection}>
            {sections.map((section) => (
              <View key={section.label} style={styles.squadRow}>
                <View style={[styles.squadDot, { backgroundColor: section.color }]} />
                <Text style={[styles.squadLabel, { color: section.color }]}>
                  {section.label}
                </Text>
                <Text style={[styles.squadNames, { color: section.nameColor }]} numberOfLines={2}>
                  {formatPlayerNames(section.players, currentPlayerId, preferences.showFullNames)}
                </Text>
                <Text style={[styles.squadCount, { color: section.color }]}>
                  {section.count}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noResponses}>No responses yet</Text>
        )}

        <View style={styles.buttonsWrap} onStartShouldSetResponder={() => true}>
          <ResponseButtons
            currentState={resolveAttendanceState(currentStatus)}
            isUpdating={isUpdating}
            onYes={onYes}
            onNo={onNo}
            onMaybe={onMaybe}
          />
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        android_ripple={{ color: t.colors.ripple, borderless: false, radius: t.radius.lg + 5 }}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.cardPressed]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    marginBottom: t.spacing.md,
    overflow: "hidden",
  },
  heroCard: {
    backgroundColor: t.colors.surfaceAlt,
    marginBottom: 0,
  },
  heroAccent: {
    backgroundColor: t.colors.primary,
    height: 3,
  },
  cardInner: {
    padding: t.spacing.lg,
  },
  cardPressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
  },
  chevron: {
    marginTop: 4,
    marginLeft: t.spacing.sm,
  },
  title: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
  },
  heroTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
  },
  meta: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.bodySmall,
    marginTop: t.spacing.xs,
  },
  metaLocation: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
    marginTop: 2,
  },
  squadSection: {
    gap: 6,
    marginTop: t.spacing.lg,
  },
  squadRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
  },
  squadDot: {
    borderRadius: t.radius.pill,
    height: 6,
    width: 6,
  },
  squadLabel: {
    ...t.typography.caption,
    fontWeight: "700",
    minWidth: 36,
  },
  squadNames: {
    color: t.colors.onSurfaceMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  squadCount: {
    ...t.typography.caption,
    fontWeight: "800",
    minWidth: 16,
    textAlign: "right",
  },
  noResponses: {
    color: t.colors.onSurfaceDim,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: t.spacing.md,
  },
  buttonsWrap: {},
});