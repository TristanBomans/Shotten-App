import { StyleSheet, Text, View } from "react-native";
import type { AttendanceStatus } from "../lib/types";
import { resolveAttendanceLabel, resolveAttendanceState } from "../lib/matches";
import { androidDarkTheme } from "../theme/androidDark";

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
          state === "undecided" && styles.maybeText
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
    backgroundColor: androidDarkTheme.colors.chip,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  text: {
    color: androidDarkTheme.colors.chipText,
    fontSize: 12,
    fontWeight: "700"
  },
  yes: {
    backgroundColor: androidDarkTheme.colors.successContainer
  },
  no: {
    backgroundColor: androidDarkTheme.colors.errorContainer
  },
  maybe: {
    backgroundColor: androidDarkTheme.colors.warningContainer
  },
  yesText: {
    color: androidDarkTheme.colors.onSuccess
  },
  noText: {
    color: androidDarkTheme.colors.onError
  },
  maybeText: {
    color: androidDarkTheme.colors.onWarning
  }
});
