import { StyleSheet, Text, View } from "react-native";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
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
}

export function MatchCard({ match, currentStatus, isUpdating, onYes, onNo }: MatchCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{match.name}</Text>
      <Text style={styles.meta}>{formatMatchDate(match.date)}</Text>
      <Text style={styles.meta}>{match.location || "Locatie onbekend"}</Text>

      <View style={styles.badgeRow}>
        <AttendanceStatusBadge status={currentStatus} />
      </View>

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
    padding: 14
  },
  title: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700"
  },
  meta: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 4
  },
  badgeRow: {
    marginTop: 12
  }
});
