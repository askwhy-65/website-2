'use strict';

const { clearSessionCookie, requireMethod, sendJson, setSecurityHeaders } = require('../../lib/api');

module.exports = function adminLogout(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['POST'])) return;
  res.setHeader('Set-Cookie', clearSessionCookie());
  return sendJson(res, 200, { ok: true });
};
