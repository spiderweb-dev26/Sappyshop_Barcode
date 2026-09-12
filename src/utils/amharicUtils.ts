/**
 * Amharic & English Bilingual Stationery Utilities for Sappy Stationary
 * Provides authentic Amharic translations, character detection, and smart bilingual splitting.
 */

// Ethiopic Unicode Range: \u1200-\u137F (Ethiopic), \u1380-\u139F (Supplement), \u2D80-\u2DDF (Extended), \uAB00-\uAB2F (Extended-A)
export const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

/**
 * Checks if a string contains any Amharic (Ethiopic/Ge'ez) characters
 */
export function isEthiopicText(text?: string | null): boolean {
  if (!text) return false;
  return ETHIOPIC_REGEX.test(text);
}

/**
 * Common stationery terms and translations dictionary
 */
export const STATIONERY_AMHARIC_DICTIONARY: Record<string, string> = {
  // General & Sets
  'stationery set': 'የጽሕፈት መሣሪያዎች ስብስብ',
  'stationery': 'የጽሕፈት መሣሪያዎች',
  'desk set': 'የቢሮ ዕቃዎች ስብስብ',
  'gift set': 'የስጦታ ዕቃዎች ስብስብ',

  // Paints & Colors
  'oil paints': 'የዘይት ቀለሞች (ቱቦ)',
  'oil paints (tubes)': 'የዘይት ቀለሞች (ቱቦ)',
  'acrylic paints': 'አክሪሊክ ቀለሞች',
  'acrylic paints (tubes)': 'አክሪሊክ ቀለሞች (ቱቦ)',
  'watercolor paints': 'የውሃ ቀለሞች',
  'watercolor paints (tubes)': 'የውሃ ቀለሞች (ቱቦ)',
  'kids watercolor sunderland': 'የልጆች የውሃ ቀለም (ሰንደርላንድ)',
  'kids watercolor vendes': 'የልጆች የውሃ ቀለም (ቬንደስ)',
  'kids watercolor': 'የልጆች የውሃ ቀለም',
  'poster color': 'ፖስተር ቀለም',
  'paint brush': 'የቀለም ብሩሽ',
  'paint brushes': 'የቀለም ብሩሾች',
  'color pencils': 'የከለር እርሳሶች',
  'crayons': 'ክሬዮን (የስዕል ከለር)',

  // Files & Albums
  'clear bag 80 page': 'ክሊር ባግ 80 ገጽ',
  'clear bag 60 page': 'ክሊር ባግ 60 ገጽ',
  'clear bag 30 page': 'ክሊር ባግ 30 ገጽ',
  'clear bag 40 page': 'ክሊር ባግ 40 ገጽ',
  'clear bag 20 page': 'ክሊር ባግ 20 ገጽ',
  'clear bag': 'ክሊር ባግ ፋይል',
  'box file': 'ቦክስ ፋይል',
  'spring file': 'ስፕሪንግ ፋይል',
  'flat file': 'ፍላት ፋይል',
  'plastic folder': 'ፕላስቲክ ፎልደር',
  'envelope': 'ፖስታ',
  'a4 envelope': 'A4 ፖስታ',

  // Rulers & Geometry
  'metal ruler (30cm)': 'የብረት ማስመሪያ (30 ሳ.ሜ)',
  'metal ruler': 'የብረት ማስመሪያ',
  'ruler (30cm)': 'ማስመሪያ (30 ሳ.ሜ)',
  'ruler (50cm)': 'ማስመሪያ (50 ሳ.ሜ)',
  'ruler (20cm)': 'ማስመሪያ (20 ሳ.ሜ)',
  'ruler': 'ማስመሪያ',
  'geometry box': 'የጂኦሜትሪ ዕቃ',
  'scale': 'ማስመሪያ / ስኬል',

  // Pens, Pencils & Markers
  'dvd marker': 'ዲቪዲ ማርከር',
  'marker': 'ማርከር',
  'permanent marker': 'ቋሚ ማርከር',
  'whiteboard marker': 'ዋይትቦርድ ማርከር',
  'highlighter': 'ሃይላይተር (ማድመቂያ)',
  'ballpoint pen': 'የቦልፖይንት እስክሪብቶ',
  'gel pen': 'ጄል እስክሪብቶ',
  'roller pen': 'ሮለር እስክሪብቶ',
  'pen': 'እስክሪብቶ',
  'pencil': 'እርሳስ',
  'hb pencil': 'HB እርሳስ',
  '2b pencil': '2B እርሳስ',
  'mechanical pencil': 'የሽቦ እርሳስ',
  'radical pen (black)': 'ራዲካል እስክሪብቶ (ጥቁር)',
  'radical pen (blue)': 'ራዲካል እስክሪብቶ (ሰማያዊ)',
  'radical pen (red)': 'ራዲካል እስክሪብቶ (ቀይ)',
  'radical (color)': 'ራዲካል ከለር እስክሪብቶ',
  'buna pen (blue)': 'ቡና እስክሪብቶ (ሰማያዊ)',
  'buna pen (black)': 'ቡና እስክሪብቶ (ጥቁር)',
  'radius (blue)': 'ራዲየስ እስክሪብቶ (ሰማያዊ)',
  'radius (black)': 'ራዲየስ እስክሪብቶ (ጥቁር)',
  'tuzo gp-2068 (blue)': 'ቱዞ እስክሪብቶ (ሰማያዊ)',
  'tuzo gp-2068 (black)': 'ቱዞ እስክሪብቶ (ጥቁር)',
  'large capacity hy803 (blue)': 'ትልቅ አቅም እስክሪብቶ (ሰማያዊ)',
  'large capacity hy803 (black)': 'ትልቅ አቅም እስክሪብቶ (ጥቁር)',
  'gp-887 (blue)': 'GP-887 እስክሪብቶ (ሰማያዊ)',
  'gp-887 (black)': 'GP-887 እስክሪብቶ (ጥቁር)',
  'bia gp-8002 (black)': 'BIA GP-8002 እስክሪብቶ (ጥቁር)',
  'bia gp-8002 (blue)': 'BIA GP-8002 እስክሪብቶ (ሰማያዊ)',
  'bia gp-2078 (green)': 'BIA GP-2078 እስክሪብቶ (አረንጓዴ)',
  'bia gp-2078 (blue)': 'BIA GP-2078 እስክሪብቶ (ሰማያዊ)',
  'bia gp-2078 (black)': 'BIA GP-2078 እስክሪብቶ (ጥቁር)',

  // Notebooks & Registers
  'gravity register 25x35': 'ግራቪቲ ሬጂስተር 25x35',
  'gravity register (200 sheets)': 'ግራቪቲ ሬጂስተር (200 ቅጠል)',
  'gravity register': 'ግራቪቲ ሬጂስተር',
  'register book': 'ሬጂስተር ደብተር',
  'a7 emoji notebook': 'A7 ኢሞጂ ማስታወሻ ደብተር',
  'a7 notebook': 'A7 ማስታወሻ ደብተር',
  'a5 notebook with ring': 'A5 የሽቦ ማስታወሻ ደብተር',
  'a6 notebook with magnetic clip': 'A6 ማስታወሻ ደብተር በማግኔት',
  'a5 sketch book': 'A5 ስኬች ቡክ (የስዕል ደብተር)',
  'sinner notebook a7': 'ሲነር ማስታወሻ ደብተር A7',
  'sinner notebook a6': 'ሲነር ማስታወሻ ደብተር A6',
  'sinner notebook 5x8': 'ሲነር ማስታወሻ ደብተር 5x8',
  'sinner notebook 9x7': 'ሲነር ማስታወሻ ደብተር 9x7',
  'sinner notebook a4': 'ሲነር ማስታወሻ ደብተር A4',
  'notebook': 'ማስታወሻ ደብተር',
  'pocket notebook': 'የኪስ ማስታወሻ ደብተር',

  // Exercise Books
  'handwriting book (50 sheets)': 'የጽሕፈት መለማመጃ ደብተር (50 ቅጠል)',
  'radical exercise book (50 sheets grid)': 'ራዲካል ሂሳብ ደብተር (50 ቅጠል)',
  'radical exercise book (50 sheets)': 'ራዲካል ደብተር (50 ቅጠል)',
  'galaxy exercise book (100 sheets grid)': 'ጋላክሲ ሂሳብ ደብተር (100 ቅጠል)',
  'sinner exercise book (100 sheets)': 'ሲነር ደብተር (100 ቅጠል)',
  'sinner exercise book (50 sheets)': 'ሲነር ደብተር (50 ቅጠል)',
  'exercise book (50 sheets)': 'ደብተር (50 ቅጠል)',
  'exercise book (100 sheets)': 'ደብተር (100 ቅጠል)',
  'exercise book': 'ደብተር',

  // Adhesives & Tapes
  'canvas tape': 'የሸራ ቴፕ',
  'tape': 'ቴፕ',
  'liquid glue': 'ፈሳሽ ሙጫ',
  'glue stick (yellow)': 'ስቲክ ሙጫ (ቢጫ)',
  'glue stick': 'ስቲክ ሙጫ',
  'uhu glue stick': 'ዩሁ (UHU) ስቲክ ሙጫ',
  'uhu twist & glue': 'ዩሁ ትዊስት ሙጫ',
  'uhu': 'ዩሁ (UHU) ሁለገብ ሙጫ',
  'glue': 'ሙጫ',
  'super glue': 'ሱፐር ግሉ (ቶሎ አጣባቂ)',
  'double sided tape': 'ባለ ሁለት ገጽ ቴፕ',
  'masking tape': 'ማስኪንግ ቴፕ',
  'packing tape': 'የማሸጊያ ቴፕ',

  // Cutting & Scissors
  'bear scissors': 'የድብ ቅርጽ መቀስ',
  'scissors (extra small)': 'መቀስ (በጣም ትንሽ)',
  'scissors (small)': 'መቀስ (ትንሽ)',
  'scissors (medium)': 'መቀስ (መካከለኛ)',
  'scissors (large)': 'መቀስ (ትልቅ)',
  'scissors': 'መቀስ',
  'scissor': 'መቀስ',
  'utility cutter knife (small)': 'መቁረጫ ካተር ቢላዋ (ትንሽ)',
  'utility cutter knife (large)': 'መቁረጫ ካተር ቢላዋ (ትልቅ)',
  'utility cutter knife': 'መቁረጫ ካተር ቢላዋ',
  'cutter knife': 'ካተር ቢላዋ',
  'cutter': 'ካተር ቢላዋ',
  'cutter blades': 'የካተር ምላጮች',

  // Sticky notes & Desk Items
  'sticky notes (large)': 'ስቲኪ ኖትስ (ትልቅ)',
  'sticky notes (medium)': 'ስቲኪ ኖትስ (መካከለኛ)',
  'sticky notes (small)': 'ስቲኪ ኖትስ (ትንሽ)',
  'sticky notes': 'ስቲኪ ኖትስ (ተለጣፊ ማስታወሻ)',
  'stapler': 'ስቴፕለር',
  'stapler pins': 'የስቴፕለር ሽቦ',
  'staples': 'የስቴፕለር ሽቦ',
  'puncher': 'መበሻ (ፓንቸር)',
  'paper clips': 'የወረቀት ክሊፕ',
  'push pins': 'ፑሽ ፒን',
  'eraser': 'ላጲስ',
  'sharpener': 'መቅረጫ',
  'correction fluid': 'የጽሕፈት ማረሚያ (ፈሳሽ)',
  'correction tape': 'የጽሕፈት ማረሚያ ቴፕ',

  // Batteries & Electronics
  'alkaline battery (9v)': 'አልካላይን ባትሪ (9V)',
  'alkaline battery (aaa)': 'አልካላይን ባትሪ (AAA)',
  'alkaline battery (aa)': 'አልካላይን ባትሪ (AA)',
  'battery': 'ባትሪ',
  'calculator': 'ካልኩሌተር',
  'kids lcd writing tablet': 'የልጆች LCD መፃፊያ ታብሌት',
  'drawing book (small)': 'የስዕል ደብተር (ትንሽ)',
  'drawing book (large) (a4)': 'የስዕል ደብተር (A4)',
  'drawing book': 'የስዕል ደብተር'
};

