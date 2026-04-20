import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Player } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface PlayerListItemProps {
  player: Player;
  onPress: () => void;
  disabled?: boolean;
}

export function PlayerListItem({ player, onPress, disabled = false }: PlayerListItemProps) {
  return (
    <Pressable
      android_ripple={{ color: t.colors.ripple, borderless: false }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, disabled && styles.cardDisabled]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.md,
    minHeight: t.touch.minHeight,
    overflow: "hidden",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  cardPressed: {
    backgroundColor: t.colors.surfaceAlt,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: t.colors.primaryMuted,
    borderRadius: t.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: t.colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  name: {
    color: t.colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
  },
});
