import type { ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

function resolveVariant(raw: string | undefined): AppVariant {
  if (raw === "development" || raw === "preview" || raw === "production") {
    return raw;
  }
  return "production";
}

const appVariant = resolveVariant(process.env.APP_VARIANT);

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

const config: ExpoConfig = {
  name: variant.appName,
  slug: "shotten-mobile",
  scheme: variant.scheme,
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: variant.iosBundleIdentifier,
    supportsTablet: false
  },
  android: {
    package: variant.androidPackage,
    predictiveBackGestureEnabled: false
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true
  },
  extra: {
    appVariant,
    eas: {
      projectId: "cbdf84f5-b6f7-4d4c-a4bb-871ff4575622"
    }
  }
};

export default config;
