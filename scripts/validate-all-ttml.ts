import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTTML } from '../packages/ttml-engine/src/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ttmlDir = path.join(rootDir, 'database', 'ttml');
const inboxDir = path.join(rootDir, 'database', 'inbox');

let hasError = false;
let validatedCount = 0;

function validateDir(dirPath: string, label: string) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.ttml'));
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const result = validateTTML(content);
    validatedCount++;
    if (!result.valid) {
      hasError = true;
      console.error(`[INVALID] [${label}] ${file}: ${result.error}`);
    } else {
      console.log(`[VALID] [${label}] ${file}`);
    }
  }
}

console.log('[Validator] Scanning database TTML files...');
validateDir(ttmlDir, 'ttml');
validateDir(inboxDir, 'inbox');
console.log(`[Validator] Finished checking ${validatedCount} file(s).`);

if (hasError) {
  console.error('[Validator] Validation failed. One or more files have errors.');
  process.exit(1);
} else {
  console.log('[Validator] All TTML files passed validation.');
  process.exit(0);
}
