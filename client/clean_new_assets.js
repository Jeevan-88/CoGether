import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function cleanAsset(filename) {
  const filePath = path.join(process.cwd(), 'public', filename);

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelData = new Uint8ClampedArray(data.buffer);
  
  const bgR = pixelData[0];
  const bgG = pixelData[1];
  const bgB = pixelData[2];

  console.log(`Processing asset ${filename}, bg color: rgb(${bgR}, ${bgG}, ${bgB})`);

  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    
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
  console.log(`Cleaned asset ${filename} transparency!`);
}

async function run() {
  await cleanAsset('wood_hyphen_bulb.png');
  await cleanAsset('jade_plant_pot.png');
}

run().catch(console.error);
