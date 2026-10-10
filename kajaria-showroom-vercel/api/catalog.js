'use strict';

const catalog = require('../catalog.json');
const { clean, requireMethod, sendJson, setSecurityHeaders } = require('../lib/api');

module.exports = function getCatalog(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['GET'])) return;

  const query = clean(req.query.q, 80).toLowerCase();
  const category = clean(req.query.category, 40).toLowerCase();
  const items = catalog.filter((item) => {
    const searchable = [item.name, item.category, item.description, ...(item.tags || [])]
      .join(' ')
      .toLowerCase();
    return (!query || searchable.includes(query)) &&
      (!category || item.category.toLowerCase() === category);
  });

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return sendJson(res, 200, { items });
};
