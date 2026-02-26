import { CommandParser, BUILT_IN_COMMANDS, ParsedSegment } from '../../src/command-parser';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it('should return empty array for empty input', () => {
    expect(parser.parse('')).toEqual([]);
    expect(parser.parse('  ')).toEqual([]);
  });

  it('should return text segment for plain text', () => {
    const result = parser.parse('hello world');
    expect(result).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('should detect a single command', () => {
    const result = parser.parse('new line');
    expect(result).toEqual([{ type: 'command', value: 'newline' }]);
  });

  it('should be case-insensitive', () => {
    const result = parser.parse('New Line');
    expect(result).toEqual([{ type: 'command', value: 'newline' }]);
  });

  it('should parse mixed text and commands', () => {
    const result = parser.parse('hello new line world');
    expect(result).toEqual([
      { type: 'text', value: 'hello ' },
      { type: 'command', value: 'newline' },
      { type: 'text', value: ' world' },
    ]);
  });

  it('should parse multiple commands', () => {
    const result = parser.parse('tab enter');
    expect(result).toEqual([
      { type: 'command', value: 'tab' },
      { type: 'text', value: ' ' },
      { type: 'command', value: 'return' },
    ]);
  });

  it('should NOT match "undo" inside "undoing" (word boundary)', () => {
    const result = parser.parse('undoing');
    expect(result).toEqual([{ type: 'text', value: 'undoing' }]);
  });

  it('should NOT match "tab" inside "tabletop" (word boundary)', () => {
    const result = parser.parse('tabletop');
    expect(result).toEqual([{ type: 'text', value: 'tabletop' }]);
  });

  it('should match longest phrase first (select all before escape)', () => {
    const result = parser.parse('select all');
    expect(result).toEqual([{ type: 'command', value: 'selectAll' }]);
  });

  it('should handle all 13 built-in commands', () => {
    expect(Object.keys(BUILT_IN_COMMANDS)).toHaveLength(13);
    for (const [phrase, value] of Object.entries(BUILT_IN_COMMANDS)) {
      const result = parser.parse(phrase);
      expect(result).toEqual([{ type: 'command', value }]);
    }
  });

  it('should allow custom commands to override built-in', () => {
    const custom = new CommandParser({ 'tab': 'customTab' });
    const result = custom.parse('tab');
    expect(result).toEqual([{ type: 'command', value: 'customTab' }]);
  });

  it('should support new custom commands', () => {
    const custom = new CommandParser({ 'fix this': 'fix' });
    const result = custom.parse('please fix this now');
    expect(result).toEqual([
      { type: 'text', value: 'please ' },
      { type: 'command', value: 'fix' },
      { type: 'text', value: ' now' },
    ]);
  });
});
