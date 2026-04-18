import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createPlayer, deletePlayer, fetchPlayers, fetchTeams, updatePlayer } from "../lib/api";
import type { Player, Team } from "../lib/types";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

export default function PlayerManagementScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const editRef = useRef<TextInput>(null);
  const addRef = useRef<TextInput>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([fetchPlayers(), fetchTeams()]);
      setPlayers(p);
      setTeams(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (editingId !== null) {
      setTimeout(() => editRef.current?.focus(), 200);
    }
  }, [editingId]);

  useEffect(() => {
    if (isAdding) {
      setTimeout(() => addRef.current?.focus(), 200);
    }
  }, [isAdding]);

  const handleSaveEdit = async (player: Player) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== player.name) {
      setSaving(true);
      try {
        await updatePlayer(player.id, { name: trimmed, teamIds: player.teamIds });
        await refresh();
      } finally {
        setSaving(false);
      }
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleToggleTeam = async (player: Player, teamId: number) => {
    const isInTeam = player.teamIds.includes(teamId);
    const newTeamIds = isInTeam
      ? player.teamIds.filter((id) => id !== teamId)
      : [...player.teamIds, teamId];

    setSaving(true);
    try {
      await updatePlayer(player.id, { name: player.name, teamIds: newTeamIds });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlayer = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createPlayer(trimmed);
      await refresh();
      setNewName("");
      setIsAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (player: Player) => {
    Alert.alert(
      "Delete Player",
      `Remove ${player.name}? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await deletePlayer(player.id);
              await refresh();
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const renderPlayer = ({ item }: { item: Player }) => {
    const isEditing = editingId === item.id;

    return (
      <View style={styles.playerRow}>
        {/* Name */}
        <View style={styles.nameCell}>
          {isEditing ? (
            <TextInput
              ref={editRef}
              value={editingName}
              onChangeText={setEditingName}
              onBlur={() => void handleSaveEdit(item)}
              onSubmitEditing={() => void handleSaveEdit(item)}
              style={styles.nameInput}
              returnKeyType="done"
            />
          ) : (
            <Pressable
              onPress={() => {
                setEditingId(item.id);
                setEditingName(item.name);
              }}
            >
              <Text style={styles.playerName}>{item.name}</Text>
            </Pressable>
          )}
        </View>

        {/* Team toggles */}
        <View style={styles.teamToggles}>
          {teams.map((team) => {
            const isIn = item.teamIds.includes(team.id);
            return (
              <Pressable
                key={team.id}
                disabled={saving}
                onPress={() => void handleToggleTeam(item, team.id)}
                android_ripple={{ color: t.colors.ripple, borderless: false }}
                style={[styles.teamToggle, isIn && styles.teamToggleActive]}
              >
                {isIn ? (
                  <MaterialCommunityIcons name="check" size={18} color={t.colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Delete */}
        <Pressable
          android_ripple={{ color: "rgba(255,95,133,0.15)", borderless: false }}
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={t.colors.errorAccent} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      ) : (
        <>
          {/* Header row */}
          {teams.length > 0 ? (
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderName}>Name</Text>
              {teams.map((team) => (
                <Text key={team.id} style={styles.tableHeaderTeam} numberOfLines={1}>
                  {team.name.substring(0, 8)}
                </Text>
              ))}
              <View style={styles.tableHeaderDeleteSpacer} />
            </View>
          ) : null}

          <FlatList
            data={players}
            keyExtractor={(p) => String(p.id)}
            renderItem={renderPlayer}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View style={styles.addRow}>
                {isAdding ? (
                  <View style={styles.addInputRow}>
                    <TextInput
                      ref={addRef}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Player name..."
                      placeholderTextColor={t.colors.onSurfaceDim}
                      onBlur={() => {
                        if (!newName.trim()) setIsAdding(false);
                      }}
                      onSubmitEditing={() => void handleAddPlayer()}
                      style={styles.addInput}
                      returnKeyType="done"
                    />
                    {newName.trim() ? (
                      <Pressable
                        onPress={() => void handleAddPlayer()}
                        style={styles.addConfirmBtn}
                      >
                        <MaterialCommunityIcons name="check" size={20} color={t.colors.onPrimary} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Pressable
                    android_ripple={{ color: t.colors.ripple, borderless: false }}
                    onPress={() => setIsAdding(true)}
                    style={styles.addButton}
                  >
                    <MaterialCommunityIcons name="account-plus" size={18} color={t.colors.primary} />
                    <Text style={styles.addButtonText}>Add new player...</Text>
                  </Pressable>
                )}
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: t.colors.background, flex: 1 },
  loaderWrap: { alignItems: "center", flex: 1, justifyContent: "center" },

  tableHeader: { alignItems: "center", borderBottomColor: t.colors.divider, borderBottomWidth: 1, flexDirection: "row", gap: t.spacing.sm, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm },
  tableHeaderName: { color: t.colors.onSurfaceDim, flex: 1, ...t.typography.caption, fontWeight: "700", textTransform: "uppercase" },
  tableHeaderTeam: { color: t.colors.onSurfaceDim, ...t.typography.caption, fontWeight: "700", textAlign: "center", textTransform: "uppercase", width: 44 },
  tableHeaderDeleteSpacer: { width: 40 },

  list: { paddingHorizontal: t.spacing.lg },
  playerRow: { alignItems: "center", borderBottomColor: t.colors.divider, borderBottomWidth: 1, flexDirection: "row", gap: t.spacing.sm, minHeight: 52, paddingVertical: t.spacing.sm },
  nameCell: { flex: 1 },
  playerName: { color: t.colors.onSurface, fontSize: 15, fontWeight: "500" },
  nameInput: { backgroundColor: t.colors.surface, borderColor: t.colors.primary, borderRadius: t.radius.sm, borderWidth: 1, color: t.colors.onSurface, fontSize: 15, paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs },

  teamToggles: { flexDirection: "row", gap: t.spacing.sm },
  teamToggle: { alignItems: "center", backgroundColor: t.colors.surface, borderRadius: t.radius.sm, height: 40, justifyContent: "center", overflow: "hidden", width: 44 },
  teamToggleActive: { backgroundColor: t.colors.successContainer },

  deleteBtn: { alignItems: "center", borderRadius: t.radius.sm, height: 40, justifyContent: "center", overflow: "hidden", width: 40 },

  addRow: { paddingVertical: t.spacing.lg },
  addButton: { alignItems: "center", flexDirection: "row", gap: t.spacing.sm },
  addButtonText: { color: t.colors.primary, fontSize: 15, fontWeight: "500" },
  addInputRow: { alignItems: "center", flexDirection: "row", gap: t.spacing.sm },
  addInput: { backgroundColor: t.colors.surface, borderColor: t.colors.primary, borderRadius: t.radius.sm, borderWidth: 1, color: t.colors.onSurface, flex: 1, fontSize: 15, paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs },
  addConfirmBtn: { alignItems: "center", backgroundColor: t.colors.primary, borderRadius: t.radius.sm, height: 40, justifyContent: "center", width: 40 },
});
