// Compressione lato client via Canvas: ridimensiona e ricodifica in JPEG
// per tenere le foto (assortimento/negozio) il più leggere possibile prima
// di salvarle come base64 in Firestore (niente Firebase Storage in questo progetto).

function loadImage(file: File): Promise<HTMLImageElement> {
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
  const img = await loadImage(file);
  const fullCanvas = drawToCanvas(img, 1280);
  const dataUrl = canvasToDataUrl(fullCanvas, 0.72);
  const thumbCanvas = drawToCanvas(img, 240);
  const thumbDataUrl = canvasToDataUrl(thumbCanvas, 0.5);
  const size = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  return { dataUrl, thumbDataUrl, width: fullCanvas.width, height: fullCanvas.height, size };
}
