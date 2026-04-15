// DISABLED — Originally a one-time seed script with hardcoded admin credentials.
// Removed after security audit: passwords were visible in repo and the guard key was hardcoded.
// To seed/reseed accounts: use Supabase SQL editor directly (service role) instead of a public endpoint.
// This stub exists only so Vercel doesn't 404 — returns 410 Gone.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(410).json({ error: 'Endpoint removed for security. Use Supabase SQL editor for seeding.' });
}
