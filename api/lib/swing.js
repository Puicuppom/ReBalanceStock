function findSwingPoints(candles, lookback = 5) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      const left = candles[i - j];
      const right = candles[i + j];
      if (current.high <= left.high || current.high <= right.high) isHigh = false;
      if (current.low >= left.low || current.low >= right.low) isLow = false;
    }
    if (isHigh) swings.push({ price: current.high, type: 'high' });
    if (isLow) swings.push({ price: current.low, type: 'low' });
  }
  return swings;
}

function clusterZones(swings, tolerancePercent = 1.5) {
  const groups = [];
  for (const swing of swings) {
    const tolerance = swing.price * (tolerancePercent / 100);
    let merged = false;
    for (const group of groups) {
      if (group.type !== swing.type) continue;
      const avg = group.prices.reduce((a, b) => a + b, 0) / group.prices.length;
      if (Math.abs(swing.price - avg) <= tolerance) {
        group.prices.push(swing.price);
        merged = true;
        break;
      }
    }
    if (!merged) groups.push({ type: swing.type, prices: [swing.price] });
  }
  return groups.map((group) => ({
    price: group.prices.reduce((a, b) => a + b, 0) / group.prices.length,
    type: group.type === 'high' ? 'resistance' : 'support',
    strength: group.prices.length,
  })).sort((a, b) => b.price - a.price);
}

function topZones(zones, lastClose, count = 4) {
  const resistance = zones
    .filter((z) => z.type === 'resistance' && z.price >= lastClose * 0.98)
    .sort((a, b) => a.price - b.price)
    .slice(0, count);
  const support = zones
    .filter((z) => z.type === 'support' && z.price <= lastClose * 1.02)
    .sort((a, b) => b.price - a.price)
    .slice(0, count);
  return [...resistance, ...support].sort((a, b) => b.price - a.price);
}

module.exports = { findSwingPoints, clusterZones, topZones };
