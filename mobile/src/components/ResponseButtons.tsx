import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface ResponseButtonsProps {
  currentState: "yes" | "no" | "undecided" | "unanswered";
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function ResponseButtons({ currentState, isUpdating, onYes, onNo }: ResponseButtonsProps) {
  const yesIsActive = currentState === "yes";
  const noIsActive = currentState === "no";

  return (
    <View style={styles.row}>
      <Pressable
        android_ripple={{ color: "rgba(61, 220, 132, 0.15)", borderless: false }}
        disabled={isUpdating}
        onPress={onYes}
        style={({ pressed }) => [
          styles.button,
          styles.yesButton,
          yesIsActive && styles.yesButtonActive,
          pressed && !isUpdating && styles.buttonPressed,
          isUpdating && styles.buttonDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name={yesIsActive ? "check-circle" : "check-circle-outline"}
          size={18}
          color={yesIsActive ? t.colors.onPrimary : t.colors.primary}
          style={styles.buttonIcon}
        />
        <Text style={[styles.buttonText, styles.yesText, yesIsActive && styles.activeText]}>
          {isUpdating && yesIsActive ? "Saving..." : "Yes"}
        </Text>
      </Pressable>
      <Pressable
        android_ripple={{ color: "rgba(255, 95, 133, 0.15)", borderless: false }}
        disabled={isUpdating}
        onPress={onNo}
        style={({ pressed }) => [
          styles.button,
          styles.noButton,
          noIsActive && styles.noButtonActive,
          pressed && !isUpdating && styles.buttonPressed,
          isUpdating && styles.buttonDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name={noIsActive ? "close-circle" : "close-circle-outline"}
          size={18}
          color={noIsActive ? "#1e0008" : t.colors.errorAccent}
          style={styles.buttonIcon}
        />
        <Text style={[styles.buttonText, styles.noText, noIsActive && styles.activeText]}>
          {isUpdating && noIsActive ? "Saving..." : "No"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginTop: t.spacing.lg,
  },
  button: {
    alignItems: "center",
    borderRadius: t.radius.md,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: t.touch.minHeight,
    overflow: "hidden",
    paddingVertical: 12,
  },
  buttonIcon: {
    marginRight: 6,
  },
  yesButton: {
    backgroundColor: t.colors.successContainer,
  },
  yesButtonActive: {
    backgroundColor: t.colors.primary,
  },
  noButton: {
    backgroundColor: t.colors.errorContainer,
  },
  noButtonActive: {
    backgroundColor: t.colors.errorAccent,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  yesText: {
    color: t.colors.primary,
  },
  noText: {
    color: t.colors.errorAccent,
  },
  activeText: {
    color: t.colors.onPrimary,
  },
});
