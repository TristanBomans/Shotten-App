import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchMatches, updateAttendance, fetchScraperTeams, fetchScraperTeamMatches } from "../../lib/api";
import {
  filterPastMatches,
  getHeroMatch,
  getPlayerAttendanceStatus,
  getRemainingUpcoming,
  resolveAttendanceState,
  resolveAttendanceLabel,
  withPlayerAttendance,
  formatMatchDate,
} from "../../lib/matches";
import type { AttendanceStatus, Match, ScraperMatch } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { MatchDetailModal } from "../../components/MatchDetailModal";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_MARGIN = 20;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCountdown(dateIso: string): string {
  const now = new Date();
  const matchDate = new Date(dateIso);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) return "Finished";
  if (diffMins < 60) return "Starting now";
  if (diffHours < 24) return `In ${diffHours}h`;
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

function getSquadCounts(match: Match) {
  const present = match.attendances.filter((a) => a.status === "Present").length;
  const maybe = match.attendances.filter((a) => a.status === "Maybe").length;
  const notPresent = match.attendances.filter((a) => a.status === "NotPresent").length;
  const total = match.attendances.length;
  return { present, maybe, notPresent, total, unanswered: total - present - maybe - notPresent };
}

type MatchScore = { scoreline: string; result: "W" | "L" | "D" };

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

function isSameCalendarDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function findMatchScore(match: Match, scraperMatches: ScraperMatch[]): MatchScore | null {
  for (const sm of scraperMatches) {
    if (sm.status !== "Played") continue;
    if (!isSameCalendarDay(match.date, sm.date)) continue;
    const isHome = isSameTeamName(match.teamName, sm.homeTeam);
    const isAway = isSameTeamName(match.teamName, sm.awayTeam);
    if (!isHome && !isAway) continue;
    const ourScore = isHome ? sm.homeScore : sm.awayScore;
    const oppScore = isHome ? sm.awayScore : sm.homeScore;
    const result: "W" | "L" | "D" = ourScore > oppScore ? "W" : ourScore < oppScore ? "L" : "D";
    return { scoreline: `${ourScore} - ${oppScore}`, result };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SquadCount({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <View style={styles.squadCountItem}>
      <View style={[styles.squadCountDot, { backgroundColor: color }]} />
      <Text style={styles.squadCountLabel}>{label}</Text>
      <Text style={[styles.squadCountValue, { color }]}>{count}</Text>
    </View>
  );
}

function DeckCardContent({ match, playerId }: { match: Match; playerId: number }) {
  const counts = getSquadCounts(match);
  const status = getPlayerAttendanceStatus(match, playerId);
  const state = resolveAttendanceState(status);
  const countdown = getCountdown(match.date);

  const stateColor =
    state === "yes"
      ? t.colors.primary
      : state === "no"
        ? t.colors.errorAccent
        : state === "undecided"
          ? t.colors.warningAccent
          : t.colors.onSurfaceDim;

  const stateIcon =
    state === "yes"
      ? "check-circle"
      : state === "no"
        ? "close-circle"
        : state === "undecided"
          ? "help-circle"
          : "circle-outline";

  return (
    <View style={styles.cardInner}>
      <View>
        <View style={styles.countdownPill}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={t.colors.onSurfaceMuted} />
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>

        <Text style={styles.cardTitle}>{match.name}</Text>

        <View style={styles.cardMeta}>
          <MaterialCommunityIcons name="calendar" size={16} color={t.colors.onSurfaceDim} />
          <Text style={styles.cardMetaText}>{formatMatchDate(match.date)}</Text>
        </View>

        {match.location ? (
          <View style={styles.cardMeta}>
            <MaterialCommunityIcons name="map-marker" size={16} color={t.colors.onSurfaceDim} />
            <Text style={styles.cardMetaText}>{match.location}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.squadSection}>
        <Text style={styles.squadLabel}>SQUAD</Text>
        <View style={styles.squadBar}>
          {counts.present > 0 && (
            <View style={[styles.squadSegment, { flex: counts.present, backgroundColor: t.colors.primary }]} />
          )}
          {counts.maybe > 0 && (
            <View style={[styles.squadSegment, { flex: counts.maybe, backgroundColor: t.colors.warningAccent }]} />
          )}
          {counts.notPresent > 0 && (
            <View style={[styles.squadSegment, { flex: counts.notPresent, backgroundColor: t.colors.errorAccent }]} />
          )}
          {counts.unanswered > 0 && (
            <View style={[styles.squadSegment, { flex: counts.unanswered, backgroundColor: t.colors.surfaceElevated }]} />
          )}
        </View>
        <View style={styles.squadCounts}>
          <SquadCount color={t.colors.primary} label="In" count={counts.present} />
          <SquadCount color={t.colors.warningAccent} label="Maybe" count={counts.maybe} />
          <SquadCount color={t.colors.errorAccent} label="Out" count={counts.notPresent} />
          <SquadCount color={t.colors.onSurfaceDim} label="TBD" count={counts.unanswered} />
        </View>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.statusLabel}>YOUR STATUS</Text>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                state === "yes"
                  ? t.colors.successContainer
                  : state === "no"
                    ? t.colors.errorContainer
                    : state === "undecided"
                      ? t.colors.warningContainer
                      : t.colors.surfaceRaised,
            },
          ]}
        >
          <MaterialCommunityIcons name={stateIcon as any} size={18} color={stateColor} />
          <Text style={[styles.statusText, { color: stateColor }]}>{resolveAttendanceLabel(status)}</Text>
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  color,
  bgColor,
  label,
  onPress,
  isUpdating,
}: {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
  onPress: () => void;
  isUpdating: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isUpdating}
      style={[styles.actionButton, { backgroundColor: bgColor, opacity: isUpdating ? 0.5 : 1 }]}
      android_ripple={{ color: t.colors.ripple, borderless: false }}
    >
      <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function SkeletonRow() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.pastRow, { opacity: pulse }]}>
      <View style={[styles.skeletonCircle, { marginRight: 12 }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", height: 12 }]} />
      </View>
      <View style={[styles.skeletonLine, { width: 60, height: 28, borderRadius: 8 }]} />
    </Animated.View>
  );
}

