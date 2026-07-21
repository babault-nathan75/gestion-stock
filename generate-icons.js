const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="stockLogoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="60%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <linearGradient id="topFlapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
  </defs>
  <rect width="500" height="500" rx="80" fill="#0f172a"/>
  <g>
    <path d="M 225,120 L 135,165 L 195,195 L 285,150 Z" fill="url(#topFlapGradient)" opacity="0.95" />
    <path d="M 305,150 L 395,105 L 335,75 L 245,120 Z" fill="url(#topFlapGradient)" opacity="0.8" />
    <path d="M 135,185 L 135,280 C 135,288 140,296 148,300 L 235,342 C 243,346 253,346 261,342 L 305,320 L 305,280 L 250,307 L 175,270 L 175,205 Z" fill="url(#stockLogoGradient)" />
    <path d="M 315,285 L 355,265 C 363,261 368,253 368,244 L 368,180 L 410,180 C 418,180 422,170 416,164 L 342,75 C 336,68 324,68 318,75 L 244,164 C 238,170 242,180 250,180 L 292,180 L 292,245 L 250,266 L 250,306 Z" fill="url(#stockLogoGradient)" />
    <polygon points="225,215 265,195 305,215 265,235" fill="#0284c7" opacity="0.4" />
  </g>
  <text x="250" y="415" font-family="system-ui, sans-serif" font-weight="600" font-size="24" fill="#10b981" text-anchor="middle" letter-spacing="6">GESTION DE</text>
  <text x="250" y="460" font-family="system-ui, sans-serif" font-weight="800" font-size="46" fill="#FFFFFF" text-anchor="middle" letter-spacing="8">STOCK</text>
</svg>`);

const publicDir = path.join(__dirname, 'public');

async function generate() {
  // 192x192 icon
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 512x512 icon
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 180x180 apple touch icon
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7"/><stop offset="60%" stop-color="#0d9488"/><stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="f" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="500" height="500" rx="80" fill="#0f172a"/>
  <path d="M 225,120 L 135,165 L 195,195 L 285,150 Z" fill="url(#f)" opacity=".95"/>
  <path d="M 305,150 L 395,105 L 335,75 L 245,120 Z" fill="url(#f)" opacity=".8"/>
  <path d="M 135,185 L 135,280 C 135,288 140,296 148,300 L 235,342 C 243,346 253,346 261,342 L 305,320 L 305,280 L 250,307 L 175,270 L 175,205 Z" fill="url(#g)"/>
  <path d="M 315,285 L 355,265 C 363,261 368,253 368,244 L 368,180 L 410,180 C 418,180 422,170 416,164 L 342,75 C 336,68 324,68 318,75 L 244,164 C 238,170 242,180 250,180 L 292,180 L 292,245 L 250,266 L 250,306 Z" fill="url(#g)"/>
  <polygon points="225,215 265,195 305,215 265,235" fill="#0284c7" opacity=".4"/>
</svg>`);
  console.log('Created favicon.svg');

  // favicon.ico (16x16, 32x32, 48x48)
  const ico16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  // Build ICO file manually
  const images = [ico16, ico32, ico48];
  const sizes = [16, 32, 48];
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + dirEntrySize * images.length;
  let dataOffset = dirSize;
  const entries = [];
  const imgBuffers = [];

  for (let i = 0; i < images.length; i++) {
    entries.push(Buffer.alloc(dirEntrySize));
    entries[i].writeUInt8(sizes[i], 0);
    entries[i].writeUInt8(sizes[i], 1);
    entries[i].writeUInt16LE(0, 2);
    entries[i].writeUInt16LE(1, 4);
    entries[i].writeUInt16LE(images[i].length, 6);
    entries[i].writeUInt32LE(dataOffset, 8);
    imgBuffers.push(images[i]);
    dataOffset += images[i].length;
  }

  const ico = Buffer.concat([
    Buffer.from([0, 0, 1, 0, images.length, 0]),
    ...entries,
    ...imgBuffers,
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
  console.log('Created favicon.ico');
}

generate().catch(console.error);
