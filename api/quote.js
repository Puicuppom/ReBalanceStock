export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const symbol = (req.query.symbol || '').toString().trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReBalanceStock/1.0)' }
    });

    if (!response.ok) return res.status(502).json({ error: 'upstream error' });

    const data = await response.json();
    const result = data.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice
      ?? result?.indicators?.quote?.[0]?.close?.filter(Boolean).pop();

    if (price == null || Number.isNaN(price)) {
      return res.status(404).json({ error: 'price not found', symbol });
    }

    return res.status(200).json({
      symbol,
      price,
      currency: result?.meta?.currency || 'USD',
      updated: result?.meta?.regularMarketTime || Date.now() / 1000
    });
  } catch {
    return res.status(500).json({ error: 'fetch failed' });
  }
}
