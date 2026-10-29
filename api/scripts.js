const { supabase } = require('./_supabase')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret'
const XOR_KEY = 0x5A

function xorEncode(str) {
  const buf = Buffer.from(str, 'utf8')
  for (let i = 0; i < buf.length; i++) buf[i] ^= XOR_KEY
  return buf.toString('base64')
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7)
}

function authUser(req) {
  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '')
  try { return jwt.verify(token, JWT_SECRET) }
  catch { return null }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── GET /api/scripts?slug=xxx  → serve encoded blob ──────────
  if (req.method === 'GET' && req.query.slug) {
    const { data, error } = await supabase
      .from('scripts')
      .select('content_enc, hits')
      .eq('slug', req.query.slug)
      .eq('is_public', true)
      .single()

    if (error || !data) return res.status(404).json({ error: 'not found' })

    await supabase.from('scripts')
      .update({ hits: data.hits + 1 })
      .eq('slug', req.query.slug)

    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(data.content_enc)
  }

  // ── GET /api/scripts  → list public scripts ───────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, description, slug, hits, created_at, users(username)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // ── POST /api/scripts  → upload (auth required) ───────────────
  if (req.method === 'POST') {
    const user = authUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { name, description, content, is_public } = req.body
    if (!name || !content)
      return res.status(400).json({ error: 'name + content required' })

    const slug = slugify(name)
    const content_enc = xorEncode(content)

    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_id: user.id,
        name,
        description,
        slug,
        content_enc,
        is_public: is_public !== false
      })
      .select('id, slug')
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({
      slug: data.slug,
      loader_url: `https://${req.headers.host}/api/loader/${data.slug}`
    })
  }

  // ── DELETE /api/scripts?slug=xxx ──────────────────────────────
  if (req.method === 'DELETE') {
    const user = authUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('slug', req.query.slug)
      .eq('owner_id', user.id)

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method not allowed' })
}
