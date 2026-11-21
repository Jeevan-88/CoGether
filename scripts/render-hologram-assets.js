const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC_DIR = path.join(__dirname, '../client/public');
const NODE_MODULES_DIR = path.join(__dirname, '../client/node_modules');
const PORT = 4321;
const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/test-hologram.html';

  let filePath;
  if (reqPath.startsWith('/node_modules/')) {
    filePath = path.join(NODE_MODULES_DIR, reqPath.replace('/node_modules/', ''));
  } else {
    filePath = path.join(PUBLIC_DIR, reqPath);
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`Rendering server listening on http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle']
    });

    const context = await browser.newContext({
      viewport: { width: 800, height: 800 },
      deviceScaleFactor: 2
    });

    // 1. Render Transparent Icons for CoShop
    console.log('1. Rendering transparent assets for CoShop...');
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/test-hologram.html`);
    await page.waitForFunction(() => window.__MODEL_LOADED__ === true, { timeout: 20000 });
    await page.waitForTimeout(1000);

    const bufferTransparent = await page.screenshot({ omitBackground: true, type: 'png' });

    const menPosterPath = path.join(PUBLIC_DIR, 'coshop/categories/men-poster.png');
    const menGridPath = path.join(PUBLIC_DIR, 'coshop/category-grid/men-first.webp');
    const menCurationPath = path.join(PUBLIC_DIR, 'coshop/curation/men.webp');

    fs.writeFileSync(menPosterPath, bufferTransparent);
    console.log('Saved to:', menPosterPath);

    fs.writeFileSync(menGridPath, bufferTransparent);
    console.log('Saved to:', menGridPath);

    fs.writeFileSync(menCurationPath, bufferTransparent);
    console.log('Saved to:', menCurationPath);
    await page.close();

    // 2. Render Dark Studio Preview matching Tripo 3D interface
    console.log('2. Rendering dark studio preview matching Tripo 3D viewport...');
    const previewPage = await context.newPage();
    await previewPage.goto(`http://localhost:${PORT}/test-hologram.html?bg=dark`);
    await previewPage.waitForFunction(() => window.__MODEL_LOADED__ === true, { timeout: 20000 });
    await previewPage.waitForTimeout(1000);

    const bufferDark = await previewPage.screenshot({ omitBackground: false, type: 'png' });
    const previewArtifactPath = path.join(ARTIFACT_DIR, 'men-hologram-preview.png');
    fs.writeFileSync(previewArtifactPath, bufferDark);
    console.log('Saved Tripo-matched dark preview to:', previewArtifactPath);
    await previewPage.close();

    await browser.close();
    console.log('All 3 Men assets successfully replaced with exact Tripo 3D Hologram shirt.glb!');
  } catch (err) {
    console.error('Render error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
