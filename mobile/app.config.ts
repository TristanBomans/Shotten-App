import type { ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

function resolveOptionalValue(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function resolveVariant(raw: string | undefined): AppVariant {
  if (raw === "development" || raw === "preview" || raw === "production") {
    return raw;
  }
  return "production";
}

const appVariant = resolveVariant(process.env.APP_VARIANT);
const releaseTag = resolveOptionalValue(process.env.RELEASE_TAG);
const releasePublishedAt = resolveOptionalValue(process.env.RELEASE_PUBLISHED_AT);

const VARIANT_CONFIG: Record<
  AppVariant,
  {
    appName: string;
    scheme: string;
    iosBundleIdentifier: string;
    androidPackage: string;
  }
> = {
  development: {
    appName: "Shotten Dev",
    scheme: "shotten-dev",
    iosBundleIdentifier: "com.taltiko.shotten.dev",
    androidPackage: "com.taltiko.shotten.dev"
  },
  preview: {
    appName: "Shotten Preview",
    scheme: "shotten-preview",
    iosBundleIdentifier: "com.taltiko.shotten.preview",
    androidPackage: "com.taltiko.shotten.preview"
  },
  production: {
    appName: "Shotten",
    scheme: "shotten",
    iosBundleIdentifier: "com.taltiko.shotten.prod",
    androidPackage: "com.taltiko.shotten.prod"
  }
};

const variant = VARIANT_CONFIG[appVariant];
const isPreview = appVariant === "preview";
const iconPath = isPreview ? "./assets/icon-preview.png" : "./assets/icon.png";
const adaptiveIconPath = isPreview
  ? "./assets/adaptive-icon-preview.png"
  : "./assets/adaptive-icon.png";

const config: ExpoConfig = {
  name: variant.appName,
  slug: "shotten-mobile",
  scheme: variant.scheme,
  version: "0.1.0",
  icon: iconPath,
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    icon: iconPath,
    bundleIdentifier: variant.iosBundleIdentifier,
    supportsTablet: false
  },
  android: {
    package: variant.androidPackage,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: adaptiveIconPath,
      backgroundColor: "#050508"
    }
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true
  },
  extra: {
    appVariant,
    releaseTag,
    releasePublishedAt,
    eas: {
      projectId: "cbdf84f5-b6f7-4d4c-a4bb-871ff4575622"
    }
  }
};

export default config;
