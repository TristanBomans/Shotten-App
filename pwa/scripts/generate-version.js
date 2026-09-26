const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Look further back than we show: internal commits (CI, chores) are dropped.
const MAX_RELEASE_COMMITS = 12;
const MAX_RELEASES = 6;
const INTERNAL_COMMIT_PATTERN = /^(ci|chore|build|test|refactor|docs|style)(\(.+\))?!?:|\b(workflow|github actions|trigger (a )?(fresh |new )?(pwa )?build|bump|lockfile|wrangler|cloudflare pages preview)\b/i;
const OPENROUTER_MODEL = 'openai/gpt-6-luna';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_AI_ATTEMPTS = 4;

function isMobileReleaseRef(ref) {
  if (!ref) return false;
  return /^mobile-v[^/]+$/.test(ref) || /^mobile-preview[^/]*$/.test(ref);
}

function resolveCurrentGitRef() {
  const candidates = [
    process.env.GITHUB_REF_NAME,
    process.env.CF_GIT_TAG,
    process.env.CF_PAGES_BRANCH,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isMobileReleaseRef(candidate)) {
      return candidate;
    }
  }

  const githubRef = process.env.GITHUB_REF;
  if (githubRef && githubRef.startsWith('refs/tags/')) {
    const tag = githubRef.replace('refs/tags/', '');
    if (isMobileReleaseRef(tag)) {
      return tag;
    }
  }

  return null;
}

async function main() {
  const releaseRef = resolveCurrentGitRef();
  if (releaseRef) {
    console.log(`Skipping version.json generation for mobile release ref: ${releaseRef}`);
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  // Ensure full git history is available (Cloudflare Pages uses shallow clones)
  try {
    execSync('git fetch --unshallow 2>/dev/null', { encoding: 'utf8' });
  } catch {}

  // The build number is the commit count, so it increases on every push.
  const build = getBuildNumber('HEAD');
  const commitHash = getCommitHash();

  // Read the complete history before filtering so redacted commits do not
  // reduce the number of visible release notes.
  const rawCommits = getRecentCommits();
  const commits = rawCommits
    .filter(c => !c.message.includes('[redacted]'))
    .slice(0, MAX_RELEASE_COMMITS);
  console.log('Recent commits:');
  commits.forEach(c => console.log(`  - [${c.date}] ${c.message}`));

  let releases;

  if (!apiKey) {
    console.warn('⚠️  OPENROUTER_API_KEY not found - skipping AI changelog');
    releases = commits
      .filter(c => !INTERNAL_COMMIT_PATTERN.test(getSubject(c.message)))
      .map(createFallbackRelease);
  } else {
    console.log(`\nGenerating changelog via OpenRouter (${OPENROUTER_MODEL}, low reasoning)...`);
    try {
      releases = await generateChangelog(commits, apiKey);
      console.log('Generated releases:');
      releases.forEach(r => console.log(`  - [${r.date}] ${r.changes.length} bullet(s)`));
    } catch (error) {
      console.warn('⚠️  Failed to generate AI changelog:', error.message);
      releases = commits
        .filter(c => !INTERNAL_COMMIT_PATTERN.test(getSubject(c.message)))
        .map(createFallbackRelease);
    }
  }
  releases = releases.slice(0, MAX_RELEASES);

  // Build version info
  const versionInfo = {
    version: String(build),
    build,
    commitHash,
    releases,
  };

  // Write to file
  const outputPath = path.join(process.cwd(), 'public', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  console.log(`\n✅ Version info generated:`);
  console.log(`  Build: ${build}`);
  console.log(`  Commit: ${commitHash}`);
  console.log(`  Releases: ${releases.length}`);
  console.log(`  Output: ${outputPath}`);
}

function getBuildNumber(ref) {
  try {
    return Number(execSync(`git rev-list --count ${ref}`, { encoding: 'utf8' }).trim()) || 0;
  } catch {
    return 0;
  }
}

function getSubject(message) {
  return message.split(/\r?\n/, 1)[0].trim();
}

function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return `no-git-${Date.now()}`;
  }
}

function getRecentCommits(count) {
  try {
    // Get full commit message (including body) and ISO date for each commit
    // Use a unique delimiter to separate commits
    const output = execSync(
      `git log${count ? ` -${count}` : ''} --pretty=format:"%H|||HASHDELIM|||%B|||DATEDELIM|||%aI|||COMMITDELIM|||"`,
      { encoding: 'utf8' }
    );
    return output
      .split('|||COMMITDELIM|||')
      .filter(Boolean)
      .map(entry => {
        const [hash, rest] = entry.split('|||HASHDELIM|||');
        const [message, date] = rest.split('|||DATEDELIM|||');
        return {
          hash: hash.trim(),
          message: message.trim(),
          date: date.trim()
        };
      });
  } catch {
    return [];
  }
}

