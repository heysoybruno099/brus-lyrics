export interface AmbientColors {
  ambient1: string;
  ambient2: string;
}

const DEFAULT_AMBIENT: AmbientColors = {
  ambient1: 'rgba(38, 42, 54, 0.45)',
  ambient2: 'rgba(20, 22, 28, 0.85)',
};

export async function extractAlbumColors(imageUrl: string | undefined): Promise<AmbientColors> {
  if (!imageUrl || typeof document === 'undefined') {
    return DEFAULT_AMBIENT;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_AMBIENT);
          return;
        }

        ctx.drawImage(img, 0, 0, 32, 32);
        const imgData = ctx.getImageData(0, 0, 32, 32).data;

        let rTop = 0, gTop = 0, bTop = 0, countTop = 0;
        let rBottom = 0, gBottom = 0, bBottom = 0, countBottom = 0;

        // Sample top half and bottom half
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const idx = (y * 32 + x) * 4;
            const r = imgData[idx] ?? 0;
            const g = imgData[idx + 1] ?? 0;
            const b = imgData[idx + 2] ?? 0;

            // Keep colors muted and darker for high-contrast lyrics readability
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            if (brightness > 220) continue; // skip pure whites

            if (y < 16) {
              rTop += r;
              gTop += g;
              bTop += b;
              countTop++;
            } else {
              rBottom += r;
              gBottom += g;
              bBottom += b;
              countBottom++;
            }
          }
        }

        if (countTop === 0) countTop = 1;
        if (countBottom === 0) countBottom = 1;

        const c1R = Math.min(120, Math.round(rTop / countTop));
        const c1G = Math.min(120, Math.round(gTop / countTop));
        const c1B = Math.min(140, Math.round(bTop / countTop));

        const c2R = Math.min(80, Math.round(rBottom / countBottom));
        const c2G = Math.min(80, Math.round(gBottom / countBottom));
        const c2B = Math.min(100, Math.round(bBottom / countBottom));

        resolve({
          ambient1: `rgba(${c1R}, ${c1G}, ${c1B}, 0.5)`,
          ambient2: `rgba(${c2R}, ${c2G}, ${c2B}, 0.85)`,
        });
      } catch {
        resolve(DEFAULT_AMBIENT);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_AMBIENT);
    };

    img.src = imageUrl;
  });
}