/**
 * Category-level Amharic names
 */
export const CATEGORY_AMHARIC_MAP: Record<string, string> = {
  'Paint': 'ቀለም',
  'Colors': 'ቀለሞች',
  'Notebooks': 'ደብተሮች',
  'Notebook': 'ማስታወሻ ደብተር',
  'Exercise Book': 'ደብተር',
  'Pen': 'እስክሪብቶ',
  'Pencil': 'እርሳስ',
  'Highlighter': 'ሃይላይተር',
  'Marker': 'ማርከር',
  'Ruler': 'ማስመሪያ',
  'Scissor': 'መቀስ',
  'Cutter': 'ካተር ቢላዋ',
  'Adhesives': 'ሙጫና ቴፕ',
  'Tape': 'ቴፕ',
  'File Album': 'ክሊር ባግና ፋይል',
  'Kids Material': 'የልጆች ዕቃዎች',
  'Kids': 'የልጆች ዕቃዎች',
  'Battery': 'ባትሪ',
  'General': 'ጠቅላላ ዕቃ'
};

/**
 * Finds or synthesizes an Amharic translation for any English stationery name
 */
export function getAmharicStationeryName(englishName: string, category: string = ''): string {
  if (!englishName) return '';
  const trimmed = englishName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact match in dictionary
  if (STATIONERY_AMHARIC_DICTIONARY[lower]) {
    return STATIONERY_AMHARIC_DICTIONARY[lower];
  }

  // 2. Normalized match (remove extra spaces/punctuation)
  const clean = lower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [key, amharic] of Object.entries(STATIONERY_AMHARIC_DICTIONARY)) {
    const keyClean = key.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean === keyClean) {
      return amharic;
    }
  }

  // 3. Substring matching for compound stationery phrases
  if (lower.includes('oil paint')) return 'የዘይት ቀለም';
  if (lower.includes('acrylic paint')) return 'አክሪሊክ ቀለም';
  if (lower.includes('watercolor')) return 'የውሃ ቀለም';
  if (lower.includes('clear bag')) {
    const pageMatch = lower.match(/(\d+)\s*page/);
    return pageMatch ? `ክሊር ባግ ${pageMatch[1]} ገጽ` : 'ክሊር ባግ ፋይል';
  }
  if (lower.includes('metal ruler')) return 'የብረት ማስመሪያ';
  if (lower.includes('ruler')) {
    const cmMatch = lower.match(/(\d+)\s*cm/);
    return cmMatch ? `ማስመሪያ (${cmMatch[1]} ሳ.ሜ)` : 'ማስመሪያ';
  }
  if (lower.includes('exercise book')) {
    const sheetMatch = lower.match(/(\d+)\s*sheet/);
    const isGrid = lower.includes('grid');
    if (sheetMatch && isGrid) return `ሂሳብ ደብተር (${sheetMatch[1]} ቅጠል)`;
    if (sheetMatch) return `ደብተር (${sheetMatch[1]} ቅጠል)`;
    return 'ደብተር';
  }
  if (lower.includes('register')) return 'ሬጂስተር ደብተር';
  if (lower.includes('sketch book')) return 'ስኬች ቡክ (የስዕል ደብተር)';
  if (lower.includes('drawing book')) return 'የስዕል ደብተር';
  if (lower.includes('notebook')) return 'ማስታወሻ ደብተር';
  if (lower.includes('sticky note')) return 'ስቲኪ ኖትስ';
  if (lower.includes('scissors') || lower.includes('scissor')) return 'መቀስ';
  if (lower.includes('cutter knife') || lower.includes('cutter')) return 'ካተር ቢላዋ';
  if (lower.includes('glue stick')) return 'ስቲክ ሙጫ';
  if (lower.includes('liquid glue')) return 'ፈሳሽ ሙጫ';
  if (lower.includes('glue')) return 'ሙጫ';
  if (lower.includes('tape')) return 'ቴፕ';
  if (lower.includes('highlighter')) return 'ሃይላይተር';
  if (lower.includes('whiteboard marker')) return 'ዋይትቦርድ ማርከር';
  if (lower.includes('marker')) return 'ማርከር';
  if (lower.includes('stapler pin') || lower.includes('staples')) return 'የስቴፕለር ሽቦ';
  if (lower.includes('stapler')) return 'ስቴፕለር';
  if (lower.includes('puncher')) return 'መበሻ (ፓንቸር)';
  if (lower.includes('eraser')) return 'ላጲስ';
  if (lower.includes('sharpener')) return 'መቅረጫ';
  if (lower.includes('pencil')) return 'እርሳስ';
  if (lower.includes('pen')) {
    let colorSuffix = '';
    if (lower.includes('blue')) colorSuffix = ' (ሰማያዊ)';
    else if (lower.includes('black')) colorSuffix = ' (ጥቁር)';
    else if (lower.includes('red')) colorSuffix = ' (ቀይ)';
    else if (lower.includes('green')) colorSuffix = ' (አረንጓዴ)';
    return `እስክሪብቶ${colorSuffix}`;
  }
  if (lower.includes('battery')) {
    if (lower.includes('9v')) return 'ባትሪ (9V)';
    if (lower.includes('aaa')) return 'ባትሪ (AAA)';
    if (lower.includes('aa')) return 'ባትሪ (AA)';
    return 'ባትሪ';
  }

  // 4. Fallback to category translation
  if (category && CATEGORY_AMHARIC_MAP[category]) {
    return CATEGORY_AMHARIC_MAP[category];
  }

  return '';
}

