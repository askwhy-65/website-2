'use strict';

const {
  clean,
  databaseRequest,
  notifyWebhook,
  publicLead,
  readJson,
  requireMethod,
  sendJson,
  setSecurityHeaders
} = require('../lib/api');

const recentRequests = new Map();

function isRateLimited(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || 'unknown';
  const now = Date.now();
  const previous = recentRequests.get(key) || { start: now, count: 0 };
  if (now - previous.start > 10 * 60 * 1000) {
    previous.start = now;
    previous.count = 0;
  }
  previous.count += 1;
  recentRequests.set(key, previous);
  return previous.count > 8;
}

module.exports = async function createEnquiry(req, res) {
  setSecurityHeaders(res);
  if (!requireMethod(req, res, ['POST'])) return;
  if (isRateLimited(req)) {
    return sendJson(res, 429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  }

  try {
    const body = await readJson(req);
    const name = clean(body.name, 100);
    const phone = clean(body.phone, 30);
    const email = clean(body.email, 150);
    const interest = clean(body.interest, 100);
    const message = clean(body.message, 2000);
    const honeypot = clean(body.website, 200);

    if (honeypot) {
      return sendJson(res, 200, { ok: true, message: 'Thank you. Your enquiry has been received.' });
    }

    if (name.length < 2 || phone.replace(/\D/g, '').length < 7 || message.length < 5) {
      return sendJson(res, 400, {
        error: 'Please enter your name, a valid phone number, and a short message.'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Please enter a valid email address.' });
    }

    const insertedRows = await databaseRequest('enquiries', {
      method: 'POST',
      body: [{ name, phone, email, interest, message, status: 'new' }]
    });
    const lead = publicLead(insertedRows[0]);
    const notified = await notifyWebhook(lead);

    return sendJson(res, 201, {
      ok: true,
      message: 'Thank you — your enquiry has been received. We will get back to you soon.',
      notified
    });
  } catch (error) {
    console.error('Enquiry submission failed:', error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.statusCode === 400 || error.statusCode === 413
        ? error.message
        : error.statusCode === 503
          ? error.message
          : 'Could not save your enquiry. Please try again.'
    });
  }
};
