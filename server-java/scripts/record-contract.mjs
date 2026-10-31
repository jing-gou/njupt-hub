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
const forceDeviation = args.includes('--force-deviation');

const files = fs.readdirSync(casesDir).filter((name) => name.endsWith('.json')).sort();

for (const file of files) {
  const fullPath = path.join(casesDir, file);
  const contractCase = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  if (contractCase.type === 'deviation' && !forceDeviation) {
    process.stdout.write(
      `skip ${contractCase.name || file} (deviation fixture, use --force-deviation)\n`,
    );
    continue;
  }

  if (contractCase.expected && !force && !dryRun) {
    process.stdout.write(`skip ${contractCase.name || file} (expected exists, use --force)\n`);
    continue;
  }

  const headers = { ...(contractCase.headers || {}) };
  let body;
  if (contractCase.body !== null && contractCase.body !== undefined) {
    body = typeof contractCase.body === 'string'
      ? contractCase.body
      : JSON.stringify(contractCase.body);
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(`${baseUrl}${contractCase.path}`, {
    method: contractCase.method || 'GET',
    headers,
    body,
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
