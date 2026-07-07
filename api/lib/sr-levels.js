function buildSrLevels(zones) {
  let res = 0;
  let sup = 0;
  return zones.map((zone) => ({
    price: zone.price,
    label: zone.type === 'resistance' ? `แนวต้าน ${++res}` : `แนวรับ ${++sup}`,
    kind: zone.type,
    strength: zone.strength,
  })).sort((a, b) => b.price - a.price);
}

function nearestSrLevels(levels, currentPrice) {
  const resistances = levels.filter((l) => l.kind === 'resistance' && l.price > currentPrice);
  const supports = levels.filter((l) => l.kind === 'support' && l.price < currentPrice);
  return {
    nearestResistance: resistances.at(-1) ?? null,
    nearestSupport: supports[0] ?? null,
  };
}

function distancePercent(price, levelPrice) {
  if (levelPrice <= 0) return Infinity;
  return (Math.abs(price - levelPrice) / levelPrice) * 100;
}

function findSrHits(zones, currentPrice, tolerancePercent = 1) {
  const levels = buildSrLevels(zones);
  const { nearestResistance, nearestSupport } = nearestSrLevels(levels, currentPrice);
  const hits = [];

  if (nearestSupport && distancePercent(currentPrice, nearestSupport.price) <= tolerancePercent) {
    hits.push({
      kind: 'support',
      level: nearestSupport,
      distancePercent: distancePercent(currentPrice, nearestSupport.price),
    });
  }
  if (nearestResistance && distancePercent(currentPrice, nearestResistance.price) <= tolerancePercent) {
    hits.push({
      kind: 'resistance',
      level: nearestResistance,
      distancePercent: distancePercent(currentPrice, nearestResistance.price),
    });
  }
  return hits;
}

module.exports = { findSrHits, buildSrLevels };
