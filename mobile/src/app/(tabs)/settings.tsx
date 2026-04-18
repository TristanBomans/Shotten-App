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

const t = androidDarkTheme;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function SettingIcon({ name, color }: { name: IconName; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: `${color}14` }]}>
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
        const unique = Array.from(new Set(teams.map((tm) => tm.leagueName).filter(Boolean))).sort() as string[];
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player identity card */}
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
          <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <SettingIcon name="bell-outline" color={t.colors.warningAccent} />
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Notifications</Text>
              <Text style={styles.settingDescription}>Coming in a future update</Text>
            </View>
            <Switch
              value={false}
              disabled
              trackColor={{ false: t.colors.surfaceRaised, true: t.colors.surfaceRaised }}
              thumbColor={t.colors.onSurfaceDim}
              style={styles.switch}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <SettingIcon name="vibrate" color={t.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                {preferences.hapticFeedback ? "Vibration on actions" : "Vibration disabled"}
              </Text>
            </View>
            <Switch
              value={preferences.hapticFeedback}
              onValueChange={() => void handleToggleHaptic()}
              trackColor={{ false: t.colors.surfaceRaised, true: `${t.colors.primary}55` }}
              thumbColor={preferences.hapticFeedback ? t.colors.primary : t.colors.onSurfaceDim}
              style={styles.switch}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <SettingIcon name="account-group" color={t.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Show Full Names</Text>
              <Text style={styles.settingDescription}>
                {preferences.showFullNames ? "Names visible on cards" : "Avatars only"}
              </Text>
            </View>
            <Switch
              value={preferences.showFullNames}
              onValueChange={() => void handleToggleFullNames()}
              trackColor={{ false: t.colors.surfaceRaised, true: `${t.colors.primary}55` }}
              thumbColor={preferences.showFullNames ? t.colors.primary : t.colors.onSurfaceDim}
              style={styles.switch}
            />
          </View>
        </View>

        {/* League */}
        <Text style={styles.sectionTitle}>League</Text>
        <View style={styles.section}>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => setLeaguePickerOpen(true)}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="trophy" color={t.colors.warningAccent} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Default League</Text>
              <Text style={styles.settingDescription} numberOfLines={1}>
                {preferences.defaultLeague || "Auto-select (Mechelen preferred)"}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
          </Pressable>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.section}>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => {}}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="account-check" color={t.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Respond as Player</Text>
              <Text style={styles.settingDescription}>Fill in attendance for someone else</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
          </Pressable>

          <View style={styles.settingDivider} />

          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => {}}
            style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
          >
            <SettingIcon name="account-cog" color={t.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Manage Players</Text>
              <Text style={styles.settingDescription}>Add, edit or remove players</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
          </Pressable>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <SettingIcon name="information-outline" color={t.colors.onSurfaceMuted} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingDescription}>{appVersion} (beta)</Text>
            </View>
          </View>
        </View>

        {/* Sign out — danger zone */}
        <View style={styles.signOutWrap}>
          <Pressable
            android_ripple={{ color: "rgba(255,95,133,0.10)", borderless: false }}
            onPress={handleLogout}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}
          >
            <MaterialCommunityIcons name="logout" size={20} color={t.colors.errorAccent} />
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* League picker bottom sheet */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={leaguePickerOpen}
        onRequestClose={() => setLeaguePickerOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
        <SafeAreaView style={styles.pickerSafeArea} edges={["top", "bottom"]}>
          {/* Drag handle */}
          <View style={styles.pickerHandleBar}>
            <View style={styles.pickerHandle} />
          </View>

          <View style={styles.pickerToolbar}>
            <Text style={styles.pickerTitle}>Default League</Text>
            <Pressable
              android_ripple={{ color: t.colors.ripple, borderless: true }}
              onPress={() => setLeaguePickerOpen(false)}
              style={styles.pickerCloseBtn}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            <Pressable
              android_ripple={{ color: t.colors.ripple, borderless: false }}
              onPress={() => void handleClearDefaultLeague()}
              style={[styles.pickerItem, preferences.defaultLeague === "" && styles.pickerItemActive]}
            >
              <View style={styles.pickerItemContent}>
                <Text style={[styles.pickerItemName, preferences.defaultLeague === "" && styles.pickerItemNameActive]}>
                  Auto-select
                </Text>
                <Text style={styles.pickerItemSubtext}>Prefer Mechelen if available</Text>
              </View>
              {preferences.defaultLeague === "" ? (
                <MaterialCommunityIcons name="check" size={20} color={t.colors.primary} />
              ) : null}
            </Pressable>

            {leagues.map((league) => (
              <Pressable
                key={league}
                android_ripple={{ color: t.colors.ripple, borderless: false }}
                onPress={() => void handleSelectLeague(league)}
                style={[styles.pickerItem, preferences.defaultLeague === league && styles.pickerItemActive]}
              >
                <View style={styles.pickerItemContent}>
                  <Text style={[styles.pickerItemName, preferences.defaultLeague === league && styles.pickerItemNameActive]}>
                    {league}
                  </Text>
                </View>
                {preferences.defaultLeague === league ? (
                  <MaterialCommunityIcons name="check" size={20} color={t.colors.primary} />
                ) : null}
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
    backgroundColor: t.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxxl,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },

  // Player card
  playerCard: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    flexDirection: "row",
    gap: t.spacing.md,
    marginBottom: t.spacing.xxl,
    padding: t.spacing.lg,
  },
  playerAvatar: {
    alignItems: "center",
    backgroundColor: t.colors.primaryMuted,
    borderRadius: t.radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  playerAvatarText: {
    color: t.colors.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
  },
  playerId: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
    marginTop: 2,
  },

  // Section headers
  sectionTitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    marginBottom: t.spacing.lg,
    overflow: "hidden",
  },
  settingDivider: {
    backgroundColor: t.colors.divider,
    height: 1,
    marginLeft: 68, // align with text after icon
  },

  // Setting rows
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.md,
    minHeight: t.touch.minHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  settingRowPressed: {
    backgroundColor: t.colors.surfaceAlt,
  },
  iconBox: {
    alignItems: "center",
    borderRadius: t.radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  settingLabelDisabled: {
    color: t.colors.onSurfaceDim,
  },
  settingDescription: {
    color: t.colors.onSurfaceDim,
    fontSize: 12,
    marginTop: 2,
  },
  switch: {
    marginLeft: t.spacing.sm,
  },

  // Sign out
  signOutWrap: {
    marginTop: t.spacing.lg,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: t.colors.errorContainer,
    borderRadius: t.radius.lg,
    flexDirection: "row",
    gap: t.spacing.md,
    justifyContent: "center",
    minHeight: t.touch.minHeight,
    overflow: "hidden",
    paddingVertical: t.spacing.md,
  },
  signOutPressed: {
    opacity: 0.85,
  },
  signOutLabel: {
    color: t.colors.errorAccent,
    fontSize: 15,
    fontWeight: "700",
  },

  // League picker bottom sheet
  pickerSafeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  pickerHandleBar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    paddingTop: t.spacing.sm,
  },
  pickerHandle: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.pill,
    height: 4,
    width: 36,
  },
  pickerToolbar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  pickerTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
    flex: 1,
  },
  pickerCloseBtn: {
    borderRadius: t.radius.pill,
    padding: t.spacing.xs,
  },
  pickerList: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    gap: t.spacing.sm,
  },
  pickerItem: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
  },
  pickerItemActive: {
    backgroundColor: t.colors.primaryMuted,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  pickerItemNameActive: {
    color: t.colors.primary,
  },
  pickerItemSubtext: {
    color: t.colors.onSurfaceDim,
    fontSize: 12,
    marginTop: 2,
  },
});