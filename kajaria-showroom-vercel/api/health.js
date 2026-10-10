'use strict';

const { requireMethod, sendJson, setSecurityHeaders } = require('../lib/api');

module.exports = function health(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['GET'])) return;
  return sendJson(res, 200, { ok: true, platform: 'vercel' });
};
