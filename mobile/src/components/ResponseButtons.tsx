import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface ResponseButtonsProps {
  currentState: "yes" | "no" | "undecided" | "unanswered";
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  onMaybe?: () => void;
}

export function ResponseButtons({ currentState, isUpdating, onYes, onNo, onMaybe }: ResponseButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isUpdating}
        onPress={onYes}
        style={[
          styles.segment,
          currentState === "yes" && { backgroundColor: t.colors.primary },
        ]}
      >
        <Text
          style={[
            styles.segmentText,
            currentState === "yes" ? { color: "#000000" } : { color: t.colors.primary },
          ]}
        >
          {isUpdating && currentState === "yes" ? "Saving..." : "Yes"}
        </Text>
      </TouchableOpacity>

      {onMaybe ? (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isUpdating}
          onPress={onMaybe}
          style={[
            styles.segment,
            currentState === "undecided" && { backgroundColor: t.colors.warningAccent },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              currentState === "undecided" ? { color: "#000000" } : { color: t.colors.warningAccent },
            ]}
          >
            {isUpdating && currentState === "undecided" ? "Saving..." : "Maybe"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isUpdating}
        onPress={onNo}
        style={[
          styles.segment,
          currentState === "no" && { backgroundColor: t.colors.errorAccent },
        ]}
      >
        <Text
          style={[
            styles.segmentText,
            currentState === "no" ? { color: "#000000" } : { color: t.colors.errorAccent },
          ]}
        >
          {isUpdating && currentState === "no" ? "Saving..." : "No"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.lg,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: t.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
