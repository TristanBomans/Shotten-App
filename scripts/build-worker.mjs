import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve(".open-next");
const assetsDir = path.join(sourceDir, "assets");

function runCommand(command) {
    console.log(`Executing: ${command}`);
    execSync(command, { stdio: "inherit" });
}

function copyDir(src, dest) {
    if (fs.existsSync(src)) {
        console.log(`Copying ${src} to ${dest}...`);
        fs.cpSync(src, dest, { recursive: true });
    } else {
        console.warn(`Warning: Source directory ${src} does not exist.`);
    }
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        console.log(`Copying ${src} to ${dest}...`);
        fs.cpSync(src, dest);
    } else {
        console.warn(`Warning: Source file ${src} does not exist.`);
    }
}

try {
    // 0. Unshallow git repository if needed (for Cloudflare Pages shallow clones)
    console.log("Ensuring git history is available...");
    try {
        execSync("git fetch --unshallow", { stdio: "inherit" });
        console.log("✓ Git history expanded");
    } catch (error) {
        // Ignore errors - repository might not be shallow or git might not be available
        console.log("ℹ Git unshallow not needed or failed (this is OK)");
    }

    // 1. Generate version file (specific for Shotten-App)
    console.log("Generating version info...");
    runCommand("node scripts/generate-version.js");

    // 2. Build the OpenNext Cloudflare worker
    console.log("Building OpenNext Cloudflare worker...");
    // Use explicit npx to ensure we use the local version
    runCommand("npx opennextjs-cloudflare build");

    // 3. Prepare destination
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 4. Copy worker.js to assets/_worker.js
    const workerSrc = path.join(sourceDir, "worker.js");
    const workerDest = path.join(assetsDir, "_worker.js");
    copyFile(workerSrc, workerDest);

    // 5. Copy required directories into assets
    // This is crucial: we copy the folders that worker.js imports from
    const dirsToCopy = ["cloudflare", "middleware", "server-functions", ".build"];

    for (const dir of dirsToCopy) {
        const srcPath = path.join(sourceDir, dir);
        const destPath = path.join(assetsDir, dir);
        // Ensure destination dir exists (or cpSync handles it)
        copyDir(srcPath, destPath);
    }

    // 6. Copy .next/static to assets/_next/static
    // OpenNext might already do this, but the example script does it explicitly
    const nextStaticDir = path.resolve(".next", "static");
    const destStaticDir = path.join(assetsDir, "_next", "static");
    if (fs.existsSync(nextStaticDir)) {
        console.log(`Copying ${nextStaticDir} to ${destStaticDir}...`);
        if (!fs.existsSync(destStaticDir)) {
            fs.mkdirSync(destStaticDir, { recursive: true });
        }
        fs.cpSync(nextStaticDir, destStaticDir, { recursive: true });
    } else {
        console.warn(`Warning: .next/static not found at ${nextStaticDir}`);
    }

    // 7. Copy public assets to assets/
    const publicDir = path.resolve("public");
    if (fs.existsSync(publicDir)) {
        console.log(`Copying contents of ${publicDir} to ${assetsDir}...`);
        const publicFiles = fs.readdirSync(publicDir);
        for (const file of publicFiles) {
            const src = path.join(publicDir, file);
            const dest = path.join(assetsDir, file);
            // Skip if destination already exists to avoid overwriting build artifacts
            if (!fs.existsSync(dest)) {
                console.log(`Copying ${src} to ${dest}...`);
                fs.cpSync(src, dest, { recursive: true });
            }
        }
    }

    console.log("Build and copy process complete!");
} catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
}
