import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchPlayers } from "../lib/api";
import type { Player } from "../lib/types";
import { getPlayerSession, setPlayerSession } from "../state/player-session";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

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

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === filteredPlayers.length - 1;

    return (
      <Pressable
        android_ripple={{ color: t.colors.ripple, borderless: false }}
        onPress={() => void handlePlayerPress(item)}
        style={({ pressed }) => [
          styles.playerRow,
          isFirst && styles.playerRowFirst,
          isLast && styles.playerRowLast,
          !isLast && styles.playerRowDivider,
          pressed && styles.playerRowPressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.playerName}>{item.name}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={t.colors.onSurfaceDim} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Brand hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} />
            {isPreviewBuild ? (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>Preview</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>Shotten</Text>
          <Text style={styles.subtitle}>Who are you?</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={t.colors.onSurfaceDim}
            style={styles.searchIcon}
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            placeholder="Search players..."
            placeholderTextColor={t.colors.onSurfaceDim}
            selectionColor={t.colors.primary}
            style={styles.searchInput}
            value={searchQuery}
          />
        </View>

        {loading ? <LoadingState message="Loading players..." /> : null}

        {!loading && error ? <ErrorState message={error} onRetry={() => void loadPlayers()} /> : null}

        {!loading && !error ? (
          <View style={styles.listWrapper}>
            <FlatList
              contentContainerStyle={styles.listContent}
              data={filteredPlayers}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={renderPlayer}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginBottom: t.spacing.xxl,
    paddingTop: t.spacing.xxxl,
  },
  logoContainer: {
    position: "relative",
    marginBottom: t.spacing.lg,
  },
  logo: {
    borderRadius: t.radius.xl,
    height: 80,
    width: 80,
  },
  previewBadge: {
    alignSelf: "center",
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.pill,
    bottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
  },
  previewBadgeText: {
    color: t.colors.onPrimary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: t.colors.onBackground,
    ...t.typography.hero,
  },
  subtitle: {
    color: t.colors.onSurfaceMuted,
    fontSize: 15,
    marginTop: t.spacing.xs,
  },

  // Search
  searchContainer: {
    alignItems: "center",
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.md,
    flexDirection: "row",
    marginBottom: t.spacing.lg,
    paddingHorizontal: t.spacing.md,
  },
  searchIcon: {
    marginRight: t.spacing.sm,
  },
  searchInput: {
    color: t.colors.onSurface,
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },

  // Player list — grouped, no individual card borders
  listWrapper: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    flex: 1,
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: t.spacing.sm,
  },
  playerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.md,
    minHeight: t.touch.minHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  playerRowFirst: {
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
  },
  playerRowLast: {
    borderBottomLeftRadius: t.radius.lg,
    borderBottomRightRadius: t.radius.lg,
  },
  playerRowDivider: {
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
  },
  playerRowPressed: {
    backgroundColor: t.colors.surfaceAlt,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: t.colors.primaryMuted,
    borderRadius: t.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: t.colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  playerName: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
});
