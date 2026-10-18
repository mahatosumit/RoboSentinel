import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const files = ['server.js'];
for (const folder of ['src', 'public', 'scripts', 'test']) {
  for (const file of await readdir(new URL(`${folder}/`, root))) {
    if (file.endsWith('.js')) files.push(`${folder}/${file}`);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checks passed for ${files.length} JavaScript files. This is not a linter or typechecker.`);
