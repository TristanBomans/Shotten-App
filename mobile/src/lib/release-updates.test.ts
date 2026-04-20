import { describe, expect, it } from "vitest";
import {
  filterAndroidReleases,
  isStableReleaseTag,
  resolveInstalledReleaseTag,
  resolveReleaseUpdateStatus,
} from "./release-updates";
import type { GithubRelease } from "./types";

function buildRelease(overrides: Partial<GithubRelease> & Pick<GithubRelease, "tagName">): GithubRelease {
  return {
    tagName: overrides.tagName,
    name: overrides.name ?? overrides.tagName,
    htmlUrl: overrides.htmlUrl ?? `https://example.com/releases/${overrides.tagName}`,
    draft: overrides.draft ?? false,
    prerelease: overrides.prerelease ?? false,
    publishedAt: overrides.publishedAt ?? "2026-04-18T10:00:00Z",
    assets: overrides.assets ?? [
      {
        name: `shotten-${overrides.tagName}.apk`,
        contentType: "application/vnd.android.package-archive",
        browserDownloadUrl: `https://example.com/${overrides.tagName}.apk`,
      },
    ],
  };
}

describe("isStableReleaseTag", () => {
  it("accepts mobile-vX.Y.Z tags only", () => {
    expect(isStableReleaseTag("mobile-v1.2.3")).toBe(true);
    expect(isStableReleaseTag("mobile-v1.2.3-alpha.1")).toBe(false);
    expect(isStableReleaseTag("mobile-preview-20260418")).toBe(false);
  });
});

describe("filterAndroidReleases", () => {
  it("keeps only stable Android releases in stable mode", () => {
    const releases: GithubRelease[] = [
      buildRelease({ tagName: "mobile-v0.2.0", publishedAt: "2026-04-18T11:00:00Z" }),
      buildRelease({ tagName: "mobile-preview-ci-20260418-100000", prerelease: true }),
      buildRelease({ tagName: "mobile-v0.1.0-alpha.1", prerelease: true }),
      buildRelease({ tagName: "mobile-v0.1.9", draft: true }),
      buildRelease({
        tagName: "mobile-v0.1.8",
        assets: [
          {
            name: "notes.txt",
            contentType: "text/plain",
            browserDownloadUrl: "https://example.com/notes.txt",
          },
        ],
      }),
    ];

    const filtered = filterAndroidReleases(releases, "stable");

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.tagName).toBe("mobile-v0.2.0");
  });
});

describe("resolveInstalledReleaseTag", () => {
  it("prefers embedded release tag, then falls back to mobile-v{version}", () => {
    expect(resolveInstalledReleaseTag("0.1.0", "mobile-preview-ci-123")).toBe("mobile-preview-ci-123");
    expect(resolveInstalledReleaseTag("0.1.0", "   ")).toBe("mobile-v0.1.0");
  });
});

describe("resolveReleaseUpdateStatus", () => {
  it("detects newer stable releases by semver", () => {
    const releases = [buildRelease({ tagName: "mobile-v0.2.0" })];

    const status = resolveReleaseUpdateStatus({
      releases,
      scope: "stable",
      installedAppVersion: "0.1.0",
      installedReleaseTag: "mobile-v0.1.0",
    });

    expect(status.updateAvailable).toBe(true);
    expect(status.latestRelease?.tagName).toBe("mobile-v0.2.0");
  });

  it("detects new releases in all mode by tag mismatch", () => {
    const releases = [buildRelease({ tagName: "mobile-preview-ci-20260418-100647", prerelease: true })];

    const status = resolveReleaseUpdateStatus({
      releases,
      scope: "all",
      installedAppVersion: "0.1.0",
      installedReleaseTag: "mobile-v0.1.0",
    });

    expect(status.updateAvailable).toBe(true);
  });

  it("stays up to date in all mode when tags match", () => {
    const releases = [buildRelease({ tagName: "mobile-preview-ci-20260418-100647", prerelease: true })];

    const status = resolveReleaseUpdateStatus({
      releases,
      scope: "all",
      installedAppVersion: "0.1.0",
      installedReleaseTag: "mobile-preview-ci-20260418-100647",
    });

    expect(status.updateAvailable).toBe(false);
  });
});
