// Read-only proxy to the GitHub API. The token lives only on the server
// (GITHUB_TOKEN); the browser proves who it is with its Firebase ID token.
// Runs as a Vercel function in production and via the Vite dev plugin locally.
import { createRequire } from 'module';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const require = createRequire(import.meta.url);
const students = require('../src/data/students.json');
const teacherIds = require('../src/data/teachers.json');

const ORG = process.env.GITHUB_ORG || 'classroom-programacion-web';
const TEMPLATE_REPO = 'tareas-template';
const FIREBASE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Only the endpoints src/services/githubApi.js uses, inside the class org
const ALLOWED_PATH = new RegExp(
  `^repos/${ORG}/([A-Za-z0-9._-]+)/(commits|git/trees/[A-Za-z0-9._-]+|git/blobs/[0-9a-f]{40})$`
);
const ALLOWED_PARAMS = new Set(['per_page', 'path', 'since', 'until', 'recursive']);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// Numeric GitHub id of the signed-in user, or null if the Firebase token is missing or invalid
async function callerGithubId(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_KEYS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return payload.firebase?.identities?.['github.com']?.[0] ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  if (!process.env.GITHUB_TOKEN) return send(res, 500, { error: 'GITHUB_TOKEN is not configured' });

  const target = new URL(req.url, 'http://localhost').searchParams.get('path') || '';
  const [path, rawQuery = ''] = target.split('?');
  const match = path.match(ALLOWED_PATH);
  if (!match || path.split('/').includes('..')) return send(res, 400, { error: 'Path not allowed' });

  const githubId = await callerGithubId(req);
  if (!githubId) return send(res, 401, { error: 'Login required' });

  // The teacher reads every repo; a student only their own and the template it is compared with
  const repo = match[1].toLowerCase();
  if (!teacherIds.includes(githubId)) {
    const student = students.find(s => s.githubId && s.githubId === githubId);
    if (!student || (repo !== student.repoName.toLowerCase() && repo !== TEMPLATE_REPO)) {
      return send(res, 403, { error: 'Forbidden' });
    }
  }

  const query = new URLSearchParams(
    [...new URLSearchParams(rawQuery)].filter(([key]) => ALLOWED_PARAMS.has(key))
  ).toString();
  const upstream = await fetch(`https://api.github.com/${path}${query ? `?${query}` : ''}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });
  send(res, upstream.status, await upstream.text());
}
