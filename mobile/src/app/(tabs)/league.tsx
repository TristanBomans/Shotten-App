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
import { fetchScraperTeams, fetchScraperPlayers } from "../../lib/api";
import type { ScraperTeam, ScraperPlayer } from "../../lib/types";
import { usePreferences } from "../../state/preferences-context";
import { setDefaultLeague, clearDefaultLeague } from "../../state/preferences";
import { androidDarkTheme } from "../../theme/androidDark";

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
    return Array.from(new Set(teams.map((t) => t.leagueName).filter(Boolean))).sort() as string[];
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
      .filter((t) => t.leagueName === selectedLeague)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }, [teams, selectedLeague]);

  const validTeamIds = useMemo(
    () => new Set(filteredTeams.map((t) => t.externalId)),
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
        <ActivityIndicator size="large" color={androidDarkTheme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not load league data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
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
      <View style={styles.controlsBar}>
        <View style={styles.segmentedControl}>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => setActiveTab("standings")}
            style={[styles.segment, activeTab === "standings" && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === "standings" && styles.segmentTextActive]}>Standings</Text>
          </Pressable>
          <Pressable
            android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
            onPress={() => setActiveTab("players")}
            style={[styles.segment, activeTab === "players" && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === "players" && styles.segmentTextActive]}>Players</Text>
          </Pressable>
        </View>
        <Pressable
          android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
          onPress={() => setLeaguePickerOpen(true)}
          style={styles.leagueChip}
        >
          <Text style={styles.leagueChipText} numberOfLines={1}>{selectedLeague || "Select league"}</Text>
          <Text style={styles.leagueChipArrow}>{"\u25BE"}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={androidDarkTheme.colors.primary}
          />
        }
      >
        {activeTab === "standings" ? (
          <StandingsTable teams={filteredTeams} />
        ) : (
          <PlayersList players={shownPlayers} teams={teams} hasMore={hasMorePlayers} onLoadMore={() => setVisiblePlayers((p) => p + 50)} />
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={leaguePickerOpen}
        onRequestClose={() => setLeaguePickerOpen(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor={androidDarkTheme.colors.surface} />
        <SafeAreaView style={styles.pickerSafeArea} edges={["top", "bottom"]}>
          <View style={styles.pickerToolbar}>
            <Pressable
              android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: true }}
              onPress={() => setLeaguePickerOpen(false)}
              style={styles.pickerClose}
            >
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
            <Text style={styles.pickerTitle}>Select League</Text>
            <View style={styles.pickerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.pickerList}>
            {leagues.map((league) => {
              const teamCount = teams.filter((t) => t.leagueName === league).length;
              const isSelected = league === selectedLeague;
              return (
                <Pressable
                  key={league}
                  android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
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
                  {isSelected ? <Text style={styles.pickerCheck}>{"\u2713"}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function StandingsTable({ teams }: { teams: ScraperTeam[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.thRank}>#</Text>
        <Text style={styles.thTeam}>Team</Text>
        <Text style={styles.thNum}>MP</Text>
        <Text style={styles.thNum}>GD</Text>
        <Text style={styles.thPts}>Pts</Text>
      </View>
      {teams.length > 0 ? teams.map((team, i) => {
        const gd = team.goalDifference ?? 0;
        const gdText = gd > 0 ? `+${gd}` : String(gd);
        const isLast = i === teams.length - 1;
        return (
          <View key={team.externalId} style={[styles.tableRow, isLast && styles.tableRowLast]}>
            <Text style={[styles.tdRank, team.rank === 1 && styles.tdRankFirst, isLast && styles.tdRankLast]}>
              {team.rank ?? "-"}
            </Text>
            <Text style={styles.tdTeam} numberOfLines={1}>{team.name}</Text>
            <Text style={styles.tdNum}>{team.matchesPlayed ?? 0}</Text>
            <Text style={[styles.tdNum, gd > 0 && styles.tdGdPositive, gd < 0 && styles.tdGdNegative]}>{gdText}</Text>
            <Text style={styles.tdPts}>{team.points ?? 0}</Text>
          </View>
        );
      }) : (
        <View style={styles.emptyTable}>
          <Text style={styles.emptyTableText}>No teams found for this league</Text>
        </View>
      )}
    </View>
  );
}

function PlayersList({ players, teams, hasMore, onLoadMore }: { players: ScraperPlayer[]; teams: ScraperTeam[]; hasMore: boolean; onLoadMore: () => void }) {
  return (
    <View style={styles.playersList}>
      {players.length > 0 ? players.map((player, index) => {
        const playerTeamIds = player.teamIds ?? [player.teamId];
        const playerTeams = teams.filter((t) => playerTeamIds.includes(t.externalId));
        const primaryTeam = playerTeams[0];
        const isMultiTeam = playerTeams.length > 1;

        return (
          <View key={player.externalId} style={[styles.playerCard, index === 0 && styles.playerCardTop, index === players.length - 1 && styles.playerCardBottom]}>
            <Text style={[styles.playerCardRank, index < 3 && styles.playerCardRankTop]}>
              {index + 1}
            </Text>
            <View style={styles.playerCardInfo}>
              <Text style={styles.playerCardName} numberOfLines={1}>
                {player.name}{isMultiTeam ? <Text style={styles.playerCardMulti}> {playerTeams.length} teams</Text> : null}
              </Text>
              <Text style={styles.playerCardSubtext} numberOfLines={1}>
                {isMultiTeam ? playerTeams.map((t) => t.name).join(" & ") : primaryTeam?.name ?? "Unknown"}
                {" \u00B7 "}{player.gamesPlayed}g
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
      }) : (
        <View style={styles.emptyTable}>
          <Text style={styles.emptyTableText}>No player data available for this league</Text>
        </View>
      )}
      {hasMore ? (
        <Pressable
          android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
          onPress={onLoadMore}
          style={styles.showMoreButton}
        >
          <Text style={styles.showMoreText}>Show more</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 18,
    fontWeight: "700",
  },
  errorSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: androidDarkTheme.colors.primary,
    borderRadius: androidDarkTheme.radius.pill,
    marginTop: 16,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: androidDarkTheme.colors.onPrimary,
    fontWeight: "700",
  },
  controlsBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  segmentedControl: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderRadius: androidDarkTheme.radius.pill,
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  segmentActive: {
    backgroundColor: androidDarkTheme.colors.primary,
    borderRadius: androidDarkTheme.radius.pill,
  },
  segmentText: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: androidDarkTheme.colors.onPrimary,
  },
  leagueChip: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    flex: 1,
    gap: 4,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  leagueChipText: {
    color: androidDarkTheme.colors.onSurface,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  leagueChipArrow: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  table: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  tableHeader: {
    alignItems: "center",
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thRank: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    width: 28,
  },
  thTeam: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  thNum: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
    width: 30,
  },
  thPts: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    textTransform: "uppercase",
    width: 30,
  },
  tableRow: {
    alignItems: "center",
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tdRank: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
    width: 28,
  },
  tdRankFirst: {
    color: "#f7cb61",
  },
  tdRankLast: {
    color: "#ff5f85",
  },
  tdTeam: {
    color: androidDarkTheme.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  tdNum: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    textAlign: "center",
    width: 30,
  },
  tdGdPositive: {
    color: androidDarkTheme.colors.primary,
  },
  tdGdNegative: {
    color: "#ff5f85",
  },
  tdPts: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    width: 30,
  },
  emptyTable: {
    alignItems: "center",
    padding: 24,
  },
  emptyTableText: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
  },
  playersList: {
    marginHorizontal: 16,
  },
  playerCard: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    borderTopColor: androidDarkTheme.colors.outline,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  playerCardTop: {
    borderTopLeftRadius: androidDarkTheme.radius.lg,
    borderTopRightRadius: androidDarkTheme.radius.lg,
  },
  playerCardBottom: {
    borderBottomLeftRadius: androidDarkTheme.radius.lg,
    borderBottomRightRadius: androidDarkTheme.radius.lg,
    borderBottomWidth: 0,
  },
  playerCardRank: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "600",
    width: 26,
  },
  playerCardRankTop: {
    color: "#f7cb61",
    fontWeight: "700",
  },
  playerCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerCardName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  playerCardMulti: {
    color: androidDarkTheme.colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },
  playerCardSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 1,
  },
  playerCardStats: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 10,
  },
  playerCardStat: {
    alignItems: "center",
  },
  playerCardGoals: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  playerCardAssists: {
    color: "#f7cb61",
    fontSize: 16,
    fontWeight: "800",
  },
  playerCardStatLabel: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 1,
    textTransform: "uppercase",
  },
  playerCardDivider: {
    backgroundColor: androidDarkTheme.colors.outline,
    height: 18,
    width: 1,
  },
  showMoreButton: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    borderColor: androidDarkTheme.colors.outline,
    borderWidth: 1,
    marginTop: -1,
    overflow: "hidden",
    paddingVertical: 14,
  },
  showMoreText: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  pickerSafeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  pickerToolbar: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderBottomColor: androidDarkTheme.colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerClose: {
    borderRadius: androidDarkTheme.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickerCloseText: {
    color: androidDarkTheme.colors.primary,
    fontSize: 16,
  },
  pickerTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
  },
  pickerSpacer: {
    width: 60,
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerItem: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerItemActive: {
    backgroundColor: "rgba(61, 220, 132, 0.08)",
    borderColor: androidDarkTheme.colors.primary,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  pickerItemNameActive: {
    color: androidDarkTheme.colors.primary,
  },
  pickerItemSubtext: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pickerCheck: {
    color: androidDarkTheme.colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
});