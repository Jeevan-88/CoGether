import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processImage(inputFilename, outputFilename) {
  const inputPath = path.join(process.cwd(), 'public', inputFilename);
  const outputPath = path.join(process.cwd(), 'public', outputFilename);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelData = new Uint8ClampedArray(data.buffer);
  
  // Sample top-left corner background color
  const bgR = pixelData[0];
  const bgG = pixelData[1];
  const bgB = pixelData[2];

  console.log(`Processing ${inputFilename}, sampled bg color: rgb(${bgR}, ${bgG}, ${bgB})`);

  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    const isNeutralGrey = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;

    if (dist < 38 || (isNeutralGrey && dist < 60)) {
      const alpha = Math.max(0, Math.min(255, (dist - 18) * 10));
      pixelData[i + 3] = alpha;
    }
  }

  await sharp(pixelData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(outputPath);

  console.log(`Successfully created clean transparent PNG: ${outputFilename}`);
}

async function run() {
  await processImage('shopping_cart_src.jpg', 'shopping_cart_artwork.png');
}

run().catch(console.error);
