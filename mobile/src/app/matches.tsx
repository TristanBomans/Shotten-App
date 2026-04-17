import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchMatches, updateAttendance } from "../lib/api";
import { filterUpcomingMatches, getPlayerAttendanceStatus, withPlayerAttendance } from "../lib/matches";
import type { Match } from "../lib/types";
import { clearPlayerSession, getPlayerSession, type PlayerSession } from "../state/player-session";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MatchCard } from "../components/MatchCard";
import { androidDarkTheme } from "../theme/androidDark";

export default function MatchesScreen() {
  const router = useRouter();
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  const loadMatchesForPlayer = useCallback(async (playerId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchMatches(playerId);
      setMatches(filterUpcomingMatches(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kon matches niet laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const existingSession = await getPlayerSession();

      if (!existingSession) {
        router.replace("/");
        return;
      }

      if (!cancelled) {
        setSession(existingSession);
      }

      await loadMatchesForPlayer(existingSession.playerId);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadMatchesForPlayer, router]);

  const handleLogout = async () => {
    await clearPlayerSession();
    router.replace("/");
  };

  const handleRespond = async (matchId: number, response: "yes" | "no") => {
    if (!session) {
      return;
    }

    const nextStatus = response === "yes" ? "Present" : "NotPresent";
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
      setActionError(updateError instanceof Error ? updateError.message : "Kon attendance niet opslaan.");
    } finally {
      setUpdatingMatchId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Hi {session?.playerName ?? "speler"}</Text>
            <Text style={styles.subtitle}>Upcoming matches en je aanwezigheid.</Text>
          </View>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => void handleLogout()}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          >
            <Text style={styles.logoutText}>Wissel speler</Text>
          </Pressable>
        </View>

        {loading ? <LoadingState message="Upcoming matches laden..." /> : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={() => (session ? void loadMatchesForPlayer(session.playerId) : undefined)} />
        ) : null}

        {!loading && actionError ? <ErrorState message={actionError} /> : null}

        {!loading && !error ? (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={matches}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Geen upcoming matches</Text>
                <Text style={styles.emptySubtitle}>Zodra er nieuwe wedstrijden zijn, zie je ze hier.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const currentStatus = session ? getPlayerAttendanceStatus(item, session.playerId) : null;
              return (
                <MatchCard
                  match={item}
                  currentStatus={currentStatus}
                  isUpdating={updatingMatchId === item.id}
                  onYes={() => void handleRespond(item.id, "yes")}
                  onNo={() => void handleRespond(item.id, "no")}
                />
              );
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  title: {
    color: androidDarkTheme.colors.onBackground,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 4
  },
  logoutButton: {
    backgroundColor: androidDarkTheme.colors.surfaceRaised,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.pill,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  logoutButtonPressed: {
    backgroundColor: "#2f3643"
  },
  logoutText: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 12,
    fontWeight: "700"
  },
  listContent: {
    paddingBottom: 28
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 18
  },
  emptyTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: "700"
  },
  emptySubtitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center"
  }
});
