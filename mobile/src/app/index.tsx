import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchPlayers } from "../lib/api";
import type { Player } from "../lib/types";
import { getPlayerSession, setPlayerSession } from "../state/player-session";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PlayerListItem } from "../components/PlayerListItem";
import { androidDarkTheme } from "../theme/androidDark";

export default function PlayerSelectScreen() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchPlayers();
      setPlayers(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kon spelers niet laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const existingSession = await getPlayerSession();
      if (existingSession) {
        router.replace("/matches");
        return;
      }

      await loadPlayers();
    }

    void bootstrap();
  }, [loadPlayers, router]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return players;
    }

    return players.filter((player) => player.name.toLowerCase().includes(normalizedQuery));
  }, [players, searchQuery]);

  const handlePlayerPress = async (player: Player) => {
    await setPlayerSession({
      playerId: player.id,
      playerName: player.name
    });

    router.replace("/matches");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Welkom bij Shotten</Text>
          <Text style={styles.subtitle}>Selecteer je speler om attendance te beheren.</Text>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Zoek speler..."
          placeholderTextColor={androidDarkTheme.colors.onSurfaceMuted}
          selectionColor={androidDarkTheme.colors.primary}
          style={styles.searchInput}
          value={searchQuery}
        />

        {loading ? <LoadingState message="Spelers laden..." /> : null}

        {!loading && error ? <ErrorState message={error} onRetry={() => void loadPlayers()} /> : null}

        {!loading && !error ? (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={filteredPlayers}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <PlayerListItem player={item} onPress={() => void handlePlayerPress(item)} />}
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
  hero: {
    marginBottom: 16
  },
  title: {
    color: androidDarkTheme.colors.onBackground,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  subtitle: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
    marginTop: 6
  },
  searchInput: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.md,
    borderWidth: 1,
    color: androidDarkTheme.colors.onSurface,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  listContent: {
    paddingBottom: 24
  }
});
