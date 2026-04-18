import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearPlayerSession } from "../../state/player-session";
import { useSession } from "../../state/session-context";
import { androidDarkTheme } from "../../theme/androidDark";

export default function SettingsScreen() {
  const session = useSession();

  const handleLogout = () => {
    Alert.alert("Switch player", "Are you sure you want to switch to a different player?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        style: "destructive",
        onPress: () => {
          void clearPlayerSession();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.playerCard}>
          <View style={styles.playerAvatar}>
            <Text style={styles.playerAvatarText}>
              {session.playerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{session.playerName}</Text>
            <Text style={styles.playerId}>Player #{session.playerId}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={handleLogout}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Switch player</Text>
              <Text style={styles.settingDescription}>Choose a different player profile</Text>
            </View>
            <Text style={styles.settingArrow}>{"\u203A"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={[styles.settingRow, styles.settingRowDisabled]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Theme</Text>
              <Text style={styles.settingDescription}>Coming soon</Text>
            </View>
          </View>
          <View style={[styles.settingRow, styles.settingRowDisabled, styles.settingRowNoBorder]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Haptic feedback</Text>
              <Text style={styles.settingDescription}>Coming soon</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.settingRow, styles.settingRowDisabled, styles.settingRowNoBorder]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Version</Text>
              <Text style={styles.settingDescription}>0.1.0 (beta)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  playerCard: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    padding: 16,
  },
  playerAvatar: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  playerAvatarText: {
    color: androidDarkTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
  },
  playerId: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    color: androidDarkTheme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
    textTransform: "uppercase",
  },
  settingRow: {
    alignItems: "center",
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowPressed: {
    backgroundColor: androidDarkTheme.colors.surfaceAlt,
  },
  settingRowDisabled: {
    opacity: 0.6,
  },
  settingRowNoBorder: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  settingLabelDisabled: {
    color: androidDarkTheme.colors.onSurfaceMuted,
  },
  settingDescription: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 2,
  },
  settingArrow: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 20,
    fontWeight: "300",
  },
});