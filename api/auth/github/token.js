// Step 3: the page picks up the GitHub token once (the cookie is deleted right away) and
// signs in to Firebase with it
import { cookie, readCookie, sendJson } from '../../_github-oauth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const token = readCookie(req, 'gh_oauth_token');
  const clear = [cookie('gh_oauth_token', '', 0)];
  if (!token) return sendJson(res, 404, { error: 'no_token' }, clear);
  sendJson(res, 200, { accessToken: token }, clear);
}
