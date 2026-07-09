import type { AutoCompleteExtractor, Preset } from '@unocss/core'

import type { StringPosition } from '../utils'
import { generateCompletionResult } from '../utils'

export type ObjectCompletionMode = 'both' | 'key' | 'value'

/**
 * Represents the object string (key or value) that contains the cursor.
 */
interface ObjectPropertyCall {
  key: string
  kind: 'key' | 'value'
  valueStart: number
  valueEnd: number
  valueContent: string
}

interface StringLiteral {
  quote: string
  start: number
  end: number
  content: string
}

const DEFAULT_SCAN_LIMIT = 2000

/**
 * Scans object property strings using the same parser path for keys and values.
 *
 * Supported forms include:
 * - `{ key: 'classes' }`
 * - `{ 'classes': condition }`
 * - `{ [computedKey]: 'classes' }`
 * - `{ key: ['classes', 'more-classes'] }`
 */
export function scanObjectAtCursor(
  content: string,
  cursor: number,
  mode: ObjectCompletionMode = 'both',
): ObjectPropertyCall | null {
  const searchLimit = Math.max(0, cursor - DEFAULT_SCAN_LIMIT)
  const len = content.length

  const countPrecedingBackslashes = (pos: number) => {
    let count = 0
    for (let i = pos - 1; i >= 0 && content[i] === '\\'; i--) {
      count++
    }
    return count
  }

  const isEscaped = (pos: number) => countPrecedingBackslashes(pos) % 2 === 1

  const skipTemplateExpression = (openBraceIndex: number): number => {
    let i = openBraceIndex + 1
    let depth = 1

    while (i < len && depth > 0) {
      const ch = content[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        const skipped = skipStringForward(i)
        if (!skipped) {
          return len - 1
        }
        i = skipped.end + 1
        continue
      }
      if (ch === '{') {
        depth++
      } else if (ch === '}') {
        depth--
      }
      i++
    }

    return i - 1
  }

  const skipStringForward = (start: number): StringLiteral | null => {
    const quote = content[start]
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      return null
    }

    let i = start + 1
    while (i < len) {
      const ch = content[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (quote === '`' && ch === '$' && content[i + 1] === '{') {
        i = skipTemplateExpression(i + 1) + 1
        continue
      }
      if (ch === quote && !isEscaped(i)) {
        return {
          quote,
          start,
          end: i,
          content: content.slice(start + 1, i),
        }
      }
      i++
    }

    return {
      quote,
      start,
      end: len,
      content: content.slice(start + 1),
    }
  }

  const findStringAtCursor = (): StringLiteral | null => {
    for (let i = searchLimit; i < cursor; i++) {
      const literal = skipStringForward(i)
      if (!literal) {
        continue
      }

      if (cursor > literal.start && cursor <= literal.end) {
        return literal
      }

      i = literal.end
    }

    return null
  }

  const skipWhitespaceAndCommentsForward = (start: number) => {
    let i = start
    while (i < len) {
      if (/\s/.test(content[i]!)) {
        i++
        continue
      }
      if (content[i] === '/' && content[i + 1] === '*') {
        i += 2
        while (i < len && !(content[i] === '*' && content[i + 1] === '/')) {
          i++
        }
        i = Math.min(i + 2, len)
        continue
      }
      break
    }
    return i
  }

  const skipWhitespaceAndCommentsBackward = (start: number) => {
    let i = start
    while (i >= searchLimit) {
      if (/\s/.test(content[i]!)) {
        i--
        continue
      }
      if (content[i] === '/' && content[i - 1] === '*') {
        i -= 2
        while (i >= searchLimit && !(content[i] === '/' && content[i + 1] === '*')) {
          i--
        }
        i--
        continue
      }
      break
    }
    return i
  }

  const findMatchingOpenForClose = (closeIndex: number, openChar: string, closeChar: string) => {
    let depth = 1
    for (let i = closeIndex - 1; i >= searchLimit; i--) {
      const ch = content[i]
      if (ch === closeChar) {
        depth++
        continue
      }
      if (ch === openChar) {
        depth--
        if (depth === 0) {
          return i
        }
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        i = findOpeningQuoteBefore(i, ch)
        if (i === -1) {
          return -1
        }
        continue
      }
      if (ch === '/' && content[i - 1] === '*') {
        i = skipWhitespaceAndCommentsBackward(i)
      }
    }
    return -1
  }

  const findOpeningQuoteBefore = (closeIndex: number, quote: string) => {
    for (let i = closeIndex - 1; i >= searchLimit; i--) {
      if (content[i] === quote && !isEscaped(i)) {
        return i
      }
    }
    return -1
  }

  const findPropertyColonBefore = (index: number) => {
    for (let i = skipWhitespaceAndCommentsBackward(index - 1); i >= searchLimit; i--) {
      const ch = content[i]!
      if (ch === ']' || ch === ')' || ch === '}') {
        const openChar = ch === ']' ? '[' : ch === ')' ? '(' : '{'
        const openIndex = findMatchingOpenForClose(i, openChar, ch)
        if (openIndex === -1) {
          return -1
        }
        i = openIndex
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        const openIndex = findOpeningQuoteBefore(i, ch)
        if (openIndex === -1) {
          return -1
        }
        i = openIndex
        continue
      }
      if (ch === ':') {
        return i
      }
    }
    return -1
  }

  const readPropertyKeyBefore = (colonIndex: number) => {
    let keyEnd = skipWhitespaceAndCommentsBackward(colonIndex - 1) + 1
    let keyStart = keyEnd - 1
    let key = ''
    const ch = content[keyStart]

    if (ch === '"' || ch === "'") {
      const openIndex = findOpeningQuoteBefore(keyStart, ch)
      if (openIndex === -1) {
        return null
      }
      keyStart = openIndex
      key = content.slice(openIndex + 1, keyEnd - 1)
    } else if (ch === ']') {
      const openIndex = findMatchingOpenForClose(keyStart, '[', ']')
      if (openIndex === -1) {
        return null
      }
      keyStart = openIndex
      key = content.slice(keyStart, keyEnd)
    } else if (ch && /[\w$]/.test(ch)) {
      while (keyStart >= searchLimit && /[\w$]/.test(content[keyStart]!)) {
        keyStart--
      }
      keyStart++
      key = content.slice(keyStart, keyEnd)
    } else {
      return null
    }

    const contextIndex = skipWhitespaceAndCommentsBackward(keyStart - 1)
    if (content.slice(Math.max(0, keyStart - 5), keyStart).trim() === 'case') {
      return null
    }
    if (content[contextIndex] === '?') {
      return null
    }

    return { key, keyStart }
  }

  const buildKeyMatch = (literal: StringLiteral): ObjectPropertyCall | null => {
    if (literal.quote === '`') {
      return null
    }

    const colonIndex = skipWhitespaceAndCommentsForward(literal.end + 1)
    if (content[colonIndex] !== ':') {
      return null
    }

    const contextIndex = skipWhitespaceAndCommentsBackward(literal.start - 1)
    if (content[contextIndex] !== '{' && content[contextIndex] !== ',') {
      return null
    }

    return {
      key: literal.content,
      kind: 'key',
      valueStart: literal.start,
      valueEnd: literal.end,
      valueContent: literal.content,
    }
  }

  const buildValueMatch = (literal: StringLiteral): ObjectPropertyCall | null => {
    const colonIndex = findPropertyColonBefore(literal.start)
    if (colonIndex === -1) {
      return null
    }

    const keyInfo = readPropertyKeyBefore(colonIndex)
    if (!keyInfo) {
      return null
    }

    return {
      key: keyInfo.key,
      kind: 'value',
      valueStart: literal.start,
      valueEnd: literal.end,
      valueContent: literal.content,
    }
  }

  const literal = findStringAtCursor()
  if (!literal) {
    return null
  }

  if (mode === 'key') {
    return buildKeyMatch(literal)
  }
  if (mode === 'value') {
    return buildValueMatch(literal)
  }

  return buildKeyMatch(literal) ?? buildValueMatch(literal)
}

