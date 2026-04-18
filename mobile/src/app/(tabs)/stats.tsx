import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

  const selectedRank = selectedPlayer
    ? leaderboard.findIndex((p) => p.id === selectedPlayer.id) + 1
    : 0;

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
                style={[styles.playerRow, isOwnPlayer && styles.playerRowOwn, i === leaderboard.length - 1 && styles.playerRowLast]}
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

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={selectedPlayer !== null}
        onRequestClose={() => setSelectedPlayer(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor={androidDarkTheme.colors.surface} />
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          <View style={styles.modalToolbar}>
            <Pressable
              android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: true }}
              onPress={() => setSelectedPlayer(null)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedPlayer?.name ?? ""}
            </Text>
            <View style={styles.modalClosePlaceholder} />
          </View>
          {selectedPlayer ? (
            <PlayerDetailContent player={selectedPlayer} rank={selectedRank} />
          ) : null}
        </SafeAreaView>
      </Modal>
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

function PlayerDetailContent({ player, rank }: { player: PlayerWithStats; rank: number }) {
  const s = player.stats;

  return (
    <ScrollView contentContainerStyle={styles.modalScrollContent}>
      <View style={styles.modalHero}>
        <View style={[styles.modalRankBadge, { backgroundColor: s.rank.bgColor }]}>
          <Text style={styles.modalRankEmoji}>{s.rank.emoji}</Text>
        </View>
        <Text style={styles.modalRankLabel}>{s.rank.name}</Text>
        <Text style={styles.modalRankPosition}>#{rank}</Text>
      </View>

      <View style={styles.modalScoreCard}>
        <Text style={[styles.modalScoreNumber, { color: s.rank.color }]}>{s.score}</Text>
        <Text style={styles.modalScoreLabel}>SHOTTEN POINTS</Text>
      </View>

      <View style={styles.modalStatGrid}>
        <View style={[styles.modalStatCell, { backgroundColor: androidDarkTheme.colors.successContainer }]}>
          <Text style={[styles.modalStatValue, { color: androidDarkTheme.colors.primary }]}>{s.presentCount}</Text>
          <Text style={styles.modalStatSublabel}>Present</Text>
        </View>
        <View style={[styles.modalStatCell, { backgroundColor: androidDarkTheme.colors.warningContainer }]}>
          <Text style={[styles.modalStatValue, { color: "#f7cb61" }]}>{s.maybeCount}</Text>
          <Text style={styles.modalStatSublabel}>Maybe</Text>
        </View>
        <View style={[styles.modalStatCell, { backgroundColor: androidDarkTheme.colors.errorContainer }]}>
          <Text style={[styles.modalStatValue, { color: "#ff5f85" }]}>{s.absentCount}</Text>
          <Text style={styles.modalStatSublabel}>Absent</Text>
        </View>
        <View style={[styles.modalStatCell, { backgroundColor: androidDarkTheme.colors.surfaceRaised }]}>
          <Text style={[styles.modalStatValue, { color: androidDarkTheme.colors.onSurfaceMuted }]}>{s.ghostCount}</Text>
          <Text style={styles.modalStatSublabel}>Ghost</Text>
        </View>
      </View>

      {s.matchResults.length > 0 ? (
        <View style={styles.modalHistory}>
          <Text style={styles.modalSectionTitle}>Match History</Text>
          {s.matchResults.map((result) => (
            <View key={result.matchId} style={styles.modalHistoryRow}>
              <Text style={styles.modalHistoryName} numberOfLines={1}>{result.matchName}</Text>
              <Text style={styles.modalHistoryEmoji}>
                {result.status === "present" ? "✅" : result.status === "maybe" ? "⚠️" : result.status === "notPresent" ? "❌" : "👻"}
              </Text>
              <Text style={[styles.modalHistoryPoints, { color: result.points > 0 ? androidDarkTheme.colors.primary : "#ff5f85" }]}>
                {result.points > 0 ? `+${result.points}` : String(result.points)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  playerRowLast: {
    borderBottomWidth: 0,
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
  modalSafeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  modalToolbar: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClose: {
    borderRadius: androidDarkTheme.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalCloseText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
  },
  modalTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  modalClosePlaceholder: {
    width: 60,
  },
  modalScrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHero: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalRankBadge: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  modalRankEmoji: {
    fontSize: 28,
  },
  modalRankLabel: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  modalRankPosition: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 2,
  },
  modalScoreCard: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginHorizontal: 24,
    padding: 20,
  },
  modalScoreNumber: {
    fontSize: 48,
    fontWeight: "800",
  },
  modalScoreLabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
    textTransform: "uppercase",
  },
  modalStatGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  modalStatCell: {
    alignItems: "center",
    borderRadius: androidDarkTheme.radius.md,
    flex: 1,
    paddingVertical: 12,
  },
  modalStatValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalStatSublabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  modalHistory: {
    marginTop: 20,
  },
  modalSectionTitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalHistoryRow: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 11,
  },
  modalHistoryName: {
    color: androidDarkTheme.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  modalHistoryEmoji: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  modalHistoryPoints: {
    fontSize: 14,
    fontWeight: "700",
    width: 40,
    textAlign: "right",
  },
});