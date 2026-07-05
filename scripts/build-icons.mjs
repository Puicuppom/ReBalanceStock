import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('icons/icon.svg');
const sizes = [
  ['icons/icon-512.png', 512],
  ['icons/icon-192.png', 192],
  ['icons/apple-touch-icon.png', 180],
];

for (const [file, size] of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: '#1e3a5f',
  });
  writeFileSync(file, resvg.render().asPng());
  console.log(`Wrote ${file} (${size}px)`);
}
