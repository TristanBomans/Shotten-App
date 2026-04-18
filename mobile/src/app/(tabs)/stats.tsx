import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMatches, fetchPlayers } from "../../lib/api";
import { getAttendanceSummary, getPlayerAttendanceStatus } from "../../lib/matches";
import type { Match, Player } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { androidDarkTheme } from "../../theme/androidDark";

type SortKey = "present" | "absent" | "rate";

interface PlayerStat {
  player: Player;
  present: number;
  notPresent: number;
  maybe: number;
  total: number;
  rate: number;
}

export default function StatsScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("rate");

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [matchData, playerData] = await Promise.all([fetchMatches(session.playerId), fetchPlayers()]);
        setMatches(matchData);
        setPlayers(playerData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load leaderboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.playerId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ownSummary = useMemo(() => getAttendanceSummary(matches, session.playerId), [matches, session.playerId]);

  const playerStats = useMemo((): PlayerStat[] => {
    return players
      .map((player) => {
        const summary = getAttendanceSummary(matches, player.id);
        const total = summary.present + summary.notPresent + summary.maybe;
        const rate = total > 0 ? summary.present / total : 0;
        return { player, ...summary, total, rate };
      })
      .filter((stat) => stat.total > 0)
      .sort((a, b) => {
        if (sortBy === "present") return b.present - a.present;
        if (sortBy === "absent") return b.notPresent - a.notPresent;
        return b.rate - a.rate;
      });
  }, [players, matches, sortBy]);

  const rankEmoji = (index: number) => {
    if (index === 0) return "\u{1F947}";
    if (index === 1) return "\u{1F948}";
    if (index === 2) return "\u{1F949}";
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <LoadingState message="Loading leaderboard..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ErrorState message={error} onRetry={() => void loadData()} />
      </SafeAreaView>
    );
  }

  const ownRate = ownSummary.present + ownSummary.notPresent + ownSummary.maybe > 0
    ? Math.round((ownSummary.present / (ownSummary.present + ownSummary.notPresent + ownSummary.maybe)) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={androidDarkTheme.colors.primary}
            colors={[androidDarkTheme.colors.primary]}
            progressBackgroundColor={androidDarkTheme.colors.surfaceRaised}
          />
        }
      >
        <View style={styles.ownStats}>
          <Text style={styles.ownStatsTitle}>Your attendance</Text>
          <View style={styles.ownStatsRow}>
            <View style={[styles.ownStat, styles.ownStatPresent]}>
              <Text style={styles.ownStatValue}>{ownSummary.present}</Text>
              <Text style={styles.ownStatLabel}>Present</Text>
            </View>
            <View style={[styles.ownStat, styles.ownStatAbsent]}>
              <Text style={styles.ownStatValue}>{ownSummary.notPresent}</Text>
              <Text style={styles.ownStatLabel}>Not present</Text>
            </View>
            <View style={[styles.ownStat, styles.ownStatMaybe]}>
              <Text style={styles.ownStatValue}>{ownSummary.maybe}</Text>
              <Text style={styles.ownStatLabel}>Maybe</Text>
            </View>
            <View style={[styles.ownStat, styles.ownStatRate]}>
              <Text style={styles.ownStatValue}>{ownRate}%</Text>
              <Text style={styles.ownStatLabel}>Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.sortRow}>
          {(["rate", "present", "absent"] as SortKey[]).map((key) => (
            <View key={key} style={styles.sortChipContainer}>
              <Text
                onPress={() => setSortBy(key)}
                style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
              >
                {key === "rate" ? "Rate" : key === "present" ? "Present" : "Absent"}
              </Text>
            </View>
          ))}
        </View>

        {playerStats.length > 0 ? (
          playerStats.map((stat, index) => {
            const isOwnPlayer = stat.player.id === session.playerId;
            return (
              <View
                key={stat.player.id}
                style={[styles.playerRow, isOwnPlayer && styles.playerRowOwn]}
              >
                <View style={styles.playerRank}>
                  <Text style={styles.playerRankText}>
                    {rankEmoji(index) ?? `${index + 1}`}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isOwnPlayer && styles.playerNameOwn]}>
                    {stat.player.name}
                  </Text>
                  <Text style={styles.playerSubtext}>
                    {stat.present} present \u00B7 {stat.notPresent} absent \u00B7 {stat.maybe} maybe
                  </Text>
                </View>
                <View style={styles.playerRate}>
                  <Text style={styles.playerRateText}>
                    {Math.round(stat.rate * 100)}%
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Leaderboard data will appear once matches are played.</Text>
          </View>
        )}
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
  },
  ownStats: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    borderTopColor: androidDarkTheme.colors.outline,
    borderTopWidth: 1,
    padding: 16,
  },
  ownStatsTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  ownStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  ownStat: {
    alignItems: "center",
    borderRadius: androidDarkTheme.radius.md,
    flex: 1,
    paddingVertical: 10,
  },
  ownStatPresent: {
    backgroundColor: androidDarkTheme.colors.successContainer,
  },
  ownStatAbsent: {
    backgroundColor: androidDarkTheme.colors.errorContainer,
  },
  ownStatMaybe: {
    backgroundColor: androidDarkTheme.colors.warningContainer,
  },
  ownStatRate: {
    backgroundColor: androidDarkTheme.colors.surfaceRaised,
  },
  ownStatValue: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  ownStatLabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  sortRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortChipContainer: {
    borderRadius: androidDarkTheme.radius.pill,
    overflow: "hidden",
  },
  sortChip: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.pill,
    borderWidth: 1,
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortChipActive: {
    backgroundColor: androidDarkTheme.colors.primary,
    borderColor: androidDarkTheme.colors.primary,
    color: androidDarkTheme.colors.onPrimary,
  },
  playerRow: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    marginHorizontal: 16,
  },
  playerRowOwn: {
    backgroundColor: androidDarkTheme.colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: androidDarkTheme.colors.primary,
  },
  playerRank: {
    alignItems: "center",
    width: 44,
  },
  playerRankText: {
    fontSize: 16,
  },
  playerInfo: {
    flex: 1,
    paddingVertical: 12,
  },
  playerName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  playerNameOwn: {
    color: androidDarkTheme.colors.primary,
  },
  playerSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 2,
  },
  playerRate: {
    paddingHorizontal: 8,
  },
  playerRateText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
  },
  emptyTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
});