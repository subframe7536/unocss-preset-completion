import { describe, expect, it } from 'bun:test'

import { scanForDirectivesAtCursor } from '../src/presets/directive'
import { scanFunctionCallAtCursor, scanStringLiterals } from '../src/presets/function'
import { scanObjectValueAtCursor } from '../src/presets/object'

describe('scanFunctionCallAtCursor', () => {
  it('finds simple function call', () => {
    const content = 'foo(bar, baz)'
    const cursor = content.indexOf('bar') + 1
    const res = scanFunctionCallAtCursor(content, cursor, new Set(['foo']))
    expect(res).not.toBeNull()
    expect(res!.fnName).toBe('foo')
    expect(res!.argsStart).toBe(content.indexOf('(') + 1)
    expect(res!.argsContent).toBe('bar, baz')
  })

  it('finds innermost function in nested calls', () => {
    const content = 'outer(inner(arg1), other)'
    const cursor = content.indexOf('arg1') + 2
    const res = scanFunctionCallAtCursor(content, cursor, new Set(['outer', 'inner']))
    expect(res).not.toBeNull()
    expect(res!.fnName).toBe('inner')
    expect(res!.argsContent.trim()).toBe('arg1')
  })

  it('returns null when function not allowed', () => {
    const content = 'foo(a)'
    const cursor = content.indexOf('a') + 1
    const res = scanFunctionCallAtCursor(content, cursor, new Set(['bar']))
    expect(res).toBeNull()
  })
})

describe('scanStringLiterals', () => {
  it('finds a simple single-quoted string', () => {
    const content = '\'hello\''
    const cursor = 2 // inside 'hello'
    const res = scanStringLiterals(content, 0, cursor)
    expect(res).not.toBeNull()
    expect(res!.start).toBe(0)
    expect(res!.end).toBe(6)
    expect(res!.content).toBe('hello')
  })

  it('handles escaped quotes inside string', () => {
    const content = '\'don\\\'t\''
    // place cursor inside the word don't
    const cursor = content.indexOf('n') + 1
    const res = scanStringLiterals(content, 0, cursor)
    expect(res).not.toBeNull()
    // inner content should preserve the escape sequence (backslash + quote)
    expect(res!.content).toBe(content.slice(1, content.lastIndexOf('\'')))
  })

  it('handles unclosed string while typing', () => {
    const content = '\'open'
    const cursor = content.indexOf('o') + 2
    const res = scanStringLiterals(content, 0, cursor)
    expect(res).not.toBeNull()
    expect(res!.start).toBe(0)
    // end should be treated as virtual end (start + content.length)
    expect(res!.end).toBe(0 + content.length)
    expect(res!.content).toBe('open')
  })
})

describe('scanObjectValueAtCursor', () => {
  it('detects object property value and key (identifier key)', () => {
    const content = 'const variants = { primary: \'text-red\', other: \'x\' }'
    const cursor = content.indexOf('text-red') + 2
    const res = scanObjectValueAtCursor(content, cursor)
    expect(res).not.toBeNull()
    expect(res!.key).toBe('primary')
    expect(res!.valueContent).toBe('text-red')
  })

  it('detects multi-line backtick template value and key', () => {
    const content = 'const variants = { root: `text-black/40\nline2` }'
    const cursor = content.indexOf('line2') + 1
    const res = scanObjectValueAtCursor(content, cursor)
    expect(res).not.toBeNull()
    expect(res!.key).toBe('root')
    expect(res!.valueContent).toBe('text-black/40\nline2')
  })

  it('detects string inside array value', () => {
    const content = "const variants = { arr: ['a', 'b'] }"
    const cursor = content.indexOf("'b'") + 2
    const res = scanObjectValueAtCursor(content, cursor)
    expect(res).not.toBeNull()
    expect(res!.key).toBe('arr')
    expect(res!.valueContent).toBe('b')
  })

  it('handles block comment between colon and value', () => {
    const content = "const variants = { key: /*comment*/ 'v' }"
    const cursor = content.indexOf("'v'") + 2
    const res = scanObjectValueAtCursor(content, cursor)
    expect(res).not.toBeNull()
    expect(res!.key).toBe('key')
    expect(res!.valueContent).toBe('v')
  })

  it('handles computed keys and returns bracketed key', () => {
    const content = "const variants = { [getKey()]: 'value' }"
    const cursor = content.indexOf("'value'") + 2
    const res = scanObjectValueAtCursor(content, cursor)
    expect(res).not.toBeNull()
    expect(res!.key).toBe('[getKey()]')
    expect(res!.valueContent).toBe('value')
  })
})

describe('scanForDirectivesAtCursor', () => {
  it('finds directive args content', () => {
    const content = '.foo { --uno: text-blue; }'
    const cursor = content.indexOf('text-blue') + 2
    const res = scanForDirectivesAtCursor(content, cursor, ['--uno'])
    expect(res).not.toBeNull()
    expect(res!.directiveName).toBe('--uno')
    expect(res!.content.trim()).toBe('text-blue')
    // argsStart calculation mirrors implementation: index of name + name.length + 1
    const expectedStart = content.indexOf('--uno') + '--uno'.length + 1
    expect(res!.start).toBe(expectedStart)
    expect(res!.start).toBeLessThanOrEqual(cursor)
    expect(res!.end).toBeGreaterThanOrEqual(cursor)
  })
})
