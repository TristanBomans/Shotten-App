import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import type { AttendanceStatus, Match } from "../lib/types";
import { formatMatchDate, resolveAttendanceState } from "../lib/matches";
import { ResponseButtons } from "./ResponseButtons";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface MatchDetailModalProps {
  match: Match | null;
  currentPlayerId: number;
  currentStatus: AttendanceStatus | null;
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
  onMaybe: () => void;
  onClose: () => void;
}

type StatusGroup = {
  title: string;
  emoji: string;
  color: string;
  players: { id: number; name: string; status: string }[];
};

export function MatchDetailModal({
  match,
  currentPlayerId,
  currentStatus,
  isUpdating,
  onYes,
  onNo,
  onMaybe,
  onClose,
}: MatchDetailModalProps) {
  if (!match) return null;

  const present = match.attendances.filter((a) => a.status === "Present");
  const maybe = match.attendances.filter((a) => a.status === "Maybe");
  const notPresent = match.attendances.filter((a) => a.status === "NotPresent");
  const unknown = match.attendances.filter(
    (a) => a.status !== "Present" && a.status !== "Maybe" && a.status !== "NotPresent",
  );

  const statusGroups: StatusGroup[] = [
    {
      title: "Coming",
      emoji: "✅",
      color: t.colors.primary,
      players: present.map((a) => ({
        id: a.playerId,
        name: a.player?.name ?? `Player ${a.playerId}`,
        status: a.status,
      })),
    },
    {
      title: "Maybe",
      emoji: "🤔",
      color: t.colors.warningAccent,
      players: maybe.map((a) => ({
        id: a.playerId,
        name: a.player?.name ?? `Player ${a.playerId}`,
        status: a.status,
      })),
    },
    {
      title: "Not Coming",
      emoji: "❌",
      color: t.colors.errorAccent,
      players: notPresent.map((a) => ({
        id: a.playerId,
        name: a.player?.name ?? `Player ${a.playerId}`,
        status: a.status,
      })),
    },
    {
      title: "No Response",
      emoji: "❓",
      color: t.colors.onSurfaceDim,
      players: unknown.map((a) => ({
        id: a.playerId,
        name: a.player?.name ?? `Player ${a.playerId}`,
        status: "Unknown",
      })),
    },
  ].filter((g) => g.players.length > 0);

  const totalCount = present.length + maybe.length;
  const matchDate = new Date(match.date);

  const openMaps = () => {
    if (match.location) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`);
    }
  };

  const openCalendar = () => {
    const start = matchDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(match.name)}&dates=${start}/${end}&location=${encodeURIComponent(match.location || "")}`;
    Linking.openURL(url);
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={true}
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
          <View style={styles.toolbarText}>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {match.name.replace(/-/g, " vs ")}
            </Text>
            <Text style={styles.toolbarSubtitle}>
              {formatMatchDate(match.date)}
              {match.location ? ` · ${match.location}` : ""}
            </Text>
          </View>
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: true }}
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={24} color={t.colors.onSurfaceMuted} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Response section */}
          <View style={styles.responseSection}>
            <Text style={styles.sectionLabel}>Your Response</Text>
            <ResponseButtons
              currentState={resolveAttendanceState(currentStatus)}
              isUpdating={isUpdating}
              onYes={onYes}
              onNo={onNo}
              onMaybe={onMaybe}
            />
          </View>

          {/* Squad summary */}
          <View style={styles.squadSummary}>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryNum, { color: t.colors.primary }]}>
                {present.length}
              </Text>
              <Text style={styles.summaryLabel}>In</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryNum, { color: t.colors.warningAccent }]}>
                {maybe.length}
              </Text>
              <Text style={styles.summaryLabel}>Maybe</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryNum, { color: t.colors.errorAccent }]}>
                {notPresent.length}
              </Text>
              <Text style={styles.summaryLabel}>Out</Text>
            </View>
          </View>

          {/* Squad groups */}
          {statusGroups.map((group) => (
            <View key={group.title} style={styles.squadGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>{group.emoji}</Text>
                <Text style={[styles.groupTitle, { color: group.color }]}>
                  {group.title}
                </Text>
                <Text style={styles.groupCount}>{group.players.length}</Text>
              </View>
              <View style={styles.groupList}>
                {group.players.map((player) => {
                  const isYou = player.id === currentPlayerId;
                  return (
                    <View key={player.id} style={styles.playerRow}>
                      <View style={[styles.playerAvatar, { backgroundColor: `${group.color}22` }]}>
                        <Text style={[styles.playerAvatarText, { color: group.color }]}>
                          {player.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.playerName, isYou && styles.playerNameYou]} numberOfLines={1}>
                        {player.name}
                        {isYou ? " (you)" : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom action bar */}
        <View style={styles.actionBar}>
          {match.location ? (
            <Pressable
              android_ripple={{ color: t.colors.ripple, borderless: false }}
              onPress={openMaps}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={t.colors.onSurfaceMuted} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </Pressable>
          ) : null}
          <Pressable
            android_ripple={{ color: t.colors.ripple, borderless: false }}
            onPress={openCalendar}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="calendar-plus" size={18} color={t.colors.onSurfaceMuted} />
            <Text style={styles.actionButtonText}>Calendar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: t.colors.background,
    flex: 1,
  },
  handleBar: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    paddingTop: t.spacing.sm,
  },
  handle: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radius.pill,
    height: 4,
    width: 36,
  },
  toolbar: {
    alignItems: "flex-start",
    backgroundColor: t.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  toolbarText: {
    flex: 1,
    marginRight: t.spacing.md,
  },
  toolbarTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
  },
  toolbarSubtitle: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.bodySmall,
    marginTop: 2,
  },
  closeBtn: {
    borderRadius: t.radius.pill,
    padding: t.spacing.xs,
  },
  scrollContent: {
    paddingBottom: t.spacing.xxxl,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
  },
  responseSection: {
    marginBottom: t.spacing.xl,
  },
  sectionLabel: {
    color: t.colors.onSurfaceMuted,
    ...t.typography.label,
  },
  squadSummary: {
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.xl,
  },
  summaryChip: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    flex: 1,
    paddingVertical: t.spacing.md,
  },
  summaryNum: {
    ...t.typography.score,
  },
  summaryLabel: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  squadGroup: {
    marginBottom: t.spacing.lg,
  },
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  groupEmoji: {
    fontSize: 14,
  },
  groupTitle: {
    ...t.typography.label,
    flex: 1,
  },
  groupCount: {
    color: t.colors.onSurfaceDim,
    ...t.typography.caption,
    fontWeight: "700",
  },
  groupList: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
  },
  playerRow: {
    alignItems: "center",
    borderBottomColor: t.colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: t.spacing.md,
    minHeight: t.touch.minHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  playerAvatar: {
    alignItems: "center",
    borderRadius: t.radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  playerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  playerName: {
    color: t.colors.onSurface,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  playerNameYou: {
    color: t.colors.primary,
    fontWeight: "700",
  },
  actionBar: {
    borderTopColor: t.colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    flex: 1,
    flexDirection: "row",
    gap: t.spacing.sm,
    justifyContent: "center",
    overflow: "hidden",
    paddingVertical: t.spacing.md,
  },
  actionButtonText: {
    color: t.colors.onSurfaceMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
