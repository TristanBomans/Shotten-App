const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    return null;
  }
}

function getBuildTimestamp() {
  return new Date().toISOString();
}

function main() {
  const version = getVersion();
  const commitHash = getCommitHash();
  const timestamp = getBuildTimestamp();

  const versionInfo = {
    version,
    commitHash: commitHash || `no-git-${Date.now()}`,
    buildTimestamp: timestamp,
  };

  const outputPath = path.join(process.cwd(), 'public', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  console.log(`Version info generated:`);
  console.log(`  Version: ${versionInfo.version}`);
  console.log(`  Commit: ${versionInfo.commitHash}`);
  console.log(`  Timestamp: ${versionInfo.buildTimestamp}`);
  console.log(`  Output: ${outputPath}`);
}

main();
