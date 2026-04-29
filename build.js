const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isClean = args.includes('--clean');
const isDist = args.includes('--dist');
const isFast = args.includes('--fast');

function run(cmd, cwd) {
    console.log(`\n> Running: ${cmd} in ${cwd || './'}`);
    execSync(cmd, { stdio: 'inherit', cwd });
}

try {
    // Handle Cleaning
    if (isClean) {
        console.log("Cleaning build artifacts...");
        const paths = [
            'backend/dist', 'backend/build', 'backend/backend.spec',
            'frontend/out', 'frontend/.vite'
        ];
        paths.forEach(p => {
            const abs = path.join(__dirname, p);
            if (fs.existsSync(abs)) {
                fs.rmSync(abs, { recursive: true, force: true });
                console.log(`Deleted ${p}`);
            }
        });
        if (args.length === 1) {
            console.log("Clean complete.");
            process.exit(0);
        }
    }

    // 1. Build Backend (Python)
    const backendExe = path.join(__dirname, 'backend/dist/backend.exe');
    if (isFast && fs.existsSync(backendExe)) {
        console.log("\n--- [1/2] Skipping Backend Build (Backend EXE already exists) ---");
    } else {
        console.log("\n--- [1/2] Building Backend (PyInstaller) ---");
        run('.\\.venv\\Scripts\\pyinstaller --onefile --name backend --clean main.py', 'backend');
    }

    // 2. Build Frontend (Electron)
    console.log("\n--- [2/2] Building Frontend (Electron) ---");
    if (isDist) {
        console.log("Creating distributable installer...");
        run('npm run make', 'frontend');
    } else {
        console.log("Packaging application...");
        run('npm run package', 'frontend');
    }

    console.log("\n✅ Build Process Complete!");
} catch (err) {
    console.error("\n❌ Build Failed!");
    console.error(err.message);
    process.exit(1);
}
