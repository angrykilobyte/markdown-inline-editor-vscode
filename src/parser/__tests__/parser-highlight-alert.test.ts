import { MarkdownParser } from '../../parser';

describe('MarkdownParser - Highlight & Alert', () => {
  let parser: MarkdownParser;

  beforeEach(async () => {
    parser = await MarkdownParser.create();
  });

  describe('highlight (=text=) — solid bg, transparent markers', () => {
    it('applies bg to full range and makes markers transparent', () => {
      const result = parser.extractDecorations('=word=');
      expect(result).toContainEqual({ startPos: 0, endPos: 6, type: 'highlight' });
      expect(result).toContainEqual({ startPos: 0, endPos: 1, type: 'transparent' });
      expect(result).toContainEqual({ startPos: 5, endPos: 6, type: 'transparent' });
    });

    it('matches highlight followed by punctuation', () => {
      const result = parser.extractDecorations('Look at =this=.');
      expect(result.some(d => d.type === 'highlight')).toBe(true);
    });

    it('matches highlight inside parentheses', () => {
      const result = parser.extractDecorations('(=test=)');
      expect(result.some(d => d.type === 'highlight')).toBe(true);
    });

    it('matches highlight with internal spaces', () => {
      const result = parser.extractDecorations('=foo bar=');
      const hl = result.find(d => d.type === 'highlight');
      expect(hl).toBeDefined();
      expect(hl?.startPos).toBe(0);
      expect(hl?.endPos).toBe(9);
    });

    it('does NOT match inside identifier-like text (a=b=c)', () => {
      const result = parser.extractDecorations('a=b=c');
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('does NOT match assignments (flag=true, x=5)', () => {
      const result = parser.extractDecorations('flag=true, x=5');
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('does NOT match when closer is followed by a word char (=word=word)', () => {
      const result = parser.extractDecorations('=word=word');
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('does NOT match when content starts with whitespace (= bad=)', () => {
      const result = parser.extractDecorations('= bad=');
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('does NOT match when content ends with whitespace (=bad =)', () => {
      const result = parser.extractDecorations('=bad =');
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('handles multiple highlights on one line', () => {
      const result = parser.extractDecorations('=one= and =two=');
      const highlights = result.filter(d => d.type === 'highlight');
      expect(highlights.length).toBe(2);
    });
  });

  describe('highlightBold (==text==) — fg only, not bold', () => {
    it('hides markers and styles content', () => {
      const result = parser.extractDecorations('==word==');
      expect(result).toContainEqual({ startPos: 0, endPos: 2, type: 'hide' });
      expect(result).toContainEqual({ startPos: 2, endPos: 6, type: 'highlightBold' });
      expect(result).toContainEqual({ startPos: 6, endPos: 8, type: 'hide' });
    });

    it('does NOT match adjacent to word chars (a==b==c)', () => {
      const result = parser.extractDecorations('a==b==c');
      expect(result.some(d => d.type === 'highlightBold')).toBe(false);
    });

    it('takes precedence over single highlight', () => {
      const result = parser.extractDecorations('==bold==');
      expect(result.some(d => d.type === 'highlightBold')).toBe(true);
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });
  });

  describe('alert (!text!) — solid bg, transparent markers', () => {
    it('applies bg to full range and makes markers transparent', () => {
      const result = parser.extractDecorations('!word!');
      expect(result).toContainEqual({ startPos: 0, endPos: 6, type: 'alert' });
      expect(result).toContainEqual({ startPos: 0, endPos: 1, type: 'transparent' });
      expect(result).toContainEqual({ startPos: 5, endPos: 6, type: 'transparent' });
    });

    it('matches !important! at start of line', () => {
      const result = parser.extractDecorations('!important!');
      expect(result.some(d => d.type === 'alert')).toBe(true);
    });

    it('does NOT match prose exclamations (Wow! Yes!)', () => {
      const result = parser.extractDecorations('Wow! Yes!');
      expect(result.some(d => d.type === 'alert')).toBe(false);
    });

    it('does NOT match negation operator (x != 5)', () => {
      const result = parser.extractDecorations('x != 5');
      expect(result.some(d => d.type === 'alert')).toBe(false);
    });

    it('does NOT match when content has leading whitespace (! bad!)', () => {
      const result = parser.extractDecorations('! bad!');
      expect(result.some(d => d.type === 'alert')).toBe(false);
    });

    it('matches alert followed by punctuation', () => {
      const result = parser.extractDecorations('Note: !critical!.');
      expect(result.some(d => d.type === 'alert')).toBe(true);
    });
  });

  describe('alertBold (!!text!!) — fg only, not bold', () => {
    it('hides markers and styles content', () => {
      const result = parser.extractDecorations('!!word!!');
      expect(result).toContainEqual({ startPos: 0, endPos: 2, type: 'hide' });
      expect(result).toContainEqual({ startPos: 2, endPos: 6, type: 'alertBold' });
      expect(result).toContainEqual({ startPos: 6, endPos: 8, type: 'hide' });
    });

    it('takes precedence over single alert', () => {
      const result = parser.extractDecorations('!!bold!!');
      expect(result.some(d => d.type === 'alertBold')).toBe(true);
      expect(result.some(d => d.type === 'alert')).toBe(false);
    });
  });

  describe('highlightTriple (===text===) — fg + bold', () => {
    it('hides 3-char markers and styles content', () => {
      const result = parser.extractDecorations('===word===');
      expect(result).toContainEqual({ startPos: 0, endPos: 3, type: 'hide' });
      expect(result).toContainEqual({ startPos: 3, endPos: 7, type: 'highlightTriple' });
      expect(result).toContainEqual({ startPos: 7, endPos: 10, type: 'hide' });
    });

    it('takes precedence over bold and single highlight', () => {
      const result = parser.extractDecorations('===word===');
      expect(result.some(d => d.type === 'highlightTriple')).toBe(true);
      expect(result.some(d => d.type === 'highlightBold')).toBe(false);
      expect(result.some(d => d.type === 'highlight')).toBe(false);
    });

    it('does NOT match adjacent to word chars (a===b===c)', () => {
      const result = parser.extractDecorations('a===b===c');
      expect(result.some(d => d.type === 'highlightTriple')).toBe(false);
    });

    it('matches with internal spaces (===foo bar===)', () => {
      const result = parser.extractDecorations('===foo bar===');
      expect(result.some(d => d.type === 'highlightTriple')).toBe(true);
    });
  });

  describe('alertTriple (!!!text!!!) — fg + bold', () => {
    it('hides 3-char markers and styles content', () => {
      const result = parser.extractDecorations('!!!word!!!');
      expect(result).toContainEqual({ startPos: 0, endPos: 3, type: 'hide' });
      expect(result).toContainEqual({ startPos: 3, endPos: 7, type: 'alertTriple' });
      expect(result).toContainEqual({ startPos: 7, endPos: 10, type: 'hide' });
    });

    it('takes precedence over bold and single alert', () => {
      const result = parser.extractDecorations('!!!word!!!');
      expect(result.some(d => d.type === 'alertTriple')).toBe(true);
      expect(result.some(d => d.type === 'alertBold')).toBe(false);
      expect(result.some(d => d.type === 'alert')).toBe(false);
    });

    it('does NOT match adjacent to word chars (a!!!b!!!c)', () => {
      const result = parser.extractDecorations('a!!!b!!!c');
      expect(result.some(d => d.type === 'alertTriple')).toBe(false);
    });

    it('matches !!!critical!!! followed by punctuation', () => {
      const result = parser.extractDecorations('Status: !!!critical!!!.');
      expect(result.some(d => d.type === 'alertTriple')).toBe(true);
    });
  });
});
