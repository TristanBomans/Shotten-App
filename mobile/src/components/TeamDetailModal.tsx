import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchScraperTeamMatches, fetchScraperPlayersByTeam } from "../lib/api";
import type { ScraperMatch, ScraperPlayer, ScraperTeam } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface TeamDetailModalProps {
  team: ScraperTeam | null;
  visible: boolean;
  onClose: () => void;
}

function isHomeTeam(teamName: string, homeTeam: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim();
  return norm(homeTeam).includes(norm(teamName)) || norm(teamName).includes(norm(homeTeam));
}

export function TeamDetailModal({ team, visible, onClose }: TeamDetailModalProps) {
  const [matches, setMatches] = useState<ScraperMatch[]>([]);
  const [players, setPlayers] = useState<ScraperPlayer[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    if (!visible || !team) return;

    setLoadingMatches(true);
    setLoadingPlayers(true);

    fetchScraperTeamMatches(team.externalId)
      .then(setMatches)
      .finally(() => setLoadingMatches(false));

    fetchScraperPlayersByTeam(team.externalId)
      .then((p) => setPlayers(p.sort((a, b) => b.goals - a.goals)))
      .finally(() => setLoadingPlayers(false));
  }, [visible, team]);

  if (!team) return null;

  const now = Date.now();
  const upcomingMatches = matches
    .filter((m) => new Date(m.date).getTime() > now || m.status === "Scheduled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMatches = matches
    .filter((m) => new Date(m.date).getTime() <= now && m.status === "Played")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Recent form
  const recentForm = pastMatches.slice(0, 5).map((m) => {
    const isHome = isHomeTeam(team.name, m.homeTeam);
    const teamScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (teamScore > oppScore) return "W";
    if (teamScore < oppScore) return "L";
    return "D";
  });

  const formColors: Record<string, string> = {
    W: t.colors.primary,
    D: t.colors.warningAccent,
    L: t.colors.errorAccent,
  };

  const openLZV = () => {
    Linking.openURL(`https://www.lzvcup.be/teams/detail/${team.externalId}`);
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.colors.surface} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Drag handle */}
        <View style={styles.handleBar}>
          <View style={styles.handle} />
        </View>

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle} numberOfLines={1}>{team.name}</Text>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: true }}
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* League + rank */}
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{team.name.charAt(0)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{team.name}</Text>
              {team.leagueName ? <Text style={styles.heroLeague}>{team.leagueName}</Text> : null}
            </View>
          </View>

          {/* Form */}
          {recentForm.length > 0 ? (
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Recent Form</Text>
              <View style={styles.formRow}>
                {recentForm.map((result, i) => (
                  <View key={i} style={[styles.formBadge, { backgroundColor: `${formColors[result]}22` }]}>
                    <Text style={[styles.formBadgeText, { color: formColors[result] }]}>{result}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Stats grid */}
          {team.rank !== undefined ? (
            <View style={styles.statsGrid}>
              <StatCell label="Rank" value={`#${team.rank}`} color={t.colors.warningAccent} />
              <StatCell label="Pts" value={String(team.points ?? 0)} color={t.colors.primary} />
              <StatCell label="MP" value={String(team.matchesPlayed ?? 0)} />
              <StatCell label="GD" value={`${(team.goalDifference ?? 0) >= 0 ? "+" : ""}${team.goalDifference ?? 0}`} color={(team.goalDifference ?? 0) >= 0 ? t.colors.primary : t.colors.errorAccent} />
            </View>
          ) : null}

          {/* W/D/L detail */}
          {team.wins !== undefined ? (
            <View style={styles.wdlRow}>
              <View style={styles.wdlItem}>
                <Text style={[styles.wdlValue, { color: t.colors.primary }]}>{team.wins ?? 0}</Text>
                <Text style={styles.wdlLabel}>Won</Text>
              </View>
              <View style={styles.wdlItem}>
                <Text style={[styles.wdlValue, { color: t.colors.warningAccent }]}>{team.draws ?? 0}</Text>
                <Text style={styles.wdlLabel}>Drawn</Text>
              </View>
              <View style={styles.wdlItem}>
                <Text style={[styles.wdlValue, { color: t.colors.errorAccent }]}>{team.losses ?? 0}</Text>
                <Text style={styles.wdlLabel}>Lost</Text>
              </View>
              <View style={styles.wdlItem}>
                <Text style={styles.wdlValue}>{team.goalsFor ?? 0}</Text>
                <Text style={styles.wdlLabel}>GF</Text>
              </View>
              <View style={styles.wdlItem}>
                <Text style={styles.wdlValue}>{team.goalsAgainst ?? 0}</Text>
                <Text style={styles.wdlLabel}>GA</Text>
              </View>
            </View>
          ) : null}

          {/* Team info */}
          {(team.colors || team.manager || team.description) ? (
            <View style={styles.infoSection}>
              {team.colors ? (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="palette" size={16} color={t.colors.onSurfaceDim} />
                  <Text style={styles.infoText}>{team.colors}</Text>
                </View>
              ) : null}
              {team.manager ? (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account" size={16} color={t.colors.onSurfaceDim} />
                  <Text style={styles.infoText}>{team.manager}</Text>
                </View>
              ) : null}
              {team.description ? (
                <Text style={styles.infoDescription}>"{team.description}"</Text>
              ) : null}
            </View>
          ) : null}

          {/* Matches */}
          <Text style={[styles.sectionLabel, { marginTop: t.spacing.xl }]}>Matches</Text>
          {loadingMatches ? (
            <ActivityIndicator size="small" color={t.colors.primary} style={{ marginVertical: t.spacing.xl }} />
          ) : matches.length === 0 ? (
            <Text style={styles.emptyText}>No matches available</Text>
          ) : (
            <View style={styles.matchesSection}>
              {upcomingMatches.length > 0 ? (
                <View style={styles.matchGroup}>
                  <Text style={styles.matchGroupLabel}>Upcoming ({upcomingMatches.length})</Text>
                  <View style={styles.matchGroupList}>
                    {upcomingMatches.slice(0, 5).map((m) => (
                      <MatchRow key={m.externalId} match={m} teamName={team.name} />
                    ))}
                  </View>
                </View>
              ) : null}
              {pastMatches.length > 0 ? (
                <View style={styles.matchGroup}>
                  <Text style={styles.matchGroupLabel}>Recent Results ({pastMatches.length})</Text>
                  <View style={styles.matchGroupList}>
                    {pastMatches.slice(0, 10).map((m) => (
                      <MatchRow key={m.externalId} match={m} teamName={team.name} isPlayed />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Squad */}
          <Text style={[styles.sectionLabel, { marginTop: t.spacing.xl }]}>Squad</Text>
          {loadingPlayers ? (
            <ActivityIndicator size="small" color={t.colors.primary} style={{ marginVertical: t.spacing.xl }} />
          ) : players.length === 0 ? (
            <Text style={styles.emptyText}>No player stats available</Text>
          ) : (
            <View style={styles.squadList}>
              {players.map((player, i) => (
                <View key={player.externalId} style={styles.squadRow}>
                  <View style={[styles.squadRankBadge, i < 3 && styles.squadRankBadgeTop]}>
                    <Text style={[styles.squadRankText, i < 3 && styles.squadRankTextTop]}>
                      {player.number || i + 1}
                    </Text>
                  </View>
                  <View style={styles.squadInfo}>
                    <Text style={styles.squadName} numberOfLines={1}>{player.name}</Text>
                    <Text style={styles.squadSub}>{player.gamesPlayed} games</Text>
                  </View>
                  <Text style={[styles.squadStat, { color: t.colors.primary }]}>⚽ {player.goals}</Text>
                  <Text style={[styles.squadStat, { color: t.colors.warningAccent }]}>🎯 {player.assists}</Text>
                </View>
              ))}
            </View>
          )}

          {/* LZV link */}
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={openLZV}
            style={styles.lzvButton}
          >
            <Text style={styles.lzvButtonText}>View on LZV Cup</Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color={t.colors.onSurfaceMuted} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function MatchRow({ match, teamName, isPlayed }: { match: ScraperMatch; teamName: string; isPlayed?: boolean }) {
  const isHome = isHomeTeam(teamName, match.homeTeam);
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const teamScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  const result = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "D";
  const resultColor = result === "W" ? t.colors.primary : result === "L" ? t.colors.errorAccent : t.colors.warningAccent;

  const d = new Date(match.date);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={styles.matchRow}>
      {isPlayed ? (
        <View style={[styles.matchResultBadge, { backgroundColor: `${resultColor}22` }]}>
          <Text style={[styles.matchResultText, { color: resultColor }]}>{result}</Text>
        </View>
      ) : null}
      <View style={styles.matchRowInfo}>
        <Text style={styles.matchRowOpponent} numberOfLines={1}>
          {isHome ? "vs" : "@"} {opponent}
        </Text>
        <Text style={styles.matchRowDate}>
          {dateStr} · {timeStr}
          {match.location ? ` · ${match.location}` : ""}
        </Text>
      </View>
      {isPlayed ? (
        <Text style={[styles.matchRowScore, { color: resultColor }]}>
          {teamScore} – {oppScore}
        </Text>
      ) : null}
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },
  handleBar: { alignItems: "center", backgroundColor: t.colors.surface, paddingTop: t.spacing.sm },
  handle: { backgroundColor: t.colors.surfaceElevated, borderRadius: t.radius.pill, height: 4, width: 36 },
  toolbar: { alignItems: "center", backgroundColor: t.colors.surface, flexDirection: "row", justifyContent: "space-between", paddingBottom: t.spacing.md, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md },
  toolbarTitle: { color: t.colors.onSurface, ...t.typography.title, flex: 1 },
  closeBtn: { borderRadius: t.radius.pill, padding: t.spacing.xs },
  scrollContent: { paddingBottom: t.spacing.xxxl, paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },

  heroRow: { alignItems: "center", flexDirection: "row", gap: t.spacing.lg, marginBottom: t.spacing.xl },
  heroAvatar: { alignItems: "center", backgroundColor: t.colors.primaryMuted, borderRadius: t.radius.lg, height: 56, justifyContent: "center", width: 56 },
  heroAvatarText: { color: t.colors.primary, fontSize: 24, fontWeight: "800" },
  heroInfo: { flex: 1 },
  heroName: { color: t.colors.onSurface, ...t.typography.title },
  heroLeague: { color: t.colors.onSurfaceMuted, ...t.typography.bodySmall, marginTop: 2 },

  formSection: { marginBottom: t.spacing.xl },
  sectionLabel: { color: t.colors.onSurfaceMuted, ...t.typography.label, marginBottom: t.spacing.sm },
  formRow: { flexDirection: "row", gap: t.spacing.sm },
  formBadge: { alignItems: "center", borderRadius: t.radius.sm, height: 32, justifyContent: "center", width: 32 },
  formBadgeText: { fontSize: 13, fontWeight: "700" },

  statsGrid: { flexDirection: "row", gap: t.spacing.sm, marginBottom: t.spacing.md },
  statCell: { alignItems: "center", backgroundColor: t.colors.surface, borderRadius: t.radius.md, flex: 1, paddingVertical: t.spacing.md },
  statValue: { color: t.colors.onSurface, ...t.typography.score },
  statLabel: { color: t.colors.onSurfaceDim, ...t.typography.caption, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },

  wdlRow: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, flexDirection: "row", marginBottom: t.spacing.lg, overflow: "hidden" },
  wdlItem: { alignItems: "center", flex: 1, paddingVertical: t.spacing.md },
  wdlValue: { color: t.colors.onSurface, fontSize: 16, fontWeight: "700" },
  wdlLabel: { color: t.colors.onSurfaceDim, ...t.typography.caption, fontWeight: "600", marginTop: 2 },

  infoSection: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, gap: t.spacing.sm, marginBottom: t.spacing.lg, padding: t.spacing.lg },
  infoRow: { alignItems: "center", flexDirection: "row", gap: t.spacing.sm },
  infoText: { color: t.colors.onSurfaceMuted, fontSize: 14 },
  infoDescription: { color: t.colors.onSurfaceMuted, fontStyle: "italic", fontSize: 14, lineHeight: 20, marginTop: t.spacing.xs },

  matchesSection: { gap: t.spacing.lg },
  matchGroup: {},
  matchGroupLabel: { color: t.colors.onSurfaceDim, ...t.typography.caption, fontWeight: "700", marginBottom: t.spacing.sm, textTransform: "uppercase" },
  matchGroupList: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, overflow: "hidden" },
  matchRow: { alignItems: "center", borderBottomColor: t.colors.divider, borderBottomWidth: 1, flexDirection: "row", gap: t.spacing.sm, minHeight: t.touch.minHeight, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm },
  matchResultBadge: { alignItems: "center", borderRadius: t.radius.sm, height: 28, justifyContent: "center", width: 28 },
  matchResultText: { fontSize: 12, fontWeight: "700" },
  matchRowInfo: { flex: 1, minWidth: 0 },
  matchRowOpponent: { color: t.colors.onSurface, fontSize: 14, fontWeight: "500" },
  matchRowDate: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 1 },
  matchRowScore: { fontSize: 15, fontWeight: "700" },

  squadList: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, overflow: "hidden" },
  squadRow: { alignItems: "center", borderBottomColor: t.colors.divider, borderBottomWidth: 1, flexDirection: "row", gap: t.spacing.sm, minHeight: t.touch.minHeight, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm },
  squadRankBadge: { alignItems: "center", backgroundColor: t.colors.surfaceRaised, borderRadius: t.radius.pill, height: 32, justifyContent: "center", width: 32 },
  squadRankBadgeTop: { backgroundColor: t.colors.warningAccent },
  squadRankText: { color: t.colors.onSurface, fontSize: 13, fontWeight: "700" },
  squadRankTextTop: { color: "#1a1200" },
  squadInfo: { flex: 1, minWidth: 0 },
  squadName: { color: t.colors.onSurface, fontSize: 14, fontWeight: "500" },
  squadSub: { color: t.colors.onSurfaceDim, fontSize: 12, marginTop: 1 },
  squadStat: { fontSize: 14, fontWeight: "600", minWidth: 40, textAlign: "right" },

  lzvButton: { alignItems: "center", alignSelf: "center", backgroundColor: t.colors.surface, borderRadius: t.radius.md, flexDirection: "row", gap: t.spacing.sm, marginTop: t.spacing.xl, overflow: "hidden", paddingHorizontal: t.spacing.xl, paddingVertical: t.spacing.md },
  lzvButtonText: { color: t.colors.onSurfaceMuted, fontSize: 14, fontWeight: "600" },

  emptyText: { color: t.colors.onSurfaceDim, ...t.typography.bodySmall, fontStyle: "italic", paddingVertical: t.spacing.xl, textAlign: "center" },
});
