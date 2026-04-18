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
import { fetchMatches, updateAttendance } from "../../lib/api";
import {
  filterPastMatches,
  getHeroMatch,
  getPlayerAttendanceStatus,
  getRemainingUpcoming,
  withPlayerAttendance,
} from "../../lib/matches";
import type { AttendanceStatus, Match } from "../../lib/types";
import { useSession } from "../../state/session-context";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { MatchCard } from "../../components/MatchCard";
import { androidDarkTheme } from "../../theme/androidDark";

export default function HomeScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

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
        <LoadingState message="Loading upcoming matches..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ErrorState message={error} onRetry={() => void loadMatches(session.playerId)} />
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
            onRefresh={handleRefresh}
            tintColor={androidDarkTheme.colors.primary}
            colors={[androidDarkTheme.colors.primary]}
            progressBackgroundColor={androidDarkTheme.colors.surfaceRaised}
          />
        }
      >
        <View style={[styles.contentWrap, refreshing && styles.contentWrapRefreshing]}>
          {actionError ? <View style={styles.errorWrap}><ErrorState message={actionError} /></View> : null}

          {heroMatch ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next match</Text>
              {renderMatchCard(heroMatch, "hero")}
            </View>
          ) : null}

          {upcomingMatches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming matches</Text>
              {upcomingMatches.map((m) => renderMatchCard(m))}
            </View>
          ) : null}

          {pastMatches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past matches</Text>
              <View style={styles.pastOverlay}>
                {pastMatches.slice(0, 5).map((m) => renderMatchCard(m))}
              </View>
            </View>
          ) : null}

          {!heroMatch && upcomingMatches.length === 0 && pastMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No upcoming matches</Text>
              <Text style={styles.emptySubtitle}>As soon as new matches are available, you will see them here.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  contentWrap: {
    opacity: 1,
  },
  contentWrapRefreshing: {
    opacity: 0.5,
  },
  errorWrap: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 16,
  },
  pastOverlay: {
    opacity: 0.6,
  },
  sectionTitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
    textTransform: "uppercase",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
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
});