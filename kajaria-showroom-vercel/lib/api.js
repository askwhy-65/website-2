'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'ks_admin';
const SESSION_LENGTH_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 30_000;

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(statusCode).json(payload);
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
}

function clean(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[<>\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    const error = new Error('Invalid JSON');
    error.statusCode = 400;
    throw error;
  }
}

function siteConfig() {
  const siteUrl = env('SITE_URL', env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : '');

  return {
    name: env('BUSINESS_NAME', 'Kajaria Shop'),
    tagline: env('BUSINESS_TAGLINE', 'Thoughtful tile choices for better spaces'),
    city: env('CITY', 'Roorkee'),
    state: env('STATE', 'Uttarakhand'),
    postalCode: env('POSTAL_CODE'),
    address: env('STREET_ADDRESS'),
    phoneDisplay: env('PHONE_DISPLAY'),
    phoneE164: env('PHONE_E164'),
    whatsapp: env('WHATSAPP_NUMBER').replace(/\D/g, ''),
    email: env('PUBLIC_EMAIL'),
    hours: env('OPENING_HOURS'),
    siteUrl: siteUrl.replace(/\/$/, ''),
    configured: Boolean(
      env('PHONE_E164') &&
      env('WHATSAPP_NUMBER') &&
      env('STREET_ADDRESS') &&
      env('PUBLIC_EMAIL') &&
      siteUrl
    )
  };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  return env('SESSION_SECRET');
}

function signature(payload) {
  const secret = sessionSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makeSessionCookie(username) {
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: Date.now() + SESSION_LENGTH_MS
  })).toString('base64url');
  const value = encodeURIComponent(`${payload}.${signature(payload)}`);
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_LENGTH_MS / 1000}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

function isAdmin(req) {
  const cookieHeader = req.headers.cookie || '';
  const entry = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return false;

  let token;
  try {
    token = decodeURIComponent(entry.slice(COOKIE_NAME.length + 1));
  } catch {
    return false;
  }

  const separator = token.lastIndexOf('.');
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!safeEqual(signature(payload), suppliedSignature)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Boolean(session.sub && session.exp > Date.now());
  } catch {
    return false;
  }
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  sendJson(res, 401, { error: 'Sign in required.' });
  return false;
}

function requireMethod(req, res, allowedMethods) {
  if (allowedMethods.includes(req.method)) return true;
  res.setHeader('Allow', allowedMethods.join(', '));
  sendJson(res, 405, { error: 'Method not allowed.' });
  return false;
}

function databaseConfig() {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    const error = new Error('Database is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.');
    error.statusCode = 503;
    throw error;
  }
  return { url, key };
}

async function databaseRequest(table, options = {}) {
  const { url, key } = databaseConfig();
  const query = options.query ? `?${options.query}` : '';
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });

  const responseText = await response.text();
  let data = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) {
    console.error('Database request failed:', response.status, data);
    const error = new Error('Database request failed. Check your Supabase configuration and table schema.');
    error.statusCode = response.status >= 500 ? 503 : 400;
    throw error;
  }

  return data;
}

function publicLead(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    interest: row.interest || '',
    message: row.message,
    status: row.status || 'new'
  };
}

async function notifyWebhook(lead) {
  const webhookUrl = env('ENQUIRY_WEBHOOK_URL');
  if (!webhookUrl) return false;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'new_enquiry', lead }),
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.error('Webhook delivery failed:', error.message);
    return false;
  }
}

module.exports = {
  clean,
  clearSessionCookie,
  databaseRequest,
  env,
  isAdmin,
  makeSessionCookie,
  notifyWebhook,
  publicLead,
  readJson,
  requireAdmin,
  requireMethod,
  safeEqual,
  sendJson,
  setSecurityHeaders,
  siteConfig
};
