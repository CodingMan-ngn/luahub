const { supabase } = require('../_supabase')

module.exports = async (req, res) => {
  const { slug } = req.query

  if (!slug) return res.status(400).send('-- missing slug')

  const { data, error } = await supabase
    .from('scripts')
    .select('content_enc, hits, name')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (error || !data) return res.status(404).send('-- script not found')

  // increment hit counter async (don't await — keep response fast)
  supabase.from('scripts')
    .update({ hits: data.hits + 1 })
    .eq('slug', slug)

  // serve XOR+base64 encoded blob
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(data.content_enc)
}
