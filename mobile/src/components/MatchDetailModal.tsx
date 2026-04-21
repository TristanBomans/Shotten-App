import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AttendanceStatus, Match, ScraperPlayer, ScraperTeam } from "../lib/types";
import {
  formatMatchDate,
  resolveAttendanceState,
} from "../lib/matches";
import { ResponseButtons } from "./ResponseButtons";
import { androidDarkTheme } from "../theme/androidDark";
import {
  fetchScraperPlayersByTeam,
  fetchScraperTeamById,
  fetchScraperTeamMatches,
  fetchScraperTeams,
} from "../lib/api";

const t = androidDarkTheme;
const SCREEN_WIDTH = Dimensions.get("window").width;

/* ==============================================================================
   Helpers
   ============================================================================== */

function normalizeTeamName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['`']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameTeamName(left: string, right: string): boolean {
  const ln = normalizeTeamName(left);
  const rn = normalizeTeamName(right);
  if (!ln || !rn) return false;
  if (ln === rn) return true;
  return ln.includes(rn) || rn.includes(ln);
}

function extractOpponentTeam(match: Match): string | null {
  const parts = match.name.split(/\s+-\s+|\s*-\s*/).map((s) => s.trim());
  if (parts.length === 2) {
    const [a, b] = parts;
    if (isSameTeamName(a, match.teamName)) return b;
    if (isSameTeamName(b, match.teamName)) return a;
    return b;
  }
  return null;
}

function getMatchDateObj(dateIso: string): Date {
  return new Date(dateIso);
}

/* ==============================================================================
   Hook: useOpponentData
   ============================================================================== */

interface OpponentData {
  opponentTeam: string | null;
  opponentData: ScraperTeam | null;
  opponentPlayers: ScraperPlayer[];
  recentForm: ("W" | "L" | "D")[];
  loading: boolean;
}

function useOpponentData(match: Match, enabled: boolean): OpponentData {
  const [allTeams, setAllTeams] = useState<ScraperTeam[]>([]);
  const [opponentData, setOpponentData] = useState<ScraperTeam | null>(null);
  const [opponentPlayers, setOpponentPlayers] = useState<ScraperPlayer[]>([]);
  const [recentForm, setRecentForm] = useState<("W" | "L" | "D")[]>([]);
  const [loading, setLoading] = useState(false);

  const opponentTeam = useMemo(() => extractOpponentTeam(match), [match]);

  useEffect(() => {
    if (!enabled || !opponentTeam) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const teams = await fetchScraperTeams();
        if (cancelled) return;
        setAllTeams(teams);

        const matched = teams.find((team) => isSameTeamName(team.name, opponentTeam!));
        if (!matched) {
          setLoading(false);
          return;
        }

        const details = await fetchScraperTeamById(matched.externalId);
        if (cancelled) return;
        setOpponentData(details);

        const players = await fetchScraperPlayersByTeam(matched.externalId);
        if (cancelled) return;
        setOpponentPlayers(players);

        const matches = await fetchScraperTeamMatches(matched.externalId);
        if (cancelled) return;

        const played = matches
          .filter((m) => m.status === "Played")
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        const form: ("W" | "L" | "D")[] = played.map((m) => {
          const isHome = isSameTeamName(m.homeTeam, matched.name);
          const ourScore = isHome ? m.homeScore : m.awayScore;
          const theirScore = isHome ? m.awayScore : m.homeScore;
          if (ourScore > theirScore) return "W";
          if (ourScore < theirScore) return "L";
          return "D";
        });
        setRecentForm(form);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, opponentTeam]);

  return { opponentTeam, opponentData, opponentPlayers, recentForm, loading };
}

/* ==============================================================================
   Sub-components
   ============================================================================== */

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

