import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { androidDarkTheme } from "../../theme/androidDark";

export default function LeagueScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>{"\uD83C\uDFC1"}</Text>
          <Text style={styles.cardTitle}>League standings</Text>
          <Text style={styles.cardText}>
            League standings and player stats will be available here once the feature is implemented.
          </Text>
          <Text style={styles.cardHint}>This tab is part of the native app navigation shell and is ready for content.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming soon</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>{"\u2022"}</Text>
            <Text style={styles.featureText}>Team standings and results</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>{"\u2022"}</Text>
            <Text style={styles.featureText}>Player rankings per league</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>{"\u2022"}</Text>
            <Text style={styles.featureText}>Multi-league selector</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>{"\u2022"}</Text>
            <Text style={styles.featureText}>Match schedules and fixtures</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    padding: 16,
  },
  card: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    padding: 32,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  cardText: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  cardHint: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 12,
  },
  section: {
    backgroundColor: androidDarkTheme.colors.surface,
    borderColor: androidDarkTheme.colors.outline,
    borderRadius: androidDarkTheme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  featureDot: {
    color: androidDarkTheme.colors.primary,
    fontSize: 14,
  },
  featureText: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14,
  },
});