#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const serverRoot = process.cwd();
const javaRoot = path.resolve(serverRoot, '../server-java');
const samplesPath = path.join(javaRoot, 'scripts/sensitive-cases.json');
const outputPath = path.join(javaRoot, 'src/test/resources/sensitive-cases.json');

process.env.SENSITIVE_WORDS = '测试专用词';

const { findSensitiveWord } = await import(
  pathToFileURL(path.join(serverRoot, 'src/lib/sensitiveFilter.js')).href
);

const samples = JSON.parse(fs.readFileSync(samplesPath, 'utf8'));
const cases = samples.map((text) => ({
  text,
  expected: Boolean(findSensitiveWord(text)),
}));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(cases, null, 2)}\n`);
process.stdout.write(`recorded ${cases.length} cases -> ${outputPath}\n`);
