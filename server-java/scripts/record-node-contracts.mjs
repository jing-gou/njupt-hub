#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.RECORD_BASE_URL || 'http://localhost:3200').replace(/\/+$/, '');
const mailpitUrl = (process.env.MAILPIT_URL || 'http://localhost:8025').replace(/\/+$/, '');
const root = process.cwd();
const contractDir = path.join(root, 'src/test/resources/contract');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/contract-manifest.json'), 'utf8'),
);
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const selected = only ? manifest.filter((name) => name === only) : manifest;
if (only && selected.length === 0) {
  console.error(`unknown contract case: ${only}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, url, { headers = {}, body } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined && !Object.keys(finalHeaders).some((key) => key.toLowerCase() === 'content-type')) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: response.status, json };
}

async function loginToken(username) {
  const result = await request('POST', `${baseUrl}/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: { username, password: 'Password123' },
  });
  if (result.status !== 200) {
    throw new Error(`login failed for ${username}: ${result.status} ${JSON.stringify(result.json)}`);
  }
  return result.json.token;
}

async function latestCodeFor(email) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await request('GET', `${mailpitUrl}/api/v1/messages`);
    const messages = list.json.messages || [];
    const match = messages.find((message) =>
      (message.To || []).some((to) => to.Address === email));
    if (match) {
      const detail = await request('GET', `${mailpitUrl}/api/v1/message/${match.ID}`);
      const text = detail.json.Text || detail.json.HTML || '';
      const code = String(text).match(/\b\d{6}\b/);
      if (code) {
        return code[0];
      }
    }
    await sleep(250);
  }
  throw new Error(`verification code not found for ${email}`);
}

async function sendCode(type, email) {
  const endpoint = type === 'reset'
    ? '/api/auth/send-reset-password-code'
    : '/api/auth/send-verification-code';
  const result = await request('POST', `${baseUrl}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    body: { email },
  });
  if (result.status !== 200) {
    throw new Error(`send code failed: ${result.status} ${JSON.stringify(result.json)}`);
  }
  return latestCodeFor(email);
}

for (const name of selected) {
  const file = path.join(contractDir, `${name}.json`);
  const fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
  const headers = { ...(fixture.headers || {}) };
  const body = fixture.body === undefined ? undefined : structuredClone(fixture.body);

  if (fixture.presetCode) {
    const originalPresetCode = fixture.presetCode.code;
    const code = await sendCode(fixture.presetCode.type, fixture.presetCode.email);
    fixture.presetCode.code = code;
    if (body && body.code === originalPresetCode) {
      body.code = code;
    }
  }

  if (fixture.loginAs) {
    headers.Authorization = `Bearer ${await loginToken(fixture.loginAs)}`;
  }

  let url = `${baseUrl}${fixture.path}`;
  if (fixture.params) {
    const query = new URLSearchParams();
    for (const [key, values] of Object.entries(fixture.params)) {
      for (const value of values) {
        query.append(key, value);
      }
    }
    url += `?${query.toString()}`;
  }

  const result = await request(fixture.method || 'GET', url, {
    headers,
    body,
  });

  fixture.body = body;
  fixture.expected = { status: result.status, json: result.json };
  fs.writeFileSync(file, `${JSON.stringify(fixture, null, 2)}\n`);
  process.stdout.write(`${name} ${result.status}\n`);
}
