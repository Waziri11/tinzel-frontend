/**
 * Fast, single-pass print-ready image optimizer.
 * Keeps 2400px resolution at 86% JPEG quality (sharp for magazine print layouts)
 * while reducing multi-megabyte phone photos to ~400-800 KB so uploads finish in seconds.
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
  { maxBytes = 900 * 1024, maxDimension = 2400, quality = 0.86 } = {}
) {
  if (!file || typeof file.size !== 'number') return file;
  // Already small JPEG/WEBP — skip canvas processing completely
  if (file.size <= maxBytes && /image\/(jpeg|jpg|webp)/i.test(file.type)) {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return file;

    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
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

    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    // Only do one quick second pass if an unusually detailed image still exceeds the hard 3.5MB ceiling
    if (blob && blob.size > 3.5 * 1024 * 1024) {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.76);
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
