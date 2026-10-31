#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const baseUrl = valueOf('--base-url', 'http://localhost:3000').replace(/\/+$/, '');
const casesDir = path.resolve(valueOf('--cases', 'src/test/resources/contract'));
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

const files = fs.readdirSync(casesDir).filter((name) => name.endsWith('.json')).sort();

for (const file of files) {
  const fullPath = path.join(casesDir, file);
  const contractCase = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  if (contractCase.expected && !force) {
    process.stdout.write(`skip ${contractCase.name || file} (expected exists, use --force)\n`);
    continue;
  }

  const response = await fetch(`${baseUrl}${contractCase.path}`, {
    method: contractCase.method || 'GET',
    headers: contractCase.headers || {},
    body: contractCase.body ?? undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  contractCase.expected = { status: response.status, json };
  process.stdout.write(
    `${contractCase.name || file} ${contractCase.method || 'GET'} ${contractCase.path} -> ${response.status}\n`,
  );

  if (!dryRun) {
    fs.writeFileSync(fullPath, `${JSON.stringify(contractCase, null, 2)}\n`);
  }
}
