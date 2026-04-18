import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
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
  withPlayerAttendance,
  formatMatchDate,
  resolveAttendanceState,
} from "../../lib/matches";
import type { AttendanceStatus, Match } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { MatchCard } from "../../components/MatchCard";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;

export default function HomeScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

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

  const handleRespond = async (matchId: number, response: "yes" | "no") => {
    const nextStatus: AttendanceStatus = response === "yes" ? "Present" : "NotPresent";
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

  const heroMatch = useMemo(() => getHeroMatch(matches), [matches]);
  const upcomingMatches = useMemo(() => getRemainingUpcoming(matches), [matches]);
  const pastMatches = useMemo(() => filterPastMatches(matches), [matches]);

  const renderMatchCard = (match: Match, variant: "default" | "hero" = "default") => {
    const currentStatus = getPlayerAttendanceStatus(match, session.playerId);
    return (
      <MatchCard
        key={match.id}
        match={match}
        currentStatus={currentStatus}
        isUpdating={updatingMatchId === match.id}
        onYes={() => void handleRespond(match.id, "yes")}
        onNo={() => void handleRespond(match.id, "no")}
        variant={variant}
        currentPlayerId={session.playerId}
      />
    );
  };

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
            progressBackgroundColor={t.colors.surfaceRaised}
          />
        }
      >
        <View style={[styles.contentWrap, refreshing && styles.contentWrapRefreshing]}>
          {actionError ? (
            <View style={styles.actionErrorWrap}>
              <ErrorState message={actionError} />
            </View>
          ) : null}

          {/* Hero match */}
          {heroMatch ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Next match</Text>
              </View>
              {renderMatchCard(heroMatch, "hero")}
            </View>
          ) : null}

          {/* Upcoming */}
          {upcomingMatches.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                <Text style={styles.sectionCount}>{upcomingMatches.length}</Text>
              </View>
              {upcomingMatches.map((m) => renderMatchCard(m))}
            </View>
          ) : null}

          {/* Past matches — collapsible */}
          {pastMatches.length > 0 ? (
            <View style={styles.section}>
              <Pressable
                onPress={() => setShowPast(!showPast)}
                style={styles.sectionHeaderPressable}
                android_ripple={{ color: t.colors.ripple, borderless: false }}
              >
                <Text style={styles.sectionTitle}>Past matches</Text>
                <View style={styles.pastToggle}>
                  <Text style={styles.sectionCount}>{pastMatches.length}</Text>
                  <MaterialCommunityIcons
                    name={showPast ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={t.colors.onSurfaceDim}
                  />
                </View>
              </Pressable>
              {showPast ? (
                <View style={styles.pastList}>
                  {pastMatches.slice(0, 10).map((m) => (
                    <PastMatchRow key={m.id} match={m} playerId={session.playerId} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Empty state */}
          {!heroMatch && upcomingMatches.length === 0 && pastMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="soccer" size={40} color={t.colors.onSurfaceDim} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySubtitle}>
                New matches will appear here when they're available.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Compact past match row — not a full card */
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxl,
  },
  contentWrap: {
    opacity: 1,
  },
  contentWrapRefreshing: {
    opacity: 0.5,
  },
  errorWrap: {
    padding: t.spacing.lg,
  },
  actionErrorWrap: {
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.sm,
  },
  section: {
    paddingHorizontal: t.spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
    marginTop: t.spacing.xl,
  },
  sectionDot: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.pill,
    height: 8,
    width: 8,
  },
  sectionTitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
    flex: 1,
  },
  sectionCount: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
  },
  sectionHeaderPressable: {
    alignItems: "center",
    borderRadius: t.radius.sm,
    flexDirection: "row",
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.xl,
    overflow: "hidden",
    paddingVertical: t.spacing.xs,
  },
  pastToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  pastList: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
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
  emptyState: {
    alignItems: "center",
    marginHorizontal: t.spacing.lg,
    marginTop: t.spacing.xxxl,
    paddingVertical: t.spacing.xxxl,
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
});