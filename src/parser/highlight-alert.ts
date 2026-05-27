import { addScope } from './common';
import type { DecorationRange, DecorationType, ScopeRange } from './types';

function addTransparentMarkerDecorations(
  decorations: DecorationRange[],
  start: number,
  end: number,
  markerLength: number,
  contentType: DecorationType,
): void {
  const contentStart = start + markerLength;
  const contentEnd = end - markerLength;

  decorations.push({ startPos: start, endPos: contentStart, type: 'hide' });

  if (contentStart < contentEnd) {
    decorations.push({
      startPos: contentStart,
      endPos: contentEnd,
      type: contentType,
    });
  }

  decorations.push({ startPos: contentEnd, endPos: end, type: 'hide' });
}

// Background on the full range plus transparent markers keeps the colored
// block spanning the entire `=word=` / `!word!` (markers stay in layout but
// are not visible).
function addFullRangeBackgroundDecorations(
  decorations: DecorationRange[],
  start: number,
  end: number,
  markerLength: number,
  contentType: DecorationType,
): void {
  decorations.push({ startPos: start, endPos: end, type: contentType });
  decorations.push({ startPos: start, endPos: start + markerLength, type: 'transparent' });
  decorations.push({ startPos: end - markerLength, endPos: end, type: 'transparent' });
}

export function processHighlightInSlice(
  slice: string,
  offset: number,
  decorations: DecorationRange[],
  scopes: ScopeRange[],
): void {
  if (!slice || slice.indexOf('=') === -1) {
    return;
  }

  const consumedRanges: Array<[number, number]> = [];

  const tripleRegex = /(?<![\w=])===(?=\S)([^=\n]+?)(?<=\S)===(?![\w=])/g;
  let match: RegExpExecArray | null;
  while ((match = tripleRegex.exec(slice)) !== null) {
    const fullStart = offset + match.index;
    const fullEnd = fullStart + match[0].length;
    consumedRanges.push([match.index, match.index + match[0].length]);
    addTransparentMarkerDecorations(decorations, fullStart, fullEnd, 3, 'highlightTriple');
    addScope(scopes, fullStart, fullEnd, 'highlightTriple');
  }

  const boldRegex = /(?<![\w=])==(?=\S)([^=\n]+?)(?<=\S)==(?![\w=])/g;
  while ((match = boldRegex.exec(slice)) !== null) {
    const idx = match.index;
    if (consumedRanges.some(([s, e]) => idx >= s && idx < e)) continue;
    const fullStart = offset + idx;
    const fullEnd = fullStart + match[0].length;
    consumedRanges.push([idx, idx + match[0].length]);
    addTransparentMarkerDecorations(decorations, fullStart, fullEnd, 2, 'highlightBold');
    addScope(scopes, fullStart, fullEnd, 'highlightBold');
  }

  const singleRegex = /(?<![\w=])=(?=\S)([^=\n]+?)(?<=\S)=(?![\w=])/g;
  while ((match = singleRegex.exec(slice)) !== null) {
    const idx = match.index;
    if (consumedRanges.some(([s, e]) => idx >= s && idx < e)) continue;
    const fullStart = offset + idx;
    const fullEnd = fullStart + match[0].length;
    addFullRangeBackgroundDecorations(decorations, fullStart, fullEnd, 1, 'highlight');
    addScope(scopes, fullStart, fullEnd, 'highlight');
  }
}

export function processAlertInSlice(
  slice: string,
  offset: number,
  decorations: DecorationRange[],
  scopes: ScopeRange[],
): void {
  if (!slice || slice.indexOf('!') === -1) {
    return;
  }

  const consumedRanges: Array<[number, number]> = [];

  const tripleRegex = /(?<![\w!])!!!(?=\S)([^!\n]+?)(?<=\S)!!!(?![\w!])/g;
  let match: RegExpExecArray | null;
  while ((match = tripleRegex.exec(slice)) !== null) {
    const fullStart = offset + match.index;
    const fullEnd = fullStart + match[0].length;
    consumedRanges.push([match.index, match.index + match[0].length]);
    addTransparentMarkerDecorations(decorations, fullStart, fullEnd, 3, 'alertTriple');
    addScope(scopes, fullStart, fullEnd, 'alertTriple');
  }

  const boldRegex = /(?<![\w!])!!(?=\S)([^!\n]+?)(?<=\S)!!(?![\w!])/g;
  while ((match = boldRegex.exec(slice)) !== null) {
    const idx = match.index;
    if (consumedRanges.some(([s, e]) => idx >= s && idx < e)) continue;
    const fullStart = offset + idx;
    const fullEnd = fullStart + match[0].length;
    consumedRanges.push([idx, idx + match[0].length]);
    addTransparentMarkerDecorations(decorations, fullStart, fullEnd, 2, 'alertBold');
    addScope(scopes, fullStart, fullEnd, 'alertBold');
  }

  const singleRegex = /(?<![\w!])!(?=\S)([^!\n]+?)(?<=\S)!(?![\w!])/g;
  while ((match = singleRegex.exec(slice)) !== null) {
    const idx = match.index;
    if (consumedRanges.some(([s, e]) => idx >= s && idx < e)) continue;
    const fullStart = offset + idx;
    const fullEnd = fullStart + match[0].length;
    addFullRangeBackgroundDecorations(decorations, fullStart, fullEnd, 1, 'alert');
    addScope(scopes, fullStart, fullEnd, 'alert');
  }
}
