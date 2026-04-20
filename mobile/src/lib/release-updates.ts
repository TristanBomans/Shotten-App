import type { GithubRelease, ReleaseScope } from "./types";

const STABLE_TAG_REGEX = /^mobile-v(\d+)\.(\d+)\.(\d+)$/;

type SemverTuple = [number, number, number];

export interface AndroidRelease {
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt: string | null;
  prerelease: boolean;
  apkDownloadUrl: string;
}

export interface ReleaseUpdateStatus {
  latestRelease: AndroidRelease | null;
  updateAvailable: boolean;
}

function parseSemverTuple(value: string): SemverTuple | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (![major, minor, patch].every(Number.isFinite)) {
    return null;
  }

  return [major, minor, patch];
}

function compareSemver(left: SemverTuple, right: SemverTuple): number {
  if (left[0] !== right[0]) return left[0] - right[0];
  if (left[1] !== right[1]) return left[1] - right[1];
  return left[2] - right[2];
}

function getAndroidApkDownloadUrl(release: GithubRelease): string | null {
  const apkAsset = release.assets.find((asset) => {
    const contentType = asset.contentType.toLowerCase();
    const name = asset.name.toLowerCase();
    return contentType === "application/vnd.android.package-archive" || name.endsWith(".apk");
  });

  return apkAsset?.browserDownloadUrl ?? null;
}

function toTimestamp(isoString: string | null): number {
  if (!isoString) {
    return 0;
  }

  const ts = Date.parse(isoString);
  return Number.isFinite(ts) ? ts : 0;
}

export function isStableReleaseTag(tagName: string): boolean {
  return STABLE_TAG_REGEX.test(tagName);
}

export function parseStableTagSemver(tagName: string): SemverTuple | null {
  const match = tagName.match(STABLE_TAG_REGEX);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function filterAndroidReleases(releases: GithubRelease[], scope: ReleaseScope): AndroidRelease[] {
  return releases
    .filter((release) => !release.draft)
    .map((release) => {
      const apkDownloadUrl = getAndroidApkDownloadUrl(release);
      if (!apkDownloadUrl) {
        return null;
      }

      if (scope === "stable" && !isStableReleaseTag(release.tagName)) {
        return null;
      }

      return {
        tagName: release.tagName,
        name: release.name,
        htmlUrl: release.htmlUrl,
        publishedAt: release.publishedAt,
        prerelease: release.prerelease,
        apkDownloadUrl,
      } satisfies AndroidRelease;
    })
    .filter((release): release is AndroidRelease => release !== null)
    .sort((left, right) => toTimestamp(right.publishedAt) - toTimestamp(left.publishedAt));
}

export function resolveInstalledReleaseTag(appVersion: string, embeddedReleaseTag?: string): string {
  const trimmedTag = embeddedReleaseTag?.trim();
  if (trimmedTag) {
    return trimmedTag;
  }

  return `mobile-v${appVersion}`;
}

export function resolveReleaseUpdateStatus(input: {
  releases: GithubRelease[];
  scope: ReleaseScope;
  installedAppVersion: string;
  installedReleaseTag: string;
}): ReleaseUpdateStatus {
  const filtered = filterAndroidReleases(input.releases, input.scope);
  const latestRelease = filtered[0] ?? null;
  if (!latestRelease) {
    return { latestRelease: null, updateAvailable: false };
  }

  if (input.scope === "all") {
    return {
      latestRelease,
      updateAvailable: latestRelease.tagName !== input.installedReleaseTag,
    };
  }

  const latestStableSemver = parseStableTagSemver(latestRelease.tagName);
  const installedSemver = parseSemverTuple(input.installedAppVersion);

  if (!latestStableSemver || !installedSemver) {
    return { latestRelease, updateAvailable: false };
  }

  return {
    latestRelease,
    updateAvailable: compareSemver(latestStableSemver, installedSemver) > 0,
  };
}
