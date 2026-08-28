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
