import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fetchMatches, fetchPlayers, updateAttendance } from "../lib/api";
import { formatMatchDate, resolveAttendanceState } from "../lib/matches";
import type { AttendanceStatus, Match, Player } from "../lib/types";
import { ResponseButtons } from "../components/ResponseButtons";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;
type Step = "player" | "matches";

export default function RespondAsPlayerScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("player");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  useEffect(() => {
    fetchPlayers()
      .then(setPlayers)
      .finally(() => setLoadingPlayers(false));
  }, []);

  const handleSelectPlayer = async (player: Player) => {
    setSelectedPlayer(player);
    setStep("matches");
    setLoadingMatches(true);
    try {
      const data = await fetchMatches(player.id);
      // Only upcoming
      const now = Date.now() - 2 * 60 * 60 * 1000;
      const upcoming = data.filter((m) => new Date(m.date).getTime() > now);
      setMatches(upcoming);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleRespond = async (matchId: number, status: AttendanceStatus) => {
    if (!selectedPlayer) return;
    setUpdatingMatchId(matchId);
    try {
      await updateAttendance(matchId, selectedPlayer.id, status);
      // Optimistic update
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== matchId) return m;
          const updated = m.attendances ? [...m.attendances] : [];
          const idx = updated.findIndex((a) => a.playerId === selectedPlayer.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], status };
          } else {
            updated.push({ matchId, playerId: selectedPlayer.id, player: selectedPlayer, status });
          }
          return { ...m, attendances: updated };
        }),
      );
    } catch {
      // silent
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const getPlayerStatus = (match: Match): AttendanceStatus | null => {
    if (!selectedPlayer) return null;
    const att = match.attendances?.find((a) => a.playerId === selectedPlayer.id);
    return att?.status ?? null;
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <Pressable
      android_ripple={{ color: t.colors.ripple, borderless: false }}
      onPress={() => void handleSelectPlayer(item)}
      style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
    >
      <View style={styles.playerAvatar}>
        <Text style={styles.playerAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.playerName}>{item.name}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={t.colors.onSurfaceDim} />
    </Pressable>
  );

  const renderMatch = ({ item }: { item: Match }) => {
    const status = getPlayerStatus(item);
    return (
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.matchInfo}>
            <Text style={styles.matchName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.matchMeta}>
              <MaterialCommunityIcons name="calendar" size={12} color={t.colors.onSurfaceDim} />
              <Text style={styles.matchDate}>{formatMatchDate(item.date)}</Text>
            </View>
            {item.location ? (
              <View style={styles.matchMeta}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color={t.colors.onSurfaceDim} />
                <Text style={styles.matchDate}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <ResponseButtons
          currentState={resolveAttendanceState(status)}
          isUpdating={updatingMatchId === item.id}
          onYes={() => void handleRespond(item.id, "Present")}
          onMaybe={() => void handleRespond(item.id, "Maybe")}
          onNo={() => void handleRespond(item.id, "NotPresent")}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {step === "player" ? (
        <>
          {loadingPlayers ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={t.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={players}
              keyExtractor={(p) => String(p.id)}
              renderItem={renderPlayer}
              contentContainerStyle={styles.playerList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          )}
        </>
      ) : (
        <>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => { setStep("player"); setSelectedPlayer(null); setMatches([]); }}
            style={styles.backChip}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={t.colors.primary} />
            <Text style={styles.backChipText}>{selectedPlayer?.name}</Text>
          </Pressable>
          {loadingMatches ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={t.colors.primary} />
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="soccer" size={40} color={t.colors.onSurfaceDim} />
              <Text style={styles.emptyTitle}>No upcoming matches</Text>
              <Text style={styles.emptySubtext}>This player has no matches to respond to</Text>
            </View>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(m) => String(m.id)}
              renderItem={renderMatch}
              contentContainerStyle={styles.matchList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },
  loaderWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
  playerList: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.sm },
  playerRow: { alignItems: "center", flexDirection: "row", gap: t.spacing.md, minHeight: t.touch.minHeight, paddingVertical: t.spacing.md },
  playerRowPressed: { opacity: 0.7 },
  playerAvatar: { alignItems: "center", backgroundColor: t.colors.primaryMuted, borderRadius: t.radius.pill, height: 40, justifyContent: "center", width: 40 },
  playerAvatarText: { color: t.colors.primary, fontSize: 16, fontWeight: "700" },
  playerName: { color: t.colors.onSurface, flex: 1, fontSize: 16, fontWeight: "600" },
  divider: { backgroundColor: t.colors.divider, height: 1 },
  backChip: { alignItems: "center", flexDirection: "row", gap: t.spacing.xs, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md },
  backChipText: { color: t.colors.primary, fontSize: 16, fontWeight: "600" },
  matchList: { paddingBottom: t.spacing.xxl, paddingHorizontal: t.spacing.lg },
  matchCard: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, marginBottom: t.spacing.md, padding: t.spacing.lg },
  matchHeader: { flexDirection: "row", alignItems: "flex-start" },
  matchInfo: { flex: 1 },
  matchName: { color: t.colors.onSurface, ...t.typography.subtitle },
  matchMeta: { alignItems: "center", flexDirection: "row", gap: t.spacing.xs, marginTop: t.spacing.xs },
  matchDate: { color: t.colors.onSurfaceDim, fontSize: 13 },
  emptyState: { alignItems: "center", flex: 1, gap: t.spacing.sm, justifyContent: "center" },
  emptyTitle: { color: t.colors.onSurface, ...t.typography.subtitle },
  emptySubtext: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall },
});
