import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchScraperTeams, fetchScraperPlayers } from "../../lib/api";
import type { ScraperTeam, ScraperPlayer } from "../../lib/types";
import { usePreferences } from "../../state/preferences-context";
import { TeamDetailModal } from "../../components/TeamDetailModal";
import { PlayerStatsModal } from "../../components/PlayerStatsModal";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;
const { width: SCREEN_W } = Dimensions.get("window");

// Teams that belong to "us" — highlighted across the app
const OUR_TEAM_KEYWORDS = ["hattrick", "shotten", "wille", "degrade"];
function isOurTeam(name: string): boolean {
  const n = name.toLowerCase();
  return OUR_TEAM_KEYWORDS.some((k) => n.includes(k));
}

type LeagueTab = "standings" | "players";

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function LeagueScreen() {
  const { preferences } = usePreferences();
  const [teams, setTeams] = useState<ScraperTeam[]>([]);
  const [allPlayers, setAllPlayers] = useState<ScraperPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeagueTab>("standings");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ScraperTeam | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ScraperPlayer | null>(null);
  const [visiblePlayers, setVisiblePlayers] = useState(50);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const pickerPanY = useRef(new Animated.Value(0)).current;

  const pickerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 2,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pickerPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.timing(pickerPanY, {
            toValue: SCREEN_W,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            pickerPanY.setValue(0);
            setLeaguePickerOpen(false);
          });
        } else {
          Animated.spring(pickerPanY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (leaguePickerOpen) {
      pickerPanY.setValue(0);
    }
  }, [leaguePickerOpen]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [teamsData, playersData] = await Promise.all([
        fetchScraperTeams(),
        fetchScraperPlayers(),
      ]);
      setTeams(teamsData);
      setAllPlayers(playersData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load league data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const leagues = useMemo(() => {
    return Array.from(new Set(teams.map((tTeam) => tTeam.leagueName).filter(Boolean))).sort() as string[];
  }, [teams]);

  useEffect(() => {
    if (leagues.length > 0 && !selectedLeague) {
      if (preferences.defaultLeague && leagues.includes(preferences.defaultLeague)) {
        setSelectedLeague(preferences.defaultLeague);
      } else {
        const mechelen = leagues.find((l) => l.toLowerCase().includes("mechelen"));
        setSelectedLeague(mechelen ?? leagues[0] ?? "");
      }
    }
  }, [leagues, selectedLeague, preferences.defaultLeague]);

  useEffect(() => { setVisiblePlayers(50); }, [activeTab, selectedLeague]);

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: activeTab === "standings" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [activeTab]);

  const filteredTeams = useMemo(() => {
    if (!selectedLeague) return [];
    return teams
      .filter((tTeam) => tTeam.leagueName === selectedLeague)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }, [teams, selectedLeague]);

  const validTeamIds = useMemo(
    () => new Set(filteredTeams.map((tTeam) => tTeam.externalId)),
    [filteredTeams]
  );

  const filteredPlayers = useMemo(() => {
    if (!selectedLeague) return [];
    return allPlayers
      .filter((p) => {
        if (p.teamIds && p.teamIds.length > 0) {
          return p.teamIds.some((tid) => validTeamIds.has(tid));
        }
        return validTeamIds.has(p.teamId);
      })
      .sort((a, b) => b.goals - a.goals);
  }, [allPlayers, validTeamIds, selectedLeague]);

  const shownPlayers = filteredPlayers.slice(0, visiblePlayers);
  const hasMorePlayers = visiblePlayers < filteredPlayers.length;

  // League summary stats
  const leagueStats = useMemo(() => {
    if (!filteredTeams.length) return null;
    const totalMatches = filteredTeams.reduce((s, t) => s + (t.matchesPlayed ?? 0), 0);
    const totalGoals = filteredTeams.reduce((s, t) => s + (t.goalsFor ?? 0), 0);
    return { teamCount: filteredTeams.length, totalMatches, totalGoals };
  }, [filteredTeams]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={t.colors.onSurfaceDim} />
          <Text style={styles.errorTitle}>Could not load league data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => void loadData()}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.headerLeague} numberOfLines={1}>{selectedLeague}</Text>
            {leagueStats && (
              <Text style={styles.headerMeta}>
                {leagueStats.teamCount} teams · {leagueStats.totalMatches} matches · {leagueStats.totalGoals} goals
              </Text>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLeaguePickerOpen(true)}
            style={styles.leaguePickerBtn}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={t.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("standings")}
            style={[styles.tabBtn, activeTab === "standings" && styles.tabBtnActive]}
          >
            <MaterialCommunityIcons
              name="format-list-numbered"
              size={16}
              color={activeTab === "standings" ? t.colors.onPrimary : t.colors.onSurfaceMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === "standings" && styles.tabBtnTextActive]}>
              Standings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("players")}
            style={[styles.tabBtn, activeTab === "players" && styles.tabBtnActive]}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={16}
              color={activeTab === "players" ? t.colors.onPrimary : t.colors.onSurfaceMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === "players" && styles.tabBtnTextActive]}>
              Top Scorers
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={t.colors.primary}
          />
        }
      >
        {activeTab === "standings" ? (
          <StandingsView teams={filteredTeams} onTeamPress={setSelectedTeam} />
        ) : (
          <PlayersView
            players={shownPlayers}
            teams={teams}
            hasMore={hasMorePlayers}
            onLoadMore={() => setVisiblePlayers((p) => p + 50)}
            onPlayerPress={setSelectedPlayer}
          />
        )}
      </ScrollView>

      {/* ── League Picker Modal ── */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={leaguePickerOpen}
        onRequestClose={() => setLeaguePickerOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
        <SafeAreaView style={styles.pickerSafeArea} edges={["top", "bottom"]}>
          <Animated.View style={{ flex: 1, transform: [{ translateY: pickerPanY }] }}>
            {/* Handle — swipeable */}
            <View style={styles.pickerHandleBar} {...pickerPanResponder.panHandlers}>
              <View style={styles.pickerHandle} />
            </View>
            <View style={styles.pickerToolbar}>
            <Text style={styles.pickerTitle}>Select League</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setLeaguePickerOpen(false)}
              style={styles.pickerCloseBtn}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            {leagues.map((league) => {
              const teamCount = teams.filter((tTeam) => tTeam.leagueName === league).length;
              const isSelected = league === selectedLeague;
              return (
                <TouchableOpacity
                  key={league}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedLeague(league);
                    setLeaguePickerOpen(false);
                  }}
                  style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameActive]}>{league}</Text>
                    <Text style={styles.pickerItemSubtext}>{teamCount} {teamCount === 1 ? "team" : "teams"}</Text>
                  </View>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check" size={20} color={t.colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </Modal>

      <TeamDetailModal
        team={selectedTeam}
        visible={selectedTeam !== null}
        onClose={() => setSelectedTeam(null)}
      />

      <PlayerStatsModal
        player={selectedPlayer}
        teams={teams}
        visible={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// STANDINGS VIEW
// =============================================================================

function StandingsView({ teams, onTeamPress }: { teams: ScraperTeam[]; onTeamPress: (team: ScraperTeam) => void }) {
  if (teams.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="trophy-outline" size={48} color={t.colors.onSurfaceDim} />
        <Text style={styles.emptyStateText}>No teams found</Text>
      </View>
    );
  }

  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);

  return (
    <View style={styles.standingsContainer}>
      {/* Podium */}
      {top3.length > 0 && (
        <View style={styles.podiumSection}>
          <Text style={styles.sectionTitle}>Top Teams</Text>
          <View style={styles.podiumRow}>
            {top3[1] && <PodiumCard team={top3[1]} rank={2} onPress={onTeamPress} />}
            {top3[0] && <PodiumCard team={top3[0]} rank={1} onPress={onTeamPress} highlight />}
            {top3[2] && <PodiumCard team={top3[2]} rank={3} onPress={onTeamPress} />}
          </View>
        </View>
      )}

      {/* Rest of table */}
      {rest.length > 0 && (
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>Standings</Text>
          {rest.map((team, i) => (
            <TeamCard key={team.externalId} team={team} index={i + 4} onPress={onTeamPress} />
          ))}
        </View>
      )}
    </View>
  );
}

