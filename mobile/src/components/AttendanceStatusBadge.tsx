import { StyleSheet, Text, View } from "react-native";
import type { AttendanceStatus } from "../lib/types";
import { resolveAttendanceLabel, resolveAttendanceState } from "../lib/matches";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | null;
}

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const state = resolveAttendanceState(status);
  return (
    <View style={[styles.base, state === "yes" && styles.yes, state === "no" && styles.no, state === "undecided" && styles.maybe]}>
      <Text
        style={[
          styles.text,
          state === "yes" && styles.yesText,
          state === "no" && styles.noText,
          state === "undecided" && styles.maybeText,
        ]}
      >
        {resolveAttendanceLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    backgroundColor: t.colors.chip,
    borderRadius: t.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    color: t.colors.chipText,
    fontSize: 12,
    fontWeight: "700",
  },
  yes: {
    backgroundColor: t.colors.successContainer,
  },
  no: {
    backgroundColor: t.colors.errorContainer,
  },
  maybe: {
    backgroundColor: t.colors.warningContainer,
  },
  yesText: {
    color: t.colors.onSuccess,
  },
  noText: {
    color: t.colors.onError,
  },
  maybeText: {
    color: t.colors.onWarning,
  },
});
