import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchScraperTeamMatches, fetchScraperPlayersByTeam } from "../lib/api";
import type { ScraperMatch, ScraperPlayer, ScraperTeam } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;
const { width: SCREEN_W } = Dimensions.get("window");

type TeamTab = "overview" | "matches" | "squad";
type MatchFilter = "all" | "upcoming" | "past";

interface TeamDetailModalProps {
  team: ScraperTeam | null;
  visible: boolean;
  onClose: () => void;
}

function isHomeTeam(teamName: string, homeTeam: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim();
  return norm(homeTeam).includes(norm(teamName)) || norm(teamName).includes(norm(homeTeam));
}

export function TeamDetailModal({ team, visible, onClose }: TeamDetailModalProps) {
  const [matches, setMatches] = useState<ScraperMatch[]>([]);
  const [players, setPlayers] = useState<ScraperPlayer[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("past");
  const [showImage, setShowImage] = useState(false);
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.timing(panY, {
            toValue: SCREEN_W,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(panY, {
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
    if (!visible || !team) return;
    setActiveTab("overview");
    setMatchFilter("past");
    setLoadingMatches(true);
    setLoadingPlayers(true);

    fetchScraperTeamMatches(team.externalId)
      .then(setMatches)
      .finally(() => setLoadingMatches(false));

    fetchScraperPlayersByTeam(team.externalId)
      .then((p) => setPlayers(p.sort((a, b) => b.goals - a.goals)))
      .finally(() => setLoadingPlayers(false));
  }, [visible, team]);

  const now = Date.now();
  const upcomingMatches = matches
    .filter((m) => new Date(m.date).getTime() > now || m.status === "Scheduled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMatches = matches
    .filter((m) => new Date(m.date).getTime() <= now && m.status === "Played")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredMatches = useMemo(() => {
    if (matchFilter === "upcoming") return upcomingMatches;
    if (matchFilter === "past") return pastMatches;
    return [...upcomingMatches, ...pastMatches];
  }, [matchFilter, upcomingMatches, pastMatches]);

  if (!team) return null;

  // Recent form
  const recentForm = pastMatches.slice(0, 5).map((m) => {
    const isHome = isHomeTeam(team.name, m.homeTeam);
    const teamScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (teamScore > oppScore) return "W";
    if (teamScore < oppScore) return "L";
    return "D";
  });

  const formColors: Record<string, string> = {
    W: t.colors.primary,
    D: t.colors.warningAccent,
    L: t.colors.errorAccent,
  };

  const openLZV = () => {
    Linking.openURL(`https://www.lzvcup.be/teams/detail/${team.externalId}`);
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: panY }] }}>
          {/* Drag handle — swipeable */}
          <View style={styles.handleBar} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── HERO ── */}
          <View style={styles.hero}>
            <View style={styles.heroGradient}>
              <View style={styles.heroContent}>
                {team.imageBase64 ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => setShowImage(true)}>
                    <Image source={{ uri: team.imageBase64 }} style={styles.heroAvatarImage} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarText}>{team.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.heroText}>
                  <Text style={styles.heroName}>{team.name}</Text>
                  {team.leagueName && (
                    <Text style={styles.heroLeague}>{team.leagueName}</Text>
                  )}
                </View>
                {team.rank !== undefined && (
                  <View style={styles.heroRankBadge}>
                    <Text style={styles.heroRankLabel}>RANK</Text>
                    <Text style={styles.heroRankValue}>#{team.rank}</Text>
                  </View>
                )}
              </View>

              {/* Season Stats Bar */}
              {team.points !== undefined && (
                <View style={styles.heroStatsBar}>
                  <HeroStat label="Points" value={String(team.points)} accent />
                  <View style={styles.heroStatDivider} />
                  <HeroStat label="Played" value={String(team.matchesPlayed ?? 0)} />
                  <View style={styles.heroStatDivider} />
                  <HeroStat
                    label="GD"
                    value={`${(team.goalDifference ?? 0) >= 0 ? "+" : ""}${team.goalDifference ?? 0}`}
                    accent={(team.goalDifference ?? 0) > 0}
                    negative={(team.goalDifference ?? 0) < 0}
                  />
                </View>
              )}
            </View>
          </View>

          {/* ── TABS ── */}
          <View style={styles.tabs}>
            {([
              { key: "overview" as TeamTab, label: "Overview" },
              { key: "matches" as TeamTab, label: "Matches" },
              { key: "squad" as TeamTab, label: "Squad" },
            ]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── TAB CONTENT ── */}
          {activeTab === "overview" && (
            <OverviewTab
              team={team}
              recentForm={recentForm}
              formColors={formColors}
              upcomingCount={upcomingMatches.length}
              pastCount={pastMatches.length}
              onOpenLZV={openLZV}
            />
          )}

          {activeTab === "matches" && (
            <MatchesTab
              matches={filteredMatches}
              teamName={team.name}
              loading={loadingMatches}
              filter={matchFilter}
              onFilterChange={setMatchFilter}
              upcomingCount={upcomingMatches.length}
              pastCount={pastMatches.length}
            />
          )}

          {activeTab === "squad" && (
            <SquadTab players={players} loading={loadingPlayers} />
          )}
        </ScrollView>
        </Animated.View>

        {/* Full-screen image overlay */}
        <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
          <View style={styles.imageOverlay}>
            <TouchableOpacity style={styles.imageOverlayClose} activeOpacity={0.7} onPress={() => setShowImage(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: team.imageBase64 }} style={styles.imageOverlayImage} resizeMode="contain" />
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// OVERVIEW TAB
// =============================================================================

function OverviewTab({
  team,
  recentForm,
  formColors,
  upcomingCount,
  pastCount,
  onOpenLZV,
}: {
  team: ScraperTeam;
  recentForm: string[];
  formColors: Record<string, string>;
  upcomingCount: number;
  pastCount: number;
  onOpenLZV: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      {/* Season Record */}
      <Text style={styles.sectionLabel}>Season Record</Text>
      <View style={styles.recordGrid}>
        <RecordCell label="Won" value={team.wins ?? 0} color={t.colors.primary} />
        <RecordCell label="Drawn" value={team.draws ?? 0} color={t.colors.warningAccent} />
        <RecordCell label="Lost" value={team.losses ?? 0} color={t.colors.errorAccent} />
        <RecordCell label="GF" value={team.goalsFor ?? 0} />
        <RecordCell label="GA" value={team.goalsAgainst ?? 0} />
        <RecordCell label="PPG" value={(team.pointsPerMatch ?? 0).toFixed(2)} accent />
      </View>

      {/* Recent Form */}
      {recentForm.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: t.spacing.xl }]}>Recent Form</Text>
          <View style={styles.formTimeline}>
            {recentForm.map((result, i) => (
              <View key={i} style={styles.formTimelineItem}>
                <View style={[styles.formTimelineBadge, { backgroundColor: `${formColors[result]}22` }]}>
                  <Text style={[styles.formTimelineText, { color: formColors[result] }]}>{result}</Text>
                </View>
                {i < recentForm.length - 1 && (
                  <View style={styles.formTimelineConnector} />
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Match Summary */}
      <Text style={[styles.sectionLabel, { marginTop: t.spacing.xl }]}>Matches</Text>
      <View style={styles.matchSummary}>
        <View style={styles.matchSummaryItem}>
          <MaterialCommunityIcons name="calendar-clock" size={20} color={t.colors.primary} />
          <Text style={styles.matchSummaryValue}>{upcomingCount}</Text>
          <Text style={styles.matchSummaryLabel}>Upcoming</Text>
        </View>
        <View style={styles.matchSummaryDivider} />
        <View style={styles.matchSummaryItem}>
          <MaterialCommunityIcons name="history" size={20} color={t.colors.warningAccent} />
          <Text style={styles.matchSummaryValue}>{pastCount}</Text>
          <Text style={styles.matchSummaryLabel}>Played</Text>
        </View>
      </View>

      {/* Team Info */}
      {(team.colors || team.manager || team.description) && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: t.spacing.xl }]}>About</Text>
          <View style={styles.infoCard}>
            {team.colors && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="palette" size={18} color={t.colors.onSurfaceDim} />
                <Text style={styles.infoText}>{team.colors}</Text>
              </View>
            )}
            {team.manager && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-tie" size={18} color={t.colors.onSurfaceDim} />
                <Text style={styles.infoText}>{team.manager}</Text>
              </View>
            )}
            {team.description && (
              <Text style={styles.infoDescription}>"{team.description}"</Text>
            )}
          </View>
        </>
      )}

      {/* LZV Link */}
      <TouchableOpacity activeOpacity={0.7} onPress={onOpenLZV} style={styles.lzvBtn}>
        <MaterialCommunityIcons name="open-in-new" size={16} color={t.colors.onSurfaceMuted} />
        <Text style={styles.lzvBtnText}>View on LZV Cup</Text>
      </TouchableOpacity>
    </View>
  );
}

