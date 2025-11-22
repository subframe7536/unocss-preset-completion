import type { StringPosition } from '../src/utils'

import { describe, expect, it } from 'bun:test'

import { generateCompletionResult } from '../src/utils'

describe('generateCompletionResult', () => {
  it('extracts token inside parentheses', () => {
    const content = 'one two(three) four'
    const pos: StringPosition = { start: 0, end: 0 + 1 + content.length, content }
    // place cursor after 'r' in 'three'
    const cursorRel = content.indexOf('three') + 3 // after 'thr'
    const cursor = pos.start + 1 + cursorRel
    const res = generateCompletionResult(cursor, pos)
    expect(res).not.toBeNull()
    expect(res!.extracted).toBe('thr')

    const replacement = res!.resolveReplacement('three-sugg')
    // expected start = literal.start + 1 + tokenStartRel (leftParen + 1)
    expect(replacement.start).toBe(pos.start + 1 + content.indexOf('three'))
    // expected end = literal.start + 1 + tokenEndRel (rightParen index)
    expect(replacement.end).toBe(pos.start + 1 + content.indexOf(')'))
    expect(replacement.replacement).toBe('three-sugg')
  })

  it('extracts token separated by spaces', () => {
    const content = 'alpha beta gamma'
    const pos: StringPosition = { start: 0, end: 0 + 1 + content.length, content }
    const tokenStart = content.indexOf('beta')
    const cursorRel = tokenStart + 2 // after 'be'
    const cursor = pos.start + 1 + cursorRel
    const res = generateCompletionResult(cursor, pos)
    expect(res).not.toBeNull()
    expect(res!.extracted).toBe('be')
  })

  it('returns null when cursor outside any position', () => {
    const content = 'hello world'
    const pos: StringPosition = { start: 5, end: 5 + 1 + content.length, content }
    const cursor = 1 // clearly outside
    const res = generateCompletionResult(cursor, pos)
    expect(res).toBeNull()
  })
})
