import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchScraperTeams, fetchScraperPlayers } from "../../lib/api";
import type { ScraperTeam, ScraperPlayer } from "../../lib/types";
import { usePreferences } from "../../state/preferences-context";
import { setDefaultLeague, clearDefaultLeague } from "../../state/preferences";
import { TeamDetailModal } from "../../components/TeamDetailModal";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;

type LeagueTab = "standings" | "players";

export default function LeagueScreen() {
  const { preferences, reload: reloadPrefs } = usePreferences();
  const [teams, setTeams] = useState<ScraperTeam[]>([]);
  const [allPlayers, setAllPlayers] = useState<ScraperPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeagueTab>("standings");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ScraperTeam | null>(null);
  const [visiblePlayers, setVisiblePlayers] = useState(50);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
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

  const filteredTeams = useMemo(() => {
    if (!selectedLeague) return [];
    return teams
      .filter((tTeam) => tTeam.leagueName === selectedLeague)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }, [teams, selectedLeague]);

  const validTeamIds = useMemo(
    () => new Set(filteredTeams.map((tTeam) => tTeam.externalId)),
    [filteredTeams],
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
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => void loadData()}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {/* Controls: segmented tabs + league picker */}
      <View style={styles.controlsBar}>
        <View style={styles.segmentedControl}>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => setActiveTab("standings")}
            style={[styles.segment, activeTab === "standings" && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === "standings" && styles.segmentTextActive]}>Standings</Text>
          </Pressable>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => setActiveTab("players")}
            style={[styles.segment, activeTab === "players" && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === "players" && styles.segmentTextActive]}>Players</Text>
          </Pressable>
        </View>

        <Pressable
          android_ripple={{ color: t.colors.ripple, borderless: false }}
          onPress={() => setLeaguePickerOpen(true)}
          style={styles.leagueChip}
        >
          <Text style={styles.leagueChipText} numberOfLines={1}>{selectedLeague || "Select"}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={t.colors.onSurfaceDim} />
        </Pressable>
      </View>

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
          <StandingsTable teams={filteredTeams} onTeamPress={setSelectedTeam} />
        ) : (
          <PlayersList players={shownPlayers} teams={teams} hasMore={hasMorePlayers} onLoadMore={() => setVisiblePlayers((p) => p + 50)} />
        )}
      </ScrollView>

      {/* League picker — bottom sheet modal */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={leaguePickerOpen}
        onRequestClose={() => setLeaguePickerOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
        <SafeAreaView style={styles.pickerSafeArea} edges={["top", "bottom"]}>
          {/* Drag handle */}
          <View style={styles.pickerHandleBar}>
            <View style={styles.pickerHandle} />
          </View>

          <View style={styles.pickerToolbar}>
            <Text style={styles.pickerTitle}>Select League</Text>
            <Pressable
              android_ripple={{ color: t.colors.ripple, borderless: true }}
              onPress={() => setLeaguePickerOpen(false)}
              style={styles.pickerCloseBtn}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false}>
            {leagues.map((league) => {
              const teamCount = teams.filter((tTeam) => tTeam.leagueName === league).length;
              const isSelected = league === selectedLeague;
              return (
                <Pressable
                  key={league}
                  android_ripple={{ color: t.colors.ripple, borderless: false }}
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
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <TeamDetailModal
        team={selectedTeam}
        visible={selectedTeam !== null}
        onClose={() => setSelectedTeam(null)}
      />
    </SafeAreaView>
  );
}

function StandingsTable({ teams, onTeamPress }: { teams: ScraperTeam[]; onTeamPress: (team: ScraperTeam) => void }) {
  if (teams.length === 0) {
    return (
      <View style={styles.emptyTable}>
        <MaterialCommunityIcons name="format-list-bulleted" size={32} color={t.colors.onSurfaceDim} />
        <Text style={styles.emptyTableText}>No teams found for this league</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      {/* Compact header */}
      <View style={styles.tableHeader}>
        <Text style={styles.thRank}>#</Text>
        <Text style={styles.thTeam}>Team</Text>
        <Text style={styles.thNum}>MP</Text>
        <Text style={styles.thNum}>GD</Text>
        <Text style={styles.thPts}>Pts</Text>
      </View>

      {teams.map((team, i) => {
        const gd = team.goalDifference ?? 0;
        const gdText = gd > 0 ? `+${gd}` : String(gd);
        return (
          <Pressable
            key={team.externalId}
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={() => onTeamPress(team)}
            style={styles.tableRow}
          >
            <Text style={[styles.tdRank, team.rank === 1 && styles.tdRankFirst, i === teams.length - 1 && styles.tdRankLast]}>
              {team.rank ?? "-"}
            </Text>
            <Text style={styles.tdTeam} numberOfLines={1}>{team.name}</Text>
            <Text style={styles.tdNum}>{team.matchesPlayed ?? 0}</Text>
            <Text style={[styles.tdNum, gd > 0 && styles.tdGdPositive, gd < 0 && styles.tdGdNegative]}>{gdText}</Text>
            <Text style={styles.tdPts}>{team.points ?? 0}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlayersList({ players, teams, hasMore, onLoadMore }: { players: ScraperPlayer[]; teams: ScraperTeam[]; hasMore: boolean; onLoadMore: () => void }) {
  if (players.length === 0) {
    return (
      <View style={styles.emptyTable}>
        <MaterialCommunityIcons name="account-outline" size={32} color={t.colors.onSurfaceDim} />
        <Text style={styles.emptyTableText}>No player data available for this league</Text>
      </View>
    );
  }

  return (
    <View style={styles.playersList}>
      {players.map((player, index) => {
        const playerTeamIds = player.teamIds ?? [player.teamId];
        const playerTeams = teams.filter((tTeam) => playerTeamIds.includes(tTeam.externalId));
        const primaryTeam = playerTeams[0];
        const isMultiTeam = playerTeams.length > 1;

        return (
          <View key={player.externalId} style={styles.playerCard}>
            <Text style={[styles.playerCardRank, index < 3 && styles.playerCardRankTop]}>
              {index + 1}
            </Text>
            <View style={styles.playerCardInfo}>
              <Text style={styles.playerCardName} numberOfLines={1}>
                {player.name}
                {isMultiTeam ? <Text style={styles.playerCardMulti}> {playerTeams.length} teams</Text> : null}
              </Text>
              <Text style={styles.playerCardSubtext} numberOfLines={1}>
                {isMultiTeam ? playerTeams.map((tm) => tm.name).join(" & ") : primaryTeam?.name ?? "Unknown"}
                {" · "}{player.gamesPlayed}g
              </Text>
            </View>
            <View style={styles.playerCardStats}>
              <View style={styles.playerCardStat}>
                <Text style={styles.playerCardGoals}>{player.goals}</Text>
                <Text style={styles.playerCardStatLabel}>Goals</Text>
              </View>
              <View style={styles.playerCardDivider} />
              <View style={styles.playerCardStat}>
                <Text style={styles.playerCardAssists}>{player.assists}</Text>
                <Text style={styles.playerCardStatLabel}>Asts</Text>
              </View>
            </View>
          </View>
        );
      })}

      {hasMore ? (
        <Pressable
          android_ripple={{ color: t.colors.ripple, borderless: false }}
          onPress={onLoadMore}
          style={styles.showMoreButton}
        >
          <Text style={styles.showMoreText}>Show more</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={t.colors.onSurfaceMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.xxl,
  },
  errorTitle: {
    color: t.colors.onSurface,
    ...t.typography.subtitle,
    marginTop: t.spacing.md,
  },
  errorSubtext: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.bodySmall,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.pill,
    marginTop: t.spacing.md,
    overflow: "hidden",
    paddingHorizontal: t.spacing.xxl,
    paddingVertical: t.spacing.md,
  },
  errorButtonText: {
    color: t.colors.onPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  // Controls bar
  controlsBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    paddingBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  segmentedControl: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    overflow: "hidden",
    padding: 3,
  },
  segment: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: t.colors.primary,
  },
  segmentText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: t.colors.onPrimary,
  },
  leagueChip: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    flex: 1,
    gap: t.spacing.xs,
    overflow: "hidden",
    paddingHorizontal: t.spacing.md,
    paddingVertical: 8,
  },
  leagueChipText: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: t.spacing.xxl,
  },

  // Table
  table: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    marginHorizontal: t.spacing.lg,
    overflow: "hidden",
  },
  tableHeader: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  thRank: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    width: 28,
  },
  thTeam: {
    color: t.colors.onSurfaceDim,
    flex: 1,
    ...t.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  thNum: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    width: 30,
  },
  thPts: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    width: 30,
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: t.touch.minHeight,
    overflow: "hidden",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  tdRank: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
    width: 28,
  },
  tdRankFirst: {
    color: t.colors.warningAccent,
  },
  tdRankLast: {
    color: t.colors.errorAccent,
  },
  tdTeam: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  tdNum: {
    color: t.colors.onSurfaceMuted,
    fontSize: 13,
    textAlign: "center",
    width: 30,
  },
  tdGdPositive: {
    color: t.colors.primary,
  },
  tdGdNegative: {
    color: t.colors.errorAccent,
  },
  tdPts: {
    color: t.colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    width: 30,
  },
  emptyTable: {
    alignItems: "center",
    gap: t.spacing.md,
    paddingVertical: t.spacing.xxxl,
  },
  emptyTableText: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
  },

  // Players list
  playersList: {
    marginHorizontal: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
  },
  playerCard: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: t.touch.minHeight,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  playerCardRank: {
    color: t.colors.onSurfaceDim,
    fontSize: 13,
    fontWeight: "600",
    width: 26,
  },
  playerCardRankTop: {
    color: t.colors.warningAccent,
    fontWeight: "700",
  },
  playerCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerCardName: {
    color: t.colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  playerCardMulti: {
    color: t.colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  playerCardSubtext: {
    color: t.colors.onSurfaceDim,
    fontSize: 12,
    marginTop: 1,
  },
  playerCardStats: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: t.spacing.sm,
  },
  playerCardStat: {
    alignItems: "center",
  },
  playerCardGoals: {
    color: t.colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  playerCardAssists: {
    color: t.colors.warningAccent,
    fontSize: 16,
    fontWeight: "800",
  },
  playerCardStatLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "600",
    marginTop: 1,
    textTransform: "uppercase",
  },
  playerCardDivider: {
    backgroundColor: t.colors.divider,
    height: 18,
    width: 1,
  },
  showMoreButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
    justifyContent: "center",
    overflow: "hidden",
    paddingVertical: t.spacing.md,
  },
  showMoreText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  // Picker — bottom sheet
  pickerSafeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  pickerHandleBar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    paddingTop: t.spacing.sm,
  },
  pickerHandle: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.pill,
    height: 4,
    width: 36,
  },
  pickerToolbar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  pickerTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
    flex: 1,
  },
  pickerCloseBtn: {
    borderRadius: t.radius.pill,
    padding: t.spacing.xs,
  },
  pickerList: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    gap: t.spacing.sm,
  },
  pickerItem: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
  },
  pickerItemActive: {
    backgroundColor: t.colors.primaryMuted,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    color: t.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  pickerItemNameActive: {
    color: t.colors.primary,
  },
  pickerItemSubtext: {
    color: t.colors.onSurfaceDim,
    fontSize: 12,
    marginTop: 2,
  },
});