function RecordCell({ label, value, color, accent }: { label: string; value: number | string; color?: string; accent?: boolean }) {
  return (
    <View style={styles.recordCell}>
      <Text style={[styles.recordValue, color ? { color } : accent ? { color: t.colors.primary } : undefined]}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function HeroStat({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatValue, accent && styles.heroStatValueAccent, negative && styles.heroStatValueNeg]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

// =============================================================================
// MATCHES TAB
// =============================================================================

function MatchesTab({
  matches,
  teamName,
  loading,
  filter,
  onFilterChange,
  upcomingCount,
  pastCount,
}: {
  matches: ScraperMatch[];
  teamName: string;
  loading: boolean;
  filter: MatchFilter;
  onFilterChange: (f: MatchFilter) => void;
  upcomingCount: number;
  pastCount: number;
}) {
  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="large" color={t.colors.primary} style={{ marginTop: t.spacing.xxxl }} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyTab}>
          <MaterialCommunityIcons name="calendar-blank" size={40} color={t.colors.onSurfaceDim} />
          <Text style={styles.emptyTabText}>No matches found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Filter chips */}
      <View style={styles.filterBar}>
        <FilterChip label="All" count={upcomingCount + pastCount} active={filter === "all"} onPress={() => onFilterChange("all")} />
        <FilterChip label="Upcoming" count={upcomingCount} active={filter === "upcoming"} onPress={() => onFilterChange("upcoming")} />
        <FilterChip label="Played" count={pastCount} active={filter === "past"} onPress={() => onFilterChange("past")} />
      </View>

      {/* Match list */}
      <View style={styles.matchList}>
        {matches.map((match, i) => {
          const isHome = isHomeTeam(teamName, match.homeTeam);
          const opponent = isHome ? match.awayTeam : match.homeTeam;
          const isPlayed = match.status === "Played";
          const d = new Date(match.date);
          const dateStr = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

          let resultColor: string = t.colors.onSurfaceDim;
          let resultText = "—";
          if (isPlayed) {
            const teamScore = isHome ? match.homeScore : match.awayScore;
            const oppScore = isHome ? match.awayScore : match.homeScore;
            if (teamScore > oppScore) { resultColor = t.colors.primary; resultText = "W"; }
            else if (teamScore < oppScore) { resultColor = t.colors.errorAccent; resultText = "L"; }
            else { resultColor = t.colors.warningAccent; resultText = "D"; }
          }

          return (
            <View key={match.externalId + i} style={styles.matchCard}>
              {/* Result badge */}
              <View style={[styles.matchCardBadge, { backgroundColor: `${resultColor}20` }]}>
                <Text style={[styles.matchCardBadgeText, { color: resultColor }]}>{isPlayed ? resultText : "•"}</Text>
              </View>

              {/* Match info */}
              <View style={styles.matchCardInfo}>
                <Text style={styles.matchCardOpponent} numberOfLines={1}>
                  {isHome ? "vs" : "@"} {opponent}
                </Text>
                <Text style={styles.matchCardMeta}>
                  {dateStr} · {timeStr}
                  {match.location ? ` · ${match.location}` : ""}
                </Text>
              </View>

              {/* Score */}
              {isPlayed ? (
                <View style={styles.matchCardScoreBox}>
                  <Text style={[styles.matchCardScore, { color: resultColor }]}>
                    {isHome ? match.homeScore : match.awayScore}
                  </Text>
                  <Text style={styles.matchCardScoreDivider}>–</Text>
                  <Text style={styles.matchCardScoreOpp}>
                    {isHome ? match.awayScore : match.homeScore}
                  </Text>
                </View>
              ) : (
                <View style={styles.matchCardUpcomingBadge}>
                  <Text style={styles.matchCardUpcomingText}>UPC</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      <View style={[styles.filterChipCount, active && styles.filterChipCountActive]}>
        <Text style={[styles.filterChipCountText, active && styles.filterChipCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// SQUAD TAB
// =============================================================================

function SquadTab({ players, loading }: { players: ScraperPlayer[]; loading: boolean }) {
  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="large" color={t.colors.primary} style={{ marginTop: t.spacing.xxxl }} />
      </View>
    );
  }

  if (players.length === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyTab}>
          <MaterialCommunityIcons name="account-off-outline" size={40} color={t.colors.onSurfaceDim} />
          <Text style={styles.emptyTabText}>No squad data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionLabel}>Squad ({players.length})</Text>
      <View style={styles.squadList}>
        {players.map((player, i) => (
          <View key={player.externalId} style={styles.squadCard}>
            {/* Rank / Number */}
            <View style={[styles.squadRankBadge, i < 3 && styles.squadRankBadgeTop]}>
              <Text style={[styles.squadRankText, i < 3 && styles.squadRankTextTop]}>
                {player.number || i + 1}
              </Text>
            </View>

            {/* Avatar */}
            <View style={styles.squadAvatar}>
              <Text style={styles.squadAvatarText}>{getInitials(player.name)}</Text>
            </View>

            {/* Info */}
            <View style={styles.squadInfo}>
              <Text style={styles.squadName} numberOfLines={1}>{player.name}</Text>
              <Text style={styles.squadSub}>{player.gamesPlayed} games</Text>
            </View>

            {/* Stats */}
            <View style={styles.squadStats}>
              <View style={styles.squadStat}>
                <MaterialCommunityIcons name="soccer" size={12} color={t.colors.primary} />
                <Text style={styles.squadStatValue}>{player.goals}</Text>
              </View>
              <View style={styles.squadStat}>
                <MaterialCommunityIcons name="handshake" size={12} color={t.colors.warningAccent} />
                <Text style={[styles.squadStatValue, { color: t.colors.warningAccent }]}>{player.assists}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },

  // Handle
  handleBar: { alignItems: "center", justifyContent: "center", backgroundColor: t.colors.surface, paddingVertical: t.spacing.xs, minHeight: 20 },
  handle: { backgroundColor: t.colors.surfaceElevated, borderRadius: t.radius.pill, height: 4, width: 36 },

  // Header
  header: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  headerTitle: { color: t.colors.onSurface, ...t.typography.subtitle, flex: 1 },
  closeBtn: { borderRadius: t.radius.pill, padding: t.spacing.xs },

  // Scroll
  scrollContent: { paddingBottom: t.spacing.xxxl },

  // Hero
  hero: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg, paddingBottom: t.spacing.md },
  heroGradient: {
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.outline,
    overflow: "hidden",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: t.spacing.xl,
    gap: t.spacing.lg,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: t.radius.xl,
    backgroundColor: t.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: t.radius.xl,
    resizeMode: "cover",
  },
  heroAvatarText: { color: t.colors.primary, fontSize: 28, fontWeight: "800" },
  heroText: { flex: 1, minWidth: 0 },
  heroName: { color: t.colors.onSurface, ...t.typography.subtitle },
  heroLeague: { color: t.colors.onSurfaceMuted, ...t.typography.bodySmall, marginTop: 2 },
  heroRankBadge: {
    alignItems: "center",
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minWidth: 56,
  },
  heroRankLabel: { color: t.colors.onSurfaceDim, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  heroRankValue: { color: t.colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 1 },

  // Hero stats bar
  heroStatsBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
    paddingVertical: t.spacing.md,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: t.colors.onSurface, fontSize: 18, fontWeight: "800" },
  heroStatValueAccent: { color: t.colors.primary },
  heroStatValueNeg: { color: t.colors.errorAccent },
  heroStatLabel: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
  heroStatDivider: { width: 1, backgroundColor: t.colors.divider },

  // Tabs
  tabs: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
    marginHorizontal: t.spacing.lg,
    padding: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.md,
  },
  tabBtnActive: {
    backgroundColor: t.colors.surfaceRaised,
  },
  tabBtnText: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "600" },
  tabBtnTextActive: { color: t.colors.onSurface },

  // Tab content
  tabContent: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },

  // Section label
  sectionLabel: { color: t.colors.onSurfaceMuted, ...t.typography.label, marginBottom: t.spacing.md },

  // Record grid
  recordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.sm,
  },
  recordCell: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    alignItems: "center",
    minWidth: (SCREEN_W - t.spacing.lg * 2 - t.spacing.sm * 2) / 3,
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  recordValue: { color: t.colors.onSurface, fontSize: 22, fontWeight: "800" },
  recordLabel: { color: t.colors.onSurfaceDim, fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },

  // Form timeline
  formTimeline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 },
  formTimelineItem: { flexDirection: "row", alignItems: "center" },
  formTimelineBadge: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  formTimelineText: { fontSize: 16, fontWeight: "800" },
  formTimelineConnector: { width: 20, height: 2, backgroundColor: t.colors.divider },

  // Match summary
  matchSummary: {
    flexDirection: "row",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.outline,
    overflow: "hidden",
  },
  matchSummaryItem: { flex: 1, alignItems: "center", paddingVertical: t.spacing.lg, gap: t.spacing.xs },
  matchSummaryDivider: { width: 1, backgroundColor: t.colors.divider },
  matchSummaryValue: { color: t.colors.onSurface, fontSize: 24, fontWeight: "800" },
  matchSummaryLabel: { color: t.colors.onSurfaceDim, fontSize: 12, fontWeight: "600" },

  // Info
  infoCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  infoText: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "500" },
  infoDescription: { color: t.colors.onSurfaceDim, fontStyle: "italic", fontSize: 14, lineHeight: 20, marginTop: t.spacing.xs },

  // LZV
  lzvBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    marginTop: t.spacing.xl,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  lzvBtnText: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "600" },

  // Filter bar
  filterBar: { flexDirection: "row", gap: t.spacing.sm, marginBottom: t.spacing.lg },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    paddingVertical: 8,
    paddingLeft: t.spacing.lg,
    paddingRight: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  filterChipActive: { backgroundColor: t.colors.primaryMuted, borderColor: t.colors.primaryMuted },
  filterChipText: { color: t.colors.onSurfaceMuted, fontSize: 13, fontWeight: "600" },
  filterChipTextActive: { color: t.colors.primary },
  filterChipCount: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterChipCountActive: { backgroundColor: `${t.colors.primary}30` },
  filterChipCountText: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "700" },
  filterChipCountTextActive: { color: t.colors.primary },

  // Match list
  matchList: { gap: t.spacing.sm },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.outline,
    gap: t.spacing.md,
  },
  matchCardBadge: {
    width: 32,
    height: 32,
    borderRadius: t.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  matchCardBadgeText: { fontSize: 13, fontWeight: "800" },
  matchCardInfo: { flex: 1, minWidth: 0 },
  matchCardOpponent: { color: t.colors.onSurface, fontSize: 14, fontWeight: "600" },
  matchCardMeta: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 2 },
  matchCardScoreBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  matchCardScore: { fontSize: 18, fontWeight: "800" },
  matchCardScoreDivider: { color: t.colors.onSurfaceDim, fontSize: 14, fontWeight: "600" },
  matchCardScoreOpp: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "600" },
  matchCardUpcomingBadge: {
    backgroundColor: t.colors.primaryMuted,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
  },
  matchCardUpcomingText: { color: t.colors.primary, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  // Squad
  squadList: { gap: t.spacing.sm },
  squadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.outline,
    gap: t.spacing.sm,
  },
  squadRankBadge: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  squadRankBadgeTop: { backgroundColor: t.colors.warningAccent },
  squadRankText: { color: t.colors.onSurface, fontSize: 12, fontWeight: "700" },
  squadRankTextTop: { color: "#1a1200" },
  squadAvatar: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  squadAvatarText: { color: t.colors.onSurface, fontSize: 14, fontWeight: "800" },
  squadInfo: { flex: 1, minWidth: 0 },
  squadName: { color: t.colors.onSurface, fontSize: 14, fontWeight: "600" },
  squadSub: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 1 },
  squadStats: { flexDirection: "row", alignItems: "center", gap: t.spacing.lg },
  squadStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  squadStatValue: { color: t.colors.primary, fontSize: 15, fontWeight: "700" },

  // Empty
  emptyTab: { alignItems: "center", paddingVertical: t.spacing.xxxl, gap: t.spacing.md },
  emptyTabText: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall },

  // Image overlay
  imageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: t.spacing.lg,
  },
  imageOverlayClose: {
    position: "absolute",
    top: 48,
    right: t.spacing.lg,
    padding: t.spacing.sm,
    zIndex: 1,
  },
  imageOverlayImage: {
    width: "100%",
    height: "80%",
    borderRadius: t.radius.xl,
  },
});
