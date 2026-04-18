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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchMatches, fetchPlayers } from "../../lib/api";
import { buildLeaderboard, type PlayerWithStats } from "../../lib/leaderboard";
import type { Match, Player } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;

const FORM_DOT_COLORS: Record<string, string> = {
  present: t.colors.primary,
  maybe: t.colors.warningAccent,
  notPresent: t.colors.errorAccent,
  ghost: t.colors.onSurfaceDim,
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
        <View style={styles.errorWrapper}>
          <ErrorState message={error} onRetry={() => void loadData()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
            progressBackgroundColor={t.colors.surfaceRaised}
          />
        }
      >
        {/* Highlight banner — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightsScroll}
        >
          <HighlightChip emoji="🏆" title="Legend" name={topScorer?.name ?? "—"} color={t.colors.warningAccent} />
          <HighlightChip emoji="👻" title="Casper" name={mostGhosts?.name ?? "—"} color={t.colors.errorAccent} />
          <HighlightChip emoji="🤔" title="Miss Maybe" name={mostMaybe?.name ?? "—"} color={t.colors.warningAccent} />
        </ScrollView>

        {/* Leaderboard */}
        <View style={styles.leaderboard}>
          {leaderboard.map((player, i) => {
            const isOwnPlayer = player.id === session.playerId;
            return (
              <Pressable
                key={player.id}
                android_ripple={{ color: t.colors.ripple, borderless: false }}
                onPress={() => setSelectedPlayer(player)}
                style={[
                  styles.playerRow,
                  isOwnPlayer && styles.playerRowOwn,
                ]}
              >
                <Text style={[styles.playerRank, i < 3 && styles.playerRankTop]}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </Text>

                <View style={[styles.rankIcon, { backgroundColor: player.stats.rank.bgColor }]}>
                  <Text style={styles.rankIconText}>{player.stats.rank.emoji}</Text>
                </View>

                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isOwnPlayer && styles.playerNameOwn]} numberOfLines={1}>
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

                <Text style={[styles.playerScore, isOwnPlayer && styles.playerScoreOwn]}>
                  {player.stats.score}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trophy-outline" size={40} color={t.colors.onSurfaceDim} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>Leaderboard data will appear once matches are played.</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Player detail — bottom sheet style modal */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={selectedPlayer !== null}
        onRequestClose={() => setSelectedPlayer(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          {/* Drag handle */}
          <View style={styles.modalHandleBar}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalToolbar}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedPlayer?.name ?? ""}
            </Text>
            <Pressable
              android_ripple={{ color: t.colors.ripple, borderless: true }}
              onPress={() => setSelectedPlayer(null)}
              style={styles.modalCloseBtn}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
            </Pressable>
          </View>

          {selectedPlayer ? (
            <PlayerDetailContent player={selectedPlayer} rank={selectedRank} />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function HighlightChip({ emoji, title, name, color }: { emoji: string; title: string; name: string; color: string }) {
  return (
    <View style={styles.highlightChip}>
      <Text style={styles.highlightEmoji}>{emoji}</Text>
      <View style={styles.highlightTextWrap}>
        <Text style={[styles.highlightTitle, { color }]}>{title}</Text>
        <Text style={styles.highlightName} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

function PlayerDetailContent({ player, rank }: { player: PlayerWithStats; rank: number }) {
  const s = player.stats;

  return (
    <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero rank */}
      <View style={styles.modalHero}>
        <View style={[styles.modalRankBadge, { backgroundColor: s.rank.bgColor }]}>
          <Text style={styles.modalRankEmoji}>{s.rank.emoji}</Text>
        </View>
        <Text style={styles.modalRankLabel}>{s.rank.name}</Text>
        <Text style={styles.modalRankPosition}>#{rank}</Text>
      </View>

      {/* Big score */}
      <View style={styles.modalScoreCard}>
        <Text style={[styles.modalScoreNumber, { color: s.rank.color }]}>{s.score}</Text>
        <Text style={styles.modalScoreLabel}>Shotten Points</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.modalStatGrid}>
        <StatCell label="Present" value={s.presentCount} color={t.colors.primary} bg={t.colors.successContainer} />
        <StatCell label="Maybe" value={s.maybeCount} color={t.colors.warningAccent} bg={t.colors.warningContainer} />
        <StatCell label="Absent" value={s.absentCount} color={t.colors.errorAccent} bg={t.colors.errorContainer} />
        <StatCell label="Ghost" value={s.ghostCount} color={t.colors.onSurfaceDim} bg={t.colors.surfaceRaised} />
      </View>

      {/* Match history */}
      {s.matchResults.length > 0 ? (
        <View style={styles.modalHistory}>
          <Text style={styles.modalSectionTitle}>Match History</Text>
          <View style={styles.modalHistoryList}>
            {s.matchResults.map((result) => (
              <View key={result.matchId} style={styles.modalHistoryRow}>
                <MaterialCommunityIcons
                  name={
                    result.status === "present" ? "check-circle" :
                    result.status === "maybe" ? "help-circle" :
                    result.status === "notPresent" ? "close-circle" :
                    "ghost"
                  }
                  size={16}
                  color={FORM_DOT_COLORS[result.status] ?? t.colors.onSurfaceDim}
                />
                <Text style={styles.modalHistoryName} numberOfLines={1}>{result.matchName}</Text>
                <Text style={[styles.modalHistoryPoints, { color: result.points > 0 ? t.colors.primary : t.colors.errorAccent }]}>
                  {result.points > 0 ? `+${result.points}` : String(result.points)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatCell({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.modalStatCell, { backgroundColor: bg }]}>
      <Text style={[styles.modalStatValue, { color }]}>{value}</Text>
      <Text style={styles.modalStatSublabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  errorWrapper: {
    padding: t.spacing.lg,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxl,
  },

  // Highlights — horizontal scroll chips
  highlightsScroll: {
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  highlightChip: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    flexDirection: "row",
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    minWidth: 140,
  },
  highlightEmoji: {
    fontSize: 24,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    ...t.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  highlightName: {
    color: t.colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  // Leaderboard
  leaderboard: {
    marginHorizontal: t.spacing.lg,
    marginTop: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
  },
  playerRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    minHeight: t.touch.minHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  playerRowOwn: {
    backgroundColor: t.colors.primaryMuted,
  },
  playerRank: {
    color: t.colors.onSurfaceDim,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    width: 28,
  },
  playerRankTop: {
    fontSize: 18,
  },
  rankIcon: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rankIconText: {
    fontSize: 16,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  playerNameOwn: {
    color: t.colors.primary,
  },
  formRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  formDot: {
    borderRadius: t.radius.pill,
    height: 8,
    width: 8,
  },
  playerScore: {
    color: t.colors.onSurface,
    ...t.typography.score,
  },
  playerScoreOwn: {
    color: t.colors.primary,
  },
  emptyState: {
    alignItems: "center",
    marginTop: t.spacing.xxxl,
    padding: t.spacing.xxl,
  },
  emptyTitle: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
    marginTop: t.spacing.lg,
  },
  emptySubtitle: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
    marginTop: t.spacing.sm,
    textAlign: "center",
  },

  // Modal — bottom sheet feel
  modalSafeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  modalHandleBar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    paddingTop: t.spacing.sm,
  },
  modalHandle: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.pill,
    height: 4,
    width: 36,
  },
  modalToolbar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  modalTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
    flex: 1,
  },
  modalCloseBtn: {
    borderRadius: t.radius.pill,
    padding: t.spacing.xs,
  },
  modalScrollContent: {
    paddingBottom: t.spacing.xxxl,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
  },
  modalHero: {
    alignItems: "center",
    marginBottom: t.spacing.lg,
  },
  modalRankBadge: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  modalRankEmoji: {
    fontSize: 28,
  },
  modalRankLabel: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
    marginTop: t.spacing.sm,
  },
  modalRankPosition: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.bodySmall,
    marginTop: 2,
  },
  modalScoreCard: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.xxl,
    paddingVertical: t.spacing.xl,
  },
  modalScoreNumber: {
    ...t.typography.bigScore,
  },
  modalScoreLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.label,
    marginTop: t.spacing.xs,
  },
  modalStatGrid: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginTop: t.spacing.lg,
  },
  modalStatCell: {
    alignItems: "center",
    borderRadius: t.radius.md,
    flex: 1,
    paddingVertical: t.spacing.md,
  },
  modalStatValue: {
    ...t.typography.score,
  },
  modalStatSublabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  modalHistory: {
    marginTop: t.spacing.xl,
  },
  modalSectionTitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
    marginBottom: t.spacing.sm,
  },
  modalHistoryList: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
  },
  modalHistoryRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  modalHistoryName: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  modalHistoryPoints: {
    fontSize: 14,
    fontWeight: "700",
    width: 40,
    textAlign: "right",
  },
});