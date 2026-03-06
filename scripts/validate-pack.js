// [META] since:2026-03 | owner:release-team | stable:true
// [WHY] Validate package contents before publishing to ensure all required files are included

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const REQUIRED_FILES = [
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'mycodemap.config.schema.json'
];

const REQUIRED_DIRS = [
  'dist/'
];

function validate() {
  console.log('🔍 Validating package contents...');

  // Change to project root
  process.chdir(rootDir);

  // Run npm pack dry-run
  let output;
  try {
    output = execSync('npm pack --dry-run --json', { encoding: 'utf-8', timeout: 60000 });
  } catch (error) {
    console.error('❌ Failed to run npm pack --dry-run --json');
    process.exit(1);
  }

  let packInfo;
  try {
    packInfo = JSON.parse(output);
  } catch (error) {
    console.error('❌ Failed to parse pack output');
    process.exit(1);
  }

  // Validate packInfo structure
  if (!packInfo || packInfo.length === 0 || !packInfo[0].files) {
    console.error('❌ No package files found in npm pack output');
    process.exit(1);
  }

  const files = packInfo[0].files.map(f => f.path);

  console.log('📦 Packaged files count:', files.length);

  // Check required files
  const missing = [];
  for (const reqFile of REQUIRED_FILES) {
    if (!files.some(p => p === reqFile || p.startsWith(reqFile + '/'))) {
      missing.push(reqFile);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required files:', missing.join(', '));
    process.exit(1);
  }

  // Check required directories
  const missingDirs = [];
  for (const reqDir of REQUIRED_DIRS) {
    if (!files.some(p => p.startsWith(reqDir))) {
      missingDirs.push(reqDir);
    }
  }

  if (missingDirs.length > 0) {
    console.error('❌ Missing required directories:', missingDirs.join(', '));
    process.exit(1);
  }

  console.log('✅ Package validation passed!');
  console.log('   Required files:', REQUIRED_FILES.join(', '));
  console.log('   Required dirs:', REQUIRED_DIRS.join(', '));
}

validate();
