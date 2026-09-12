/**
 * Image Utilities for Sappy Stationery POS
 * Includes client-side compression/resizing, curated stationery presets,
 * and 100% offline-ready vector SVG fallbacks.
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
 * Returns a high-definition, guaranteed vector SVG Data URI for stationery items.
 * Works 100% offline, requires 0 network requests, and never fails to render.
 */
export function getStationeryFallbackSvg(category?: string, name?: string): string {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  // Helper to build a clean SVG data URI
  const makeSvgUri = (bgColor: string, accentColor: string, label: string, iconPaths: string) => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColor}" stop-opacity="1" />
          <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="20" fill="url(#g)" />
      <g transform="translate(20, 16)">
        ${iconPaths}
      </g>
      <text x="80" y="146" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff" opacity="0.95" letter-spacing="0.5">${label}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
  };

  // 1. Notebooks / Exercise books / Registers
  if (
    cat.includes('notebook') || cat.includes('exercise') || cat.includes('register') ||
    n.includes('notebook') || n.includes('register') || n.includes('ደብተር') || n.includes('ሬጂስተር') || n.includes('ማስታወሻ')
  ) {
    return makeSvgUri(
      '#065f46', '#047857', 'NOTEBOOK',
      `<rect x="20" y="10" width="80" height="100" rx="8" fill="#f8fafc" stroke="#10b981" stroke-width="3" />
       <rect x="20" y="10" width="16" height="100" rx="4" fill="#047857" />
       <line x1="46" y1="32" x2="88" y2="32" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
       <line x1="46" y1="50" x2="88" y2="50" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
       <line x1="46" y1="68" x2="88" y2="68" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
       <line x1="46" y1="86" x2="75" y2="86" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
       <circle cx="28" cy="25" r="3" fill="#ffffff" />
       <circle cx="28" cy="45" r="3" fill="#ffffff" />
       <circle cx="28" cy="65" r="3" fill="#ffffff" />
       <circle cx="28" cy="85" r="3" fill="#ffffff" />`
    );
  }

  // 2. Pens / Pencils / Writing
  if (
    cat.includes('pen') || cat.includes('pencil') || n.includes('pen') || n.includes('pencil') ||
    n.includes('buna') || n.includes('radius') || n.includes('tuzo') || n.includes('ስክሪፕቶ') || n.includes('እስክሪብቶ') || n.includes('እርሳስ')
  ) {
    return makeSvgUri(
      '#1e3a8a', '#2563eb', 'PEN & WRITING',
      `<path d="M75 15 L105 45 L45 105 L15 105 L15 75 Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" />
       <path d="M65 25 L95 55" stroke="#2563eb" stroke-width="2.5" />
       <polygon points="15,105 25,85 35,95" fill="#f59e0b" />
       <circle cx="17" cy="103" r="2.5" fill="#0f172a" />
       <rect x="80" y="20" width="12" height="25" rx="3" fill="#f59e0b" transform="rotate(45 80 20)" />`
    );
  }

  // 3. Highlighters & Markers
  if (
    cat.includes('highlighter') || cat.includes('marker') || n.includes('highlighter') || n.includes('marker') ||
    n.includes('ማርከር') || n.includes('ሃይላይተር') || n.includes('ማድመቂያ')
  ) {
    return makeSvgUri(
      '#78350f', '#d97706', 'HIGHLIGHTER',
      `<rect x="35" y="20" width="45" height="75" rx="10" fill="#fef08a" stroke="#eab308" stroke-width="3" />
       <path d="M47 95 L68 95 L63 112 L52 112 Z" fill="#ca8a04" />
       <rect x="42" y="32" width="31" height="20" rx="4" fill="#ca8a04" />
       <line x1="57" y1="58" x2="57" y2="82" stroke="#eab308" stroke-width="3" stroke-linecap="round" />`
    );
  }

  // 4. Paints, Inks & Drawing Colors
  if (
    cat.includes('paint') || cat.includes('color') || n.includes('paint') || n.includes('color') ||
    n.includes('ቀለም') || n.includes('አክሪሊክ') || n.includes('ዘይት') || n.includes('ስዕል')
  ) {
    return makeSvgUri(
      '#701a75', '#a21caf', 'COLORS & PAINT',
      `<path d="M60 15 C30 15, 10 35, 10 65 C10 95, 35 110, 65 110 C85 110, 110 100, 110 75 C110 60, 95 60, 95 45 C95 25, 80 15, 60 15 Z" fill="#ffffff" stroke="#f472b6" stroke-width="3" />
       <circle cx="35" cy="45" r="9" fill="#ef4444" />
       <circle cx="65" cy="35" r="9" fill="#f59e0b" />
       <circle cx="85" cy="55" r="9" fill="#10b981" />
       <circle cx="45" cy="80" r="9" fill="#3b82f6" />
       <circle cx="80" cy="85" r="7" fill="#8b5cf6" />`
    );
  }

  // 5. Rulers & Math Tools
  if (
    cat.includes('ruler') || cat.includes('geom') || n.includes('ruler') || n.includes('geometry') ||
    n.includes('scale') || n.includes('ማስመሪያ') || n.includes('ጂኦሜትሪ')
  ) {
    return makeSvgUri(
      '#0f172a', '#334155', 'RULER & SCALE',
      `<rect x="15" y="45" width="95" height="36" rx="6" fill="#f8fafc" stroke="#38bdf8" stroke-width="3" />
       <line x1="25" y1="45" x2="25" y2="62" stroke="#0284c7" stroke-width="2.5" />
       <line x1="35" y1="45" x2="35" y2="55" stroke="#0284c7" stroke-width="2" />
       <line x1="45" y1="45" x2="45" y2="62" stroke="#0284c7" stroke-width="2.5" />
       <line x1="55" y1="45" x2="55" y2="55" stroke="#0284c7" stroke-width="2" />
       <line x1="65" y1="45" x2="65" y2="62" stroke="#0284c7" stroke-width="2.5" />
       <line x1="75" y1="45" x2="75" y2="55" stroke="#0284c7" stroke-width="2" />
       <line x1="85" y1="45" x2="85" y2="62" stroke="#0284c7" stroke-width="2.5" />
       <line x1="95" y1="45" x2="95" y2="55" stroke="#0284c7" stroke-width="2" />`
    );
  }

  // 6. Scissors & Cutters
  if (
    cat.includes('scissor') || cat.includes('cutter') || n.includes('scissor') || n.includes('cutter') ||
    n.includes('knife') || n.includes('መቀስ') || n.includes('ካተር') || n.includes('ቢላዋ')
  ) {
    return makeSvgUri(
      '#991b1b', '#dc2626', 'SCISSORS & CUT',
      `<circle cx="35" cy="85" r="16" fill="none" stroke="#f8fafc" stroke-width="4" />
       <circle cx="85" cy="85" r="16" fill="none" stroke="#f8fafc" stroke-width="4" />
       <line x1="45" y1="75" x2="85" y2="25" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" />
       <line x1="75" y1="75" x2="35" y2="25" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" />
       <circle cx="60" cy="50" r="4.5" fill="#facc15" />`
    );
  }

  // 7. Glues, Tapes & Adhesives
  if (
    cat.includes('adhes') || cat.includes('tape') || cat.includes('glue') || n.includes('tape') ||
    n.includes('glue') || n.includes('uhu') || n.includes('ሙጫ') || n.includes('ቴፕ')
  ) {
    return makeSvgUri(
      '#14532d', '#15803d', 'GLUE & TAPES',
      `<rect x="40" y="40" width="40" height="65" rx="8" fill="#f8fafc" stroke="#22c55e" stroke-width="3" />
       <rect x="48" y="25" width="24" height="15" rx="3" fill="#22c55e" />
       <polygon points="60,10 52,25 68,25" fill="#eab308" />
       <rect x="46" y="55" width="28" height="35" rx="4" fill="#bbf7d0" />
       <line x1="52" y1="68" x2="68" y2="68" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" />`
    );
  }

  // 8. Files, Folders & Albums
  if (
    cat.includes('file') || cat.includes('album') || n.includes('file') || n.includes('folder') ||
    n.includes('clear bag') || n.includes('ፋይል') || n.includes('ክሊር') || n.includes('ማህደር')
  ) {
    return makeSvgUri(
      '#1e293b', '#475569', 'FILES & FOLDERS',
      `<path d="M15 35 L45 35 L55 45 L105 45 L105 105 L15 105 Z" fill="#f8fafc" stroke="#60a5fa" stroke-width="3" stroke-linejoin="round" />
       <path d="M22 55 L98 55 L90 98 L14 98 Z" fill="#93c5fd" stroke="#3b82f6" stroke-width="2" />
       <circle cx="32" cy="76" r="3" fill="#1e40af" />
       <line x1="42" y1="76" x2="75" y2="76" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" />`
    );
  }

  // 9. Calculators & Electronics
  if (
    cat.includes('calc') || cat.includes('battery') || n.includes('calc') || n.includes('battery') ||
    n.includes('ባትሪ') || n.includes('ካልኩሌተር')
  ) {
    return makeSvgUri(
      '#134e4a', '#0d9488', 'CALCULATOR',
      `<rect x="25" y="15" width="70" height="95" rx="8" fill="#f8fafc" stroke="#14b8a6" stroke-width="3" />
       <rect x="35" y="26" width="50" height="20" rx="4" fill="#ccfbf1" stroke="#0d9488" stroke-width="1.5" />
       <circle cx="42" cy="58" r="4.5" fill="#0d9488" />
       <circle cx="60" cy="58" r="4.5" fill="#0d9488" />
       <circle cx="78" cy="58" r="4.5" fill="#0d9488" />
       <circle cx="42" cy="74" r="4.5" fill="#0d9488" />
       <circle cx="60" cy="74" r="4.5" fill="#0d9488" />
       <circle cx="78" cy="74" r="4.5" fill="#0d9488" />
       <circle cx="42" cy="90" r="4.5" fill="#f59e0b" />
       <circle cx="60" cy="90" r="4.5" fill="#0d9488" />
       <circle cx="78" cy="90" r="4.5" fill="#10b981" />`
    );
  }

  // Default Stationery Desk
  return makeSvgUri(
    '#064e3b', '#059669', 'SAPPY ITEM',
    `<rect x="25" y="20" width="70" height="85" rx="8" fill="#f8fafc" stroke="#34d399" stroke-width="3" />
     <path d="M70 15 L95 40 L50 85 L25 85 L25 60 Z" fill="#34d399" opacity="0.4" />
     <line x1="40" y1="40" x2="80" y2="40" stroke="#059669" stroke-width="3" stroke-linecap="round" />
     <line x1="40" y1="56" x2="70" y2="56" stroke="#059669" stroke-width="3" stroke-linecap="round" />
     <line x1="40" y1="72" x2="80" y2="72" stroke="#059669" stroke-width="3" stroke-linecap="round" />`
  );
}

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
 * Otherwise, maps the item's category, English name, and Amharic name to curated stationery visuals.
 */
