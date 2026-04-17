import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Player } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

interface PlayerListItemProps {
  player: Player;
  onPress: () => void;
  disabled?: boolean;
}

export function PlayerListItem({ player, onPress, disabled = false }: PlayerListItemProps) {
  return (
    <Pressable
      android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
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
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  cardPressed: {
    backgroundColor: androidDarkTheme.colors.surfaceAlt
  },
  cardDisabled: {
    opacity: 0.6
  },
  avatar: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.primary,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    marginRight: 12,
    width: 38
  },
  avatarText: {
    color: androidDarkTheme.colors.onPrimary,
    fontWeight: "700"
  },
  info: {
    flex: 1
  },
  name: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "600"
  },
  chevron: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 22,
    marginLeft: 8
  }
});
