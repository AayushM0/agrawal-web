'use client';

/**
 * Client-Side Image Resizer & Optimizer
 * Converts user uploads into compact, high-efficiency 400x400 WebP/JPEG payloads (< 40KB)
 * using an off-screen HTML5 Canvas. Prevents server bloat and memory exhaustion.
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(jpe?g|png|webp|avif|heic|heif|bmp|gif|tiff)$/i)) {
      return reject(new Error("Selected file is not an image."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onerror = () => reject(new Error("Failed to parse image element."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(event.target?.result as string);
        }

        // Fill background with white in case of transparent PNG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Encode as standard JPEG (supported universally by @react-pdf/renderer, HTML canvas, and email)
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts any image format (WebP, PNG, remote URL, legacy data URL) to a clean JPEG data URL
 * on the fly using HTML5 Canvas for @react-pdf/renderer compatibility.
 */
export async function convertToJpegDataUrl(src?: string): Promise<string> {
  if (!src || !src.trim()) return "";
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) return src;

  return new Promise((resolve) => {
    try {
      const img = new (window as any).Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = img.naturalWidth || img.width || 400;
          const height = img.naturalHeight || img.height || 400;
          canvas.width = Math.min(width, 400);
          canvas.height = Math.min(height, 400);
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(src);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const jpegUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(jpegUrl);
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    } catch {
      resolve(src || "");
    }
  });
}
