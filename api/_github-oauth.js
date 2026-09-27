// Shared helpers for the GitHub sign-in flow in api/auth/github/*.
// (Files starting with "_" are not deployed as functions by Vercel.)
//
// Why a server flow: Firebase's popup keeps its state in the popup's sessionStorage.
// On an iPhone with the GitHub app installed, iOS opens the app to authorize and then
// returns in a *different* Safari tab, so the state is gone ("missing initial state").
// Here the state lives in a cookie on our own domain, which every tab shares.

// The OAuth app Firebase is configured with: Firebase only accepts tokens it issued
export const CLIENT_ID = 'Ov23liMOxxOLkkrgB8n9';
const COOKIE_PATH = '/api/auth/github';

export function originOf(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `https://${host}`;
}

export function callbackUrl(req) {
  return `${originOf(req)}/api/auth/github/callback`;
}

export function cookie(name, value, maxAgeSeconds) {
  return `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`;
}

export function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function redirect(res, location, cookies = []) {
  res.statusCode = 302;
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

export function sendJson(res, status, body, cookies = []) {
  res.statusCode = status;
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
