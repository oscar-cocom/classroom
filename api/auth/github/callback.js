// Step 2: GitHub sends the student back here. Check the state, trade the code for a token
// (the client secret never leaves the server) and hand the token over through a short-lived
// cookie that only /api/auth/github/token can read.
import { CLIENT_ID, callbackUrl, cookie, readCookie, redirect } from '../../_github-oauth.js';

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const clearState = cookie('gh_oauth_state', '', 0);
  const fail = reason => redirect(res, `/?auth_error=${encodeURIComponent(reason)}`, [clearState]);

  if (params.get('error')) return fail(params.get('error'));

  const code = params.get('code');
  const state = params.get('state');
  const savedState = readCookie(req, 'gh_oauth_state');
  if (!code || !state || !savedState || state !== savedState) return fail('state');

  if (!process.env.GITHUB_OAUTH_CLIENT_SECRET) return fail('config');

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(req),
      }),
    });
    const data = await response.json();
    if (!data.access_token) return fail('exchange');
    redirect(res, '/?auth=github', [clearState, cookie('gh_oauth_token', data.access_token, 120)]);
  } catch {
    fail('exchange');
  }
}