/**
 * Smartly splits and separates bilingual item input
 * Handles strings like:
 * - "Oil Paints / የዘይት ቀለም"
 * - "የዘይት ቀለም (Oil Paints)"
 * - "Metal Ruler - የብረት ማስመሪያ"
 */
export function extractBilingualNames(
  rawName: string, 
  rawAmharic?: string
): { name: string; nameAmharic: string } {
  let name = (rawName || '').trim();
  let nameAmharic = (rawAmharic || '').trim();

  // If Amharic name is already separately provided
  if (nameAmharic) {
    return { name, nameAmharic };
  }

  // If the single name input has delimiters like / or | or -
  const delimiters = [' / ', '/', ' | ', '|', ' - ', ' – '];
  for (const d of delimiters) {
    if (name.includes(d)) {
      const parts = name.split(d).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const p1HasEthiopic = isEthiopicText(parts[0]);
        const p2HasEthiopic = isEthiopicText(parts[1]);

        if (p1HasEthiopic && !p2HasEthiopic) {
          return { name: parts[1], nameAmharic: parts[0] };
        } else if (!p1HasEthiopic && p2HasEthiopic) {
          return { name: parts[0], nameAmharic: parts[1] };
        }
      }
    }
  }

  // Parentheses check: e.g. "Oil Paints (የዘይት ቀለሞች)" or "የዘይት ቀለሞች (Oil Paints)"
  const parenMatch = name.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    const main = parenMatch[1].trim();
    const inside = parenMatch[2].trim();

    if (isEthiopicText(inside) && !isEthiopicText(main)) {
      return { name: main, nameAmharic: inside };
    } else if (isEthiopicText(main) && !isEthiopicText(inside)) {
      return { name: inside, nameAmharic: main };
    }
  }

  // If user only entered Amharic text into the name field
  if (isEthiopicText(name) && !nameAmharic) {
    nameAmharic = name;
  }

  return { name, nameAmharic };
}