export function scanObjectValueAtCursor(content: string, cursor: number): ObjectPropertyCall | null {
  return scanObjectAtCursor(content, cursor, 'value')
}

export function scanObjectKeyAtCursor(content: string, cursor: number): ObjectPropertyCall | null {
  return scanObjectAtCursor(content, cursor, 'key')
}

export interface ObjectCompletionOptions {
  /**
   * Controls whether completion is enabled for object property values, quoted keys, or both.
   * @default 'both'
   */
  mode?: ObjectCompletionMode
  debug?: (msg: string) => void
}

/**
 * Preset to enable UnoCSS autocomplete inside Object Properties.
 * @param options - Configuration options for the preset.
 * @example
 * ```ts
 * const variants = {
 *   primary: "text-red"
 *   root: ['text-black/40', ``],
 *   nest: {
 *    data: 'p-10',
 *   }
 * }
 * ```
 */
export function presetObjectCompletion(options: ObjectCompletionOptions = {}): Preset {
  const { debug, mode = 'both' } = options

  const extractor: AutoCompleteExtractor = {
    name: 'object-completion',
    extract({ content, cursor }) {
      const objectMatch = scanObjectAtCursor(content, cursor, mode)

      if (!objectMatch) {
        debug?.(`No object. cursor=${cursor}, mode=${mode}`)
        return null
      }

      const pos: StringPosition = {
        start: objectMatch.valueStart,
        end: objectMatch.valueEnd,
        content: objectMatch.valueContent,
      }

      debug?.(`Found object ${objectMatch.kind}: [${objectMatch.key}]`)

      return generateCompletionResult(cursor, pos, debug)
    },
  }

  return {
    name: 'unocss-preset-object-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
