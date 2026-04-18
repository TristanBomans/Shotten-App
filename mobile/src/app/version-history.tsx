import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchVersionInfo } from "../lib/api";
import type { VersionRelease } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const calendarDaysDiff = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) /
      (1000 * 60 * 60 * 24),
  );
  const calendarWeeksDiff = Math.floor(calendarDaysDiff / 7);
  const calendarMonthsDiff = Math.floor(calendarDaysDiff / 30);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (calendarDaysDiff === 1) return "Yesterday";
  if (calendarDaysDiff < 7) return `${calendarDaysDiff}d ago`;
  if (calendarWeeksDiff <= 4) return `${calendarWeeksDiff}w ago`;
  return `${Math.max(1, calendarMonthsDiff)}mo ago`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function VersionHistoryScreen() {
  const [releases, setReleases] = useState<VersionRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersionInfo()
      .then((info) => {
        if (info?.releases) setReleases(info.releases);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={t.colors.primary} />
          </View>
        ) : releases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No changes available</Text>
          </View>
        ) : (
          releases.map((release, idx) => (
            <View key={`${release.date}-${idx}`} style={[styles.releaseBlock, idx > 0 && styles.releaseBlockTop]}>
              <View style={styles.releaseDateRow}>
                <Text style={styles.releaseDate}>{formatDate(release.date)}</Text>
                <Text style={styles.releaseRelative}>{formatRelativeTime(release.date)}</Text>
              </View>
              <View style={styles.changesList}>
                {release.changes.map((change, ci) => (
                  <View key={`${idx}-${ci}`} style={styles.changeRow}>
                    <View style={styles.changeDot} />
                    <Text style={styles.changeText}>{change}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },
  scrollContent: { paddingBottom: t.spacing.xxxl, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },
  loaderWrap: { alignItems: "center", justifyContent: "center", paddingVertical: t.spacing.xxxl },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: t.spacing.xxxl },
  emptyText: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall },

  releaseBlock: { marginBottom: t.spacing.lg },
  releaseBlockTop: { borderTopColor: t.colors.divider, borderTopWidth: 1, paddingTop: t.spacing.lg },
  releaseDateRow: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: t.spacing.sm },
  releaseDate: { color: t.colors.onSurface, fontSize: 16, fontWeight: "700" },
  releaseRelative: { color: t.colors.onSurfaceDim, fontSize: 13 },

  changesList: { gap: t.spacing.xs },
  changeRow: { alignItems: "flex-start", flexDirection: "row", gap: t.spacing.sm },
  changeDot: { backgroundColor: t.colors.primary, borderRadius: t.radius.pill, height: 6, marginTop: 7, width: 6 },
  changeText: { color: t.colors.onSurfaceMuted, flex: 1, fontSize: 15, lineHeight: 22 },
});
