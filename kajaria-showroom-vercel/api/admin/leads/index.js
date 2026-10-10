'use strict';

const {
  databaseRequest,
  publicLead,
  requireAdmin,
  requireMethod,
  sendJson,
  setSecurityHeaders
} = require('../../../lib/api');

module.exports = async function adminLeads(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['GET'])) return;
  if (!requireAdmin(req, res)) return;

  try {
    const rows = await databaseRequest('enquiries', {
      query: 'select=id,created_at,name,phone,email,interest,message,status&order=created_at.desc&limit=500'
    });
    return sendJson(res, 200, { leads: rows.map(publicLead) });
  } catch (error) {
    console.error('Could not load enquiries:', error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode === 503 ? error.message : 'Could not load enquiries.'
    });
  }
};