export function getItemDisplayImage(item?: { imageUrl?: string; category?: string; name?: string; nameAmharic?: string } | null): string {
  if (item?.imageUrl && item.imageUrl.trim().length > 0) {
    return item.imageUrl.trim();
  }

  const cat = (item?.category || '').toLowerCase();
  const name = (item?.name || '').toLowerCase();
  const amharic = (item?.nameAmharic || '').toLowerCase();
  const combined = `${cat} ${name} ${amharic}`;

  // Paints & Mediums
  if (
    combined.includes('paint') || combined.includes('acrylic') || combined.includes('oil paint') ||
    combined.includes('ቀለም') || combined.includes('አክሪሊክ') || combined.includes('ዘይት') || combined.includes('የውሃ')
  ) {
    return 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
  }

  // Colors, Drawing & Kids Art
  if (
    combined.includes('color') || combined.includes('kid') || combined.includes('drawing') ||
    combined.includes('sketch pencil') || combined.includes('sunderland') || combined.includes('vendes') ||
    combined.includes('ከለር') || combined.includes('ስዕል') || combined.includes('የልጆች')
  ) {
    return 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80';
  }

  // Highlighters, Markers & Board Pens
  if (
    combined.includes('highlighter') || combined.includes('marker') ||
    combined.includes('ማርከር') || combined.includes('ሃይላይተር') || combined.includes('ማድመቂያ')
  ) {
    return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80';
  }

  // Pens, Pencils & Writing
  if (
    combined.includes('pen') || combined.includes('pencil') || combined.includes('radius') ||
    combined.includes('buna') || combined.includes('tuzo') ||
    combined.includes('ስክሪፕቶ') || combined.includes('እስክሪብቶ') || combined.includes('እርሳስ') || combined.includes('ብዕር')
  ) {
    return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80';
  }

  // Rulers & Math / Geometry Tools
  if (
    combined.includes('ruler') || combined.includes('geom') || combined.includes('geometry') ||
    combined.includes('compass') || combined.includes('scale') ||
    combined.includes('ማስመሪያ') || combined.includes('ጂኦሜትሪ') || combined.includes('ኮምፓስ')
  ) {
    return 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=400&q=80';
  }

  // Scissors & Cutters
  if (
    combined.includes('scissor') || combined.includes('cutter') || combined.includes('knife') ||
    combined.includes('blade') || combined.includes('bear') ||
    combined.includes('መቀስ') || combined.includes('ካተር') || combined.includes('ቢላዋ') || combined.includes('መቁረጫ')
  ) {
    return 'https://images.unsplash.com/photo-1590845947670-c009801fee74?auto=format&fit=crop&w=400&q=80';
  }

  // Glues, Adhesives & Tapes
  if (
    combined.includes('adhes') || combined.includes('tape') || combined.includes('glue') ||
    combined.includes('uhu') || combined.includes('canvas tape') ||
    combined.includes('ሙጫ') || combined.includes('ቴፕ') || combined.includes('ማጣበቂያ')
  ) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';
  }

  // Files, Folders & Albums
  if (
    combined.includes('file') || combined.includes('album') || combined.includes('folder') ||
    combined.includes('clear bag') || combined.includes('ፋይል') || combined.includes('ክሊር ባግ') || combined.includes('አልበም')
  ) {
    return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80';
  }

  // Notebooks, Sketchbooks, Diaries, Registers & Exercise Books
  if (
    combined.includes('notebook') || combined.includes('exercise') || combined.includes('register') ||
    combined.includes('sketch book') || combined.includes('diary') || combined.includes('ledger') ||
    combined.includes('ደብተር') || combined.includes('ሬጂስተር') || combined.includes('ማስታወሻ')
  ) {
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
  }

  // Paper & Printing Sheets
  if (
    combined.includes('paper') || combined.includes('ream') || combined.includes('sheet') ||
    combined.includes('a4') || combined.includes('ወረቀት') || combined.includes('ሪም')
  ) {
    return 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80';
  }

  // Sticky Notes
  if (combined.includes('sticky') || combined.includes('post-it') || combined.includes('note pad')) {
    return 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=80';
  }

  // Batteries & Calculators
  if (combined.includes('battery') || combined.includes('calc') || combined.includes('ባትሪ') || combined.includes('ካልኩሌተር')) {
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80';
  }

  // Default stationery desk photo
  return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80';
}
