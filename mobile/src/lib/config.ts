export const DEFAULT_API_BASE_URL = "https://shotten.taltiko.com";

export function resolveApiBaseUrl(rawValue = process.env.EXPO_PUBLIC_API_BASE_URL): string {
  const trimmed = rawValue?.trim();

  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
