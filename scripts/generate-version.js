const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const apiKey = process.env.MISTRAL_API_KEY;

  // Get version and commit hash for update checking
  const version = getVersion();
  const commitHash = getCommitHash();

  // Get last 5 commits with their dates
  const commits = getRecentCommits(5);
  console.log('Recent commits:');
  commits.forEach(c => console.log(`  - [${c.date}] ${c.message}`));

  let releases;

  // Check if Mistral AI is available and API key is present
  const hasMistral = await checkMistralAvailability();
  const hasApiKey = !!apiKey;

  if (!hasMistral || !hasApiKey) {
    const reason = !hasMistral ? 'Mistral AI package not available' : 'MISTRAL_API_KEY not found';
    console.warn(`⚠️  ${reason} - using basic changelog format`);
    // Fallback: create basic changelog from commit messages
    releases = commits.map(commit => ({
      date: commit.date,
      changes: [`📝 ${commit.message.split('\n')[0]}`], // Use first line only as fallback
    }));
  } else {
    // Generate changelog via Mistral AI
    console.log('\nGenerating changelog via Mistral AI...');
    try {
      const { Mistral } = await import('@mistralai/mistralai');
      releases = await generateChangelog(commits, apiKey, Mistral);
      console.log('Generated releases:');
      releases.forEach(r => console.log(`  - [${r.date}] ${r.changes.length} bullet(s)`));
    } catch (error) {
      console.warn('⚠️  Failed to generate AI changelog, using basic format:', error.message);
      // Fallback on error
      releases = commits.map(commit => ({
        date: commit.date,
        changes: [`📝 ${commit.message.split('\n')[0]}`],
      }));
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

  const response = await client.chat.complete({
    model: 'mistral-small-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  
  // Parse JSON response
  let parsed;
  try {
    // Remove potential markdown code blocks
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleanContent);
  } catch (e) {
    console.error('Failed to parse Mistral response as JSON:', content);
    throw new Error('Mistral returned invalid JSON');
  }

  // Map parsed response back to commits
  const releases = commits.map((commit, index) => {
    const item = parsed.find(p => p.index === index);
    const changes = item?.bullets || [`📝 ${commit.message}`];
    return {
      date: commit.date,
      changes,
    };
  });

  return releases;
}

main().catch(err => {
  console.error('Failed to generate version info:', err.message);
  process.exit(1);
});
