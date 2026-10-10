'use strict';

const {
  clean,
  databaseRequest,
  publicLead,
  readJson,
  requireAdmin,
  requireMethod,
  sendJson,
  setSecurityHeaders
} = require('../../../lib/api');

module.exports = async function updateLead(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['PATCH'])) return;
  if (!requireAdmin(req, res)) return;

  try {
    const id = clean(req.query.id, 80);
    const body = await readJson(req);
    const status = clean(body.status, 20);

    if (!['new', 'contacted', 'closed'].includes(status)) {
      return sendJson(res, 400, { error: 'Invalid enquiry status.' });
    }

    const rows = await databaseRequest('enquiries', {
      method: 'PATCH',
      query: `id=eq.${encodeURIComponent(id)}&select=id,created_at,name,phone,email,interest,message,status`,
      body: { status }
    });

    if (!rows.length) return sendJson(res, 404, { error: 'Enquiry not found.' });
    return sendJson(res, 200, { ok: true, lead: publicLead(rows[0]) });
  } catch (error) {
    console.error('Could not update enquiry:', error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode === 503 ? error.message : 'Could not update enquiry.'
    });
  }
};
