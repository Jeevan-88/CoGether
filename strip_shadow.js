const fs = require('fs');
const zlib = require('zlib');

// Read the original graduation cap PNG
const pngBuffer = fs.readFileSync('client/public/graduation_cap.png');

// Find IHDR chunk
let offset = 8;
let width = 0, height = 0, bitDepth = 0, colorType = 0;
let idatChunks = [];

while (offset < pngBuffer.length) {
  const length = pngBuffer.readUInt32BE(offset);
  const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
  const data = pngBuffer.slice(offset + 8, offset + 8 + length);
  
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data.readUInt8(8);
    colorType = data.readUInt8(9);
    console.log(`IHDR: ${width}x${height}, bitDepth: ${bitDepth}, colorType: ${colorType}`);
  } else if (type === 'IDAT') {
    idatChunks.push(data);
  } else if (type === 'IEND') {
    break;
  }
  offset += 12 + length;
}

if (colorType === 6 && bitDepth === 8) { // RGBA
  const combinedIdat = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(combinedIdat);
  const bytesPerPixel = 4;
  const stride = 1 + width * bytesPerPixel;
  
  // Unfilter PNG scanlines
  const rawData = Buffer.alloc(width * height * bytesPerPixel);
  let prevRow = Buffer.alloc(width * bytesPerPixel);
  
  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const currentRowFiltered = decompressed.slice(y * stride + 1, (y + 1) * stride);
    const currentRow = Buffer.alloc(width * bytesPerPixel);
    
    for (let x = 0; x < width; x++) {
      for (let b = 0; b < bytesPerPixel; b++) {
        const idx = x * bytesPerPixel + b;
        const xByte = currentRowFiltered[idx];
        const a = x > 0 ? currentRow[idx - bytesPerPixel] : 0;
        const bByte = prevRow[idx];
        const c = x > 0 ? prevRow[idx - bytesPerPixel] : 0;
        
        let recon = 0;
        if (filterType === 0) recon = xByte;
        else if (filterType === 1) recon = (xByte + a) & 0xff;
        else if (filterType === 2) recon = (xByte + bByte) & 0xff;
        else if (filterType === 3) recon = (xByte + Math.floor((a + bByte) / 2)) & 0xff;
        else if (filterType === 4) {
          const p = a + bByte - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - bByte);
          const pc = Math.abs(p - c);
          let pr = 0;
          if (pa <= pb && pa <= pc) pr = a;
          else if (pb <= pc) pr = bByte;
          else pr = c;
          recon = (xByte + pr) & 0xff;
        }
        currentRow[idx] = recon;
      }
    }
    currentRow.copy(rawData, y * width * bytesPerPixel);
    prevRow = currentRow;
  }
  
  // Now clean the pixels: Strip the semi-transparent black shadow pixels (low alpha shadow glow)
  let strippedCount = 0;
  for (let i = 0; i < rawData.length; i += 4) {
    const r = rawData[i];
    const g = rawData[i + 1];
    const b = rawData[i + 2];
    const a = rawData[i + 3];
    
    // If alpha is partial / fuzzy shadow (alpha < 210 and dark color), make it completely transparent (alpha = 0)
    if (a > 0 && a < 215) {
      rawData[i] = 0;
      rawData[i + 1] = 0;
      rawData[i + 2] = 0;
      rawData[i + 3] = 0;
      strippedCount++;
    } else if (a >= 215) {
      // Keep hat fully opaque
      rawData[i + 3] = 255;
    }
  }
  console.log(`Stripped ${strippedCount} shadow pixels!`);
  
  // Re-encode scanlines (Filter 0)
  const filteredOutput = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    filteredOutput[y * stride] = 0; // Filter None
    rawData.copy(filteredOutput, y * stride + 1, y * width * bytesPerPixel, (y + 1) * width * bytesPerPixel);
  }
  
  const recompressed = zlib.deflateSync(filteredOutput);
  
  // Build clean PNG
  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // calculate CRC
    const crc = require('zlib').crc32 ? require('zlib').crc32(buf.slice(4, 8 + len)) : calculateCrc(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }
  
  function calculateCrc(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', recompressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  const cleanPng = Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync('client/public/graduation_cap_clean.png', cleanPng);
  fs.writeFileSync('client/public/graduation_cap.png', cleanPng);
  console.log('Saved razor-sharp graduation_cap.png without shadow glow!');
}
