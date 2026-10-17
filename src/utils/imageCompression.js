/**
 * Compresses an image File in the browser so that individual uploads and
 * multipart form submissions stay well below reverse-proxy / serverless
 * payload limits (413 Payload Too Large).
 */
const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

export async function compressPhotoFile(
  file,
  { maxBytes = Math.floor(3.8 * 1024 * 1024), maxDimension = 3600 } = {}
) {
  if (!file || typeof file.size !== 'number') return file;
  // Keep original file 100% untouched whenever it fits within the per-request limit
  if (file.size <= maxBytes && /image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return file;

    let currentMaxDim = maxDimension;
    let quality = 0.92;
    let bestBlob = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, currentMaxDim / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob) {
        bestBlob = blob;
        if (blob.size <= maxBytes) break;
      }

      quality = Math.max(0.75, quality - 0.05);
      currentMaxDim = Math.round(currentMaxDim * 0.9);
    }

    if (!bestBlob || bestBlob.size >= file.size) {
      return file;
    }

    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([bestBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
