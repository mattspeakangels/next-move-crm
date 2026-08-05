// Compressione lato client via Canvas: ridimensiona e ricodifica in JPEG
// per tenere le foto (assortimento/negozio) il più leggere possibile prima
// di salvarle come base64 in Firestore (niente Firebase Storage in questo progetto).

// Le foto iPhone (HEIC/HEIF, codec HEVC) non vengono decodificate da <img> in
// tutti i browser/webview: le convertiamo in JPEG con heic2any prima del resto.
function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
}

async function toJpegIfHeic(file: File): Promise<File | Blob> {
  if (!isHeic(file)) return file;
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(result) ? result[0] : result;
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non valida')); };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export interface CompressedImage {
  dataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  size: number;
}

// full: max 1280px lato lungo, qualità 0.72 → tipicamente 80-250KB
// thumb: max 240px lato lungo, qualità 0.5 → tipicamente 5-15KB, per la griglia
export async function compressImage(file: File): Promise<CompressedImage> {
  const source = await toJpegIfHeic(file);
  const img = await loadImage(source);
  const fullCanvas = drawToCanvas(img, 1280);
  const dataUrl = canvasToDataUrl(fullCanvas, 0.72);
  const thumbCanvas = drawToCanvas(img, 240);
  const thumbDataUrl = canvasToDataUrl(thumbCanvas, 0.5);
  const size = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  return { dataUrl, thumbDataUrl, width: fullCanvas.width, height: fullCanvas.height, size };
}
