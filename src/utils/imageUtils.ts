/**
 * Image Utilities for Sappy Stationery POS
 * Includes client-side compression/resizing and curated stationery presets
 */

export interface StationeryPresetImage {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const STATIONERY_PRESET_IMAGES: StationeryPresetImage[] = [
  {
    id: 'preset-notebook',
    name: 'Spiral Notebook & Diary',
    category: 'Notebooks',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-pens',
    name: 'Ballpoint & Gel Pens',
    category: 'Pen',
    url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-colors',
    name: 'Color Pencils Set',
    category: 'Colors',
    url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-paints',
    name: 'Watercolor & Acrylic Paints',
    category: 'Paint',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-markers',
    name: 'Highlighters & Markers',
    category: 'Highlighter',
    url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-geometry',
    name: 'Rulers & Math Geometry Set',
    category: 'Ruler',
    url: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-scissors',
    name: 'Craft Scissors & Cutters',
    category: 'Scissor',
    url: 'https://images.unsplash.com/photo-1590845947670-c009801fee74?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-glue',
    name: 'Adhesive Glue & Tapes',
    category: 'Adhesives',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-files',
    name: 'File Folders & Document Bags',
    category: 'File Album',
    url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-desk',
    name: 'Desk Calculator & Tools',
    category: 'General',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-sticky',
    name: 'Sticky Notes & Pads',
    category: 'Notebook',
    url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'preset-paper',
    name: 'Printing Paper & Reams',
    category: 'Paper',
    url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80'
  }
];

/**
 * Resizes and compresses an image client-side to keep base64 compact (~30-60 KB)
 * preventing LocalStorage/Firestore bloat while keeping image crisp.
 */
export async function compressAndResizeImage(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.85
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Clean white background for transparent PNGs/SVGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp if supported, or jpeg
        let mimeType = 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, quality);

        // If data URL is excessively large, lower quality slightly
        if (dataUrl.length > 250000) {
          dataUrl = canvas.toDataURL(mimeType, 0.7);
        }

        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKb });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file into memory'));
      };

      if (typeof readerEvent.target?.result === 'string') {
        img.src = readerEvent.target.result;
      } else {
        reject(new Error('Failed to read file buffer'));
      }
    };

    reader.onerror = () => reject(new Error('File reader failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Returns the effective display image URL for an inventory item.
 * If the item has a user-defined imageUrl, it is used.
 * Otherwise, maps the item's category/name to a curated, high-definition stationery photograph.
 */
export function getItemDisplayImage(item?: { imageUrl?: string; category?: string; name?: string } | null): string {
  if (item?.imageUrl && item.imageUrl.trim().length > 0) {
    return item.imageUrl.trim();
  }

  const cat = (item?.category || '').toLowerCase();
  const name = (item?.name || '').toLowerCase();

  // Paints & Mediums
  if (cat.includes('paint') || name.includes('paint') || name.includes('acrylic') || name.includes('oil paint')) {
    return 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
  }

  // Colors, Drawing & Kids Art
  if (cat.includes('color') || name.includes('color') || cat.includes('kid') || name.includes('kid') || name.includes('drawing') || name.includes('sketch pencil')) {
    return 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80';
  }

  // Highlighters, Markers & Board Pens
  if (cat.includes('highlighter') || cat.includes('marker') || name.includes('highlighter') || name.includes('marker')) {
    return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80';
  }

  // Pens, Pencils & Writing
  if (cat.includes('pen') || cat.includes('pencil') || name.includes('pen') || name.includes('pencil') || name.includes('radius') || name.includes('buna') || name.includes('tuzo')) {
    return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80';
  }

  // Rulers & Math / Geometry Tools
  if (cat.includes('ruler') || name.includes('ruler') || cat.includes('geom') || name.includes('geometry') || name.includes('compass') || name.includes('scale')) {
    return 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=400&q=80';
  }

  // Scissors & Cutters
  if (cat.includes('scissor') || cat.includes('cutter') || name.includes('scissor') || name.includes('cutter') || name.includes('knife') || name.includes('blade')) {
    return 'https://images.unsplash.com/photo-1590845947670-c009801fee74?auto=format&fit=crop&w=400&q=80';
  }

  // Glues, Adhesives & Tapes
  if (cat.includes('adhes') || cat.includes('tape') || cat.includes('glue') || name.includes('glue') || name.includes('tape') || name.includes('uhu')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
  }

  // Files, Folders & Albums
  if (cat.includes('file') || cat.includes('album') || name.includes('file') || name.includes('folder') || name.includes('clear bag')) {
    return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80';
  }

  // Notebooks, Sketchbooks, Diaries, Registers & Exercise Books
  if (
    cat.includes('notebook') ||
    cat.includes('exercise') ||
    cat.includes('register') ||
    name.includes('notebook') ||
    name.includes('register') ||
    name.includes('exercise book') ||
    name.includes('sketch book') ||
    name.includes('diary') ||
    name.includes('ledger')
  ) {
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
  }

  // Paper & Printing Sheets
  if (cat.includes('paper') || name.includes('paper') || name.includes('ream') || name.includes('sheet') || name.includes('a4')) {
    return 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80';
  }

  // Sticky Notes
  if (name.includes('sticky') || name.includes('post-it') || name.includes('note pad')) {
    return 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80';
  }

  // Default stationery desk photo
  return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80';
}
