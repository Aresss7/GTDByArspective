/**
 * Search Engine for Arspective GTD
 * Supports:
 * - Word exclusion with boundary: -комп-, -ремонт- (does not exclude "компьютер", preserves compound words)
 * - Exact phrases in quotes: "купить компьютер", "Ростов-на-Дону"
 * - OR alternative matching (case-insensitive: OR, or, Or)
 * - Compound hyphenated words preserved intact: Ростов-на-Дону, онлайн-курс
 * - Tags: #срочно, #работа
 * - Category/destination filtering
 * - Standard multi-word plain search
 */

export interface SearchToken {
  type: 'word' | 'exact' | 'tag';
  value: string;
}

export interface ParsedSearchQuery {
  excludedWords: string[];
  orGroups: SearchToken[][];
  requiredTokens: SearchToken[];
  category?: string;
  rawQuery: string;
}

export interface SearchableItem {
  id?: string;
  title?: string;
  notes?: string;
  description?: string;
  approximate_plan?: string;
  completion_criteria?: string;
  tags?: string[];
  category?: string;
  destination?: string;
  status?: string;
  [key: string]: any;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a specific standalone word exists in text, respecting word boundaries
 * and preventing hyphens in compound words from acting as boundaries.
 */
export function containsWordBoundary(text: string, word: string): boolean {
  if (!text || !word) return false;
  const escaped = escapeRegExp(word);
  // Using Unicode lookaround: not preceded by letter, number or hyphen, and not followed by letter, number or hyphen.
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_–—-])${escaped}(?![\\p{L}\\p{N}_–—-])`, 'iu');
  return regex.test(text);
}

/**
 * Parses a search query string into structured search components.
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const rawQuery = (query || '').trim();
  if (!rawQuery) {
    return {
      excludedWords: [],
      orGroups: [],
      requiredTokens: [],
      rawQuery: '',
    };
  }

  const exactPhrases: string[] = [];
  // 1. Extract exact phrases in quotes ("...", «...», “...”)
  let working = rawQuery.replace(/(?:"([^"]+)"|«([^»]+)»|[“„]([^”"]+)[”"])/g, (_, p1, p2, p3) => {
    const phrase = p1 || p2 || p3 || '';
    const trimmed = phrase.trim();
    if (trimmed) {
      const idx = exactPhrases.length;
      exactPhrases.push(trimmed);
      return ` __EXACT_${idx}__ `;
    }
    return ' ';
  });

  // 2. Extract exclusion words surrounded by hyphens/dashes: -word-, –word–, —word—
  const excludedWords: string[] = [];
  working = working.replace(/(?:^|\s)[-–—]([^\s–—-]+)[-–—](?=\s|$)/gu, (_, word) => {
    const cleanWord = word.trim();
    if (cleanWord) {
      excludedWords.push(cleanWord);
    }
    return ' ';
  });

  // 3. Tokenize remaining words and placeholders by whitespace
  const rawTokens = working.split(/\s+/).filter(Boolean);
  const structuredTokens: (SearchToken | 'OR')[] = [];

  for (const token of rawTokens) {
    const upper = token.toUpperCase();
    if (upper === 'OR' || upper === 'ИЛИ') {
      structuredTokens.push('OR');
      continue;
    }

    const exactMatch = token.match(/^__EXACT_(\d+)__$/);
    if (exactMatch) {
      const phrase = exactPhrases[parseInt(exactMatch[1], 10)];
      if (phrase) {
        structuredTokens.push({ type: 'exact', value: phrase });
      }
      continue;
    }

    if (token.startsWith('#') && token.length > 1) {
      structuredTokens.push({ type: 'tag', value: token });
      continue;
    }

    structuredTokens.push({ type: 'word', value: token });
  }

  // 4. Process OR sequences
  const orGroups: SearchToken[][] = [];
  const requiredTokens: SearchToken[] = [];

  let i = 0;
  while (i < structuredTokens.length) {
    const current = structuredTokens[i];
    if (current === 'OR') {
      // Stray OR, skip
      i++;
      continue;
    }

    // Check if followed by OR
    if (i + 1 < structuredTokens.length && structuredTokens[i + 1] === 'OR') {
      const group: SearchToken[] = [current];
      let j = i + 1;
      while (j < structuredTokens.length && structuredTokens[j] === 'OR') {
        if (j + 1 < structuredTokens.length && structuredTokens[j + 1] !== 'OR') {
          group.push(structuredTokens[j + 1] as SearchToken);
          j += 2;
        } else {
          j++;
        }
      }
      orGroups.push(group);
      i = j;
    } else {
      requiredTokens.push(current);
      i++;
    }
  }

  return {
    excludedWords,
    orGroups,
    requiredTokens,
    rawQuery,
  };
}

/**
 * Extracts all searchable text from an item.
 */
export function getSearchableText(item: SearchableItem): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.notes) parts.push(item.notes);
  if (item.description) parts.push(item.description);
  if (item.approximate_plan) parts.push(item.approximate_plan);
  if (item.completion_criteria) parts.push(item.completion_criteria);
  if (item.delegated_to) parts.push(item.delegated_to);
  if (item.waiting_for) parts.push(item.waiting_for);
  if (item.tags && Array.isArray(item.tags)) parts.push(item.tags.join(' '));
  return parts.join(' ');
}

/**
 * Checks if a search token matches the given item and searchable text.
 */
function tokenMatches(token: SearchToken, fullText: string, item: SearchableItem): boolean {
  const lowerFull = fullText.toLowerCase();
  const lowerVal = token.value.toLowerCase();

  switch (token.type) {
    case 'exact':
      return lowerFull.includes(lowerVal);

    case 'tag': {
      // Check in item.tags if available, or in text
      if (item.tags && Array.isArray(item.tags)) {
        const rawTag = token.value.replace(/^#/, '').toLowerCase();
        if (item.tags.some((t) => t.toLowerCase() === rawTag || t.toLowerCase() === token.value.toLowerCase())) {
          return true;
        }
      }
      return lowerFull.includes(lowerVal);
    }

    case 'word':
    default:
      return lowerFull.includes(lowerVal);
  }
}

/**
 * Tests whether a searchable item matches the search query and optional category filter.
 */
export function matchesSearch(
  item: SearchableItem,
  query: string | ParsedSearchQuery,
  targetCategory?: string
): boolean {
  if (!item) return false;

  // Category filter
  if (targetCategory && targetCategory !== 'all') {
    const itemCat = (item.destination || item.category || '').toLowerCase();
    if (itemCat && itemCat !== targetCategory.toLowerCase()) {
      return false;
    }
  }

  const parsed = typeof query === 'string' ? parseSearchQuery(query) : query;
  if (!parsed.rawQuery) {
    return true;
  }

  const fullText = getSearchableText(item);

  // 1. Exclusion check (-word-): item MUST NOT contain the excluded standalone word
  for (const excluded of parsed.excludedWords) {
    if (containsWordBoundary(fullText, excluded)) {
      return false;
    }
  }

  // 2. Exact phrases and required tokens: ALL must match
  for (const token of parsed.requiredTokens) {
    if (!tokenMatches(token, fullText, item)) {
      return false;
    }
  }

  // 3. OR groups: For each group, AT LEAST ONE alternative must match
  for (const orGroup of parsed.orGroups) {
    const anyMatches = orGroup.some((token) => tokenMatches(token, fullText, item));
    if (!anyMatches) {
      return false;
    }
  }

  return true;
}
