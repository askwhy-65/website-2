'use strict';

const { requireMethod, sendJson, setSecurityHeaders, siteConfig } = require('../lib/api');

module.exports = function getSiteConfig(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['GET'])) return;
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return sendJson(res, 200, siteConfig());
};
