export const androidDarkTheme = {
  colors: {
    // OLED surfaces — true black base with deliberate elevation tiers
    background: "#000000",
    surface: "#0c0c10",
    surfaceAlt: "#121218",
    surfaceRaised: "#1a1a22",
    surfaceElevated: "#22222c",

    // Borders — very subtle, only used for intentional dividers
    outline: "#1e1e28",
    outlineSubtle: "#15151d",
    divider: "rgba(255, 255, 255, 0.06)",

    // Text
    onBackground: "#eceef2",
    onSurface: "#eceef2",
    onSurfaceMuted: "#8a8f9d",
    onSurfaceDim: "#5c5f6b",

    // Accent — vibrant green
    primary: "#3ddc84",
    primaryMuted: "rgba(61, 220, 132, 0.15)",
    primaryPressed: "#35c777",
    onPrimary: "#041f10",

    // Semantic states
    errorContainer: "#1e0812",
    onError: "#ffb4c5",
    errorAccent: "#ff5f85",

    successContainer: "#081e14",
    onSuccess: "#69e9a6",

    warningContainer: "#1e1808",
    onWarning: "#f7cb61",
    warningAccent: "#f7cb61",

    // Components
    chip: "#1a1a22",
    chipText: "#c9cdd2",
    ripple: "rgba(255, 255, 255, 0.06)",

    // Tab bar
    tabBarBg: "#050508",
    tabBarBorder: "rgba(255, 255, 255, 0.04)",
    tabBarIndicator: "#3ddc84",
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  typography: {
    hero: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.3 },
    title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: 0 },
    subtitle: { fontSize: 17, fontWeight: "700" as const, letterSpacing: 0 },
    body: { fontSize: 15, fontWeight: "500" as const, letterSpacing: 0 },
    bodySmall: { fontSize: 13, fontWeight: "500" as const, letterSpacing: 0.1 },
    caption: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.3 },
    label: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
    },
    tabLabel: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.1 },
    score: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.2 },
    bigScore: { fontSize: 48, fontWeight: "800" as const, letterSpacing: -0.5 },
  },

  // Touch targets — minimum 44pt per Material guidelines
  touch: {
    minHeight: 48,
    minWidth: 48,
  },
} as const;