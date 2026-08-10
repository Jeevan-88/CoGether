import sharp from 'sharp';
import path from 'path';

async function cleanWoodenShelf() {
  const inputPath = path.join(process.cwd(), 'public', 'wooden_shelf_artwork.png');
  const outputPath = path.join(process.cwd(), 'public', 'wooden_shelf_artwork.png');

  // Load raw pixels
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const pixelData = new Uint8ClampedArray(data.buffer);
  const width = metadata.width;
  const height = metadata.height;

  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    // WOOD PIXEL DETECTION: Wood is distinctly warm brown (Red > Green > Blue)
    // Wood pixels have r > 60, r - b > 15, and r >= g
    const isWood = (r > 60 && (r - b) > 12 && r >= (g - 5) && (r + g + b) > 100);

    // If it's neutral grey background (r, g, b values are very close to each other), wipe it out!
    const isNeutralGrey = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;

    if (!isWood || isNeutralGrey) {
      pixelData[i + 3] = 0; // 100% Transparent!
    } else {
      pixelData[i + 3] = 255;
    }
  }

  const cleanBuffer = await sharp(pixelData, {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();

  await sharp(cleanBuffer).toFile(outputPath + '.tmp');
  const fs = await import('fs');
  fs.copyFileSync(outputPath + '.tmp', outputPath);
  fs.unlinkSync(outputPath + '.tmp');
  console.log('Wood shelf clean transparency complete!');
}

async function cleanShoppingCart() {
  const inputPath = path.join(process.cwd(), 'public', 'shopping_cart_src.jpg');
  const outputPath = path.join(process.cwd(), 'public', 'shopping_cart_artwork.png');

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const pixelData = new Uint8ClampedArray(data.buffer);
  const width = metadata.width;
  const height = metadata.height;

  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    // RED CART PARTS: Bright red handle and front plate
    const isRedHandle = (r > 120 && g < 70 && b < 70);
    // METAL WIRES & WHEELS: Very dark wheel/metal or bright highlights
    const isMetalWire = (r < 55 && g < 55 && b < 55) || (r > 200 && g > 200 && b > 200);

    // BACKGROUND: Grey floor/wall where r,g,b are close together
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    const isGreyBackground = maxDiff < 18 && (r >= 55 && r <= 195);

    if (isGreyBackground && !isRedHandle && !isMetalWire) {
      pixelData[i + 3] = 0; // 100% Transparent!
    } else {
      pixelData[i + 3] = 255;
    }
  }

  const cleanBuffer = await sharp(pixelData, {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();

  const fs = await import('fs');
  await sharp(cleanBuffer).toFile(outputPath + '.tmp');
  fs.copyFileSync(outputPath + '.tmp', outputPath);
  fs.unlinkSync(outputPath + '.tmp');
  console.log('Shopping cart clean transparency complete!');
}

async function main() {
  await cleanWoodenShelf();
  await cleanShoppingCart();
}

main().catch(console.error);