function PodiumCard({ team, rank, onPress, highlight }: { team: ScraperTeam; rank: number; onPress: (t: ScraperTeam) => void; highlight?: boolean }) {
  const rankColors: Record<number, string> = {
    1: "#f7cb61", // gold
    2: "#c9cdd2", // silver
    3: "#cd7f32", // bronze
  };
  const rankColor = rankColors[rank] ?? t.colors.onSurfaceDim;
  const gd = team.goalDifference ?? 0;
  const ours = isOurTeam(team.name);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(team)}
      style={[styles.podiumCard, highlight && styles.podiumCardHighlight, ours && styles.podiumCardOurs]}
    >
      <View style={[styles.podiumRankBadge, { backgroundColor: `${rankColor}20`, borderColor: `${rankColor}40` }]}>
        <Text style={[styles.podiumRankText, { color: rankColor }]}>{rank}</Text>
      </View>
      <View style={styles.podiumAvatar}>
        <Text style={styles.podiumAvatarText}>{team.name.charAt(0)}</Text>
      </View>
      <Text style={[styles.podiumTeamName, highlight && styles.podiumTeamNameHighlight]} numberOfLines={2}>
        {team.name}
      </Text>
      <Text style={styles.podiumPoints}>{team.points ?? 0} pts</Text>
      <Text style={styles.podiumMeta}>{team.matchesPlayed ?? 0}M · {gd > 0 ? `+${gd}` : gd} GD</Text>
      {/* Form dots */}
      {team.form && team.form.length > 0 && (
        <View style={styles.podiumForm}>
          {team.form.slice(0, 5).map((result, i) => (
            <FormDot key={i} result={result} size={6} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function TeamCard({ team, index, onPress }: { team: ScraperTeam; index: number; onPress: (t: ScraperTeam) => void }) {
  const gd = team.goalDifference ?? 0;
  const gdText = gd > 0 ? `+${gd}` : String(gd);
  const isRelegation = index > 12; // assume 14-team league
  const isPromotion = index <= 3;
  const ours = isOurTeam(team.name);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(team)}
      style={[styles.teamCard, ours && styles.teamCardOurs]}
    >
      {/* Left: rank + avatar */}
      <View style={styles.teamCardLeft}>
        <View style={[styles.teamCardRank, isPromotion && styles.teamCardRankPromo, isRelegation && styles.teamCardRankReleg]}>
          <Text style={[styles.teamCardRankText, isPromotion && styles.teamCardRankTextPromo, isRelegation && styles.teamCardRankTextReleg]}>
            {index}
          </Text>
        </View>
        <View style={styles.teamCardAvatar}>
          <Text style={styles.teamCardAvatarText}>{team.name.charAt(0)}</Text>
        </View>
      </View>

      {/* Middle: name + form */}
      <View style={styles.teamCardMiddle}>
        <Text style={styles.teamCardName} numberOfLines={1}>
          {team.name}
          {ours && <Text style={styles.teamCardOursLabel}> (You)</Text>}
        </Text>
        {team.form && team.form.length > 0 ? (
          <View style={styles.teamCardFormRow}>
            {team.form.slice(0, 5).map((result, i) => (
              <FormDot key={i} result={result} size={5} />
            ))}
          </View>
        ) : (
          <Text style={styles.teamCardSub}>MP {team.matchesPlayed ?? 0}</Text>
        )}
      </View>

      {/* Right: stats */}
      <View style={styles.teamCardRight}>
        <Text style={styles.teamCardPts}>{team.points ?? 0}</Text>
        <Text style={[styles.teamCardGd, gd > 0 && styles.teamCardGdPos, gd < 0 && styles.teamCardGdNeg]}>
          {gdText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FormDot({ result, size }: { result: string; size: number }) {
  const colors: Record<string, string> = {
    W: t.colors.primary,
    D: t.colors.warningAccent,
    L: t.colors.errorAccent,
  };
  return (
    <View style={[styles.formDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[result] ?? t.colors.onSurfaceDim }]} />
  );
}

// =============================================================================
// PLAYERS VIEW
// =============================================================================

function PlayersView({
  players,
  teams,
  hasMore,
  onLoadMore,
  onPlayerPress,
}: {
  players: ScraperPlayer[];
  teams: ScraperTeam[];
  hasMore: boolean;
  onLoadMore: () => void;
  onPlayerPress: (p: ScraperPlayer) => void;
}) {
  if (players.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="account-outline" size={48} color={t.colors.onSurfaceDim} />
        <Text style={styles.emptyStateText}>No player data available</Text>
      </View>
    );
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <View style={styles.playersContainer}>
      {/* Top Scorers Podium */}
      {top3.length > 0 && (
        <View style={styles.podiumSection}>
          <Text style={styles.sectionTitle}>Top Scorers</Text>
          <View style={styles.podiumRow}>
            {top3[1] && <PlayerPodiumCard player={top3[1]} teams={teams} rank={2} onPress={onPlayerPress} />}
            {top3[0] && <PlayerPodiumCard player={top3[0]} teams={teams} rank={1} onPress={onPlayerPress} highlight />}
            {top3[2] && <PlayerPodiumCard player={top3[2]} teams={teams} rank={3} onPress={onPlayerPress} />}
          </View>
        </View>
      )}

      {/* Rest of players */}
      {rest.length > 0 && (
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>All Scorers</Text>
          {rest.map((player, index) => (
            <PlayerCard key={player.externalId} player={player} teams={teams} index={index + 4} onPress={onPlayerPress} />
          ))}
        </View>
      )}

      {hasMore && (
        <TouchableOpacity activeOpacity={0.7} onPress={onLoadMore} style={styles.showMoreBtn}>
          <Text style={styles.showMoreText}>Show more</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={t.colors.onSurfaceMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PlayerPodiumCard({
  player,
  teams,
  rank,
  onPress,
  highlight,
}: {
  player: ScraperPlayer;
  teams: ScraperTeam[];
  rank: number;
  onPress: (p: ScraperPlayer) => void;
  highlight?: boolean;
}) {
  const rankColors: Record<number, string> = { 1: "#f7cb61", 2: "#c9cdd2", 3: "#cd7f32" };
  const rankColor = rankColors[rank] ?? t.colors.onSurfaceDim;
  const playerTeamIds = player.teamIds ?? [player.teamId];
  const playerTeams = teams.filter((tm) => playerTeamIds.includes(tm.externalId));
  const primaryTeam = playerTeams[0];
  const ours = playerTeams.some((tm) => isOurTeam(tm.name));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(player)}
      style={[styles.playerPodiumCard, highlight && styles.playerPodiumCardHighlight, ours && styles.playerPodiumCardOurs]}
    >
      <View style={[styles.playerPodiumRankBadge, { backgroundColor: `${rankColor}20` }]}>
        <Text style={[styles.playerPodiumRankText, { color: rankColor }]}>{rank}</Text>
      </View>
      <View style={styles.playerPodiumAvatar}>
        <Text style={styles.playerPodiumAvatarText}>{getInitials(player.name)}</Text>
      </View>
      <Text style={[styles.playerPodiumName, highlight && styles.playerPodiumNameHighlight]} numberOfLines={2}>
        {player.name}
      </Text>
      <Text style={styles.playerPodiumGoals}>{player.goals} goals</Text>
      <Text style={styles.playerPodiumSub}>{player.gamesPlayed}g · {player.assists}a</Text>
      {primaryTeam && (
        <View style={styles.playerPodiumTeamChip}>
          <Text style={styles.playerPodiumTeamChipText} numberOfLines={1}>{primaryTeam.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function PlayerCard({
  player,
  teams,
  index,
  onPress,
}: {
  player: ScraperPlayer;
  teams: ScraperTeam[];
  index: number;
  onPress: (p: ScraperPlayer) => void;
}) {
  const playerTeamIds = player.teamIds ?? [player.teamId];
  const playerTeams = teams.filter((tm) => playerTeamIds.includes(tm.externalId));
  const primaryTeam = playerTeams[0];
  const isMultiTeam = playerTeams.length > 1;
  const ours = playerTeams.some((tm) => isOurTeam(tm.name));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(player)}
      style={[styles.playerCard, ours && styles.playerCardOurs]}
    >
      {/* Rank */}
      <Text style={styles.playerCardRank}>{index}</Text>

      {/* Avatar */}
      <View style={styles.playerCardAvatar}>
        <Text style={styles.playerCardAvatarText}>{getInitials(player.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.playerCardInfo}>
        <Text style={styles.playerCardName} numberOfLines={1}>
          {player.name}
          {ours && <Text style={styles.playerCardOursLabel}> (You)</Text>}
        </Text>
        <Text style={styles.playerCardTeam} numberOfLines={1}>
          {isMultiTeam ? `${playerTeams.length} teams` : primaryTeam?.name ?? "Unknown"}
          {" · "}{player.gamesPlayed} games
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.playerCardStats}>
        <View style={styles.playerCardStat}>
          <Text style={styles.playerCardStatValue}>{player.goals}</Text>
          <Text style={styles.playerCardStatLabel}>Goals</Text>
        </View>
        <View style={styles.playerCardStatDivider} />
        <View style={styles.playerCardStat}>
          <Text style={[styles.playerCardStatValue, { color: t.colors.warningAccent }]}>{player.assists}</Text>
          <Text style={styles.playerCardStatLabel}>Assts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.xxl,
  },
  errorTitle: { color: t.colors.onSurface, ...t.typography.subtitle, marginTop: t.spacing.md },
  errorSubtext: { color: t.colors.onSurfaceMuted, ...t.typography.bodySmall, textAlign: "center" },
  errorButton: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.pill,
    marginTop: t.spacing.md,
    paddingHorizontal: t.spacing.xxl,
    paddingVertical: t.spacing.md,
  },
  errorButtonText: { color: t.colors.onPrimary, fontWeight: "700", fontSize: 14 },

  // Header
  header: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md, paddingBottom: t.spacing.md },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: t.spacing.lg },
  headerText: { flex: 1, marginRight: t.spacing.md },
  headerLeague: { color: t.colors.onSurface, ...t.typography.hero },
  headerMeta: { color: t.colors.onSurfaceMuted, ...t.typography.bodySmall, marginTop: 2 },
  leaguePickerBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: t.radius.pill,
  },
  tabBtnActive: { backgroundColor: t.colors.primary },
  tabBtnText: { color: t.colors.onSurfaceMuted, fontSize: 13, fontWeight: "700" },
  tabBtnTextActive: { color: t.colors.onPrimary },

  // Scroll
  scrollContent: { paddingBottom: t.spacing.xxxl },

  // Sections
  standingsContainer: { paddingHorizontal: t.spacing.lg },
  playersContainer: { paddingHorizontal: t.spacing.lg },
  tableSection: { marginTop: t.spacing.xl },
  sectionTitle: { color: t.colors.onSurfaceMuted, ...t.typography.label, marginBottom: t.spacing.md, marginTop: t.spacing.lg },

  // Podium
  podiumSection: { marginTop: t.spacing.sm },
  podiumRow: { flexDirection: "row", gap: t.spacing.md, alignItems: "stretch", justifyContent: "center" },

  podiumCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.lg,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.outline,
    justifyContent: "space-between",
  },
  podiumCardHighlight: {
    backgroundColor: t.colors.surfaceAlt,
    borderColor: "#f7cb6160",
  },
  podiumRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: t.spacing.sm,
  },
  podiumRankText: { fontSize: 13, fontWeight: "800" },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  podiumAvatarText: { color: t.colors.onSurface, fontSize: 20, fontWeight: "800" },
  podiumTeamName: { color: t.colors.onSurface, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  podiumTeamNameHighlight: { fontSize: 14 },
  podiumPoints: { color: t.colors.primary, fontSize: 18, fontWeight: "800", marginTop: t.spacing.xs },
  podiumMeta: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "600", marginTop: 2 },
  podiumForm: { flexDirection: "row", gap: 4, marginTop: t.spacing.sm },
  podiumCardOurs: { borderColor: `${t.colors.primary}60`, backgroundColor: `${t.colors.primary}08` },

  // Form dot
  formDot: { marginHorizontal: 1 },

  // Team card
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  teamCardLeft: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  teamCardRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardRankPromo: { backgroundColor: `${t.colors.primary}25` },
  teamCardRankReleg: { backgroundColor: `${t.colors.errorAccent}20` },
  teamCardRankText: { color: t.colors.onSurfaceMuted, fontSize: 13, fontWeight: "700" },
  teamCardRankTextPromo: { color: t.colors.primary },
  teamCardRankTextReleg: { color: t.colors.errorAccent },
  teamCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardAvatarText: { color: t.colors.primary, fontSize: 16, fontWeight: "800" },
  teamCardMiddle: { flex: 1, marginHorizontal: t.spacing.md, minWidth: 0 },
  teamCardName: { color: t.colors.onSurface, fontSize: 15, fontWeight: "700" },
  teamCardFormRow: { flexDirection: "row", gap: 3, marginTop: 4 },
  teamCardSub: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 2 },
  teamCardRight: { alignItems: "flex-end", minWidth: 48 },
  teamCardPts: { color: t.colors.onSurface, fontSize: 18, fontWeight: "800" },
  teamCardGd: { color: t.colors.onSurfaceDim, fontSize: 12, fontWeight: "600", marginTop: 1 },
  teamCardGdPos: { color: t.colors.primary },
  teamCardGdNeg: { color: t.colors.errorAccent },
  teamCardOurs: { borderColor: `${t.colors.primary}60`, backgroundColor: `${t.colors.primary}08` },
  teamCardOursLabel: { color: t.colors.primary, fontSize: 12, fontWeight: "700" },

  // Player podium
  playerPodiumCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.lg,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.outline,
    justifyContent: "space-between",
  },
  playerPodiumCardHighlight: {
    backgroundColor: t.colors.surfaceAlt,
    borderColor: "#f7cb6160",
  },
  playerPodiumCardOurs: { borderColor: `${t.colors.primary}60`, backgroundColor: `${t.colors.primary}08` },
  playerPodiumRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  playerPodiumRankText: { fontSize: 13, fontWeight: "800" },
  playerPodiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  playerPodiumAvatarText: { color: t.colors.onSurface, fontSize: 16, fontWeight: "800" },
  playerPodiumName: { color: t.colors.onSurface, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18 },
  playerPodiumNameHighlight: { fontSize: 14 },
  playerPodiumGoals: { color: t.colors.primary, fontSize: 18, fontWeight: "800", marginTop: t.spacing.xs },
  playerPodiumSub: { color: t.colors.onSurfaceDim, fontSize: 11, fontWeight: "600", marginTop: 2 },
  playerPodiumTeamChip: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    marginTop: t.spacing.sm,
    maxWidth: "100%",
  },
  playerPodiumTeamChipText: { color: t.colors.onSurfaceMuted, fontSize: 10, fontWeight: "700" },

  // Player card
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.outline,
  },
  playerCardRank: {
    width: 28,
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  playerCardAvatar: {
    width: 42,
    height: 42,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: t.spacing.sm,
  },
  playerCardAvatarText: { color: t.colors.onSurface, fontSize: 14, fontWeight: "800" },
  playerCardInfo: { flex: 1, marginHorizontal: t.spacing.md, minWidth: 0 },
  playerCardName: { color: t.colors.onSurface, fontSize: 15, fontWeight: "700" },
  playerCardTeam: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 2 },
  playerCardStats: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  playerCardStat: { alignItems: "center", minWidth: 36 },
  playerCardStatValue: { color: t.colors.primary, fontSize: 18, fontWeight: "800" },
  playerCardStatLabel: { color: t.colors.onSurfaceDim, fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginTop: 1 },
  playerCardStatDivider: { width: 1, height: 24, backgroundColor: t.colors.divider },
  playerCardOurs: { borderColor: `${t.colors.primary}60`, backgroundColor: `${t.colors.primary}08` },
  playerCardOursLabel: { color: t.colors.primary, fontSize: 12, fontWeight: "700" },

  // Show more
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.md,
    marginTop: t.spacing.sm,
  },
  showMoreText: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: t.spacing.xxxl * 2, gap: t.spacing.md },
  emptyStateText: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall },

  // Picker
  pickerSafeArea: { backgroundColor: t.colors.background, flex: 1 },
  pickerHandleBar: { alignItems: "center", justifyContent: "center", backgroundColor: t.colors.surface, paddingVertical: t.spacing.md, minHeight: 44 },
  pickerHandle: { backgroundColor: t.colors.surfaceElevated, borderRadius: t.radius.pill, height: 4, width: 36 },
  pickerToolbar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  pickerTitle: { color: t.colors.onSurface, ...t.typography.title, flex: 1 },
  pickerCloseBtn: { borderRadius: t.radius.pill, padding: t.spacing.xs },
  pickerList: { paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md, gap: t.spacing.sm },
  pickerItem: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
  },
  pickerItemActive: { backgroundColor: t.colors.primaryMuted },
  pickerItemContent: { flex: 1 },
  pickerItemName: { color: t.colors.onSurface, fontSize: 15, fontWeight: "600" },
  pickerItemNameActive: { color: t.colors.primary },
  pickerItemSubtext: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 2 },
});
