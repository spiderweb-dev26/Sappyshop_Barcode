import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { InventoryItem, SaleRecord, ExpenseRecord, ActivityLog, StoreSettings, getPaymentMethodLabel } from '../types';
import { formatCurrency } from './currencyUtils';
import { generateAutoSku, generateAutoBarcode } from './skuBarcodeUtils';
import { SAPPY_STATIONERY_CATALOG } from '../data/stationeryCatalog';
import { getAmharicStationeryName, extractBilingualNames, isEthiopicText } from './amharicUtils';

/**
 * Normalizes a string for robust fuzzy matching
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137F]/g, '')
    .trim();
}

/**
 * Find matching catalog item by product name (English or Amharic)
 */
function findCatalogMatch(name: string) {
  if (!name || name.trim().length < 2) return null;
  const clean = normalizeString(name);
  
  // 1. Exact normalized match against English name or Amharic name
  const exact = SAPPY_STATIONERY_CATALOG.find(c => {
    const cClean = normalizeString(c.name);
    const amharic = c.nameAmharic || getAmharicStationeryName(c.name, c.category);
    const aClean = normalizeString(amharic);
    return cClean === clean || aClean === clean;
  });
  if (exact) return exact;

  // 2. Contains match
  const contains = SAPPY_STATIONERY_CATALOG.find(c => {
    const cClean = normalizeString(c.name);
    const amharic = c.nameAmharic || getAmharicStationeryName(c.name, c.category);
    const aClean = normalizeString(amharic);
    return clean.includes(cClean) || cClean.includes(clean) || (aClean && (clean.includes(aClean) || aClean.includes(clean)));
  });
  if (contains) return contains;

  return null;
}

/**
 * Generates and downloads the official Excel Starter Template matching the stationery catalog
 * Fields: Name (English), Amharic Name (የዕቃው ስም), Category, Selling Price (ETB), Cost (ETB), Qty
 * Barcode & SKU are auto-generated on import. Unit is always Pcs. Min stock alert is always 5.
 */
export function downloadExcelTemplate(currencySymbol: string = 'ETB') {
  const headers = [
    'Name (English)',
    'Amharic Name (የዕቃው ስም)',
    'Category',
    `Selling Price (${currencySymbol})`,
    `Cost (${currencySymbol})`,
    'Qty'
  ];

  const sampleData = [
    ['Stationery set', 'የጽሕፈት መሣሪያዎች ስብስብ', 'Kids Material', 600, '', 4],
    ['Oil Paints (Tubes)', 'የዘይት ቀለሞች (ቱቦ)', 'Paint', 450, '', 3],
    ['Acrylic Paints (Tubes)', 'አክሪሊክ ቀለሞች', 'Paint', 450, '', 3],
    ['Watercolor Paints (Tubes)', 'የውሃ ቀለሞች', 'Paint', 450, '', 3],
    ['Kids Watercolor Sunderland', 'የልጆች የውሃ ቀለም (ሰንደርላንድ)', 'Colors', 160, '', 5],
    ['Kids Watercolor vendes', 'የልጆች የውሃ ቀለም (ቬንደስ)', 'Colors', 170, '', 9],
    ['Clear Bag 80 Page', 'ክሊር ባግ 80 ገጽ', 'File Album', 670, '', 0],
    ['Clear Bag 30 Page', 'ክሊር ባግ 30 ገጽ', 'File Album', 450, '', 3],
    ['Clear Bag 60 page', 'ክሊር ባግ 60 ገጽ', 'File Album', 550, '', 8],
    ['Canvas Tape', 'የሸራ ቴፕ', 'Tape', 350, '', 8],
    ['Metal Ruler (30cm)', 'የብረት ማስመሪያ (30 ሳ.ሜ)', 'Ruler', 300, '', 2],
    ['Ruler (30cm)', 'ማስመሪያ (30 ሳ.ሜ)', 'Ruler', 80, '', 3],
    ['Ruler (50cm)', 'ማስመሪያ (50 ሳ.ሜ)', 'Ruler', 80, '', 3],
    ['DVD Marker', 'ዲቪዲ ማርከር', 'Marker', 85, '', 40],
    ['Highlighter', 'ሃይላይተር (ማድመቂያ)', 'Highlighter', 85, '', 22],
    ['Gravity Register 25x35', 'ግራቪቲ ሬጂስተር 25x35', 'Notebooks', 750, 600, 4],
    ['Gravity Register (200 Sheets)', 'ግራቪቲ ሬጂስተር (200 ቅጠል)', 'Notebooks', 600, 500, 3],
    ['Bear Scissors', 'የድብ ቅርጽ መቀስ', 'Scissor', 90, '', 8],
    ['A7 Emoji Notebook', 'A7 ኢሞጂ ማስታወሻ ደብተር', 'Notebook', 100, '', 12],
    ['Alkaline Battery (9V)', 'አልካላይን ባትሪ (9V)', 'Battery', 600, 400, 10],
    ['Alkaline Battery (AAA)', 'አልካላይን ባትሪ (AAA)', 'Battery', 200, 134, 12],
    ['Alkaline Battery (AA)', 'አልካላይን ባትሪ (AA)', 'Battery', 200, 134, 10],
    ['Utility Cutter Knife (Small)', 'መቁረጫ ካተር ቢላዋ (ትንሽ)', 'Cutter', 120, '', 30],
    ['Utility Cutter Knife (Large)', 'መቁረጫ ካተር ቢላዋ (ትልቅ)', 'Cutter', 600, '', 2],
    ['Scissors (Extra Small)', 'መቀስ (በጣም ትንሽ)', 'Scissor', 100, '', 14]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set comfortable column widths
  ws['!cols'] = [
    { wch: 34 }, // Name (English)
    { wch: 32 }, // Amharic Name (የዕቃው ስም)
    { wch: 20 }, // Category
    { wch: 22 }, // Selling Price (ETB)
    { wch: 18 }, // Cost (ETB)
    { wch: 14 }  // Qty
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Template');

  // Add Instructions Sheet
  const instructions = [
    ['SAPPY STATIONARY - BILINGUAL INVENTORY IMPORT GUIDE (ENGLISH & AMHARIC)'],
    [''],
    ['Key Column Rules:'],
    ['1. Name (English): Product name or title in English (Required, e.g. "Oil Paints", "Metal Ruler")'],
    ['2. Amharic Name (የዕቃው ስም): Product name in Amharic (Recommended for bilingual labels & receipts, e.g. "የዘይት ቀለሞች", "ማስመሪያ")'],
    ['3. Category: Classification e.g. Kids Material, Paint, Colors, File Album, Notebooks, Ruler, Scissor (Required)'],
    [`4. Selling Price (${currencySymbol}): Retail checkout price (Required, numeric)`],
    [`5. Cost (${currencySymbol}): Purchase/wholesale cost per unit (Optional, numeric)`],
    ['6. Qty: Current stock on hand count (Required, numeric)'],
    [''],
    ['Automated System Defaults:'],
    ['• SKU & BARCODE: Automatically generated for every item using unique retail identifiers.'],
    ['• UNIT: Always fixed to "Pcs".'],
    ['• LOW STOCK ALERT: Always set to 5 units minimum.'],
    ['• AUTO-TRANSLATION: If Amharic Name is left blank, Sappy Stationery automatically suggests or infers it based on the English name and stationery dictionary.'],
    [''],
    ['Tips:'],
    ['- Save your spreadsheet as .xlsx or .csv.'],
    ['- You can upload up to 5,000 items in a single batch file.']
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  XLSX.writeFile(wb, 'SappyStationary_Inventory_Template.xlsx');
}

/**
 * Helper to find value from row with fuzzy / normalized key matching
 */
function getRowValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  
  // 1. Exact case-insensitive match
  for (const alias of aliases) {
    const match = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase());
    if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
      return row[match];
    }
  }

  // 2. Normalized match (strip non-alphanumeric)
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlias);
    if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
      return row[match];
    }
  }

  // 3. Substring / contains match
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanAlias.length < 3) continue;
    const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanAlias));
    if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
      return row[match];
    }
  }

  return undefined;
}

