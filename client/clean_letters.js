import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function cleanLetter(filename) {
  const lettersDir = path.join(process.cwd(), 'public', 'letters');
  const filePath = path.join(lettersDir, filename);

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelData = new Uint8ClampedArray(data.buffer);
  
  // Sample top-left corner background color (usually white rgb(255, 255, 255))
  const bgR = pixelData[0];
  const bgG = pixelData[1];
  const bgB = pixelData[2];

  console.log(`Processing letter ${filename}, bg color: rgb(${bgR}, ${bgG}, ${bgB})`);

  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    
    // If background is white (r>230, g>230, b>230), make transparent
    if (dist < 40 || (r > 240 && g > 240 && b > 240)) {
      pixelData[i + 3] = 0;
    }
  }

  const outBuffer = await sharp(pixelData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toBuffer();

  fs.writeFileSync(filePath, outBuffer);
  console.log(`Cleaned letter ${filename} transparency!`);
}

async function run() {
  const files = ['wood_letter_C.png', 'wood_letter_O.png', 'wood_letter_S.png', 'wood_letter_H.png', 'wood_letter_P.png'];
  for (const f of files) {
    await cleanLetter(f);
  }
}

run().catch(console.error);
