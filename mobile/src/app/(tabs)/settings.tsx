import { Alert, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearPlayerSession } from "../../state/player-session";
import { useSession } from "../../state/session-context";
import { usePreferences } from "../../state/preferences-context";
import { setHapticFeedback, setShowFullNames, setDefaultLeague, clearDefaultLeague } from "../../state/preferences";
import { fetchScraperTeams } from "../../lib/api";
import { androidDarkTheme } from "../../theme/androidDark";
import Constants from "expo-constants";

function SettingIcon({ name, color }: { name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
      <MaterialCommunityIcons name={name} size={20} color={color} />
    </View>
  );
}

export default function SettingsScreen() {
  const session = useSession();
  const { preferences, reload: reloadPrefs } = usePreferences();
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);

  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const teams = await fetchScraperTeams();
        const unique = Array.from(new Set(teams.map((t) => t.leagueName).filter(Boolean))).sort() as string[];
        setLeagues(unique);
      } catch {
        // silently fail
      }
    };
    void loadLeagues();
  }, []);

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

  const handleToggleHaptic = useCallback(async () => {
    const newValue = !preferences.hapticFeedback;
    await setHapticFeedback(newValue);
    reloadPrefs();
  }, [preferences.hapticFeedback, reloadPrefs]);

  const handleToggleFullNames = useCallback(async () => {
    const newValue = !preferences.showFullNames;
    await setShowFullNames(newValue);
    reloadPrefs();
  }, [preferences.showFullNames, reloadPrefs]);

  const handleSelectLeague = useCallback(async (league: string) => {
    await setDefaultLeague(league);
    reloadPrefs();
    setLeaguePickerOpen(false);
  }, [reloadPrefs]);

  const handleClearDefaultLeague = useCallback(async () => {
    await clearDefaultLeague();
    reloadPrefs();
    setLeaguePickerOpen(false);
  }, [reloadPrefs]);

  const appVersion = useMemo(() => {
    const v = Constants.expoConfig?.version;
    return v ? `${v}` : "0.1.0";
  }, []);

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

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <SettingIcon name="bell-outline" color="#f7cb61" />
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Notifications</Text>
              <Text style={styles.settingDescription}>Coming in a future update</Text>
            </View>
            <Switch
              value={false}
              disabled
              trackColor={{ false: "#333", true: "#333" }}
              thumbColor="#666"
              style={styles.switch}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowBorder]}>
            <SettingIcon name="vibrate" color={androidDarkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                {preferences.hapticFeedback ? "Vibration on actions" : "Vibration disabled"}
              </Text>
            </View>
            <Switch
              value={preferences.hapticFeedback}
              onValueChange={() => void handleToggleHaptic()}
              trackColor={{ false: "#333", true: `${androidDarkTheme.colors.primary}66` }}
              thumbColor={preferences.hapticFeedback ? androidDarkTheme.colors.primary : "#666"}
              style={styles.switch}
            />
          </View>

          <View style={styles.settingRow}>
            <SettingIcon name="account-group" color={androidDarkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Show Full Names</Text>
              <Text style={styles.settingDescription}>
                {preferences.showFullNames ? "Names visible on cards" : "Avatars only"}
              </Text>
            </View>
            <Switch
              value={preferences.showFullNames}
              onValueChange={() => void handleToggleFullNames()}
              trackColor={{ false: "#333", true: `${androidDarkTheme.colors.primary}66` }}
              thumbColor={preferences.showFullNames ? androidDarkTheme.colors.primary : "#666"}
              style={styles.switch}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>League</Text>
        <View style={styles.section}>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => setLeaguePickerOpen(true)}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="trophy" color="#f7cb61" />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Default League</Text>
              <Text style={styles.settingDescription} numberOfLines={1}>
                {preferences.defaultLeague || "Auto-select (Mechelen preferred)"}
              </Text>
            </View>
            <Text style={styles.settingArrow}>{"\u203A"}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.section}>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => {}}
            style={({ pressed }) => [styles.settingRow, styles.settingRowBorder, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="account-check" color={androidDarkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Respond as Player</Text>
              <Text style={styles.settingDescription}>Fill in attendance for someone else</Text>
            </View>
            <Text style={styles.settingArrow}>{"\u203A"}</Text>
          </Pressable>

          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => {}}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="account-cog" color={androidDarkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Manage Players</Text>
              <Text style={styles.settingDescription}>Add, edit or remove players</Text>
            </View>
            <Text style={styles.settingArrow}>{"\u203A"}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <SettingIcon name="information-outline" color={androidDarkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingDescription}>{appVersion} (beta)</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.signOutSection]}>
          <Pressable
            android_ripple={{ color: "rgba(255,95,133,0.15)", borderless: false }}
            onPress={handleLogout}
            style={({ pressed }) => [styles.settingRow, pressed && styles.signOutPressed]}
          >
            <SettingIcon name="logout" color="#ff5f85" />
            <View style={styles.settingContent}>
              <Text style={styles.signOutLabel}>Sign Out</Text>
              <Text style={styles.settingDescription}>Switch to a different player</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={leaguePickerOpen}
        onRequestClose={() => setLeaguePickerOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor={androidDarkTheme.colors.surface} />
        <SafeAreaView style={styles.pickerSafeArea} edges={["top", "bottom"]}>
          <View style={styles.pickerToolbar}>
            <Pressable
              android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: true }}
              onPress={() => setLeaguePickerOpen(false)}
              style={styles.pickerClose}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
            <Text style={styles.pickerTitle}>Default League</Text>
            <View style={styles.pickerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.pickerList}>
            <Pressable
              android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
              onPress={() => void handleClearDefaultLeague()}
              style={[styles.pickerItem, preferences.defaultLeague === "" && styles.pickerItemActive]}
            >
              <View style={styles.pickerItemContent}>
                <Text style={[styles.pickerItemName, preferences.defaultLeague === "" && styles.pickerItemNameActive]}>
                  Auto-select
                </Text>
                <Text style={styles.pickerItemSubtext}>Prefer Mechelen if available</Text>
              </View>
              {preferences.defaultLeague === "" ? <Text style={styles.pickerCheck}>{"\u2713"}</Text> : null}
            </Pressable>

            {leagues.map((league) => (
              <Pressable
                key={league}
                android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
                onPress={() => void handleSelectLeague(league)}
                style={[styles.pickerItem, preferences.defaultLeague === league && styles.pickerItemActive]}
              >
                <View style={styles.pickerItemContent}>
                  <Text style={[styles.pickerItemName, preferences.defaultLeague === league && styles.pickerItemNameActive]}>
                    {league}
                  </Text>
                </View>
                {preferences.defaultLeague === league ? <Text style={styles.pickerCheck}>{"\u2713"}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 20,
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
  sectionTitle: {
    color: androidDarkTheme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
  section: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  signOutSection: {
    borderColor: "rgba(255, 95, 133, 0.2)",
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
  },
  settingRowPressed: {
    backgroundColor: androidDarkTheme.colors.surfaceAlt,
  },
  signOutPressed: {
    backgroundColor: "rgba(255, 95, 133, 0.06)",
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
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
  signOutLabel: {
    color: "#ff5f85",
    fontSize: 15,
    fontWeight: "600",
  },
  switch: {
    marginLeft: 8,
  },
  pickerSafeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  pickerToolbar: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerClose: {
    borderRadius: androidDarkTheme.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickerCloseText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
  },
  pickerTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
  },
  pickerSpacer: {
    width: 60,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerItem: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerItemActive: {
    backgroundColor: "rgba(61, 220, 132, 0.08)",
    borderColor: androidDarkTheme.colors.primary,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  pickerItemNameActive: {
    color: androidDarkTheme.colors.primary,
  },
  pickerItemSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pickerCheck: {
    color: androidDarkTheme.colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
});