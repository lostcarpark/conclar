import { describe, it, expect } from 'vitest';
import { Format } from './Format';

describe('Format', () => {
  describe('formatTag', () => {
    it('should return the input unchanged if it does not contain a colon', () => {
      expect(Format.formatTag('simple')).toBe('simple');
      expect(Format.formatTag('no-colon-here')).toBe('no-colon-here');
      expect(Format.formatTag('')).toBe('');
    });

    it('should capitalize the part before the colon and add a space after', () => {
      expect(Format.formatTag('type:panel')).toBe('Type: panel');
      expect(Format.formatTag('category:workshop')).toBe('Category: workshop');
    });

    it('should lowercase the rest of the part before the colon except the first letter', () => {
      expect(Format.formatTag('TYPE:panel')).toBe('Type: panel');
      expect(Format.formatTag('tYPE:workshop')).toBe('Type: workshop');
    });

    it('should handle multiple colons by using the last colon as separator', () => {
      // The regex is greedy, so it matches up to the LAST colon
      // 'type:sub:type' -> group1='type:sub', group2='type' -> 'Type:sub: type'
      expect(Format.formatTag('type:sub:type')).toBe('Type:sub: type');
    });

    it('should return input unchanged when colon is at the beginning', () => {
      expect(Format.formatTag(':value')).toBe(':value');
    });

    it('should return input unchanged when colon is at the end', () => {
      expect(Format.formatTag('key:')).toBe('key:');
    });

    it('should handle single character before colon', () => {
      expect(Format.formatTag('a:b')).toBe('A: b');
    });

    it('should handle mixed case after colon', () => {
      expect(Format.formatTag('type:PANEL')).toBe('Type: PANEL');
    });
  });
});
