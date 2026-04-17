const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const apiKey = process.env.MISTRAL_API_KEY;

  // Get version and commit hash for update checking
  const version = getVersion();
  const commitHash = getCommitHash();

  // Get last 10 commits with their dates, then filter out [redacted] ones
  const rawCommits = getRecentCommits(10);
  const commits = rawCommits.filter(c => !c.message.includes('[redacted]')).slice(0, 5);
  console.log('Recent commits:');
  commits.forEach(c => console.log(`  - [${c.date}] ${c.message}`));

  let releases;

  // Check if Mistral AI is available and API key is present
  const hasMistral = await checkMistralAvailability();
  const hasApiKey = !!apiKey;

  if (!hasMistral || !hasApiKey) {
    const reason = !hasMistral ? 'Mistral AI package not available' : 'MISTRAL_API_KEY not found';
    console.warn(`⚠️  ${reason} - skipping AI changelog`);
    releases = [];
  } else {
    // Generate changelog via Mistral AI with retries
    console.log('\nGenerating changelog via Mistral AI...');
    try {
      const { Mistral } = await import('@mistralai/mistralai');
      releases = await generateChangelog(commits, apiKey, Mistral);
      console.log('Generated releases:');
      releases.forEach(r => console.log(`  - [${r.date}] ${r.changes.length} bullet(s)`));
    } catch (error) {
      console.warn('⚠️  Failed to generate AI changelog:', error.message);
      releases = [];
    }
  }

  // Build version info
  const versionInfo = {
    version,
    commitHash,
    releases,
  };

  // Write to file
  const outputPath = path.join(process.cwd(), 'public', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  console.log(`\n✅ Version info generated:`);
  console.log(`  Version: ${version}`);
  console.log(`  Commit: ${commitHash}`);
  console.log(`  Releases: ${releases.length}`);
  console.log(`  Output: ${outputPath}`);
}

async function checkMistralAvailability() {
  try {
    // Try to import the package to check if it's available
    await import('@mistralai/mistralai');
    return true;
  } catch (error) {
    // Package not available - this is expected in Cloudflare build environment
    return false;
  }
}

function getVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return `no-git-${Date.now()}`;
  }
}

function getRecentCommits(count = 5) {
  try {
    // Get full commit message (including body) and ISO date for each commit
    // Use a unique delimiter to separate commits
    const output = execSync(
      `git log -${count} --pretty=format:"%B|||DATEDELIM|||%aI|||COMMITDELIM|||"`,
      { encoding: 'utf8' }
    );
    return output
      .split('|||COMMITDELIM|||')
      .filter(Boolean)
      .map(entry => {
        const [message, date] = entry.split('|||DATEDELIM|||');
        return {
          message: message.trim(),
          date: date.trim()
        };
      });
  } catch {
    return [];
  }
}

async function generateChangelog(commits, apiKey, Mistral) {
  if (commits.length === 0) {
    throw new Error('No commits found to generate changelog');
  }

  const client = new Mistral({ apiKey });

  const prompt = `Convert these git commit messages into user-friendly release notes in English.

Rules:
- For each commit, provide 1-4 bullet points depending on how much content there is
- Start each bullet with an emoji
- Focus on what the user experiences, not technical details
- Keep each bullet under 80 characters
- Don't include commit hashes or technical jargon
- Use present tense (e.g., "Adds" not "Added")
- Format: Return a JSON array where each item has "index" (0-based) and "bullets" (array of strings)
- Return ONLY valid JSON, no markdown code blocks or extra text

Example output:
[{"index":0,"bullets":["🎨 New design for the home screen","⚡ Faster loading times"]},{"index":1,"bullets":["🐛 Fixes a crash on startup"]}]

Commits:
${commits.map((c, i) => `${i}. ${c.message}`).join('\n')}`;

  let parsed;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;

    try {
      // Remove potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error(`Attempt ${attempt}: Failed to parse Mistral response as JSON:`, content);
      if (attempt === maxRetries) {
        throw new Error('Mistral returned invalid JSON after retries');
      }
      continue;
    }

    const coveredCount = commits.filter((_, index) => {
      const item = parsed.find(p => p.index === index);
      return Array.isArray(item?.bullets) && item.bullets.length > 0;
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

  // Map parsed response back to commits, dropping any that weren't covered
  const releases = commits
    .map((commit, index) => {
      const item = parsed.find(p => p.index === index);
      if (!Array.isArray(item?.bullets) || item.bullets.length === 0) {
        return null;
      }
      return {
        date: commit.date,
        changes: item.bullets,
      };
    })
    .filter(Boolean);

  return releases;
}

main().catch(err => {
  console.error('Failed to generate version info:', err.message);
  process.exit(1);
});