function createFallbackRelease(commit) {
  const subject = getSubject(commit.message);
  return {
    build: getBuildNumber(commit.hash),
    date: commit.date,
    changes: [`🛠️ ${subject || 'Includes the latest improvements'}`],
  };
}

async function generateChangelog(commits, apiKey) {
  if (commits.length === 0) {
    throw new Error('No commits found to generate changelog');
  }

  const prompt = `Convert these git commit messages into user-friendly release notes in English.

Rules:
- Return exactly one item for every commit index. Never omit an index.
- Set "userFacing" to false for commits a player of the app would never notice: CI/CD, deploys, build or preview config, dependency bumps, refactors, tests, docs, tooling, "trigger build" commits. Give those an empty "bullets" array.
- For each user-facing commit, provide 1-4 bullet points depending on how much content there is
- Start each bullet with an emoji
- Focus on what the user experiences, not technical details
- Keep each bullet under 80 characters
- Don't include commit hashes or technical jargon
- Use present tense (e.g., "Adds" not "Added")
- Format: Return a JSON object with a "releases" array. Each item has "index" (0-based), "userFacing" (boolean) and "bullets" (array of strings)
- Return ONLY valid JSON, no markdown code blocks or extra text

Example output:
{"releases":[{"index":0,"userFacing":true,"bullets":["🎨 New design for the home screen","⚡ Faster loading times"]},{"index":1,"userFacing":false,"bullets":[]},{"index":2,"userFacing":true,"bullets":["🐛 Fixes a crash on startup"]}]}

Commits:
${commits.map((c, i) => `${i}. ${c.message}`).join('\n')}`;

  let parsed;
  const maxRetries = MAX_AI_ATTEMPTS;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let content;
    try {
      content = await requestOpenRouter(prompt, apiKey);
    } catch (apiError) {
      console.warn(`  Attempt ${attempt}: API error: ${apiError.message}`);
      if (parsed) {
        console.warn('  Using partial result from previous attempt');
        break;
      }
      if (attempt === maxRetries || !apiError.retryable) {
        throw apiError;
      }
      const delayMs = apiError.retryAfterMs || 10000 * (2 ** (attempt - 1));
      console.warn(`  Retrying in ${Math.ceil(delayMs / 1000)}s...`);
      await delay(delayMs);
      continue;
    }

    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanContent);
      parsed = Array.isArray(result) ? result : result.releases;
    } catch (e) {
      console.error(`  Attempt ${attempt}: Failed to parse OpenRouter response as JSON:`, content);
      if (attempt === maxRetries) {
        if (parsed) {
          console.warn('  Using partial result from previous attempt');
          break;
        }
        throw new Error('OpenRouter returned invalid JSON after retries');
      }
      continue;
    }

    const parsedItems = Array.isArray(parsed) ? parsed : [];
    const coveredCount = commits.filter((_, index) => {
      const item = parsedItems.find(p => Number(p?.index) === index);
      return item?.userFacing === false || (Array.isArray(item?.bullets) && item.bullets.length > 0);
    }).length;

    if (coveredCount === commits.length) {
      console.log(`  All ${commits.length} commits covered on attempt ${attempt}`);
      break;
    }

    console.warn(`  Attempt ${attempt}: Only ${coveredCount}/${commits.length} commits covered, retrying...`);

    if (attempt === maxRetries) {
      console.warn('  Max retries reached, using partial coverage');
    }
  }

  const releases = commits
    .map((commit, index) => {
      const item = Array.isArray(parsed)
        ? parsed.find(p => Number(p?.index) === index)
        : null;
      if (item?.userFacing === false) return null;
      if (!item && INTERNAL_COMMIT_PATTERN.test(getSubject(commit.message))) return null;

      const bullets = Array.isArray(item?.bullets)
        ? item.bullets.filter(bullet => typeof bullet === 'string' && bullet.trim())
        : [];

      return {
        build: getBuildNumber(commit.hash),
        date: commit.date,
        changes: bullets.length > 0 ? bullets : createFallbackRelease(commit).changes,
      };
    })
    .filter(Boolean);

  return releases;
}

async function requestOpenRouter(prompt, apiKey) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://shotten.taltiko.com',
      'X-Title': 'Shotten release notes',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      reasoning: { effort: 'low', exclude: true },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'shotten_release_notes',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              releases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer' },
                    userFacing: { type: 'boolean' },
                    bullets: {
                      type: 'array',
                      items: { type: 'string' },
                      maxItems: 4,
                    },
                  },
                  required: ['index', 'userFacing', 'bullets'],
                  additionalProperties: false,
                },
              },
            },
            required: ['releases'],
            additionalProperties: false,
          },
        },
      },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    const error = new Error(`OpenRouter returned ${response.status}: ${body}`);
    error.retryable = response.status === 429 || response.status >= 500;
    error.retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
    throw error;
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned no release-note content');
  }
  return content;
}

function parseRetryAfter(value) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Failed to generate version info:', err.message);
  process.exit(1);
});
