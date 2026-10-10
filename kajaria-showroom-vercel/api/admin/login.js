'use strict';

const {
  env,
  makeSessionCookie,
  readJson,
  requireMethod,
  safeEqual,
  sendJson,
  setSecurityHeaders
} = require('../../lib/api');

module.exports = async function adminLogin(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['POST'])) return;

  const expectedUsername = env('ADMIN_USERNAME');
  const expectedPassword = env('ADMIN_PASSWORD');
  const secret = env('SESSION_SECRET');
  if (!expectedUsername || !expectedPassword || !secret || secret.length < 32) {
    return sendJson(res, 503, {
      error: 'Admin is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a SESSION_SECRET of at least 32 characters.'
    });
  }

  try {
    const body = await readJson(req);
    const username = String(body.username || '');
    const password = String(body.password || '');

    if (!safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
      return sendJson(res, 401, { error: 'Incorrect username or password.' });
    }

    res.setHeader('Set-Cookie', makeSessionCookie(username));
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: 'Invalid sign-in request.' });
  }
};
