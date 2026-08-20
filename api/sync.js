import { createClient } from '@supabase/supabase-js';

function getBearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}

function getUserClient(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getUserClient(token);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = userData.user;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('mission_control_state')
        .select('payload, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ state: data?.payload || null, updatedAt: data?.updated_at || null });
    }

    const payload = req.body?.state;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'state object required' });

    const { data, error } = await supabase
      .from('mission_control_state')
      .upsert({ user_id: user.id, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('updated_at')
      .single();
    if (error) throw error;
    return res.status(200).json({ ok: true, updatedAt: data.updated_at });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sync service unavailable' });
  }
}
