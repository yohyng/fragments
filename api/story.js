// GET ?id=41 → the article's story image (1080×1920 PNG; src/lib/story-image.mjs).
// Only published articles. Public, so LINE can fetch it from the link it is
// sent, and the admin can open it.

export default async function handler(req, res) {
  const id = String(req.query.id ?? '');
  try {
    const { storyImage, storyFileName } = await import('../src/lib/story-image.mjs');
    const png = await storyImage(id);
    if (!png) return res.status(404).json({ error: 'not found' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${storyFileName(id)}"`);
    // an edited article shows its new text within minutes
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(png);
  } catch (e) {
    console.error('[story]', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
