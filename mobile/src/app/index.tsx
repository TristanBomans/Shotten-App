import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { fetchPlayers } from "../lib/api";
import type { Player } from "../lib/types";
import { getPlayerSession, setPlayerSession } from "../state/player-session";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PlayerListItem } from "../components/PlayerListItem";
import { androidDarkTheme } from "../theme/androidDark";

export default function PlayerSelectScreen() {
  const router = useRouter();
  const isPreviewBuild = Constants.expoConfig?.extra?.appVariant === "preview";
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
      setError(loadError instanceof Error ? loadError.message : "Could not load players.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const existingSession = await getPlayerSession();
      if (existingSession) {
        router.replace("/home");
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

    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={require("../../assets/icon.png")} style={styles.logo} />
              {isPreviewBuild ? (
                <View style={styles.logoPreviewBadge}>
                  <Text style={styles.logoPreviewBadgeText}>Preview</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.title}>Welcome to Shotten</Text>
              <Text style={styles.subtitle}>Select your player to manage attendance.</Text>
            </View>
          </View>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchQuery}
          placeholder="Search player..."
          placeholderTextColor={androidDarkTheme.colors.onSurfaceMuted}
          selectionColor={androidDarkTheme.colors.primary}
          style={styles.searchInput}
          value={searchQuery}
        />

        {loading ? <LoadingState message="Loading players..." /> : null}

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
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  logoWrap: {
    alignSelf: "flex-start",
    position: "relative"
  },
  logo: {
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    height: 56,
    width: 56
  },
  logoPreviewBadge: {
    alignSelf: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.primary,
    borderRadius: androidDarkTheme.radius.pill,
    borderWidth: 1,
    bottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 1,
    position: "absolute"
  },
  logoPreviewBadgeText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  heroText: {
    flex: 1
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