/**
 * Safely parse numeric string or number
 */
function parseCleanNumber(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses Excel (.xlsx, .xls) or CSV files into InventoryItem array
 * Robust multi-pass parser supporting:
 * - Direct header matching with aliases
 * - Positional column index tracking (Cols: Name, Category, Selling Price, Cost, Qty)
 * - Intelligent Master Catalog cross-referencing to recover exact stationery prices/costs
 * - Automatic SKU & EAN-13 barcode generation, Pcs unit, and 5-item min alert
 */
export async function parseExcelOrCsvFile(file: File): Promise<{ items: Partial<InventoryItem>[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const items: Partial<InventoryItem>[] = [];
        const errors: string[] = [];

        // Alias dictionaries for flexible header detection
        const nameAliases = ['Name', 'Product Name', 'Item Name', 'Product', 'Title', 'Item', 'Stationery Item', 'Description', 'Item Description', 'Products', 'English Name', 'Name (English)'];
        const amharicAliases = ['Amharic Name', 'Amharic', 'Name (Amharic)', 'Name Amharic', 'የዕቃው ስም', 'የአማርኛ ስም', 'ስም (አማርኛ)', 'AmharicName', 'Amharic Description', 'Local Name', 'Amharic Title'];
        const catAliases = ['Category', 'Cat', 'Department', 'Group', 'Type', 'Section', 'Classification'];
        const sellAliases = ['Selling Price (ETB)', 'Selling Price(ETB)', 'Selling Price', 'Price (ETB)', 'Price(ETB)', 'Price', 'SellingPrice', 'Unit Price', 'Retail Price', 'Retail', 'Sales Price', 'Selling Price ($)', 'Sell Price', 'Rate', 'SP', 'S.P', 'Price ETB', 'Price in ETB', 'Amount'];
        const costAliases = ['Cost (ETB)', 'Cost(ETB)', 'Cost Price (ETB)', 'Cost Price(ETB)', 'Cost Price', 'CostPrice', 'Cost', 'Cost ($)', 'Purchase Price', 'Buying Price', 'Wholesale Price', 'CP', 'C.P'];
        const qtyAliases = ['Qty', 'Quantity', 'Stock', 'Count', 'Current Stock', 'In Stock', 'Qty in Stock', 'Quantity (Pcs)', 'Qty (Pcs)', 'Amount', 'Total Qty', 'Balance', 'Units'];
        const skuAliases = ['SKU', 'Sku', 'Item Code', 'Product Code', 'Code'];
        const barcodeAliases = ['Barcode', 'Barcode (EAN-13)', 'EAN', 'UPC', 'Bar Code'];

        // Iterate through sheets
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          // Convert to raw 2D array
          const rawAoa = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
          if (!rawAoa || rawAoa.length === 0) return;

          // Find header row and determine column indexes
          let headerRowIndex = -1;
          let colName = -1;
          let colAmharic = -1;
          let colCat = -1;
          let colSell = -1;
          let colCost = -1;
          let colQty = -1;
          let colSku = -1;
          let colBarcode = -1;

          for (let r = 0; r < Math.min(rawAoa.length, 12); r++) {
            const rowArr = (rawAoa[r] || []) as unknown[];
            const joined = rowArr.map(c => String(c).toLowerCase().trim()).join(' ');

            if (
              (joined.includes('name') || joined.includes('product') || joined.includes('item') || joined.includes('description') || joined.includes('የዕቃው') || joined.includes('አማርኛ')) &&
              (joined.includes('price') || joined.includes('selling') || joined.includes('category') || joined.includes('cost') || joined.includes('qty') || joined.includes('stock'))
            ) {
              headerRowIndex = r;

              // Map each column index
              rowArr.forEach((cellVal, cIdx) => {
                const cellStr = String(cellVal || '').toLowerCase().trim();
                const cellClean = cellStr.replace(/[^a-z0-9]/g, '');

                const isAmharicHeader = cellStr.includes('amharic') || cellStr.includes('አማርኛ') || cellStr.includes('የዕቃው ስም') || amharicAliases.some(alias => cellStr === alias.toLowerCase() || cellClean === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));

                if (colAmharic === -1 && isAmharicHeader) {
                  colAmharic = cIdx;
                } else if (colName === -1 && !isAmharicHeader && (cellStr.includes('name') || cellStr.includes('product') || cellStr.includes('item') || cellStr.includes('description') || nameAliases.some(a => cellStr === a.toLowerCase()))) {
                  colName = cIdx;
                } else if (colCat === -1 && (cellStr.includes('category') || cellStr.includes('cat') || cellStr.includes('group') || cellStr.includes('dept'))) {
                  colCat = cIdx;
                } else if (colCost === -1 && (cellStr.includes('cost') || cellStr.includes('purchase') || cellStr.includes('buy') || cellClean === 'cp')) {
                  colCost = cIdx;
                } else if (colSell === -1 && (cellStr.includes('sell') || cellStr.includes('price') || cellStr.includes('retail') || cellStr.includes('rate') || cellClean === 'sp' || cellStr.includes('amount'))) {
                  colSell = cIdx;
                } else if (colQty === -1 && (cellStr.includes('qty') || cellStr.includes('quantity') || cellStr.includes('stock') || cellStr.includes('count') || cellStr.includes('balance'))) {
                  colQty = cIdx;
                } else if (colSku === -1 && (cellStr.includes('sku') || cellClean === 'code')) {
                  colSku = cIdx;
                } else if (colBarcode === -1 && (cellStr.includes('barcode') || cellStr.includes('ean') || cellStr.includes('upc'))) {
                  colBarcode = cIdx;
                }
              });

              break;
            }
          }

          // If header detected, process row by row using mapped columns
          if (headerRowIndex !== -1) {
            const startRow = headerRowIndex + 1;
            
            for (let r = startRow; r < rawAoa.length; r++) {
              const rowCells = (rawAoa[r] || []) as unknown[];
              if (!rowCells || rowCells.length === 0) continue;

              let rawName = colName !== -1 ? String(rowCells[colName] || '').trim() : '';
              let rawAmharic = colAmharic !== -1 ? String(rowCells[colAmharic] || '').trim() : '';
              
              // If name column is empty, check if first non-empty string cell is the name
              if (!rawName) {
                const firstStrCell = rowCells.find(c => typeof c === 'string' && c.trim().length > 1 && isNaN(Number(c)));
                if (firstStrCell) {
                  rawName = String(firstStrCell).trim();
                }
              }

              if (!rawName || rawName.toLowerCase() === 'name' || rawName.toLowerCase() === 'item name') {
                continue; // Skip empty rows or repeated headers
              }

              // Extract bilingual names
              const bilingual = extractBilingualNames(rawName, rawAmharic);
              let name = bilingual.name;
              let nameAmharic = bilingual.nameAmharic;

              if (!name && nameAmharic) {
                name = nameAmharic;
              }

              let category = colCat !== -1 ? String(rowCells[colCat] || '').trim() : '';
              let sellingPrice = colSell !== -1 ? parseCleanNumber(rowCells[colSell]) : 0;
              let costPrice = colCost !== -1 ? parseCleanNumber(rowCells[colCost]) : 0;
              let stock = colQty !== -1 ? Math.round(parseCleanNumber(rowCells[colQty])) : 0;
              let sku = colSku !== -1 ? String(rowCells[colSku] || '').trim() : '';
              let barcode = colBarcode !== -1 ? String(rowCells[colBarcode] || '').trim() : '';

              // Positional fallback within the row if prices/quantities are 0
              if (sellingPrice === 0) {
                // Look for numeric cells in the row
                const numericIndices: number[] = [];
                rowCells.forEach((c, idx) => {
                  const num = parseCleanNumber(c);
                  if (num > 0 && idx !== colSku && idx !== colBarcode) {
                    numericIndices.push(idx);
                  }
                });

                if (numericIndices.length >= 2) {
                  // Usually: Selling Price, Cost, Qty OR Price, Qty
                  sellingPrice = parseCleanNumber(rowCells[numericIndices[0]]);
                  if (numericIndices.length >= 3) {
                    costPrice = parseCleanNumber(rowCells[numericIndices[1]]);
                    stock = Math.round(parseCleanNumber(rowCells[numericIndices[2]]));
                  } else {
                    stock = Math.round(parseCleanNumber(rowCells[numericIndices[1]]));
                  }
                } else if (numericIndices.length === 1) {
                  sellingPrice = parseCleanNumber(rowCells[numericIndices[0]]);
                }
              }

              // INTELLIGENT MASTER CATALOG RECOVERY:
              // Cross-reference against Sappy's stationery catalog if price is missing or 0
              let imageUrl: string | undefined = undefined;
              const catalogMatch = findCatalogMatch(name) || (nameAmharic ? findCatalogMatch(nameAmharic) : null);
              if (catalogMatch) {
                if (sellingPrice === 0) {
                  sellingPrice = catalogMatch.sellingPrice;
                }
                if (costPrice === 0 && catalogMatch.costPrice > 0) {
                  costPrice = catalogMatch.costPrice;
                }
                if (!category || category === 'General') {
                  category = catalogMatch.category;
                }
                if (!sku) {
                  sku = catalogMatch.sku;
                }
                if (!barcode) {
                  barcode = catalogMatch.barcode;
                }
                if (!nameAmharic && (catalogMatch.nameAmharic || getAmharicStationeryName(catalogMatch.name, catalogMatch.category))) {
                  nameAmharic = catalogMatch.nameAmharic || getAmharicStationeryName(catalogMatch.name, catalogMatch.category);
                }
                if (catalogMatch.imageUrl) {
                  imageUrl = catalogMatch.imageUrl;
                }
              }

              if (!nameAmharic) {
                nameAmharic = getAmharicStationeryName(name, category);
              }

              if (!category) category = 'General';
              if (!sku) sku = generateAutoSku(category, name);
              if (!barcode) barcode = generateAutoBarcode();

              items.push({
                id: `item-imp-${Date.now()}-${items.length}`,
                sku,
                barcode,
                name,
                nameAmharic: nameAmharic || undefined,
                category,
                unit: 'Pcs',
                costPrice,
                sellingPrice,
                stock,
                minStockAlert: 5,
                imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          } else {
            // Positional fallback (Headerless table)
            // Supports:
            // 6 columns: [Name, Amharic Name, Category, Selling Price, Cost, Qty]
            // 5 columns: [Name, Category, Selling Price, Cost, Qty] OR [Name, Amharic Name, Category, Price, Qty]
            rawAoa.forEach((rowCells) => {
              const cells = (rowCells || []) as unknown[];
              if (!cells || cells.length === 0) return;

              const rawName = String(cells[0] || '').trim();
              if (!rawName || rawName.toLowerCase() === 'name') return;

              let rawAmharic = '';
              let category = 'General';
              let sellVal = 0;
              let costVal = 0;
              let qtyVal = 0;

              if (cells.length >= 6) {
                // [Name, Amharic Name, Category, Selling Price, Cost, Qty]
                rawAmharic = String(cells[1] || '').trim();
                category = String(cells[2] || 'General').trim();
                sellVal = parseCleanNumber(cells[3]);
                costVal = parseCleanNumber(cells[4]);
                qtyVal = Math.round(parseCleanNumber(cells[5]));
              } else if (cells.length === 5) {
                const cell1Str = String(cells[1] || '').trim();
                if (isEthiopicText(cell1Str)) {
                  rawAmharic = cell1Str;
                  category = String(cells[2] || 'General').trim();
                  sellVal = parseCleanNumber(cells[3]);
                  qtyVal = Math.round(parseCleanNumber(cells[4]));
                } else {
                  category = cell1Str || 'General';
                  sellVal = parseCleanNumber(cells[2]);
                  costVal = parseCleanNumber(cells[3]);
                  qtyVal = Math.round(parseCleanNumber(cells[4]));
                }
              } else if (cells.length === 4) {
                category = String(cells[1] || 'General').trim();
                sellVal = parseCleanNumber(cells[2]);
                qtyVal = Math.round(parseCleanNumber(cells[3]));
              } else if (cells.length === 3) {
                sellVal = parseCleanNumber(cells[1]);
                qtyVal = Math.round(parseCleanNumber(cells[2]));
              }

              const bilingual = extractBilingualNames(rawName, rawAmharic);
              let name = bilingual.name;
              let nameAmharic = bilingual.nameAmharic;
              if (!name && nameAmharic) name = nameAmharic;

              // Cross-reference master catalog
              let imageUrl: string | undefined = undefined;
              const catalogMatch = findCatalogMatch(name) || (nameAmharic ? findCatalogMatch(nameAmharic) : null);
              let sku = '';
              let barcode = '';

              if (catalogMatch) {
                if (sellVal === 0) sellVal = catalogMatch.sellingPrice;
                if (costVal === 0) costVal = catalogMatch.costPrice;
                if (!category || category === 'General') category = catalogMatch.category;
                sku = catalogMatch.sku;
                barcode = catalogMatch.barcode;
                if (!nameAmharic && (catalogMatch.nameAmharic || getAmharicStationeryName(catalogMatch.name, catalogMatch.category))) {
                  nameAmharic = catalogMatch.nameAmharic || getAmharicStationeryName(catalogMatch.name, catalogMatch.category);
                }
                if (catalogMatch.imageUrl) imageUrl = catalogMatch.imageUrl;
              }

              if (!nameAmharic) {
                nameAmharic = getAmharicStationeryName(name, category);
              }

              if (!category) category = 'General';
              if (!sku) sku = generateAutoSku(category, name);
              if (!barcode) barcode = generateAutoBarcode();

              items.push({
                id: `item-imp-${Date.now()}-${items.length}`,
                sku,
                barcode,
                name,
                nameAmharic: nameAmharic || undefined,
                category: category || 'General',
                unit: 'Pcs',
                costPrice: costVal,
                sellingPrice: sellVal,
                stock: qtyVal,
                minStockAlert: 5,
                imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            });
          }
        });

        if (items.length === 0) {
          throw new Error('No valid stationery items could be parsed from the spreadsheet. Please check columns.');
        }

        resolve({ items, errors });
      } catch (err) {
        reject(new Error(`Failed to parse file: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses raw text from PDF files or catalogs to extract tabular lines
 */
export function parsePdfRawText(text: string): Partial<InventoryItem>[] {
  const lines = text.split('\n');
  const items: Partial<InventoryItem>[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    // Look for patterns like: Name / Price / Stock / Category
    const parts = trimmed.split(/[\t,|;]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const name = parts[0];
      const category = parts[3] || 'General';
      const price = parseFloat(parts[1].replace(/[^0-9.-]+/g, '')) || 50.0;
      const stock = parseInt(parts[2]?.replace(/[^0-9-]+/g, '') || '10', 10) || 10;

      items.push({
        id: `pdf-item-${Date.now()}-${idx}`,
        sku: generateAutoSku(category, name),
        barcode: generateAutoBarcode(),
        name,
        category,
        costPrice: Math.round(price * 0.7 * 100) / 100,
        sellingPrice: price,
        stock,
        minStockAlert: 5,
        unit: 'Pcs',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });

  return items;
}

// ----------------------------------------------------
// EXPORT REPORTS IN REAL-TIME (EXCEL & PDF)
// ----------------------------------------------------

/**
 * Real-time Inventory Valuation Report to Excel
 */
export function exportInventoryToExcel(items: InventoryItem[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const rows = items.map(item => {
    const totalCostVal = item.stock * item.costPrice;
    const totalRetailVal = item.stock * item.sellingPrice;
    const potentialProfit = totalRetailVal - totalCostVal;
    const margin = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100 : 0;

    return {
      'SKU': item.sku,
      'Barcode': item.barcode,
      'Item Name': item.name,
      'Amharic Name (የዕቃው ስም)': item.nameAmharic || '',
      'Category': item.category,
      'Unit': 'Pcs',
      'Stock on Hand': item.stock,
      'Min Alert': 5,
      [`Cost Price (${sym})`]: item.costPrice,
      [`Selling Price (${sym})`]: item.sellingPrice,
      'Unit Margin (%)': `${margin.toFixed(1)}%`,
      [`Total Cost Value (${sym})`]: totalCostVal,
      [`Total Retail Value (${sym})`]: totalRetailVal,
      [`Potential Profit (${sym})`]: potentialProfit,
      'Location': item.location || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Valuation');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Inventory_Report_${timestamp}.xlsx`);
}

/**
 * Real-time Inventory Valuation Report to PDF
 */
export function exportInventoryToPdf(items: InventoryItem[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const doc = new jsPDF('landscape');
  
  // Header
  doc.setFillColor(6, 78, 59); // Deep Emerald
  doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.storeName.toUpperCase(), 14, 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`INVENTORY VALUATION & STOCK REPORT  |  Generated: ${new Date().toLocaleString()}`, 14, 19);

  // Summary Metrics
  const totalItems = items.length;
  const totalStockCount = items.reduce((acc, i) => acc + i.stock, 0);
  const totalCostVal = items.reduce((acc, i) => acc + (i.stock * i.costPrice), 0);
  const totalRetailVal = items.reduce((acc, i) => acc + (i.stock * i.sellingPrice), 0);
  const lowStockCount = items.filter(i => i.stock <= (i.minStockAlert || 5)).length;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(
    `Total SKUs: ${totalItems}  |  Total Units: ${totalStockCount.toLocaleString()} Pcs  |  Cost Valuation: ${formatCurrency(totalCostVal, sym)}  |  Retail Valuation: ${formatCurrency(totalRetailVal, sym)}  |  Low Stock Alerts (≤5): ${lowStockCount}`,
    14, 30
  );

  const tableData = items.map(item => [
    item.sku,
    item.name,
    item.category,
    `${item.stock} Pcs`,
    formatCurrency(item.costPrice, sym),
    formatCurrency(item.sellingPrice, sym),
    formatCurrency(item.stock * item.costPrice, sym),
    formatCurrency(item.stock * item.sellingPrice, sym),
    item.stock <= 0 ? 'OUT OF STOCK' : item.stock <= (item.minStockAlert || 5) ? 'LOW STOCK (≤5)' : 'OK',
    item.location || '-'
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['SKU', 'Item Name', 'Category', 'Stock (Pcs)', 'Cost', 'Price', 'Total Cost', 'Total Retail', 'Status', 'Location']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Inventory_Report_${timestamp}.pdf`);
}

/**
 * Real-time Sales Ledger Report to Excel
 */
export function exportSalesToExcel(sales: SaleRecord[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const rows: Record<string, unknown>[] = [];

  sales.forEach(sale => {
    sale.items.forEach(item => {
      rows.push({
        'Invoice #': sale.invoiceNo,
        'Date & Time': new Date(sale.createdAt).toLocaleString(),
        'Customer Name': sale.customerName || 'Walk-in Customer',
        'Customer Phone': sale.customerPhone || '-',
        'Cashier': sale.cashierName,
        'Payment Method': getPaymentMethodLabel(sale.paymentMethod),
        'Item SKU': item.sku,
        'Item Barcode': item.barcode,
        'Item Name': item.name,
        'Category': item.category,
        'Quantity': item.quantity,
        [`Unit Price (${sym})`]: item.unitPrice,
        [`Unit Cost (${sym})`]: item.costPrice,
        [`Line Total (${sym})`]: item.subtotal,
        [`Invoice Subtotal (${sym})`]: sale.subtotal,
        [`Invoice Discount (${sym})`]: sale.discountAmount,
        [`Tax Amount (${sym})`]: sale.taxAmount,
        [`Grand Total (${sym})`]: sale.grandTotal,
        [`Gross Profit (${sym})`]: sale.netProfit,
        'Status': sale.status,
        'Notes': sale.notes || '-'
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales_Transactions');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Sales_Report_${timestamp}.xlsx`);
}

/**
 * Real-time Sales Ledger Report to PDF
 */
export function exportSalesToPdf(sales: SaleRecord[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const doc = new jsPDF('landscape');
  
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.storeName.toUpperCase(), 14, 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`SALES & REVENUE AUDIT LEDGER  |  Generated: ${new Date().toLocaleString()}`, 14, 19);

  const totalRev = sales.reduce((acc, s) => acc + (s.status === 'COMPLETED' ? s.grandTotal : 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.status === 'COMPLETED' ? s.netProfit : 0), 0);
  const totalOrders = sales.length;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(
    `Total Completed Invoices: ${totalOrders}  |  Total Gross Sales: ${formatCurrency(totalRev, sym)}  |  Total Gross Profit: ${formatCurrency(totalProfit, sym)}`,
    14, 30
  );

  const tableData = sales.map(sale => [
    sale.invoiceNo,
    new Date(sale.createdAt).toLocaleDateString(),
    sale.customerName || 'Walk-in',
    sale.cashierName,
    getPaymentMethodLabel(sale.paymentMethod),
    sale.items.reduce((acc, i) => acc + i.quantity, 0).toString(),
    formatCurrency(sale.subtotal, sym),
    formatCurrency(sale.taxAmount, sym),
    formatCurrency(sale.grandTotal, sym),
    formatCurrency(sale.netProfit, sym),
    sale.status
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['Invoice #', 'Date', 'Customer', 'Cashier', 'Payment', 'Items', 'Subtotal', 'Tax', 'Grand Total', 'Profit', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Sales_Report_${timestamp}.pdf`);
}

/**
 * Real-time Profit & Loss Statement (P&L) to Excel & PDF
 */
export function exportProfitLossReport(
  sales: SaleRecord[], 
  expenses: ExpenseRecord[], 
  settings: StoreSettings
) {
  const sym = settings.currencySymbol || 'ETB';
  const activeSales = sales.filter(s => s.status === 'COMPLETED');
  const totalRevenue = activeSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalCOGS = activeSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netIncome = grossProfit - totalExpenses;

  // Expenses grouped by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  // Excel
  const plData = [
    { 'P&L Line Item': 'REVENUE', [`Amount (${sym})`]: '' },
    { 'P&L Line Item': 'Total Sales Revenue (Gross)', [`Amount (${sym})`]: totalRevenue },
    { 'P&L Line Item': 'Cost of Goods Sold (COGS)', [`Amount (${sym})`]: -totalCOGS },
    { 'P&L Line Item': 'GROSS PROFIT', [`Amount (${sym})`]: grossProfit },
    { 'P&L Line Item': '', [`Amount (${sym})`]: '' },
    { 'P&L Line Item': 'OPERATING EXPENSES', [`Amount (${sym})`]: '' },
    ...Object.entries(expenseByCategory).map(([cat, amt]) => ({
      'P&L Line Item': `  - ${cat}`,
      [`Amount (${sym})`]: -amt
    })),
    { 'P&L Line Item': 'Total Operating Expenses', [`Amount (${sym})`]: -totalExpenses },
    { 'P&L Line Item': '', [`Amount (${sym})`]: '' },
    { 'P&L Line Item': 'NET OPERATING INCOME', [`Amount (${sym})`]: netIncome }
  ];

  const ws = XLSX.utils.json_to_sheet(plData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Profit_And_Loss');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_PnL_Statement_${timestamp}.xlsx`);
}

/**
 * Real-time Expenses Ledger to Excel
 */
export function exportExpensesToExcel(expenses: ExpenseRecord[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const rows = expenses.map(e => ({
    'Expense #': e.expenseNo,
    'Date': e.date || new Date(e.createdAt).toLocaleDateString(),
    'Category': e.category,
    'Title / Description': e.title,
    [`Amount (${sym})`]: e.amount,
    'Payee / Vendor': e.payee || '-',
    'Payment Method': e.paymentMethod,
    'Recorded By': e.recordedByName,
    'Notes': e.notes || '-'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Operating_Expenses');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Expenses_${timestamp}.xlsx`);
}

/**
 * Real-time Expenses Ledger to PDF
 */
export function exportExpensesToPdf(expenses: ExpenseRecord[], settings: StoreSettings) {
  const sym = settings.currencySymbol || 'ETB';
  const doc = new jsPDF('landscape');
  
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.storeName.toUpperCase(), 14, 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`OPERATING EXPENSES LEDGER  |  Generated: ${new Date().toLocaleString()}`, 14, 19);

  const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(
    `Total Logged Expenses: ${expenses.length}  |  Total Expense Amount: ${formatCurrency(totalExp, sym)}`,
    14, 30
  );

  const tableData = expenses.map(e => [
    e.expenseNo,
    e.date || new Date(e.createdAt).toLocaleDateString(),
    e.category,
    e.title,
    e.payee || '-',
    e.paymentMethod,
    e.recordedByName,
    formatCurrency(e.amount, sym)
  ]);

  autoTable(doc, {
    startY: 34,
    head: [['Expense #', 'Date', 'Category', 'Expense Title', 'Vendor / Payee', 'Payment Method', 'Recorded By', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Expenses_${timestamp}.pdf`);
}

/**
 * Real-time Audit Logs to Excel
 */
export function exportAuditLogsToExcel(logs: ActivityLog[], settings: StoreSettings) {
  const rows = logs.map(log => ({
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'User Name': log.userName,
    'Role': log.userRole,
    'Action Type': log.actionType,
    'Entity Type': log.entityType,
    'Entity ID': log.entityId || '-',
    'Details': log.details
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit_Trail');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${settings.storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Audit_Logs_${timestamp}.xlsx`);
}

/**
 * Creates a high-contrast base64 PNG data URL of a barcode using JsBarcode
 */
export function createBarcodeDataUrl(
  value: string, 
  options?: { displayValue?: boolean; fontSize?: number; height?: number }
): string {
  try {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    let format: 'CODE128' | 'EAN13' = 'CODE128';
    const clean = String(value || '').trim();
    if ((clean.length === 12 || clean.length === 13) && /^\d+$/.test(clean)) {
      format = 'EAN13';
    }

    try {
      JsBarcode(canvas, clean, {
        format,
        width: 2,
        height: options?.height || 40,
        displayValue: options?.displayValue ?? true,
        fontSize: options?.fontSize || 12,
        margin: 2,
        font: 'monospace',
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      JsBarcode(canvas, clean, {
        format: 'CODE128',
        width: 2,
        height: options?.height || 40,
        displayValue: options?.displayValue ?? true,
        fontSize: options?.fontSize || 12,
        margin: 2,
        font: 'monospace',
        background: '#ffffff',
        lineColor: '#000000',
      });
    }
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Barcode canvas generation error:', e);
    return '';
  }
}

export type BarcodeLayoutType = 
  | 'sheet-30' 
  | 'sheet-24' 
  | 'sheet-40' 
  | 'sheet-80' 
  | 'sheet-14' 
  | 'sheet-8' 
  | 'shelf-tag' 
  | 'shelf-talker' 
  | 'single' 
  | 'single-wide' 
  | 'single-mini' 
  | 'jewelry-tag';

export interface BarcodeLabelPrintOptions {
  layout: BarcodeLayoutType;
  showStoreName: boolean;
  showItemName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcodeText: boolean;
  storeName: string;
  currencySymbol: string;
}

/**
 * Generates and downloads a clean, printable PDF of Barcode Labels
 * supporting extensive layout options: 30-per-sheet, 24-per-sheet, 40-per-sheet, 80-micro,
 * 14-medium, 8-large bin tags, Shelf Edge Tags, Promo Shelf Talkers, and Thermal Rolls (50x30, 60x40, 30x20, Jewelry tags)
 */
export function exportBarcodeLabelsToPdf(
  labels: InventoryItem[],
  options: BarcodeLabelPrintOptions
) {
  if (labels.length === 0) return;

  const { layout, showStoreName, showItemName, showPrice, showSku, showBarcodeText, storeName, currencySymbol } = options;

  // 1. THERMAL ROLL / INDIVIDUAL STICKER LAYOUTS
  if (layout === 'single' || layout === 'single-wide' || layout === 'single-mini' || layout === 'jewelry-tag') {
    let rollW = 50;
    let rollH = 30;

    if (layout === 'single-wide') {
      rollW = 60;
      rollH = 40;
    } else if (layout === 'single-mini') {
      rollW = 30;
      rollH = 20;
    } else if (layout === 'jewelry-tag') {
      rollW = 60;
      rollH = 22;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [rollW, rollH]
    });

    labels.forEach((item, idx) => {
      if (idx > 0) doc.addPage([rollW, rollH], 'landscape');

      if (layout === 'jewelry-tag') {
        // Dual-Panel foldover tag: Left side barcode, Right side title & price
        const halfW = rollW / 2;
        
        // Left Panel (Barcode)
        const imgData = createBarcodeDataUrl(item.barcode, {
          displayValue: showBarcodeText,
          fontSize: 7,
          height: 25
        });
        if (imgData) {
          doc.addImage(imgData, 'PNG', 2, 3, halfW - 4, 15);
        }

        // Fold line divider
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(halfW, 1, halfW, rollH - 1);
        doc.setLineDashPattern([], 0);

        // Right Panel (Product details)
        let ry = 4;
        if (showStoreName) {
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139);
          doc.text(storeName.toUpperCase(), halfW + halfW / 2, ry, { align: 'center' });
          ry += 3;
        }

        if (showItemName) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          const nameLines = doc.splitTextToSize(item.name, halfW - 4);
          doc.text(nameLines[0] || item.name, halfW + halfW / 2, ry, { align: 'center' });
          ry += 3.5;
        }

        if (showSku) {
          doc.setFontSize(5.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`SKU: ${item.sku}`, halfW + 2, ry + 2);
        }

        if (showPrice) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(4, 120, 87);
          doc.text(formatCurrency(item.sellingPrice, currencySymbol), rollW - 2, ry + 5, { align: 'right' });
        }
        return;
      }

      // Standard / Wide / Mini Thermal Roll
      let y = layout === 'single-mini' ? 1.5 : 3;

      if (showStoreName && layout !== 'single-mini') {
        doc.setFontSize(layout === 'single-wide' ? 7 : 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(storeName.toUpperCase(), rollW / 2, y, { align: 'center' });
        y += (layout === 'single-wide' ? 3.5 : 3);
      }

      if (showItemName) {
        doc.setFontSize(layout === 'single-wide' ? 8.5 : (layout === 'single-mini' ? 6 : 7.5));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const nameLines = doc.splitTextToSize(item.name, rollW - 4);
        doc.text(nameLines[0] || item.name, rollW / 2, y, { align: 'center' });
        y += (layout === 'single-wide' ? 4 : 3);
      }

      // Barcode image
      const barcodeHeight = layout === 'single-wide' ? 16 : (layout === 'single-mini' ? 8.5 : 12);
      const imgData = createBarcodeDataUrl(item.barcode, {
        displayValue: showBarcodeText && layout !== 'single-mini',
        fontSize: 9,
        height: 35
      });
      if (imgData) {
        doc.addImage(imgData, 'PNG', 3, y, rollW - 6, barcodeHeight);
        y += barcodeHeight + (layout === 'single-mini' ? 0.5 : 1.5);
      }

      // SKU and Price
      const footerY = rollH - 2;
      doc.setFontSize(layout === 'single-wide' ? 7.5 : 6);
      doc.setFont('helvetica', 'bold');

      if (showSku) {
        doc.setTextColor(71, 85, 105);
        doc.text(item.sku, 3, footerY);
      }

      if (showPrice) {
        doc.setFontSize(layout === 'single-wide' ? 9 : (layout === 'single-mini' ? 6.5 : 7.5));
        doc.setTextColor(4, 120, 87);
        doc.text(formatCurrency(item.sellingPrice, currencySymbol), rollW - 3, footerY, { align: 'right' });
      }
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Labels_${layout}_${timestamp}.pdf`);
    return;
  }

  // 2. STANDARD SHEET & SHELF LAYOUTS (Letter / A4 grid)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let cols = 3;
  let rows = 10;
  let marginX = 6.5;
  let marginY = 10;
  let gapX = 3.5;
  let gapY = 0.5;
  let isDisplayTag = false;

  if (layout === 'sheet-30') {
    cols = 3;
    rows = 10;
    marginX = 6.5;
    marginY = 10;
    gapX = 3.5;
    gapY = 0.5;
  } else if (layout === 'sheet-24') {
    cols = 3;
    rows = 8;
    marginX = 7;
    marginY = 10;
    gapX = 4;
    gapY = 1.5;
  } else if (layout === 'sheet-40') {
    cols = 4;
    rows = 10;
    marginX = 6;
    marginY = 8;
    gapX = 2.5;
    gapY = 1;
  } else if (layout === 'sheet-80') {
    cols = 4;
    rows = 20;
    marginX = 5;
    marginY = 6;
    gapX = 2;
    gapY = 0.5;
  } else if (layout === 'sheet-14') {
    cols = 2;
    rows = 7;
    marginX = 8;
    marginY = 10;
    gapX = 5;
    gapY = 2.5;
  } else if (layout === 'sheet-8') {
    cols = 2;
    rows = 4;
    marginX = 10;
    marginY = 12;
    gapX = 6;
    gapY = 5;
    isDisplayTag = true;
  } else if (layout === 'shelf-tag') {
    cols = 2;
    rows = 4;
    marginX = 12;
    marginY = 14;
    gapX = 6;
    gapY = 5;
    isDisplayTag = true;
  } else if (layout === 'shelf-talker') {
    cols = 2;
    rows = 2;
    marginX = 14;
    marginY = 16;
    gapX = 8;
    gapY = 8;
    isDisplayTag = true;
  }

  const labelWidth = (pageWidth - 2 * marginX - (cols - 1) * gapX) / cols;
  const labelHeight = (pageHeight - 2 * marginY - (rows - 1) * gapY) / rows;
  const labelsPerPage = cols * rows;

  labels.forEach((item, index) => {
    const posOnPage = index % labelsPerPage;
    const colIndex = posOnPage % cols;
    const rowIndex = Math.floor(posOnPage / cols);

    if (index > 0 && posOnPage === 0) {
      doc.addPage('letter', 'portrait');
    }

    const x = marginX + colIndex * (labelWidth + gapX);
    const y = marginY + rowIndex * (labelHeight + gapY);

    // Draw card border
    if (layout === 'shelf-talker') {
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1);
      doc.roundedRect(x, y, labelWidth, labelHeight, 3, 3, 'S');
      // Top Sale Banner
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(x, y, labelWidth, 9, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('★ SPECIAL PRICE ★', x + labelWidth / 2, y + 6, { align: 'center' });
    } else if (isDisplayTag) {
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.6);
      doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2, 'S');
    } else {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, labelWidth, labelHeight, 1.5, 1.5, 'S');
    }

    let cursorY = y + (layout === 'shelf-talker' ? 14 : (isDisplayTag ? 5 : 3));

    // Store Name
    if (showStoreName && layout !== 'shelf-talker') {
      doc.setFontSize(isDisplayTag ? 7 : (layout === 'sheet-80' ? 4 : 5.5));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(storeName.toUpperCase(), x + labelWidth / 2, cursorY, { align: 'center' });
      cursorY += (isDisplayTag ? 4 : 2.5);
    }

    // Item Name
    if (showItemName) {
      doc.setFontSize(
        layout === 'shelf-talker' ? 13 :
        layout === 'shelf-tag' || layout === 'sheet-8' ? 9.5 : 
        layout === 'sheet-14' || layout === 'sheet-24' ? 8 : 
        layout === 'sheet-80' ? 5.5 : 6.8
      );
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const splitName = doc.splitTextToSize(item.name, labelWidth - 4);
      doc.text(splitName[0] || item.name, x + labelWidth / 2, cursorY, { align: 'center' });
      cursorY += (isDisplayTag ? 5 : (layout === 'sheet-80' ? 2.5 : 3.2));
    }

    // Barcode image
    const barcodeH = 
      layout === 'shelf-talker' ? 24 :
      isDisplayTag ? 18 : 
      layout === 'sheet-14' ? 14 : 
      layout === 'sheet-80' ? 4.5 : 8.5;
    const barcodeW = labelWidth - (isDisplayTag ? 14 : (layout === 'sheet-80' ? 3 : 6));
    
    const imgData = createBarcodeDataUrl(item.barcode, {
      displayValue: showBarcodeText && layout !== 'sheet-80',
      fontSize: layout === 'shelf-talker' ? 11 : 8.5,
      height: 35
    });

    if (imgData) {
      doc.addImage(imgData, 'PNG', x + (labelWidth - barcodeW) / 2, cursorY, barcodeW, barcodeH);
      cursorY += barcodeH + (isDisplayTag ? 4 : 1.5);
    }

    // Footer: SKU & Price
    const footerY = y + labelHeight - (layout === 'shelf-talker' ? 5 : (isDisplayTag ? 4 : 1.8));
    doc.setFontSize(
      layout === 'shelf-talker' ? 10 :
      isDisplayTag ? 8 : 
      layout === 'sheet-80' ? 4.5 : 6
    );
    doc.setFont('helvetica', 'bold');

    if (showSku) {
      doc.setTextColor(71, 85, 105);
      doc.text(item.sku, x + (isDisplayTag ? 4 : 2), footerY);
    }

    if (showPrice) {
      doc.setFontSize(
        layout === 'shelf-talker' ? 16 :
        layout === 'shelf-tag' || layout === 'sheet-8' ? 11 : 
        layout === 'sheet-14' ? 9 : 
        layout === 'sheet-80' ? 5.5 : 7.2
      );
      doc.setTextColor(layout === 'shelf-talker' ? 220 : 4, layout === 'shelf-talker' ? 38 : 120, layout === 'shelf-talker' ? 38 : 87);
      doc.text(formatCurrency(item.sellingPrice, currencySymbol), x + labelWidth - (isDisplayTag ? 4 : 2), footerY, { align: 'right' });
    }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_Barcode_Labels_${layout}_${timestamp}.pdf`);
}

