import { describe, it, expect } from 'vitest';
import { JsonParse } from './JsonParse';

describe('JsonParse', () => {
  describe('extractJson', () => {
    it('should extract a single JSON object from text', () => {
      const input = 'some text {"key": "value"} more text';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ key: 'value' }]);
    });

    it('should extract a single JSON array from text', () => {
      const input = 'before [1, 2, 3] after';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should extract multiple JSON entities from text', () => {
      const input = 'first {"a": 1} second {"b": 2}';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('should handle nested JSON objects', () => {
      const input = 'text {"outer": {"inner": "value"}} text';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ outer: { inner: 'value' } }]);
    });

    it('should handle nested JSON arrays', () => {
      const input = '[[1, 2], [3, 4]]';
      const result = JsonParse.extractJson(input);
      // extractJson wraps each top-level JSON entity in an array
      expect(result).toEqual([[[1, 2], [3, 4]]]);
    });

    it('should ignore text before start position', () => {
      const input = 'skip this {"key": "value"}';
      const result = JsonParse.extractJson(input, 10);
      expect(result).toEqual([{ key: 'value' }]);
    });

    it('should handle JSON with line comments', () => {
      const input = '{/* comment */ "key": "value"}';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ key: 'value' }]);
    });

    it('should handle JSON with block comments', () => {
      const input = '{// single line comment\n"key": "value"}';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ key: 'value' }]);
    });

    it('should handle empty JSON object', () => {
      const input = '{}';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{}]);
    });

    it('should handle empty JSON array', () => {
      const input = '[]';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([[]]);
    });

    it('should handle JSON with various data types', () => {
      const input = '{"string": "text", "number": 42, "bool": true, "null": null}';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{
        string: 'text',
        number: 42,
        bool: true,
        null: null
      }]);
    });

    it('should handle multiple nested structures', () => {
      const input = '{"a": [1, {"b": 2}]}, [3, 4]';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([
        { a: [1, { b: 2 }] },
        [3, 4]
      ]);
    });

    it('should handle whitespace in JSON', () => {
      const input = '{ "key" : "value" , "another" : 123 }';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([{ key: 'value', another: 123 }]);
    });

    it('should return empty array when no JSON found', () => {
      const input = 'plain text with no json at all';
      const result = JsonParse.extractJson(input);
      expect(result).toEqual([]);
    });
  });
});
