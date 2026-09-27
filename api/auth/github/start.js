// Step 1: send the student to GitHub's authorize page, remembering a random state in a cookie
import crypto from 'crypto';
import { CLIENT_ID, callbackUrl, cookie, redirect } from '../../_github-oauth.js';

export default function handler(req, res) {
  const state = crypto.randomBytes(24).toString('base64url');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl(req),
    state,
    // No scopes: only the public profile (username and id) is read
    allow_signup: 'false',
    prompt: 'select_account',
  });
  redirect(res, `https://github.com/login/oauth/authorize?${params}`, [cookie('gh_oauth_state', state, 600)]);
}
