const { getYahooAuth, USER_AGENT } = require('./yahoo-auth');

const BASE_PE = { US: 18, TH: 14 };

function num(value) {
  if (value?.raw == null || Number.isNaN(value.raw)) return null;
  return value.raw;
}

async function fetchFundamentals(symbol) {
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = new URL(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`);
    url.searchParams.set('modules', 'financialData,defaultKeyStatistics,summaryDetail');
    url.searchParams.set('crumb', crumb);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, Cookie: cookie },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const row = json.quoteSummary?.result?.[0];
    if (!row) return null;

    return {
      analyst: num(row.financialData?.targetMeanPrice),
      analystLow: num(row.financialData?.targetLowPrice),
      analystHigh: num(row.financialData?.targetHighPrice),
      trailingEps: num(row.defaultKeyStatistics?.trailingEps),
      forwardEps: num(row.defaultKeyStatistics?.forwardEps),
      trailingPE: num(row.summaryDetail?.trailingPE),
      forwardPE: num(row.summaryDetail?.forwardPE),
      fiftyTwoWeekHigh: num(row.summaryDetail?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(row.summaryDetail?.fiftyTwoWeekLow),
      freeCashflow: num(row.financialData?.freeCashflow),
      marketCap: num(row.summaryDetail?.marketCap),
      dividendYield: num(row.summaryDetail?.dividendYield),
      dividendRate: num(row.summaryDetail?.dividendRate),
    };
  } catch {
    return null;
  }
}

function peReference(market, data) {
  const eps = data.forwardEps ?? data.trailingEps;
  if (eps == null || eps <= 0) return null;
  const base = BASE_PE[market] || BASE_PE.US;
  const trailingPE = data.trailingPE;
  const fairPE = trailingPE != null && trailingPE > 0
    ? Math.min(45, Math.max(8, (base + trailingPE * 0.65) / 2))
    : base;
  return eps * fairPE;
}

function upsidePercent(target, currentPrice) {
  if (target == null || currentPrice <= 0) return null;
  return ((target - currentPrice) / currentPrice) * 100;
}

function verdictFromUpside(upside) {
  if (upside == null) return 'unknown';
  if (upside > 10) return 'undervalued';
  if (upside < -10) return 'overvalued';
  return 'fair';
}

function calculateFairValue(market, currentPrice, data) {
  if (!data) {
    return { fairValue: null, upsidePercent: null, verdict: 'unknown', source: 'unknown' };
  }

  const peRef = peReference(market, data);
  const hasAnalyst = data.analyst != null && data.analyst > 0;
  const fairValue = hasAnalyst ? data.analyst : peRef;
  const upside = upsidePercent(fairValue, currentPrice);

  return {
    fairValue,
    fairValueLow: data.analystLow ?? (hasAnalyst ? data.analyst * 0.85 : null),
    fairValueHigh: data.analystHigh ?? (hasAnalyst ? data.analyst * 1.15 : null),
    peReference: peRef,
    upsidePercent: upside,
    verdict: verdictFromUpside(upside),
    source: hasAnalyst ? 'analyst' : (peRef != null ? 'pe-fallback' : 'unknown'),
    range52w: data.fiftyTwoWeekLow != null && data.fiftyTwoWeekHigh != null
      ? { low: data.fiftyTwoWeekLow, high: data.fiftyTwoWeekHigh }
      : null,
  };
}

module.exports = { fetchFundamentals, calculateFairValue };
