import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import { clearPlayerSession } from "../../state/player-session";
import { useSession } from "../../state/session-context";
import { usePreferences } from "../../state/preferences-context";
import {
  clearDefaultLeague,
  setDefaultLeague,
  setReleaseScope,
} from "../../state/preferences";
import { fetchGithubReleases, fetchScraperTeams } from "../../lib/api";
import { resolveInstalledReleaseTag, resolveReleaseUpdateStatus } from "../../lib/release-updates";
import type { AndroidRelease } from "../../lib/release-updates";
import type { ReleaseScope } from "../../lib/types";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;
const { width: SCREEN_W } = Dimensions.get("window");

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type AppExtra = {
  appVariant?: "development" | "preview" | "production";
  releaseTag?: string;
};

function SettingIcon({ name, color }: { name: IconName; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: `${color}14` }]}>
      <MaterialCommunityIcons name={name} size={20} color={color} />
    </View>
  );
}

function formatPublishedDate(isoString: string | null): string {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsScreen() {
  const session = useSession();
  const { preferences, reload: reloadPrefs } = usePreferences();
  const router = useRouter();
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [latestRelease, setLatestRelease] = useState<AndroidRelease | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isCheckingRelease, setIsCheckingRelease] = useState(false);
  const [releaseCheckFailed, setReleaseCheckFailed] = useState(false);
  const pickerPanY = useRef(new Animated.Value(0)).current;

  const pickerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pickerPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.timing(pickerPanY, {
            toValue: SCREEN_W,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            pickerPanY.setValue(0);
            setLeaguePickerOpen(false);
          });
        } else {
          Animated.spring(pickerPanY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (leaguePickerOpen) {
      pickerPanY.setValue(0);
    }
  }, [leaguePickerOpen]);

  const isAndroid = Platform.OS === "android";
  const appVersion = useMemo(() => Constants.expoConfig?.version ?? "0.1.0", []);
  const appExtra = useMemo(() => (Constants.expoConfig?.extra ?? {}) as AppExtra, []);
  const releaseScope = preferences.releaseScope;
  const installedReleaseTag = useMemo(
    () => resolveInstalledReleaseTag(appVersion, appExtra.releaseTag),
    [appExtra.releaseTag, appVersion],
  );

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

  useEffect(() => {
    if (!isAndroid) {
      return;
    }

    let isActive = true;

    const checkReleases = async () => {
      setIsCheckingRelease(true);
      setReleaseCheckFailed(false);

      const releases = await fetchGithubReleases();
      if (!isActive) {
        return;
      }

      if (!releases) {
        setReleaseCheckFailed(true);
        setLatestRelease(null);
        setHasUpdate(false);
        setIsCheckingRelease(false);
        return;
      }

      const status = resolveReleaseUpdateStatus({
        releases,
        scope: releaseScope,
        installedAppVersion: appVersion,
        installedReleaseTag,
      });

      setLatestRelease(status.latestRelease);
      setHasUpdate(status.updateAvailable);
      setIsCheckingRelease(false);
    };

    void checkReleases();

    return () => {
      isActive = false;
    };
  }, [appVersion, installedReleaseTag, isAndroid, releaseScope]);

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

  const handleToggleReleaseScope = useCallback(async () => {
    const nextScope: ReleaseScope = releaseScope === "stable" ? "all" : "stable";
    await setReleaseScope(nextScope);
    reloadPrefs();
  }, [releaseScope, reloadPrefs]);

  const handleDownloadLatestRelease = useCallback(async () => {
    if (!latestRelease) {
      return;
    }

    try {
      await Linking.openURL(latestRelease.apkDownloadUrl);
    } catch {
      Alert.alert("Open download failed", "Could not open the APK download link.");
    }
  }, [latestRelease]);

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

  const versionLabel = useMemo(() => {
    if (appExtra.appVariant === "preview") {
      return `${appVersion} (preview)`;
    }

    if (appExtra.appVariant === "development") {
      return `${appVersion} (dev)`;
    }

    return appVersion;
  }, [appExtra.appVariant, appVersion]);

  const releaseStatusTitle = useMemo(() => {
    if (isCheckingRelease) return "Checking for updates...";
    if (releaseCheckFailed) return "Update check unavailable";
    if (hasUpdate) return "New release available";
    return "You're up to date";
  }, [hasUpdate, isCheckingRelease, releaseCheckFailed]);

  const releaseStatusDescription = useMemo(() => {
    if (releaseCheckFailed) return "Could not fetch GitHub releases right now.";
    if (!latestRelease) return "No Android release found for this scope.";
    return `Latest: ${latestRelease.tagName}`;
  }, [latestRelease, releaseCheckFailed]);

  const releasePublishedLabel = useMemo(() => {
    const dateLabel = formatPublishedDate(latestRelease?.publishedAt ?? null);
    return dateLabel ? `Published ${dateLabel}` : "";
  }, [latestRelease?.publishedAt]);

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
              <Text style={[styles.settingLabel, styles.settingLabelDisabled]}>Haptic Feedback</Text>
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
            onPress={() => router.push("/respond-as-player")}
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
            onPress={() => router.push("/player-management")}
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

        {/* Android release checker */}
        {isAndroid ? (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Android Updates</Text>
              {hasUpdate && !isCheckingRelease ? <View style={styles.sectionAlertDot} /> : null}
            </View>

            <View style={styles.section}>
              <View style={styles.settingRow}>
                <SettingIcon name="source-branch" color={t.colors.warningAccent} />
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Version Scope</Text>
                  <Text style={styles.settingDescription}>
                    {releaseScope === "stable" ? "Stable releases only" : "All releases (including previews)"}
                  </Text>
                </View>
                <Switch
                  value={releaseScope === "all"}
                  onValueChange={() => void handleToggleReleaseScope()}
                  trackColor={{ false: t.colors.surfaceRaised, true: `${t.colors.primary}55` }}
                  thumbColor={releaseScope === "all" ? t.colors.primary : t.colors.onSurfaceDim}
                  style={styles.switch}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={[styles.settingRow, styles.settingRowTop]}>
                <SettingIcon
                  name={hasUpdate ? "bell-badge-outline" : "download-circle-outline"}
                  color={hasUpdate ? t.colors.warningAccent : t.colors.primary}
                />

                <View style={styles.settingContent}>
                  <View style={styles.releaseTitleRow}>
                    <Text style={styles.settingLabel}>{releaseStatusTitle}</Text>
                    {hasUpdate && !isCheckingRelease ? (
                      <View style={styles.updateBadge}>
                        <Text style={styles.updateBadgeText}>New</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.settingDescription}>{releaseStatusDescription}</Text>
                  {releasePublishedLabel ? (
                    <Text style={styles.settingDescription}>{releasePublishedLabel}</Text>
                  ) : null}

                  {hasUpdate && latestRelease ? (
                    <Pressable
                      android_ripple={{ color: t.colors.ripple, borderless: false }}
                      onPress={() => void handleDownloadLatestRelease()}
                      style={({ pressed }) => [styles.downloadButton, pressed && styles.downloadButtonPressed]}
                    >
                      <MaterialCommunityIcons name="download" size={16} color={t.colors.onPrimary} />
                      <Text style={styles.downloadButtonText}>Download APK</Text>
                    </Pressable>
                  ) : null}
                </View>

                {isCheckingRelease ? <ActivityIndicator size="small" color={t.colors.primary} /> : null}
              </View>
            </View>
          </>
        ) : null}

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <SettingIcon name="information-outline" color={t.colors.onSurfaceMuted} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingDescription}>{versionLabel}</Text>
              {isAndroid ? <Text style={styles.settingDescription}>{installedReleaseTag}</Text> : null}
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
          <Animated.View style={{ flex: 1, transform: [{ translateY: pickerPanY }] }}>
            {/* Drag handle — swipeable */}
            <View style={styles.pickerHandleBar} {...pickerPanResponder.panHandlers}>
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
          </Animated.View>
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
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  sectionAlertDot: {
    backgroundColor: t.colors.warningAccent,
    borderRadius: t.radius.pill,
    height: 8,
    width: 8,
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
    marginLeft: 68,
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
  settingRowTop: {
    alignItems: "flex-start",
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

  // Release checker
  releaseTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
  },
  updateBadge: {
    backgroundColor: t.colors.warningContainer,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 2,
  },
  updateBadgeText: {
    color: t.colors.warningAccent,
    fontSize: 11,
    fontWeight: "700",
  },
  downloadButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.md,
    overflow: "hidden",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  downloadButtonPressed: {
    opacity: 0.9,
  },
  downloadButtonText: {
    color: t.colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
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
    justifyContent: "center",
    backgroundColor: t.colors.surface,
    paddingVertical: t.spacing.md,
    minHeight: 44,
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
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
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
