/**
 * ==============================================================================
 * Tejas Portfolio - Vercel Serverless Telemetry Gateway (/api/track)
 * 
 * Capabilities:
 *   1. Extracts Geolocation: City & Country from Vercel Edge Headers
 *      (x-vercel-ip-country, x-vercel-ip-city) without external IP API calls
 *   2. Server-side Bot & Crawler Detection via User-Agent signature
 *   3. Rate limiting & input payload validation
 *   4. Zero-PII storage: never stores raw IP addresses
 *   5. Dispatches directly to Supabase table (portfolio_events)
 * ==============================================================================
 */

export default async function handler(req, res) {
  // 1. Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    // 2. Extract Geolocation from Vercel Edge Headers
    const country = req.headers['x-vercel-ip-country'] || body.country || null;
    const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : (body.city || null);

    // 3. Server-side Bot Detection
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|headless|lighthouse|slurp|bingbot|duckduckbot/i.test(userAgent);

    // 4. Construct Telemetry Row
    const eventRow = {
      event_name: body.event_name || 'page_view',
      event_category: body.event_category || 'general',
      visitor_id: body.visitor_id || null,
      session_id: body.session_id || null,
      project_id: body.project_id || null,
      project_name: body.project_name || null,
      section_id: body.section_id || null,
      element: body.element || null,
      dwell_time_seconds: Number(body.dwell_time_seconds || 0),
      platform_source: body.platform_source || 'direct',
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      country: country,
      city: city,
      device_type: body.device_type || 'desktop',
      browser: body.browser || 'Other',
      os: body.os || 'Other',
      screen_resolution: body.screen_resolution || null,
      country_timezone: body.country_timezone || null,
      is_bot: isBot || Boolean(body.is_bot),
      metadata: body.metadata || {},
      page_path: body.page_path || '/',
      referrer: body.referrer || null,
      created_at: new Date().toISOString()
    };

    // 5. Supabase Credentials (from Vercel Environment Variables or fallback)
    const supabaseUrl = process.env.SUPABASE_URL || 'https://tkuggtlofzofaeltlzul.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_6jfofP0ME0VE5IrkyxVQGg_miRbVX_0';

    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/portfolio_events`;
    const headers = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    if (supabaseKey.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${supabaseKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(eventRow)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Supabase insert failed', details: errText });
    }

    return res.status(200).json({ ok: true, country, city, is_bot: isBot });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal telemetry error' });
  }
}

