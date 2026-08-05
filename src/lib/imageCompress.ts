// Compressione lato client via Canvas: ridimensiona e ricodifica in JPEG
// per tenere le foto (assortimento/negozio) il più leggere possibile prima
// di salvarle come base64 in Firestore (niente Firebase Storage in questo progetto).

// Alcune foto (HEIC/HEIF iPhone, ma anche scatti Samsung/Xiaomi con "immagini ad
// alta efficienza" codificate HEVC e a volte salvate con estensione .jpg fuorviante)
// non vengono decodificate da <img> in tutti i browser/webview. Invece di fidarci
// del mime/estensione dichiarati dal telefono, proviamo prima la decodifica nativa
// e solo se fallisce ripieghiamo sulla conversione in JPEG via heic2any (libheif wasm).
async function toJpegViaHeic2any(file: File | Blob): Promise<Blob> {
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

// full: max 800px lato lungo, qualità 0.55 → tipicamente 20-60KB
// thumb: max 160px lato lungo, qualità 0.4 → tipicamente 2-6KB, per la griglia
export async function compressImage(file: File): Promise<CompressedImage> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (nativeErr) {
    // Decodifica nativa fallita (probabile HEIC/HEVC): riprova convertendo in JPEG.
    try {
      const jpegBlob = await toJpegViaHeic2any(file);
      img = await loadImage(jpegBlob);
    } catch (heicErr: any) {
      // Log dettagliato per diagnosticare il formato reale del file dal telefono.
      console.error('[compressImage] decodifica fallita', {
        name: file.name,
        type: file.type,
        size: file.size,
        nativeErr,
        heicErr,
      });
      const detail = heicErr?.message ?? String(heicErr);
      throw new Error(`Immagine non valida (${file.type || 'tipo sconosciuto'}, ${file.name}): ${detail}`);
    }
  }
  const fullCanvas = drawToCanvas(img, 800);
  const dataUrl = canvasToDataUrl(fullCanvas, 0.55);
  const thumbCanvas = drawToCanvas(img, 160);
  const thumbDataUrl = canvasToDataUrl(thumbCanvas, 0.4);
  const size = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  return { dataUrl, thumbDataUrl, width: fullCanvas.width, height: fullCanvas.height, size };
}