function SectionHeader({
  icon,
  title,
  color = t.colors.onSurfaceDim,
}: {
  icon: string;
  title: string;
  color?: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function SquadView({
  match,
  currentPlayerId,
  currentStatus,
  isUpdating,
  onYes,
  onNo,
  onMaybe,
}: {
  match: Match;
  currentPlayerId: number;
  currentStatus: AttendanceStatus | null;
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  onMaybe: () => void;
}) {
  const present = match.attendances.filter((a) => a.status === "Present");
  const maybe = match.attendances.filter((a) => a.status === "Maybe");
  const notPresent = match.attendances.filter((a) => a.status === "NotPresent");
  const attendancePlayerIds = new Set(match.attendances.map((a) => a.playerId));
  const unknown = match.players
    ?.filter((p) => !attendancePlayerIds.has(p.id))
    .map((p) => ({
      matchId: match.id,
      playerId: p.id,
      player: p,
      status: "NotPresent" as AttendanceStatus,
    })) ?? [];

  const statusGroups = [
    { title: "Coming", color: t.colors.primary, bgColor: t.colors.successContainer, players: present },
    { title: "Maybe", color: t.colors.warningAccent, bgColor: t.colors.warningContainer, players: maybe },
    { title: "Not Coming", color: t.colors.errorAccent, bgColor: t.colors.errorContainer, players: notPresent },
    { title: "No Response", color: t.colors.onSurfaceDim, bgColor: t.colors.surfaceRaised, players: unknown },
  ].filter((g) => g.players.length > 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
      <SectionCard>
        <Text style={styles.sectionLabel}>YOUR RESPONSE</Text>
        <ResponseButtons
          currentState={resolveAttendanceState(currentStatus)}
          isUpdating={isUpdating}
          onYes={onYes}
          onNo={onNo}
          onMaybe={onMaybe}
        />
      </SectionCard>

      <View style={styles.summaryRow}>
        <View style={styles.summaryChip}>
          <Text style={[styles.summaryNum, { color: t.colors.primary }]}>{present.length}</Text>
          <Text style={styles.summaryLabel}>In</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={[styles.summaryNum, { color: t.colors.warningAccent }]}>{maybe.length}</Text>
          <Text style={styles.summaryLabel}>Maybe</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={[styles.summaryNum, { color: t.colors.errorAccent }]}>{notPresent.length}</Text>
          <Text style={styles.summaryLabel}>Out</Text>
        </View>
        <View style={styles.summaryChip}>
          <Text style={[styles.summaryNum, { color: t.colors.onSurfaceDim }]}>{unknown.length}</Text>
          <Text style={styles.summaryLabel}>TBD</Text>
        </View>
      </View>

      {statusGroups.map((group) => (
        <View key={group.title} style={styles.playerGroup}>
          <View style={styles.playerGroupHeader}>
            <View style={[styles.playerGroupDot, { backgroundColor: group.color }]} />
            <Text style={[styles.playerGroupTitle, { color: group.color }]}>{group.title}</Text>
            <Text style={styles.playerGroupCount}>{group.players.length}</Text>
          </View>
          <View style={styles.playerList}>
            {group.players.map((player) => {
              const isYou = player.playerId === currentPlayerId;
              const name = player.player?.name ?? `Player ${player.playerId}`;
              return (
                <View
                  key={player.playerId}
                  style={[styles.playerRow, isYou && { backgroundColor: t.colors.surfaceRaised }]}
                >
                  <View style={[styles.playerAvatar, { backgroundColor: group.bgColor }]}>
                    <Text style={[styles.playerAvatarText, { color: group.color }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.playerName, isYou && styles.playerNameYou]}>
                    {name}
                    {isYou ? " (you)" : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function OpponentView({
  match,
  opponentData,
  opponentPlayers,
  recentForm,
  loading,
  onImagePress,
}: {
  match: Match;
  opponentData: ScraperTeam | null;
  opponentPlayers: ScraperPlayer[];
  recentForm: ("W" | "L" | "D")[];
  loading: boolean;
  onImagePress?: () => void;
}) {
  if (loading && !opponentData) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
        <SectionCard style={{ padding: 20 }}>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <View style={[styles.skeletonBlock, { width: 72, height: 72, borderRadius: 14 }]} />
            <View style={{ flex: 1, gap: 10 }}>
              <View style={[styles.skeletonBlock, { width: "72%", height: 24, borderRadius: 10 }]} />
              <View style={[styles.skeletonBlock, { width: "48%", height: 14, borderRadius: 8 }]} />
            </View>
          </View>
        </SectionCard>
        <SectionCard>
          <View style={[styles.skeletonBlock, { width: 132, height: 14, borderRadius: 7, marginBottom: 12 }]} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={{ alignItems: "center", gap: 8 }}>
                <View style={[styles.skeletonBlock, { width: 48, height: 28, borderRadius: 10 }]} />
                <View style={[styles.skeletonBlock, { width: 44, height: 12, borderRadius: 6 }]} />
              </View>
            ))}
          </View>
        </SectionCard>
        <SectionCard>
          <View style={[styles.skeletonBlock, { width: 124, height: 14, borderRadius: 7, marginBottom: 12 }]} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={[styles.skeletonBlock, { width: 36, height: 36, borderRadius: 10 }]} />
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    );
  }

  if (!opponentData) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.tabScrollContent, styles.emptyTab]}
      >
        <MaterialCommunityIcons name="magnify" size={48} color={t.colors.onSurfaceDim} />
        <Text style={styles.emptyTitle}>No opponent data</Text>
        <Text style={styles.emptySubtitle}>We could not find league data for this team.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
      <SectionCard style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          {opponentData.imageBase64 ? (
            <TouchableOpacity activeOpacity={0.85} onPress={onImagePress}>
              <Image source={{ uri: opponentData.imageBase64 }} style={styles.teamLogoImage} />
            </TouchableOpacity>
          ) : (
            <View style={styles.teamLogoContainer}>
              <Text style={styles.teamLogoText}>{opponentData.name.charAt(0)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>
              {opponentData.name}
            </Text>
            {opponentData.leagueName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <MaterialCommunityIcons name="trophy" size={12} color={t.colors.onSurfaceDim} />
                <Text style={styles.teamLeague}>{opponentData.leagueName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SectionCard>

      {opponentData.rank !== undefined && (
        <SectionCard>
          <SectionHeader icon="trending-up" title="Season Stats" color={t.colors.primary} />
          <View style={styles.statsRow}>
            <StatItem
              label="Rank"
              value={`#${opponentData.rank}`}
              color={opponentData.rank === 1 ? t.colors.warningAccent : t.colors.onSurface}
            />
            <StatItem label="Points" value={opponentData.points ?? 0} />
            <StatItem label="Record" value={`${opponentData.wins ?? 0}-${opponentData.draws ?? 0}-${opponentData.losses ?? 0}`} />
            <StatItem
              label="Goal Diff"
              value={`${(opponentData.goalDifference ?? 0) >= 0 ? "+" : ""}${opponentData.goalDifference ?? 0}`}
              color={(opponentData.goalDifference ?? 0) >= 0 ? t.colors.primary : t.colors.errorAccent}
            />
          </View>
        </SectionCard>
      )}

      {recentForm.length > 0 && (
        <SectionCard>
          <SectionHeader icon="lightning-bolt" title="Recent Form" color={t.colors.successContainer} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {recentForm.map((result, i) => {
              const colors =
                result === "W"
                  ? { bg: t.colors.successContainer, text: t.colors.primary, border: t.colors.primary }
                  : result === "L"
                    ? { bg: t.colors.errorContainer, text: t.colors.errorAccent, border: t.colors.errorAccent }
                    : { bg: t.colors.warningContainer, text: t.colors.warningAccent, border: t.colors.warningAccent };
              return (
                <View
                  key={i}
                  style={[styles.formBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}
                >
                  <Text style={[styles.formBadgeText, { color: colors.text }]}>{result}</Text>
                </View>
              );
            })}
          </View>
        </SectionCard>
      )}

      {(opponentData.colors || opponentData.manager || opponentData.description) && (
        <SectionCard>
          <SectionHeader icon="information" title="Team Info" color={t.colors.primary} />
          <View style={{ gap: 10 }}>
            {opponentData.colors && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MaterialCommunityIcons name="palette" size={16} color={t.colors.onSurfaceDim} />
                <Text style={styles.infoText}>{opponentData.colors}</Text>
              </View>
            )}
            {opponentData.manager && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MaterialCommunityIcons name="account" size={16} color={t.colors.onSurfaceDim} />
                <Text style={styles.infoText}>{opponentData.manager}</Text>
              </View>
            )}
            {opponentData.description && (
              <Text style={styles.descriptionText}>"{opponentData.description}"</Text>
            )}
          </View>
        </SectionCard>
      )}

      {opponentPlayers.length > 0 && (
        <SectionCard>
          <SectionHeader icon="soccer" title="Top Scorers" color={t.colors.errorAccent} />
          <View>
            {opponentPlayers
              .sort((a, b) => b.goals - a.goals)
              .slice(0, 5)
              .map((player, i) => (
                <View
                  key={player.externalId}
                  style={[styles.scorerRow, i < 4 && { borderBottomColor: t.colors.divider, borderBottomWidth: 1 }]}
                >
                  <Text
                    style={[
                      styles.scorerRank,
                      {
                        color:
                          i === 0
                            ? t.colors.warningAccent
                            : i === 1
                              ? t.colors.onSurfaceMuted
                              : i === 2
                                ? t.colors.warningAccent
                                : t.colors.onSurfaceDim,
                      },
                    ]}
                  >
                    {i + 1}
                  </Text>
                  <View style={styles.scorerNumberBadge}>
                    <Text style={styles.scorerNumberText}>{player.number ?? "-"}</Text>
                  </View>
                  <Text style={styles.scorerName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={styles.scorerStats}>
                    <Text style={styles.scorerStatText}>
                      <Text style={{ color: t.colors.primary, fontWeight: "700" }}>{player.goals}</Text>
                      <Text style={{ color: t.colors.onSurfaceDim }}> G</Text>
                    </Text>
                    <Text style={styles.scorerStatText}>
                      <Text style={{ color: t.colors.primary, fontWeight: "700" }}>{player.assists}</Text>
                      <Text style={{ color: t.colors.onSurfaceDim }}> A</Text>
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  );
}

function StatItem({
  label,
  value,
  color = t.colors.onSurface,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ==============================================================================
   Main Modal
   ============================================================================== */

interface MatchDetailModalProps {
  match: Match | null;
  currentPlayerId: number;
  currentStatus: AttendanceStatus | null;
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  onMaybe: () => void;
  onClose: () => void;
}

type Tab = "squad" | "opponent";

export function MatchDetailModal({
  match,
  currentPlayerId,
  currentStatus,
  isUpdating,
  onYes,
  onNo,
  onMaybe,
  onClose,
}: MatchDetailModalProps) {
  if (!match) return null;

  const [activeTab, setActiveTab] = useState<Tab>("squad");
  const [showImage, setShowImage] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastTabRef = useRef<Tab>("squad");

  const opponent = useOpponentData(match, activeTab === "opponent");

  const matchDate = getMatchDateObj(match.date);
  const presentCount = match.attendances.filter((a) => a.status === "Present").length;

  const openMaps = () => {
    if (match.location) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`
      );
    }
  };

  const openCalendar = () => {
    const start = matchDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end =
      new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      match.name
    )}&dates=${start}/${end}&location=${encodeURIComponent(match.location || "")}`;
    Linking.openURL(url);
  };

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    const nextTab: Tab = index === 0 ? "squad" : "opponent";
    if (nextTab !== lastTabRef.current) {
      lastTabRef.current = nextTab;
      setActiveTab(nextTab);
    }
  }, []);

  const scrollToTab = useCallback((tab: Tab) => {
    scrollRef.current?.scrollTo({ x: tab === "squad" ? 0 : SCREEN_WIDTH, animated: true });
    lastTabRef.current = tab;
    setActiveTab(tab);
  }, []);

  return (
    <Modal animationType="slide" visible={true} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {match.name.replace(/-/g, " vs ")}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
            </Pressable>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaText}>{formatMatchDate(match.date)}</Text>
            {match.location ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.headerMetaDot}> · </Text>
                <Text style={styles.headerMetaLocation} numberOfLines={1}>
                  {match.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => scrollToTab("squad")}
            style={[styles.tabButton, activeTab === "squad" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === "squad" && styles.tabTextActive]}>
              Squad ({presentCount + match.attendances.filter((a) => a.status === "Maybe").length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => scrollToTab("opponent")}
            style={[styles.tabButton, activeTab === "opponent" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === "opponent" && styles.tabTextActive]}>
              Opponent
            </Text>
          </Pressable>
        </View>

        {/* Swipeable content */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={styles.tabContainer}
        >
          <View style={styles.tabPage}>
            <SquadView
              match={match}
              currentPlayerId={currentPlayerId}
              currentStatus={currentStatus}
              isUpdating={isUpdating}
              onYes={onYes}
              onNo={onNo}
              onMaybe={onMaybe}
            />
          </View>
          <View style={styles.tabPage}>
            <OpponentView
              match={match}
              opponentData={opponent.opponentData}
              opponentPlayers={opponent.opponentPlayers}
              recentForm={opponent.recentForm}
              loading={opponent.loading}
              onImagePress={() => setShowImage(true)}
            />
          </View>
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.actionBar}>
          {match.location && (
            <Pressable
              onPress={openMaps}
              style={styles.actionButton}
              android_ripple={{ color: t.colors.ripple, borderless: false }}
            >
              <MaterialCommunityIcons name="map-marker" size={18} color={t.colors.onSurfaceMuted} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </Pressable>
          )}
          <Pressable
            onPress={openCalendar}
            style={styles.actionButton}
            android_ripple={{ color: t.colors.ripple, borderless: false }}
          >
            <MaterialCommunityIcons name="calendar-plus" size={18} color={t.colors.onSurfaceMuted} />
            <Text style={styles.actionButtonText}>Calendar</Text>
          </Pressable>
        </View>

        {/* Full-screen image overlay */}
        <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
          <View style={styles.imageOverlay}>
            <TouchableOpacity style={styles.imageOverlayClose} activeOpacity={0.7} onPress={() => setShowImage(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: opponent.opponentData?.imageBase64 }} style={styles.imageOverlayImage} resizeMode="contain" />
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

/* ==============================================================================
   Styles
   ============================================================================== */

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  header: {
    backgroundColor: t.colors.surface,
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  closeButton: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  headerMeta: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 2,
    paddingLeft: 4,
  },
  headerMetaText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
  },
  headerMetaDot: {
    color: t.colors.onSurfaceDim,
    fontSize: 13,
  },
  headerMetaLocation: {
    color: t.colors.onSurfaceDim,
    fontSize: 13,
    maxWidth: 200,
  },
  tabBar: {
    backgroundColor: t.colors.surface,
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    padding: t.spacing.md,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: t.radius.md,
    flex: 1,
    paddingVertical: t.spacing.md,
  },
  tabButtonActive: {
    backgroundColor: t.colors.surfaceRaised,
  },
  tabText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: t.colors.onSurface,
  },
  tabContainer: {
    flex: 1,
  },
  tabPage: {
    width: SCREEN_WIDTH,
  },
  tabScrollContent: {
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xxxl,
  },
  sectionCard: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.outline,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    gap: 12,
    marginBottom: t.spacing.lg,
    overflow: "hidden",
    padding: t.spacing.lg,
  },
  sectionLabel: {
    color: t.colors.onSurfaceMuted,
    marginBottom: t.spacing.sm,
    ...t.typography.label,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.lg,
  },
  summaryChip: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderColor: t.colors.outline,
    borderRadius: t.radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: t.spacing.md,
  },
  summaryNum: {
    ...t.typography.score,
  },
  summaryLabel: {
    color: t.colors.onSurfaceDim,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  playerGroup: {
    marginBottom: t.spacing.lg,
  },
  playerGroupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  playerGroupDot: {
    borderRadius: t.radius.pill,
    height: 6,
    width: 6,
  },
  playerGroupTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  playerGroupCount: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "700",
  },
  playerList: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.outline,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  playerRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.md,
    minHeight: 52,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  playerAvatar: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  playerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  playerName: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  playerNameYou: {
    color: t.colors.primary,
    fontWeight: "700",
  },
  actionBar: {
    borderTopColor: t.colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderColor: t.colors.outline,
    borderRadius: t.radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    justifyContent: "center",
    overflow: "hidden",
    paddingVertical: t.spacing.md,
  },
  actionButtonText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: t.spacing.xxxl,
  },
  emptyTitle: {
    color: t.colors.onSurface,
    marginTop: t.spacing.lg,
    ...t.typography.subtitle,
  },
  emptySubtitle: {
    color: t.colors.onSurfaceDim,
    marginTop: t.spacing.sm,
    textAlign: "center",
    ...t.typography.bodySmall,
  },
  skeletonBlock: {
    backgroundColor: t.colors.surfaceElevated,
  },
  teamLogoContainer: {
    alignItems: "center",
    backgroundColor: t.colors.surfaceRaised,
    borderColor: t.colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  teamLogoImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    resizeMode: "cover",
  },
  teamLogoText: {
    color: t.colors.primary,
    fontSize: 28,
    fontWeight: "700",
  },
  teamName: {
    color: t.colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
  },
  teamLeague: {
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: t.spacing.sm,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: t.colors.onSurfaceDim,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  formBadge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  formBadgeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  infoText: {
    color: t.colors.onSurface,
    fontSize: 14,
  },
  descriptionText: {
    borderTopColor: t.colors.divider,
    borderTopWidth: 1,
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: t.spacing.sm,
    paddingTop: t.spacing.sm,
  },
  scorerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: t.spacing.md,
  },
  scorerRank: {
    fontSize: 14,
    fontWeight: "800",
    width: 24,
  },
  scorerNumberBadge: {
    alignItems: "center",
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  scorerNumberText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  scorerName: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  scorerStats: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  scorerStatText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
  },

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
