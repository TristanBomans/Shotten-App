import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line, Path } from "react-native-svg";
import { fetchMatches, fetchPlayers } from "../../lib/api";
import { buildLeaderboard, type PlayerWithStats, type ScoreHistoryPoint, POINTS, RANKS } from "../../lib/leaderboard";
import type { Match, Player } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;
const { width: SCREEN_W } = Dimensions.get("window");

const FORM_COLORS: Record<string, string> = {
  present: t.colors.primary,
  maybe: t.colors.warningAccent,
  notPresent: t.colors.errorAccent,
  ghost: t.colors.onSurfaceDim,
};

const PODIUM_COLORS = {
  0: { bg: "#1e1808", accent: "#f7cb61", icon: "crown" as const },
  1: { bg: "#18181c", accent: "#c0c0c0", icon: "medal" as const },
  2: { bg: "#1c1408", accent: "#cd7f32", icon: "medal-outline" as const },
};

export default function StatsScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithStats | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
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

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const leaderboard = useMemo(() => buildLeaderboard(players, matches), [players, matches]);

  const topThree = leaderboard.slice(0, 3);

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
        <View style={{ padding: t.spacing.lg }}>
          <ErrorState message={error} onRetry={() => void loadData()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
          {/* Podium */}
          {topThree.length > 0 && (
            <View style={styles.podiumSection}>
              {/* #1 — top center */}
              {topThree[0] && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedPlayer(topThree[0])}
                  style={[
                    styles.podiumFirst,
                    topThree[0].id === session.playerId && styles.podiumFirstOwn,
                  ]}
                >
                  <View style={styles.podiumFirstAvatarWrap}>
                    <View style={[styles.podiumFirstAvatar, { borderColor: PODIUM_COLORS[0].accent }]}>
                      <Text style={[styles.podiumFirstAvatarText, { color: PODIUM_COLORS[0].accent }]}>
                        {topThree[0].name.charAt(0)}
                      </Text>
                    </View>
                    <View style={[styles.podiumFirstCrown, { backgroundColor: PODIUM_COLORS[0].accent }]}>
                      <MaterialCommunityIcons name="crown" size={14} color={t.colors.background} />
                    </View>
                  </View>
                  <Text style={styles.podiumFirstName} numberOfLines={1}>{topThree[0].name}</Text>
                  <Text style={styles.podiumFirstScore}>{topThree[0].stats.score}</Text>
                </TouchableOpacity>
              )}

              {/* #2 and #3 — side by side */}
              {topThree.length > 1 && (
                <View style={styles.podiumRow}>
                  {[1, 2].map((idx) => {
                    const player = topThree[idx];
                    if (!player) return <View key={idx} style={styles.podiumSidePlaceholder} />;
                    const isOwn = player.id === session.playerId;
                    const style = PODIUM_COLORS[idx as keyof typeof PODIUM_COLORS] ?? PODIUM_COLORS[2];
                    return (
                      <TouchableOpacity
                        key={player.id}
                        activeOpacity={0.85}
                        onPress={() => setSelectedPlayer(player)}
                        style={[
                          styles.podiumSide,
                          { backgroundColor: style.bg, borderColor: style.accent },
                          isOwn && styles.podiumSideOwn,
                        ]}
                      >
                        <MaterialCommunityIcons name={style.icon} size={22} color={style.accent} />
                        <View style={[styles.podiumSideAvatar, { borderColor: style.accent }]}>
                          <Text style={[styles.podiumSideAvatarText, { color: style.accent }]}>
                            {player.name.charAt(0)}
                          </Text>
                        </View>
                        <Text style={styles.podiumSideName} numberOfLines={1}>{player.name}</Text>
                        <Text style={[styles.podiumSideScore, { color: style.accent }]}>{player.stats.score}</Text>
                        <Text style={styles.podiumSideLabel}>pts</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Leaderboard list (skip top 3) */}
          <View style={styles.leaderboardList}>
            {leaderboard.slice(3).map((player, i) => (
              <RankCard
                key={player.id}
                player={player}
                rank={i + 4}
                isOwn={player.id === session.playerId}
                onPress={() => setSelectedPlayer(player)}
              />
            ))}
          </View>

          {leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color={t.colors.onSurfaceDim} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySubtitle}>Leaderboard will appear once matches are played.</Text>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* Player Detail Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={selectedPlayer !== null}
        onRequestClose={() => setSelectedPlayer(null)}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.colors.background} />
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          <PlayerDetailModal
            player={selectedPlayer}
            rank={selectedRank}
            onClose={() => setSelectedPlayer(null)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function RankCard({
  player,
  rank,
  isOwn,
  onPress,
}: {
  player: PlayerWithStats;
  rank: number;
  isOwn: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.rankCard, isOwn && styles.rankCardOwn]}>
      <View style={styles.rankCardLeft}>
        <Text style={[styles.rankCardNumber, rank <= 10 && styles.rankCardNumberTop]}>#{rank}</Text>
        <View style={[styles.rankCardAvatar, { backgroundColor: player.stats.rank.color + "18" }]}>
          <Text style={[styles.rankCardAvatarText, { color: player.stats.rank.color }]}>{player.name.charAt(0)}</Text>
        </View>
        <View style={styles.rankCardInfo}>
          <Text style={[styles.rankCardName, isOwn && styles.rankCardNameOwn]} numberOfLines={1}>
            {player.name}{isOwn ? <Text style={styles.rankCardYou}> (You)</Text> : null}
          </Text>
          <View style={styles.rankCardForm}>
            {player.stats.recentForm.map((status, j) => (
              <View
                key={j}
                style={[styles.formDot, { backgroundColor: FORM_COLORS[status] ?? FORM_COLORS.ghost }]}
              />
            ))}
            {player.stats.recentForm.length === 0 && (
              <Text style={styles.noFormText}>No recent matches</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rankCardRight}>
        <Text style={[styles.rankCardScore, isOwn && styles.rankCardScoreOwn]}>{player.stats.score}</Text>
        <Text style={styles.rankCardPointsLabel}>pts</Text>
      </View>
    </TouchableOpacity>
  );
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function formatMonthLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { month: "short" });
}

function ScoreSparkline({ history }: { history: ScoreHistoryPoint[] }) {
  const [chartWidth, setChartWidth] = useState(0);

  if (history.length < 2) return null;

  const HEIGHT = 120;
  const Y_AXIS_W = 40;
  const PADDING = { top: 16, right: 16, bottom: 4, left: 16 };
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const scores = history.map((p) => p.score);
  const startScore = history[0].score;
  const endScore = history[history.length - 1].score;
  const trendColor = endScore >= startScore ? t.colors.primary : t.colors.errorAccent;

  const visualMin = Math.min(...scores, POINTS.base);
  const visualMax = Math.max(...scores, POINTS.base);
  const scoreRange = Math.max(visualMax - visualMin, 40);
  const yPadding = Math.max(16, Math.round(scoreRange * 0.2));
  const chartMin = visualMin - yPadding;
  const chartMax = visualMax + yPadding;

  const toX = (i: number) =>
    PADDING.left + (i / (history.length - 1)) * (chartWidth - PADDING.left - PADDING.right);
  const toY = (score: number) =>
    PADDING.top + ((chartMax - score) / (chartMax - chartMin)) * chartH;

  const points = history.map((p, i) => ({ x: toX(i), y: toY(p.score) }));
  const pathD = smoothPath(points);
  const baseY = toY(POINTS.base);

  const firstDate = history[0].date;
  const lastDate = history[history.length - 1].date;

  const labelStyle = { color: t.colors.onSurfaceDim, fontSize: 10, fontWeight: "500" as const };

  return (
    <View style={styles.sparklineCard}>
      <View style={{ flexDirection: "row", height: HEIGHT }}>
        {/* Y-axis labels */}
        <View style={{ width: Y_AXIS_W, justifyContent: "space-between", paddingVertical: PADDING.top }}>
          <Text style={[labelStyle, { textAlign: "right", paddingRight: 6 }]}>{Math.round(chartMax)}</Text>
          <Text style={[labelStyle, { textAlign: "right", paddingRight: 6 }]}>{POINTS.base}</Text>
          <Text style={[labelStyle, { textAlign: "right", paddingRight: 6 }]}>{Math.round(chartMin)}</Text>
        </View>

        {/* Chart */}
        <View style={{ flex: 1 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          {chartWidth > 0 && (
            <Svg width={chartWidth} height={HEIGHT}>
              <Line
                x1={PADDING.left}
                y1={baseY}
                x2={chartWidth - PADDING.right}
                y2={baseY}
                stroke={t.colors.outline}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Path d={pathD} fill="none" stroke={trendColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginLeft: Y_AXIS_W, paddingHorizontal: PADDING.left, paddingBottom: 10 }}>
        <Text style={labelStyle}>{formatMonthLabel(firstDate)}</Text>
        <Text style={labelStyle}>{formatMonthLabel(lastDate)}</Text>
      </View>
    </View>
  );
}

function PlayerDetailModal({
  player,
  rank,
  onClose,
}: {
  player: PlayerWithStats | null;
  rank: number;
  onClose: () => void;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;

  if (!player) return null;
  const s = player.stats;
  const nextRank = RANKS.find((r) => r.minScore > s.score);
  const prevRank = RANKS.slice()
    .reverse()
    .find((r) => r.minScore <= s.score);
  const progressToNext = nextRank && prevRank
    ? Math.min(1, (s.score - prevRank.minScore) / (nextRank.minScore - prevRank.minScore))
    : 1;

  const presentPct = s.totalMatches > 0 ? Math.round((s.presentCount / s.totalMatches) * 100) : 0;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120, 160],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky header that fades in on scroll */}
      <Animated.View style={[styles.detailStickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.detailStickyInner}>
          <Text style={styles.detailStickyTitle} numberOfLines={1}>{player.name}</Text>
          <Text style={styles.detailStickySubtitle}>#{rank} — {s.rank.name}</Text>
        </View>
      </Animated.View>

      {/* Toolbar */}
      <View style={styles.detailToolbar}>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.detailCloseBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={t.colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.detailCloseBtn}>
          <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.detailScroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <View style={[styles.detailHero, { backgroundColor: s.rank.color + "12" }]}>
          <View style={[styles.detailHeroAvatar, { borderColor: s.rank.color }]}>
            <Text style={[styles.detailHeroAvatarText, { color: s.rank.color }]}>{player.name.charAt(0)}</Text>
          </View>
          <Text style={styles.detailHeroName}>{player.name}</Text>
          <View style={styles.detailHeroBadgeRow}>
            <View style={[styles.detailHeroBadge, { backgroundColor: s.rank.bgColor }]}>
              <Text style={styles.detailHeroBadgeEmoji}>{s.rank.emoji}</Text>
              <Text style={[styles.detailHeroBadgeText, { color: s.rank.color }]}>{s.rank.name}</Text>
            </View>
            <View style={[styles.detailHeroBadge, { backgroundColor: t.colors.primaryMuted, borderWidth: 1, borderColor: t.colors.primary + "40" }]}>
              <Text style={[styles.detailHeroBadgeText, { color: t.colors.primary }]}>#{rank}</Text>
            </View>
          </View>

          {/* Big Score */}
          <View style={styles.detailScoreWrap}>
            <Text style={[styles.detailScoreNumber, { color: s.rank.color }]}>{s.score}</Text>
            <Text style={styles.detailScoreLabel}>Shotten Points</Text>
          </View>

          {/* Progress to next rank */}
          {nextRank && (
            <View style={styles.detailProgressWrap}>
              <View style={styles.detailProgressTrack}>
                <View style={[styles.detailProgressFill, { width: `${progressToNext * 100}%`, backgroundColor: s.rank.color }]} />
              </View>
              <Text style={styles.detailProgressText}>
                {nextRank.minScore - s.score} pts to {nextRank.name}
              </Text>
            </View>
          )}
        </View>

        {/* Streaks */}
        {s.matchResults.length > 0 && (
          <>
            <Text style={styles.detailSectionTitle}>Streaks</Text>
            <StreakCards results={s.matchResults} />
          </>
        )}

        {/* Stats Carousel */}
        <Text style={styles.detailSectionTitle}>Season Stats</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsCarousel}>
          <StatCircle label="Presence" value={`${presentPct}%`} sub={`${s.presentCount}/${s.totalMatches}`} color={t.colors.primary} />
          <StatCircle label="Present" value={String(s.presentCount)} color={t.colors.primary} />
          <StatCircle label="Maybe" value={String(s.maybeCount)} color={t.colors.warningAccent} />
          <StatCircle label="Absent" value={String(s.absentCount)} color={t.colors.errorAccent} />
          <StatCircle label="Ghost" value={String(s.ghostCount)} color={t.colors.onSurfaceDim} />
        </ScrollView>

        {/* Season Trend Sparkline */}
        {s.scoreHistory.length > 1 && (
          <>
            <Text style={styles.detailSectionTitle}>Season Trend</Text>
            <ScoreSparkline history={s.scoreHistory} />
          </>
        )}

        {/* Form Trend */}
        <Text style={styles.detailSectionTitle}>Recent Form</Text>
        <View style={styles.formTrend}>
          {s.recentForm.length > 0 ? (
            s.recentForm.map((status, i) => (
              <View key={i} style={styles.formTrendItem}>
                <View style={[styles.formTrendDot, { backgroundColor: FORM_COLORS[status] }]}>
                  <Text style={styles.formTrendEmoji}>
                    {status === "present" ? "✓" : status === "maybe" ? "?" : status === "notPresent" ? "✕" : "👻"}
                  </Text>
                </View>
                {i < s.recentForm.length - 1 && <View style={styles.formTrendLine} />}
              </View>
            ))
          ) : (
            <Text style={styles.emptyFormText}>No matches played yet</Text>
          )}
        </View>

        {/* Match History Timeline */}
        {s.matchResults.length > 0 && (
          <>
            <Text style={styles.detailSectionTitle}>Match History</Text>
            <View style={styles.timeline}>
              {s.matchResults.map((result, i) => {
                const isLast = i === s.matchResults.length - 1;
                return (
                  <View key={result.matchId} style={styles.timelineRow}>
                    <View style={styles.timelineLineWrap}>
                      <View style={[styles.timelineDot, { backgroundColor: FORM_COLORS[result.status] }]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={[styles.timelineCard, isLast && styles.timelineCardLast]}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={styles.timelineCardName} numberOfLines={1}>{result.matchName}</Text>
                        <Text
                          style={[
                            styles.timelineCardPoints,
                            { color: result.points > 0 ? t.colors.primary : t.colors.errorAccent },
                          ]}
                        >
                          {result.points > 0 ? `+${result.points}` : result.points}
                        </Text>
                      </View>
                      <View style={styles.timelineCardFooter}>
                        <MaterialCommunityIcons
                          name={
                            result.status === "present"
                              ? "check-circle"
                              : result.status === "maybe"
                                ? "help-circle"
                                : result.status === "notPresent"
                                  ? "close-circle"
                                  : "ghost"
                          }
                          size={14}
                          color={FORM_COLORS[result.status]}
                        />
                        <Text style={[styles.timelineCardStatus, { color: FORM_COLORS[result.status] }]}>
                          {result.status === "present" ? "Present" : result.status === "maybe" ? "Maybe" : result.status === "notPresent" ? "Absent" : "Ghost"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

function StreakCards({ results }: { results: { status: string; matchName: string }[] }) {
  const streaks = useMemo(() => {
    if (results.length === 0) return { present: 0, absent: 0, bestPresent: 0 };

    // results are newest-first (index 0 = most recent match)
    // Determine current streak: count consecutive same-status matches from the start
    let currentPresent = 0;
    let currentAbsent = 0;
    let bestPresent = 0;
    let tempPresent = 0;

    // First pass: current streak (only from most recent consecutive run)
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "present") {
        if (currentAbsent > 0) break;
        currentPresent++;
      } else if (r.status === "notPresent" || r.status === "ghost") {
        if (currentPresent > 0) break;
        currentAbsent++;
      } else if (r.status === "maybe") {
        break;
      }
    }

    // Second pass: best streak (all-time max consecutive present)
    for (const r of results) {
      if (r.status === "present") {
        tempPresent++;
        bestPresent = Math.max(bestPresent, tempPresent);
      } else {
        tempPresent = 0;
      }
    }

    return { present: currentPresent, absent: currentAbsent, bestPresent };
  }, [results]);

  const cards = [
    {
      label: "Current Streak",
      value: streaks.present > 0 ? `${streaks.present}` : streaks.absent > 0 ? `${streaks.absent}` : "0",
      sub: streaks.present > 0 ? "matches present" : streaks.absent > 0 ? "matches missed" : "no streak",
      icon: streaks.present >= 3 ? "fire" : streaks.present > 0 ? "check-circle" : streaks.absent > 0 ? "alert-circle" : "minus-circle",
      color: streaks.present > 0 ? "#ff6b35" : streaks.absent > 0 ? t.colors.errorAccent : t.colors.onSurfaceDim,
      bgColor: streaks.present > 0 ? "rgba(255, 107, 53, 0.12)" : streaks.absent > 0 ? t.colors.errorContainer : t.colors.surface,
      borderColor: streaks.present > 0 ? "rgba(255, 107, 53, 0.35)" : streaks.absent > 0 ? t.colors.errorAccent + "30" : t.colors.divider,
      glow: streaks.present >= 3,
    },
    {
      label: "Best Streak",
      value: `${streaks.bestPresent}`,
      sub: streaks.bestPresent === 1 ? "match present" : "matches present",
      icon: "trophy",
      color: "#f7cb61",
      bgColor: "rgba(247, 203, 97, 0.10)",
      borderColor: "rgba(247, 203, 97, 0.30)",
      glow: false,
    },
  ];

  return (
    <View style={styles.streakRow}>
      {cards.map((card) => (
        <View
          key={card.label}
          style={[
            styles.streakCard,
            {
              backgroundColor: card.bgColor,
              borderColor: card.borderColor,
            },
          ]}
        >
          {card.glow && (
            <LinearGradient
              colors={["rgba(255, 107, 53, 0.15)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.streakCardHeader}>
            <MaterialCommunityIcons name={card.icon as any} size={18} color={card.color} />
            <Text style={[styles.streakCardLabel, { color: card.color }]}>{card.label}</Text>
          </View>
          <Text style={[styles.streakCardValue, { color: card.color }]}>{card.value}</Text>
          <Text style={styles.streakCardSub}>{card.sub}</Text>
        </View>
      ))}
    </View>
  );
}

function StatCircle({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <View style={styles.statCircle}>
      <Text style={[styles.statCircleValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.statCircleSub}>{sub}</Text> : null}
      <Text style={styles.statCircleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.xxxl,
  },

  // Podium
  podiumSection: {
    paddingHorizontal: t.spacing.lg,
    alignItems: "center",
    gap: t.spacing.md,
  },
  podiumFirst: {
    backgroundColor: PODIUM_COLORS[0].bg,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: PODIUM_COLORS[0].accent,
    alignItems: "center",
    padding: t.spacing.lg,
    paddingTop: t.spacing.xl,
    width: 160,
  },
  podiumFirstOwn: {
    borderWidth: 2,
    borderColor: t.colors.primary,
  },
  podiumFirstAvatarWrap: {
    position: "relative",
    marginBottom: t.spacing.md,
  },
  podiumFirstAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.colors.background,
  },
  podiumFirstAvatarText: {
    fontSize: 28,
    fontWeight: "800",
  },
  podiumFirstCrown: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    borderRadius: t.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  podiumFirstName: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  podiumFirstScore: {
    color: PODIUM_COLORS[0].accent,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  podiumRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: t.spacing.md,
    width: "100%",
  },
  podiumSide: {
    flex: 1,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    alignItems: "center",
    padding: t.spacing.md,
    paddingVertical: t.spacing.lg,
    maxWidth: (SCREEN_W - t.spacing.lg * 2 - t.spacing.md) / 2,
  },
  podiumSideOwn: {
    borderColor: t.colors.primary,
    borderWidth: 2,
  },
  podiumSidePlaceholder: {
    flex: 1,
    maxWidth: (SCREEN_W - t.spacing.lg * 2 - t.spacing.md) / 2,
  },
  podiumSideAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.sm,
    backgroundColor: t.colors.background,
  },
  podiumSideAvatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  podiumSideName: {
    color: t.colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  podiumSideScore: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  podiumSideLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    marginTop: 2,
  },

  // Leaderboard list
  leaderboardList: {
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.lg,
  },
  rankCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankCardOwn: {
    borderWidth: 1,
    borderColor: t.colors.primary + "30",
  },
  rankCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.md,
    flex: 1,
  },
  rankCardNumber: {
    color: t.colors.onSurfaceDim,
    fontSize: 14,
    fontWeight: "800",
    width: 32,
    textAlign: "center",
  },
  rankCardNumberTop: {
    color: t.colors.warningAccent,
  },
  rankCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rankCardAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  rankCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  rankCardName: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  rankCardNameOwn: {
    color: t.colors.primary,
  },
  rankCardYou: {
    color: t.colors.primary,
    fontWeight: "600",
  },
  rankCardForm: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    alignItems: "center",
  },
  formDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noFormText: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
  },
  rankCardRight: {
    alignItems: "flex-end",
  },
  rankCardScore: {
    color: t.colors.onSurface,
    ...t.typography.score,
    fontSize: 20,
  },
  rankCardScoreOwn: {
    color: t.colors.primary,
  },
  rankCardPointsLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
  },

  // Empty
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

  // Modal base
  modalSafeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },

  // Detail — toolbar
  detailToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  detailCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.surface + "cc",
    alignItems: "center",
    justifyContent: "center",
  },

  // Detail — sticky header
  detailStickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: t.colors.background + "ee",
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    zIndex: 5,
    paddingTop: 50,
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
  },
  detailStickyInner: {
    alignItems: "center",
  },
  detailStickyTitle: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
  },
  detailStickySubtitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.caption,
    marginTop: 2,
  },

  // Detail — scroll
  detailScroll: {
    paddingBottom: t.spacing.xxxl,
  },

  // Detail — hero
  detailHero: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: t.spacing.xxl,
    paddingHorizontal: t.spacing.lg,
    borderBottomLeftRadius: t.radius.xl,
    borderBottomRightRadius: t.radius.xl,
    marginBottom: t.spacing.lg,
  },
  detailHeroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.colors.background,
  },
  detailHeroAvatarText: {
    fontSize: 32,
    fontWeight: "800",
  },
  detailHeroName: {
    color: t.colors.onSurface,
    ...t.typography.title,
    marginTop: t.spacing.md,
  },
  detailHeroBadgeRow: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
  detailHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  detailHeroBadgeEmoji: {
    fontSize: 12,
  },
  detailHeroBadgeText: {
    ...t.typography.caption,
    fontWeight: "700",
  },
  detailScoreWrap: {
    alignItems: "center",
    marginTop: t.spacing.lg,
  },
  detailScoreNumber: {
    ...t.typography.bigScore,
    fontSize: 56,
  },
  detailScoreLabel: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
    marginTop: 4,
  },
  detailProgressWrap: {
    width: "100%",
    marginTop: t.spacing.lg,
  },
  detailProgressTrack: {
    height: 6,
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    overflow: "hidden",
  },
  detailProgressFill: {
    height: "100%",
    borderRadius: t.radius.pill,
  },
  detailProgressText: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.caption,
    marginTop: 6,
    textAlign: "center",
  },

  // Detail — sections
  detailSectionTitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
    marginHorizontal: t.spacing.lg,
    marginTop: t.spacing.xl,
    marginBottom: t.spacing.md,
  },
  sparklineCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.divider,
    marginHorizontal: t.spacing.lg,
    overflow: "hidden",
  },

  // Stats carousel
  statsCarousel: {
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.md,
  },
  statCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.colors.divider,
  },
  statCircleValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statCircleSub: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    marginTop: 2,
  },
  statCircleLabel: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.caption,
    marginTop: 2,
  },

  // Form trend
  formTrend: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.lg,
  },
  formTrendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  formTrendDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  formTrendEmoji: {
    color: t.colors.background,
    fontSize: 14,
    fontWeight: "700",
  },
  formTrendLine: {
    width: 20,
    height: 2,
    backgroundColor: t.colors.divider,
  },
  emptyFormText: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
  },

  // Timeline
  timeline: {
    paddingHorizontal: t.spacing.lg,
  },
  timelineRow: {
    flexDirection: "row",
  },
  timelineLineWrap: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.background,
    marginTop: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: t.colors.divider,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    marginLeft: t.spacing.sm,
  },
  timelineCardLast: {
    marginBottom: 0,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: t.spacing.md,
  },
  timelineCardName: {
    color: t.colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  timelineCardPoints: {
    fontSize: 14,
    fontWeight: "700",
  },
  timelineCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  timelineCardStatus: {
    ...t.typography.caption,
    fontWeight: "600",
  },

  // Streaks
  streakRow: {
    flexDirection: "row",
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.md,
  },
  streakCard: {
    flex: 1,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    padding: t.spacing.md,
    paddingVertical: t.spacing.lg,
    overflow: "hidden",
  },
  streakCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: t.spacing.sm,
  },
  streakCardLabel: {
    ...t.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  streakCardValue: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  streakCardSub: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    marginTop: 2,
  },
});
