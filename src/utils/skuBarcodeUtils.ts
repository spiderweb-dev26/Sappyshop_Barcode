import { InventoryItem } from '../types';

/**
 * Utility functions for auto-generating unique Barcodes (EAN-13 compatible) and SKUs,
 * parsing heterogeneous QR codes / 2D matrix codes, and handling cost logic.
 */

/**
 * Checks if a cost price represents an unknown or unset cost
 * Per specification: Cost 0.00 means unknown cost
 */
export function isCostUnknown(costPrice?: number | null): boolean {
  if (costPrice === undefined || costPrice === null) return true;
  return Number(costPrice) <= 0;
}

/**
 * Formats a cost price display cleanly
 * Returns "Unknown" if cost is 0.00, otherwise returns the formatted currency string
 */
export function formatCostPrice(costPrice: number | undefined | null, currencySymbol: string = 'ETB'): string {
  if (isCostUnknown(costPrice)) {
    return 'Unknown';
  }
  return `${currencySymbol} ${Number(costPrice).toFixed(2)}`;
}

/**
 * Calculates real profit margin percentage
 * Returns null if cost is unknown, or margin percentage number
 */
export function calculateProfitMargin(sellingPrice: number, costPrice: number): number | null {
  if (isCostUnknown(costPrice) || sellingPrice <= 0) {
    return null;
  }
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

/**
 * Auto-generates a clean, readable SKU code based on product category or name
 * e.g., Category "Kids Material" -> "KID-4821", "Notebooks" -> "NOT-7201"
 */
export function generateAutoSku(category?: string, name?: string): string {
  const seed = (category || name || 'ITM').trim();
  const cleanPrefix = seed
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  
  const prefix = cleanPrefix.length >= 2 ? cleanPrefix : 'ITM';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
}

/**
 * Auto-generates a standard 13-digit EAN-13 barcode with valid checksum
 * Starts with '890' (standard stationery / retail namespace prefix)
 */
export function generateAutoBarcode(): string {
  const prefix = '890';
  const randomBody = Math.floor(100000000 + Math.random() * 900000000).toString();
  const raw12 = `${prefix}${randomBody}`;
  
  // Calculate standard EAN-13 modulo 10 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${raw12}${checksum}`;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  type?: 'barcode' | 'sku' | 'name';
  matchedItem?: InventoryItem;
  message?: string;
}

/**
 * Checks whether an item's barcode, SKU, or product name conflicts with an existing item in the catalog.
 * If editing an existing item, pass `excludeItemId` so it doesn't compare against itself.
 */
export function checkDuplicateItem(
  candidate: { barcode?: string; sku?: string; name?: string; id?: string },
  catalog: InventoryItem[],
  excludeItemId?: string
): DuplicateCheckResult {
  const ignoreId = excludeItemId || candidate.id;
  const filteredCatalog = ignoreId ? catalog.filter(i => i.id !== ignoreId) : catalog;

  // 1. Check Barcode duplicate
  const normBarcode = candidate.barcode?.trim().toLowerCase();
  if (normBarcode) {
    const match = filteredCatalog.find(i => (i.barcode || '').trim().toLowerCase() === normBarcode);
    if (match) {
      return {
        isDuplicate: true,
        type: 'barcode',
        matchedItem: match,
        message: `Barcode "${candidate.barcode?.trim()}" is already assigned to "${match.name}" (SKU: ${match.sku}).`
      };
    }
  }

  // 2. Check SKU duplicate
  const normSku = candidate.sku?.trim().toLowerCase();
  if (normSku) {
    const match = filteredCatalog.find(i => (i.sku || '').trim().toLowerCase() === normSku);
    if (match) {
      return {
        isDuplicate: true,
        type: 'sku',
        matchedItem: match,
        message: `SKU "${candidate.sku?.trim()}" is already assigned to "${match.name}".`
      };
    }
  }

  // 3. Check exact Product Name duplicate
  const normName = candidate.name?.trim().toLowerCase();
  if (normName) {
    const match = filteredCatalog.find(i => (i.name || '').trim().toLowerCase() === normName);
    if (match) {
      return {
        isDuplicate: true,
        type: 'name',
        matchedItem: match,
        message: `An item named "${match.name}" already exists in inventory (SKU: ${match.sku}, Category: ${match.category}).`
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Auto-generates a guaranteed unique SKU code that does not collide with existing catalog items
 */
export function generateUniqueSku(category?: string, name?: string, catalog: InventoryItem[] = []): string {
  let attempts = 0;
  while (attempts < 100) {
    const candidate = generateAutoSku(category, name);
    const exists = catalog.some(i => (i.sku || '').trim().toLowerCase() === candidate.toLowerCase());
    if (!exists) return candidate;
    attempts++;
  }
  return `${(category || 'ITM').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

/**
 * Auto-generates a guaranteed unique EAN-13 barcode that does not collide with existing catalog items
 */
export function generateUniqueBarcode(catalog: InventoryItem[] = []): string {
  let attempts = 0;
  while (attempts < 100) {
    const candidate = generateAutoBarcode();
    const exists = catalog.some(i => (i.barcode || '').trim().toLowerCase() === candidate.toLowerCase());
    if (!exists) return candidate;
    attempts++;
  }
  return `890${Date.now().toString().slice(-9)}`;
}

/**
 * Smart resolver for QR codes and 1D barcodes.
 * Handles:
 * - Plain barcode numbers (e.g. 8901234560213)
 * - Plain SKU codes (e.g. NOT-7201, KID-4821)
 * - Prefixed strings (e.g. "SKU: NOT-7201", "barcode:8901234560213", "ITEM#123")
 * - URLs (e.g. "https://domain.com/item/NOT-7201" or "?sku=NOT-7201&barcode=890...")
 * - JSON encoded payload strings (e.g. '{"sku":"PEN-1213"}')
 * - Multiline QR payloads with field keys
 */
export function resolveScannedBarcodeOrQr(
  rawInput: string,
  catalog: InventoryItem[]
): { item: InventoryItem | null; extractedCode: string } {
  if (!rawInput || !rawInput.trim() || !catalog || catalog.length === 0) {
    return { item: null, extractedCode: (rawInput || '').trim() };
  }

  const trimmed = rawInput.trim();
  const candidates: string[] = [trimmed];

  // 1. Try stripping common barcode/SKU prefixes
  const prefixRegex = /^(?:sku|barcode|item|code|id|product|upc|ean)[\s:_\-\.\#\=]+/i;
  if (prefixRegex.test(trimmed)) {
    candidates.push(trimmed.replace(prefixRegex, '').trim());
  }

  // 2. Try JSON parsing
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.barcode) candidates.push(String(parsed.barcode).trim());
        if (parsed.sku) candidates.push(String(parsed.sku).trim());
        if (parsed.id) candidates.push(String(parsed.id).trim());
        if (parsed.code) candidates.push(String(parsed.code).trim());
        if (parsed.name) candidates.push(String(parsed.name).trim());
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // 3. Try URL parsing
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('://')) {
    try {
      const url = new URL(trimmed);
      // Query parameters
      const urlParams = ['barcode', 'sku', 'code', 'id', 'item', 'q'];
      for (const param of urlParams) {
        const val = url.searchParams.get(param);
        if (val) candidates.push(val.trim());
      }
      // Path segments
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        candidates.push(pathSegments[pathSegments.length - 1].trim());
      }
    } catch {
      // Not a standard URL, continue
    }
  }

  // 4. Try multiline extraction (e.g. QR formatted as "SKU: XYZ\nPRICE: 120")
  if (trimmed.includes('\n')) {
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      candidates.push(line);
      if (prefixRegex.test(line)) {
        candidates.push(line.replace(prefixRegex, '').trim());
      }
    }
  }

  // 5. Look for direct match across all candidates
  for (const candidate of candidates) {
    if (!candidate) continue;
    const lowerCandidate = candidate.toLowerCase();

    // Exact Barcode match
    const byBarcode = catalog.find(i => (i.barcode || '').trim().toLowerCase() === lowerCandidate);
    if (byBarcode) return { item: byBarcode, extractedCode: candidate };

    // Exact SKU match
    const bySku = catalog.find(i => (i.sku || '').trim().toLowerCase() === lowerCandidate);
    if (bySku) return { item: bySku, extractedCode: candidate };

    // Exact Item ID match
    const byId = catalog.find(i => (i.id || '').trim().toLowerCase() === lowerCandidate);
    if (byId) return { item: byId, extractedCode: candidate };
  }

  // 6. Secondary fallback: Check if candidate is contained within item barcode/sku or vice-versa
  for (const candidate of candidates) {
    if (!candidate || candidate.length < 3) continue;
    const lowerCandidate = candidate.toLowerCase();

    const partialMatch = catalog.find(i => 
      (i.barcode && (i.barcode.toLowerCase().includes(lowerCandidate) || lowerCandidate.includes(i.barcode.toLowerCase()))) ||
      (i.sku && (i.sku.toLowerCase().includes(lowerCandidate) || lowerCandidate.includes(i.sku.toLowerCase()))) ||
      (i.name && i.name.toLowerCase() === lowerCandidate)
    );
    if (partialMatch) {
      return { item: partialMatch, extractedCode: candidate };
    }
  }

  return { item: null, extractedCode: candidates[0] || trimmed };
}

