import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMatches, fetchPlayers } from "../../lib/api";
import { buildLeaderboard, type PlayerWithStats } from "../../lib/leaderboard";
import type { Match, Player } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { androidDarkTheme } from "../../theme/androidDark";

const FORM_DOT_COLORS: Record<string, string> = {
  present: androidDarkTheme.colors.primary,
  maybe: "#f7cb61",
  notPresent: "#ff5f85",
  ghost: androidDarkTheme.colors.onSurfaceMuted,
};

export default function StatsScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [matchData, playerData] = await Promise.all([
          fetchMatches(session.playerId),
          fetchPlayers(),
        ]);
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

  const leaderboard = useMemo(
    () => buildLeaderboard(players, matches),
    [players, matches],
  );

  const topScorer = leaderboard[0] ?? null;
  const mostGhosts =
    leaderboard.length > 0
      ? leaderboard.reduce((a, b) => (a.stats.ghostCount > b.stats.ghostCount ? a : b))
      : null;
  const mostMaybe =
    leaderboard.length > 0
      ? leaderboard.reduce((a, b) => (a.stats.maybeCount > b.stats.maybeCount ? a : b))
      : null;

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

  if (selectedPlayer) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <PlayerDetail
          player={selectedPlayer}
          rank={leaderboard.findIndex((p) => p.id === selectedPlayer.id) + 1}
          onBack={() => setSelectedPlayer(null)}
        />
      </SafeAreaView>
    );
  }

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
        <View style={styles.highlightsRow}>
          <HighlightCard emoji="🏆" title="THE LEGEND" name={topScorer?.name ?? "—"} />
          <HighlightCard emoji="👻" title="CASPER" name={mostGhosts?.name ?? "—"} />
          <HighlightCard emoji="🤔" title="MISS MAYBE" name={mostMaybe?.name ?? "—"} />
        </View>

        <View style={styles.leaderboard}>
          {leaderboard.map((player, i) => {
            const isOwnPlayer = player.id === session.playerId;
            return (
              <Pressable
                key={player.id}
                android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
                onPress={() => setSelectedPlayer(player)}
                style={[styles.playerRow, isOwnPlayer && styles.playerRowOwn]}
              >
                <Text style={[styles.playerRank, i < 3 && styles.playerRankTop]}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </Text>

                <View style={[styles.rankIcon, { backgroundColor: player.stats.rank.bgColor }]}>
                  <Text style={styles.rankIconText}>{player.stats.rank.emoji}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isOwnPlayer && styles.playerNameOwn]}>
                    {player.name}
                  </Text>
                  <View style={styles.formRow}>
                    {player.stats.recentForm.map((status, j) => (
                      <View
                        key={j}
                        style={[styles.formDot, { backgroundColor: FORM_DOT_COLORS[status] ?? FORM_DOT_COLORS.ghost }]}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.playerScore}>{player.stats.score}</Text>
              </Pressable>
            );
          })}
        </View>

        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Leaderboard data will appear once matches are played.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HighlightCard({ emoji, title, name }: { emoji: string; title: string; name: string }) {
  return (
    <View style={styles.highlightCard}>
      <Text style={styles.highlightEmoji}>{emoji}</Text>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightName} numberOfLines={1}>{name}</Text>
    </View>
  );
}

function PlayerDetail({ player, rank, onBack }: { player: PlayerWithStats; rank: number; onBack: () => void }) {
  const s = player.stats;

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <Pressable
        android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>{"\u2190"} Back</Text>
      </Pressable>

      <View style={styles.detailHeader}>
        <Text style={styles.detailSubtext}>#{rank}  {s.rank.emoji} {s.rank.name}</Text>
        <View style={styles.scoreCard}>
          <Text style={[styles.scoreNumber, { color: s.rank.color }]}>{s.score}</Text>
          <Text style={styles.scoreLabel}>Shotten Points</Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatMini label="Present" value={s.presentCount} color={androidDarkTheme.colors.primary} />
        <StatMini label="Maybe" value={s.maybeCount} color="#f7cb61" />
        <StatMini label="Absent" value={s.absentCount} color="#ff5f85" />
        <StatMini label="Ghost" value={s.ghostCount} color={androidDarkTheme.colors.onSurfaceMuted} />
      </View>

      {s.matchResults.length > 0 ? (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Match History</Text>
          {s.matchResults.map((result) => (
            <View key={result.matchId} style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName} numberOfLines={1}>{result.matchName}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyEmoji}>
                  {result.status === "present" ? "✅" : result.status === "maybe" ? "⚠️" : result.status === "notPresent" ? "❌" : "👻"}
                </Text>
                <Text style={[styles.historyPoints, { color: result.points > 0 ? androidDarkTheme.colors.primary : "#ff5f85" }]}>
                  {result.points > 0 ? `+${result.points}` : String(result.points)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statMini}>
      <Text style={[styles.statMiniValue, { color }]}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
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
  highlightsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  highlightCard: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingBottom: 10,
    paddingHorizontal: 6,
    paddingTop: 10,
  },
  highlightEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  highlightTitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  highlightName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  leaderboard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  playerRow: {
    alignItems: "center",
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  playerRowOwn: {
    backgroundColor: "rgba(61, 220, 132, 0.08)",
    borderLeftColor: androidDarkTheme.colors.primary,
    borderLeftWidth: 3,
  },
  playerRank: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    width: 28,
  },
  playerRankTop: {
    fontSize: 16,
  },
  rankIcon: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rankIconText: {
    fontSize: 18,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  playerNameOwn: {
    color: androidDarkTheme.colors.primary,
  },
  formRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  formDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  playerScore: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 20,
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
  detailContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  backButtonText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
  },
  detailHeader: {
    marginBottom: 16,
  },
  detailSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    padding: 18,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: "800",
  },
  scoreLabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  statGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statMini: {
    alignItems: "center",
    flex: 1,
  },
  statMiniValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statMiniLabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  historySection: {
    marginTop: 4,
  },
  sectionTitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "500",
  },
  historyRight: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  historyEmoji: {
    fontSize: 14,
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: "700",
  },
});