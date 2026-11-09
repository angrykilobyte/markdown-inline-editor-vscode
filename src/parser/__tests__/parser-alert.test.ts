import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkdownParser } from '../core';
import { config } from '../../config';

describe('MarkdownParser - Alert (!!text!!)', () => {
  let parser: MarkdownParser;

  beforeEach(async () => {
    parser = await MarkdownParser.create();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const alertsOf = (markdown: string) =>
    parser.extractDecorationsWithScopes(markdown).decorations.filter((d) => d.type === 'alert');

  describe('basic alerts', () => {
    it('should hide markers and style alert text', () => {
      const markdown = '!!alert text!!';
      const result = parser.extractDecorationsWithScopes(markdown);

      const hideDecorations = result.decorations.filter((d) => d.type === 'hide');
      expect(hideDecorations).toEqual([
        { startPos: 0, endPos: 2, type: 'hide' },
        { startPos: 12, endPos: 14, type: 'hide' },
      ]);

      const alertDecorations = result.decorations.filter((d) => d.type === 'alert');
      expect(alertDecorations).toEqual([{ startPos: 2, endPos: 12, type: 'alert' }]);

      const alertScope = result.scopes.find((s) => s.kind === 'alert');
      expect(alertScope).toBeDefined();
      expect(alertScope?.startPos).toBe(0);
      expect(alertScope?.endPos).toBe(14);
    });

    it('should not emit highlight decorations for !! markers', () => {
      const result = parser.extractDecorationsWithScopes('!!alert!!');
      expect(result.decorations.some((d) => d.type === 'highlight')).toBe(false);
    });

    it('should handle alert in middle of text', () => {
      expect(alertsOf('before !!middle!! after')).toEqual([
        { startPos: 9, endPos: 15, type: 'alert' },
      ]);
    });

    it('should handle multiple alerts on the same line', () => {
      expect(alertsOf('!!first!! and !!second!!')).toEqual([
        { startPos: 2, endPos: 7, type: 'alert' },
        { startPos: 16, endPos: 22, type: 'alert' },
      ]);
    });
  });

  describe('interaction with other formatting', () => {
    it('should handle bold inside alert', () => {
      const result = parser.extractDecorationsWithScopes('!!before **bold** after!!');
      expect(result.decorations.some((d) => d.type === 'alert')).toBe(true);
      expect(result.decorations.some((d) => d.type === 'bold')).toBe(true);
    });

    it('should handle alert and highlight on the same line', () => {
      const result = parser.extractDecorationsWithScopes('==yellow== and !!red!!');
      expect(result.decorations.filter((d) => d.type === 'highlight')).toEqual([
        { startPos: 2, endPos: 8, type: 'highlight' },
      ]);
      expect(result.decorations.filter((d) => d.type === 'alert')).toEqual([
        { startPos: 17, endPos: 20, type: 'alert' },
      ]);
    });

    it('should handle alert nested inside highlight', () => {
      const result = parser.extractDecorationsWithScopes('==a !!b!! c==');
      expect(result.decorations.some((d) => d.type === 'highlight')).toBe(true);
      expect(result.decorations.filter((d) => d.type === 'alert')).toEqual([
        { startPos: 6, endPos: 7, type: 'alert' },
      ]);
    });

    it('should not interfere with images', () => {
      const result = parser.extractDecorationsWithScopes('![alt](image.png) and ![other](b.png)');
      expect(result.decorations.some((d) => d.type === 'alert')).toBe(false);
    });
  });

  describe('code block and inline code protection', () => {
    it('should NOT parse alerts inside fenced code blocks', () => {
      expect(alertsOf('```\n!!not alert!!\n```')).toHaveLength(0);
    });

    it('should NOT parse alerts inside inline code', () => {
      expect(alertsOf('Use `!!x!!` literally')).toHaveLength(0);
    });
  });

  describe('flanking and syntax edge cases', () => {
    it('should ignore ordinary exclamations in prose', () => {
      expect(alertsOf('Wow!! That was great!!')).toHaveLength(0);
    });

    it('should ignore empty alert markers (!!!!)', () => {
      expect(alertsOf('Empty !!!! here')).toHaveLength(0);
    });

    it('should ignore opening marker with trailing space (!! text!!)', () => {
      expect(alertsOf('Invalid !! text!! here')).toHaveLength(0);
    });

    it('should ignore closing marker with leading space (!!text !!)', () => {
      expect(alertsOf('Invalid !!text !! here')).toHaveLength(0);
    });

    it('should ignore escaped markers (\\!!text\\!!)', () => {
      expect(alertsOf('Escaped \\!!text\\!! here')).toHaveLength(0);
    });

    it('should ignore triple exclamation marks (!!!text!!!)', () => {
      expect(alertsOf('!!!triple!!!')).toHaveLength(0);
    });

    it('should ignore single exclamation marks (!text!)', () => {
      expect(alertsOf('!single!')).toHaveLength(0);
    });

    it('should NOT match across blank lines / paragraph boundaries', () => {
      expect(alertsOf('!!first paragraph\n\nsecond paragraph!!')).toHaveLength(0);
    });

    it('should NOT match unclosed alert across list item boundaries', () => {
      expect(alertsOf('- Item 1: !!unclosed alert\n- Item 2: !! invalid !!')).toHaveLength(0);
    });

    it('should decompose 4-exclamation run into closer and opener for adjacent alerts', () => {
      expect(alertsOf('!!First!!!!Second!!')).toEqual([
        { startPos: 2, endPos: 7, type: 'alert' },
        { startPos: 11, endPos: 17, type: 'alert' },
      ]);
    });
  });

  describe('configuration toggle', () => {
    it('should produce no alert decorations when alert.enabled is false', () => {
      vi.spyOn(config.alert, 'enabled').mockReturnValue(false);

      const result = parser.extractDecorationsWithScopes('!!alert text!!');

      expect(result.decorations.filter((d) => d.type === 'alert')).toHaveLength(0);
      expect(result.decorations.filter((d) => d.type === 'hide')).toHaveLength(0);
      expect(result.scopes.filter((s) => s.kind === 'alert')).toHaveLength(0);
    });

    it('should keep highlights when only alert is disabled', () => {
      vi.spyOn(config.alert, 'enabled').mockReturnValue(false);

      const result = parser.extractDecorationsWithScopes('==yellow== !!red!!');

      expect(result.decorations.filter((d) => d.type === 'highlight')).toHaveLength(1);
      expect(result.decorations.filter((d) => d.type === 'alert')).toHaveLength(0);
    });

    it('should keep alerts when only highlight is disabled', () => {
      vi.spyOn(config.highlight, 'enabled').mockReturnValue(false);

      const result = parser.extractDecorationsWithScopes('==yellow== !!red!!');

      expect(result.decorations.filter((d) => d.type === 'highlight')).toHaveLength(0);
      expect(result.decorations.filter((d) => d.type === 'alert')).toHaveLength(1);
    });
  });
});
