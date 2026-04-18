import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { fetchMatches, updateAttendance } from "../../lib/api";
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
import type { AttendanceStatus, Match } from "../../lib/types";
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

function HistoryModal({
  visible,
  onClose,
  pastMatches,
  playerId,
}: {
  visible: boolean;
  onClose: () => void;
  pastMatches: Match[];
  playerId: number;
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
          ) : (
            pastMatches.map((match) => <PastMatchRow key={match.id} match={match} playerId={playerId} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PastMatchRow({ match, playerId }: { match: Match; playerId: number }) {
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

  return (
    <View style={styles.pastRow}>
      <MaterialCommunityIcons name={stateIcon as any} size={18} color={stateColor} />
      <View style={styles.pastRowText}>
        <Text style={styles.pastRowName} numberOfLines={1}>
          {match.name}
        </Text>
        <Text style={styles.pastRowDate}>{formatMatchDate(match.date)}</Text>
      </View>
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
      <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} pastMatches={pastMatches} playerId={session.playerId} />

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
});
