const { USER_AGENT } = require('./lib/yahoo-auth');
const { fetchFundamentals, calculateFairValue } = require('./lib/fair-value');

async function fetchChart(symbol) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('interval', '1d');
  url.searchParams.set('range', '2y');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error('chart error');

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error('no chart data');

  const quote = result.indicators?.quote?.[0];
  if (!quote) throw new Error('no quote');

  const candles = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({ open, high, low, close });
  }
  return {
    candles,
    currency: result.meta?.currency || 'USD',
    marketPrice: result.meta?.regularMarketPrice
      ?? candles[candles.length - 1]?.close,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  const symbol = (req.query.symbol || '').toString().trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const [chart, fundamentals] = await Promise.all([
      fetchChart(symbol),
      fetchFundamentals(symbol).catch(() => null),
    ]);

    const candles = chart.candles;
    if (candles.length < 10) {
      return res.status(404).json({ error: 'insufficient history', symbol });
    }

    const last = candles[candles.length - 1];
    const price = chart.marketPrice ?? last.close;
    const fairValue = calculateFairValue('US', price, fundamentals);

    return res.status(200).json({
      symbol,
      price,
      currency: chart.currency,
      updated: Date.now(),
      fairValue,
    });
  } catch (err) {
    return res.status(500).json({ error: 'fetch failed', symbol, message: err?.message });
  }
};
