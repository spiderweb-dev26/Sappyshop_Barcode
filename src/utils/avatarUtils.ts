/**
 * Staff Avatar Utilities for Sappy Stationery POS
 * Includes profile picture compression, curated portrait presets,
 * camera frame capture, and SVG vector initials fallbacks.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  roleHint: string;
  url: string;
  category: 'portrait' | 'stationery' | 'vector';
}

export const STAFF_AVATAR_PRESETS: AvatarPreset[] = [
  // Professional Retail & Stationery Portraits (high reliability Unsplash portraits)
  {
    id: 'preset-staff-1',
    name: 'Admin / Executive',
    roleHint: 'ADMIN',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-2',
    name: 'Store Manager',
    roleHint: 'MANAGER',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-3',
    name: 'Head Cashier',
    roleHint: 'CASHIER',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-4',
    name: 'POS Operator',
    roleHint: 'CASHIER',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-5',
    name: 'Stock Auditor',
    roleHint: 'AUDITOR',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-6',
    name: 'Inventory Specialist',
    roleHint: 'MANAGER',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-7',
    name: 'Supervisor',
    roleHint: 'ADMIN',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80'
  },
  {
    id: 'preset-staff-8',
    name: 'Customer Service',
    roleHint: 'CASHIER',
    category: 'portrait',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80'
  },

  // Stationery-Themed Vector Avatars (100% vector SVG data URIs)
  {
    id: 'preset-vec-admin',
    name: 'Shield Master (Admin)',
    roleHint: 'ADMIN',
    category: 'vector',
    url: createVectorAvatarSvg('#064e3b', '#059669', '🛡️')
  },
  {
    id: 'preset-vec-pos',
    name: 'Cash Register (POS)',
    roleHint: 'CASHIER',
    category: 'vector',
    url: createVectorAvatarSvg('#047857', '#10b981', '🛒')
  },
  {
    id: 'preset-vec-pen',
    name: 'Golden Nib (Stationery)',
    roleHint: 'MANAGER',
    category: 'vector',
    url: createVectorAvatarSvg('#b45309', '#f59e0b', '✒️')
  },
  {
    id: 'preset-vec-book',
    name: 'Notebook & Ledger',
    roleHint: 'AUDITOR',
    category: 'vector',
    url: createVectorAvatarSvg('#1e293b', '#475569', '📚')
  },
  {
    id: 'preset-vec-star',
    name: 'Store Keeper Star',
    roleHint: 'MANAGER',
    category: 'vector',
    url: createVectorAvatarSvg('#0e7490', '#06b6d4', '⭐')
  },
  {
    id: 'preset-vec-calc',
    name: 'Finance & Audit',
    roleHint: 'AUDITOR',
    category: 'vector',
    url: createVectorAvatarSvg('#4338ca', '#6366f1', '📊')
  }
];

/**
 * Creates an offline-ready SVG Avatar with gradient background and center glyph
 */
function createVectorAvatarSvg(bg1: string, bg2: string, emojiOrGlyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="avGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#avGrad)" />
    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
    <text x="60" y="74" text-anchor="middle" font-size="44" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${emojiOrGlyph}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Client-side compression and square center-cropping for user profile pictures.
 * Converts to a compact ~20-30KB JPEG data URL to safely store in localStorage & Firestore.
 */
export async function compressAndResizeAvatar(
  file: File,
  targetSize = 256,
  quality = 0.82
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Center-crop to square ratio
        const minDim = Math.min(img.width, img.height);
        const sourceX = Math.round((img.width - minDim) / 2);
        const sourceY = Math.round((img.height - minDim) / 2);

        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Draw cropped center square
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          minDim,
          minDim,
          0,
          0,
          targetSize,
          targetSize
        );

        let mimeType = 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, quality);

        // If unexpectedly large, compress more
        if (dataUrl.length > 150000) {
          dataUrl = canvas.toDataURL(mimeType, 0.65);
        }

        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKb });
      };

      img.onerror = () => reject(new Error('Failed to load image file into memory.'));
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      } else {
        reject(new Error('Failed to read file buffer.'));
      }
    };

    reader.onerror = () => reject(new Error('File reader failed.'));
    reader.readAsDataURL(file);
  });
}
