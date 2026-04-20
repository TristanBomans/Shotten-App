import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
import type { ScraperPlayer, ScraperTeam } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;
const { width: SCREEN_W } = Dimensions.get("window");

interface PlayerStatsModalProps {
  player: ScraperPlayer | null;
  teams: ScraperTeam[];
  visible: boolean;
  onClose: () => void;
}

function getTeamName(teams: ScraperTeam[], teamId: number): string {
  return teams.find((team) => team.externalId === teamId)?.name || `Team ${teamId}`;
}

export function PlayerStatsModal({ player, teams, visible, onClose }: PlayerStatsModalProps) {
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setActiveTeamIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      panY.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, player?.externalId]);

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

  if (!player) return null;

  const playerStats = player.teamStats || [];
  const hasTeams = playerStats.length > 0;

  const avgGoals = player.gamesPlayed > 0 ? (player.goals / player.gamesPlayed).toFixed(2) : "0.00";
  const avgAssists = player.gamesPlayed > 0 ? (player.assists / player.gamesPlayed).toFixed(2) : "0.00";
  const contribution = player.gamesPlayed > 0 ? ((player.goals + player.assists) / player.gamesPlayed).toFixed(2) : "0.00";

  const teamCount = playerStats.length;

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
          {/* Handle — swipeable */}
          <View style={styles.handleBar} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>{player.name}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ── HERO ── */}
          <View style={styles.hero}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>{getInitials(player.name)}</Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroName}>{player.name}</Text>
                  <Text style={styles.heroMeta}>
                    {teamCount} {teamCount === 1 ? "team" : "teams"} · {player.gamesPlayed} games
                  </Text>
                </View>
              </View>

              {/* Big Stats */}
              <View style={styles.bigStats}>
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatValue, { color: t.colors.primary }]}>{player.goals}</Text>
                  <View style={styles.bigStatLabelRow}>
                    <MaterialCommunityIcons name="soccer" size={12} color={t.colors.onSurfaceDim} />
                    <Text style={styles.bigStatLabel}>Goals</Text>
                  </View>
                </View>
                <View style={styles.bigStatDivider} />
                <View style={styles.bigStat}>
                  <Text style={[styles.bigStatValue, { color: t.colors.warningAccent }]}>{player.assists}</Text>
                  <View style={styles.bigStatLabelRow}>
                    <MaterialCommunityIcons name="handshake" size={12} color={t.colors.onSurfaceDim} />
                    <Text style={styles.bigStatLabel}>Assists</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── PERFORMANCE METRICS ── */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionLabel}>Performance</Text>
            <View style={styles.metricsGrid}>
              <MetricCard icon="trending-up" label="G/G" value={avgGoals} />
              <MetricCard icon="handshake" label="A/G" value={avgAssists} />
              <MetricCard icon="star" label="Contrib" value={contribution} accent />
            </View>
          </View>

          {/* ── TEAM BREAKDOWN ── */}
          {hasTeams && (
            <View style={styles.teamSection}>
              <Text style={styles.sectionLabel}>Team Breakdown</Text>

              {/* Horizontal scrollable team cards */}
              <Animated.ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
                onMomentumScrollEnd={(e) => {
                  const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                  setActiveTeamIndex(page);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={styles.teamScrollContent}
              >
                {playerStats.map((teamStat) => (
                  <View key={teamStat.id} style={styles.teamCardWrapper}>
                    <View style={styles.teamCard}>
                      {/* Team header */}
                      <View style={styles.teamCardHeader}>
                        <View style={styles.teamCardAvatar}>
                          <Text style={styles.teamCardAvatarText}>
                            {getTeamName(teams, teamStat.teamId).charAt(0)}
                          </Text>
                        </View>
                        <View style={styles.teamCardHeaderText}>
                          <Text style={styles.teamCardName} numberOfLines={1}>
                            {getTeamName(teams, teamStat.teamId)}
                          </Text>
                          <Text style={styles.teamCardNumber}>
                            Jersey #{teamStat.number || "–"}
                          </Text>
                        </View>
                      </View>

                      {/* Team stats */}
                      <View style={styles.teamCardStats}>
                        <TeamStatBox value={teamStat.gamesPlayed || 0} label="Games" />
                        <TeamStatBox value={teamStat.goals || 0} label="Goals" color={t.colors.primary} />
                        <TeamStatBox value={teamStat.assists || 0} label="Assists" color={t.colors.warningAccent} />
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.ScrollView>

              {/* Pagination dots */}
              {playerStats.length > 1 && (
                <View style={styles.pagination}>
                  {playerStats.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
                        setActiveTeamIndex(idx);
                      }}
                      style={[
                        styles.paginationDot,
                        idx === activeTeamIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── NO TEAMS ── */}
          {!hasTeams && (
            <View style={styles.emptyTeams}>
              <MaterialCommunityIcons name="account-off-outline" size={32} color={t.colors.onSurfaceDim} />
              <Text style={styles.emptyTeamsText}>No team statistics available</Text>
            </View>
          )}
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MetricCard({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.metricCard, accent && styles.metricCardAccent]}>
      <View style={styles.metricCardHeader}>
        <MaterialCommunityIcons
          name={icon as any}
          size={14}
          color={accent ? t.colors.primary : t.colors.onSurfaceDim}
        />
        <Text style={[styles.metricCardLabel, accent && styles.metricCardLabelAccent]}>{label}</Text>
      </View>
      <Text style={styles.metricCardValue}>{value}</Text>
    </View>
  );
}

function TeamStatBox({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <View style={styles.teamStatBox}>
      <Text style={[styles.teamStatBoxValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.teamStatBoxLabel}>{label}</Text>
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

  // Handle — swipeable area
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
  hero: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },
  heroCard: {
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.outline,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: t.spacing.xl,
    gap: t.spacing.lg,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { color: t.colors.onSurface, fontSize: 24, fontWeight: "800" },
  heroText: { flex: 1, minWidth: 0 },
  heroName: { color: t.colors.onSurface, ...t.typography.subtitle },
  heroMeta: { color: t.colors.onSurfaceMuted, ...t.typography.bodySmall, marginTop: 2 },

  // Big stats
  bigStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
  },
  bigStat: { flex: 1, alignItems: "center", paddingVertical: t.spacing.lg },
  bigStatValue: { fontSize: 36, fontWeight: "800", lineHeight: 40 },
  bigStatLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  bigStatLabel: { color: t.colors.onSurfaceDim, fontSize: 12, fontWeight: "600" },
  bigStatDivider: { width: 1, backgroundColor: t.colors.divider },

  // Metrics
  metricsSection: { paddingHorizontal: t.spacing.lg, marginTop: t.spacing.xl },
  sectionLabel: { color: t.colors.onSurfaceMuted, ...t.typography.label, marginBottom: t.spacing.md },
  metricsGrid: { flexDirection: "row", gap: t.spacing.sm },
  metricCard: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  metricCardAccent: { backgroundColor: t.colors.primaryMuted, borderColor: `${t.colors.primary}30` },
  metricCardHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  metricCardLabel: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metricCardLabelAccent: { color: t.colors.primary },
  metricCardValue: { color: t.colors.onSurface, fontSize: 22, fontWeight: "800" },

  // Team breakdown
  teamSection: { marginTop: t.spacing.xl },
  teamScrollContent: { paddingHorizontal: 0 },
  teamCardWrapper: { width: SCREEN_W, paddingHorizontal: t.spacing.lg },
  teamCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.xl,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  teamCardHeader: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, marginBottom: t.spacing.lg },
  teamCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardAvatarText: { color: t.colors.primary, fontSize: 22, fontWeight: "800" },
  teamCardHeaderText: { flex: 1, minWidth: 0 },
  teamCardName: { color: t.colors.onSurface, fontSize: 17, fontWeight: "700" },
  teamCardNumber: { color: t.colors.onSurfaceMuted, fontSize: 14, marginTop: 2 },
  teamCardStats: { flexDirection: "row", gap: t.spacing.sm },
  teamStatBox: {
    flex: 1,
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    alignItems: "center",
  },
  teamStatBoxValue: { color: t.colors.onSurface, fontSize: 24, fontWeight: "800" },
  teamStatBoxLabel: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },

  // Pagination
  pagination: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: t.spacing.lg },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.surfaceElevated,
  },
  paginationDotActive: { backgroundColor: t.colors.primary },

  // Empty
  emptyTeams: { alignItems: "center", paddingVertical: t.spacing.xxxl, gap: t.spacing.md, marginHorizontal: t.spacing.lg },
  emptyTeamsText: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall },
});