function HistoryModal({
  visible,
  onClose,
  pastMatches,
  playerId,
  scoreLookup,
  loadingScores,
}: {
  visible: boolean;
  onClose: () => void;
  pastMatches: Match[];
  playerId: number;
  scoreLookup: Map<number, MatchScore | null>;
  loadingScores: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: t.colors.background }]}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>History</Text>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.historyContent}>
          {pastMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={40} color={t.colors.onSurfaceDim} />
              <Text style={styles.emptySubtitle}>No past matches</Text>
            </View>
          ) : loadingScores ? (
            Array.from({ length: Math.min(pastMatches.length, 8) }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          ) : (
            pastMatches.map((match) => (
              <PastMatchRow
                key={match.id}
                match={match}
                playerId={playerId}
                scoreInfo={scoreLookup.get(match.id) ?? null}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PastMatchRow({ match, playerId, scoreInfo }: { match: Match; playerId: number; scoreInfo: MatchScore | null }) {
  const status = getPlayerAttendanceStatus(match, playerId);
  const state = resolveAttendanceState(status);

  const stateColor =
    state === "yes"
      ? t.colors.primary
      : state === "no"
        ? t.colors.errorAccent
        : state === "undecided"
          ? t.colors.warningAccent
          : t.colors.onSurfaceDim;

  const stateIcon =
    state === "yes"
      ? "check-circle"
      : state === "no"
        ? "close-circle"
        : state === "undecided"
          ? "help-circle"
          : "circle-outline";

  const resultBg =
    scoreInfo?.result === "W"
      ? t.colors.successContainer
      : scoreInfo?.result === "L"
        ? t.colors.errorContainer
        : t.colors.warningContainer;

  const resultColor =
    scoreInfo?.result === "W"
      ? t.colors.primary
      : scoreInfo?.result === "L"
        ? t.colors.errorAccent
        : t.colors.warningAccent;

  return (
    <View style={styles.pastRow}>
      <MaterialCommunityIcons name={stateIcon as any} size={18} color={stateColor} />
      <View style={styles.pastRowText}>
        <Text style={styles.pastRowName} numberOfLines={1}>
          {match.name}
        </Text>
        <Text style={styles.pastRowDate}>{formatMatchDate(match.date)}</Text>
      </View>
      {scoreInfo && (
        <View style={styles.pastScoreWrap}>
          <View style={[styles.pastResultBadge, { backgroundColor: resultBg }]}>
            <Text style={[styles.pastResultText, { color: resultColor }]}>{scoreInfo.result}</Text>
          </View>
          <Text style={styles.pastScoreText}>{scoreInfo.scoreline}</Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                        */
/* ------------------------------------------------------------------ */

export default function HomeScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scoreLookup, setScoreLookup] = useState<Map<number, MatchScore | null>>(new Map());
  const [loadingScores, setLoadingScores] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadMatches = useCallback(
    async (playerId: number, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchMatches(playerId);
        setMatches(response);
        setCurrentIndex(0);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load matches.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadMatches(session.playerId);
  }, [loadMatches, session.playerId]);

  const handleRefresh = useCallback(() => {
    void loadMatches(session.playerId, true);
  }, [loadMatches, session.playerId]);

  const handleRespond = async (matchId: number, response: "yes" | "no" | "maybe") => {
    const statusMap: Record<string, AttendanceStatus> = {
      yes: "Present",
      no: "NotPresent",
      maybe: "Maybe",
    };
    const nextStatus: AttendanceStatus = statusMap[response];
    setActionError(null);
    setUpdatingMatchId(matchId);

    let previousMatchesSnapshot: Match[] = [];

    setMatches((previous) => {
      previousMatchesSnapshot = previous;
      return previous.map((match) => {
        if (match.id !== matchId) {
          return match;
        }
        return withPlayerAttendance(match, session.playerId, nextStatus);
      });
    });

    try {
      await updateAttendance(matchId, session.playerId, nextStatus);
    } catch (updateError) {
      setMatches(previousMatchesSnapshot);
      setActionError(updateError instanceof Error ? updateError.message : "Could not save attendance.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const upcomingMatches = useMemo(() => {
    const hero = getHeroMatch(matches);
    const remaining = getRemainingUpcoming(matches);
    return hero ? [hero, ...remaining] : remaining;
  }, [matches]);

  const pastMatches = useMemo(() => filterPastMatches(matches), [matches]);
  const activeMatch = upcomingMatches[currentIndex];

  useEffect(() => {
    if (!showHistory || pastMatches.length === 0) return;
    let cancelled = false;
    setLoadingScores(true);

    async function fetchScores() {
      try {
        const teams = await fetchScraperTeams();
        const uniqueTeamNames = [...new Set(pastMatches.map((m) => m.teamName))];
        const teamExternalIds = new Map<string, number>();

        for (const teamName of uniqueTeamNames) {
          const matched = teams.find((t) => isSameTeamName(t.name, teamName));
          if (matched) {
            teamExternalIds.set(teamName, matched.externalId);
          }
        }

        const allScraperMatches: ScraperMatch[] = [];
        const fetchPromises = Array.from(teamExternalIds.values()).map((externalId) =>
          fetchScraperTeamMatches(externalId).catch(() => [] as ScraperMatch[]),
        );
        const results = await Promise.all(fetchPromises);
        for (const matches of results) {
          allScraperMatches.push(...matches);
        }

        if (cancelled) return;

        const lookup = new Map<number, MatchScore | null>();
        for (const match of pastMatches) {
          lookup.set(match.id, findMatchScore(match, allScraperMatches));
        }
        setScoreLookup(lookup);
      } catch {
        // Scores won't be shown if fetch fails
      } finally {
        if (!cancelled) setLoadingScores(false);
      }
    }

    void fetchScores();
    return () => {
      cancelled = true;
    };
  }, [showHistory, pastMatches]);

  const answeredCount = upcomingMatches.filter((m) => getPlayerAttendanceStatus(m, session.playerId) !== null).length;

  const handleScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(index);
      setActionError(null);
    },
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <LoadingState message="Loading matches..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.errorWrap}>
          <ErrorState message={error} onRetry={() => void loadMatches(session.playerId)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming</Text>
        <View style={styles.headerActions}>
          <View style={styles.answeredPill}>
            <MaterialCommunityIcons name="check-circle" size={14} color={t.colors.primary} />
            <Text style={styles.answeredText}>
              {answeredCount}/{upcomingMatches.length}
            </Text>
          </View>
          <Pressable onPress={() => setShowHistory(true)} style={styles.iconButton}>
            <MaterialCommunityIcons name="history" size={22} color={t.colors.onSurfaceMuted} />
          </Pressable>
          <Pressable onPress={handleRefresh} disabled={refreshing} style={styles.iconButton}>
            <MaterialCommunityIcons
              name="refresh"
              size={22}
              color={refreshing ? t.colors.onSurfaceDim : t.colors.onSurfaceMuted}
            />
          </Pressable>
        </View>
      </View>

      {actionError ? (
        <View style={styles.actionErrorWrap}>
          <ErrorState message={actionError} />
        </View>
      ) : null}

      {upcomingMatches.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="soccer" size={48} color={t.colors.onSurfaceDim} />
          <Text style={styles.emptyTitle}>No upcoming matches</Text>
          <Text style={styles.emptySubtitle}>New matches will appear here when they&apos;re scheduled.</Text>
        </View>
      ) : (
        <>
          {/* Card deck */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={styles.deckContainer}
          >
            {upcomingMatches.map((match) => (
              <View key={match.id} style={styles.page}>
                <Pressable
                  style={styles.card}
                  onPress={() => setSelectedMatch(match)}
                  android_ripple={{ color: t.colors.ripple, borderless: false }}
                >
                  <DeckCardContent match={match} playerId={session.playerId} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Dots */}
          <View style={styles.dotsContainer}>
            {upcomingMatches.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
            ))}
          </View>

          {/* Action buttons */}
          {activeMatch ? (
            <View style={styles.actionsContainer}>
              <ActionButton
                icon="check"
                color={t.colors.primary}
                bgColor={t.colors.successContainer}
                label="Yes"
                onPress={() => void handleRespond(activeMatch.id, "yes")}
                isUpdating={updatingMatchId === activeMatch.id}
              />
              <ActionButton
                icon="help"
                color={t.colors.warningAccent}
                bgColor={t.colors.warningContainer}
                label="Maybe"
                onPress={() => void handleRespond(activeMatch.id, "maybe")}
                isUpdating={updatingMatchId === activeMatch.id}
              />
              <ActionButton
                icon="close"
                color={t.colors.errorAccent}
                bgColor={t.colors.errorContainer}
                label="No"
                onPress={() => void handleRespond(activeMatch.id, "no")}
                isUpdating={updatingMatchId === activeMatch.id}
              />
            </View>
          ) : null}
        </>
      )}

      {/* History modal */}
      <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} pastMatches={pastMatches} playerId={session.playerId} scoreLookup={scoreLookup} loadingScores={loadingScores} />

      {/* Detail modal */}
      {selectedMatch ? (
        (() => {
          const liveMatch = matches.find((m) => m.id === selectedMatch.id) ?? selectedMatch;
          return (
            <MatchDetailModal
              match={liveMatch}
              currentPlayerId={session.playerId}
              currentStatus={getPlayerAttendanceStatus(liveMatch, session.playerId)}
              isUpdating={updatingMatchId === selectedMatch.id}
              onYes={() => void handleRespond(selectedMatch.id, "yes")}
              onNo={() => void handleRespond(selectedMatch.id, "no")}
              onMaybe={() => void handleRespond(selectedMatch.id, "maybe")}
              onClose={() => setSelectedMatch(null)}
            />
          );
        })()
      ) : null}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  headerTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
  },
  answeredPill: {
    alignItems: "center",
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  answeredText: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.caption,
  },
  iconButton: {
    borderRadius: t.radius.pill,
    padding: t.spacing.sm,
  },
  errorWrap: {
    flex: 1,
    padding: t.spacing.lg,
  },
  actionErrorWrap: {
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
  },
  deckContainer: {},
  page: {
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: t.spacing.md,
    width: SCREEN_WIDTH,
  },
  card: {
    backgroundColor: t.colors.surfaceAlt,
    borderColor: t.colors.outline,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
    justifyContent: "space-between",
    padding: t.spacing.xl,
  },
  countdownPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    gap: t.spacing.xs,
    marginBottom: t.spacing.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  countdownText: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.caption,
  },
  cardTitle: {
    color: t.colors.onSurface,
    ...t.typography.hero,
    marginBottom: t.spacing.lg,
  },
  cardMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  cardMetaText: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.body,
  },
  squadSection: {
    marginBottom: t.spacing.xl,
    marginTop: "auto",
  },
  squadLabel: {
    color: t.colors.onSurfaceDim,
    marginBottom: t.spacing.sm,
    ...t.typography.label,
  },
  squadBar: {
    borderRadius: t.radius.pill,
    flexDirection: "row",
    height: 6,
    marginBottom: t.spacing.md,
    overflow: "hidden",
  },
  squadSegment: {
    height: "100%",
  },
  squadCounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  squadCountItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  squadCountDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  squadCountLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
  },
  squadCountValue: {
    ...t.typography.caption,
    fontWeight: "700",
  },
  statusSection: {
    alignItems: "center",
  },
  statusLabel: {
    color: t.colors.onSurfaceDim,
    marginBottom: t.spacing.sm,
    ...t.typography.label,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    flexDirection: "row",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  statusText: {
    ...t.typography.body,
    fontWeight: "700",
  },
  dotsContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    justifyContent: "center",
    marginVertical: t.spacing.md,
  },
  dot: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: t.colors.primary,
    borderRadius: 3,
    width: 20,
  },
  actionsContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.xl,
    justifyContent: "center",
    paddingBottom: t.spacing.xxl,
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.md,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 40,
    gap: t.spacing.xs,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  actionLabel: {
    ...t.typography.caption,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: t.spacing.xxl,
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
  historyHeader: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  historyTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
  },
  historyContent: {
    paddingBottom: t.spacing.xxl,
  },
  pastRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  pastRowText: {
    flex: 1,
  },
  pastRowName: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  pastRowDate: {
    color: t.colors.onSurfaceDim,
    fontSize: 12,
    marginTop: 2,
  },
  pastScoreWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    flexShrink: 0,
  },
  pastResultBadge: {
    borderRadius: 6,
    height: 22,
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pastResultText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.02,
  },
  pastScoreText: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.02,
  },
  skeletonCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: t.colors.surfaceElevated,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: t.colors.surfaceElevated,
  },
});
