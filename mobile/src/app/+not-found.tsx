import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Link href="/" style={styles.link}>
        Back to home
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: androidDarkTheme.colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12
  },
  link: {
    color: androidDarkTheme.colors.primary,
    fontSize: 15,
    fontWeight: "700"
  }
});
