import type { AutoCompleteExtractor, Preset } from '@unocss/core'

import type { StringPosition } from '../utils'
import { generateCompletionResult } from '../utils'

/**
 * Represents an identified object property value.
 */
interface ObjectValueCall {
  key: string
  valueStart: number
  valueEnd: number
  valueContent: string
}

/**
 * 1. Locates the string literal at the cursor.
 * 2. Scans backwards to verify it matches the pattern: [Key] [:] [Value].
 * 3. Verifies the Key is valid (identifier or quoted).
 */
export function scanObjectValueAtCursor(content: string, cursor: number): ObjectValueCall | null {
  // --- Helpers and initial setup ---
  const searchLimit = Math.max(0, cursor - 2000)
  const len = content.length

  const countPrecedingBackslashes = (pos: number) => {
    let count = 0
    for (let i = pos - 1; i >= 0 && content[i] === '\\'; i--) {
      count++
    }
    return count
  }
  const isEscaped = (pos: number) => countPrecedingBackslashes(pos) % 2 === 1

  const findMatchingOpenForClose = (pos: number, openChar: string, closeChar: string) => {
    let depth = 1
    for (let i = pos - 1; i >= searchLimit; i--) {
      const ch = content[i]
      if (ch === closeChar) {
        depth++
      } else if (ch === openChar) {
        depth--
        if (depth === 0) {
          return i
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        const q = ch
        // skip string backwards
        let j = i - 1
        while (j >= searchLimit) {
          if (content[j] === q && !isEscaped(j)) {
            i = j
            break
          }
          j--
        }
        if (j < searchLimit) {
          return -1
        }
      } else if (ch === '/' && i - 1 >= searchLimit && content[i - 1] === '*') {
        // skip block comment backwards: find the matching /*
        let j = i - 2
        while (j >= searchLimit) {
          if (content[j] === '/' && content[j + 1] === '*') {
            i = j
            break
          }
          j--
        }
        if (j < searchLimit) {
          return -1
        }
      }
    }
    return -1
  }

  const skipTemplateExpression = (openBraceIndex: number) => {
    // openBraceIndex should point at '{'
    let i = openBraceIndex + 1
    let depth = 1
    while (i < len && depth > 0) {
      const ch = content[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        const q = ch
        i++
        while (i < len) {
          if (content[i] === '\\') {
            i += 2
            continue
          }
          if (content[i] === q) {
            i++
            break
          }
          // nested template expression inside a template string
          if (q === '`' && content[i] === '$' && content[i + 1] === '{') {
            i = skipTemplateExpression(i + 1) + 1
            continue
          }
          i++
        }
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

  // --- Step 1: Find the string literal boundaries surrounding the cursor ---
  // Instead of naively taking the nearest quote to the left (which may be a
  // closing quote), scan forward from the search window and locate the string
  // literal whose opening quote occurs before the cursor and whose closing
  // quote is after the cursor. This reliably finds the string that actually
  // contains the cursor even in nested or JSX contexts.
  let openQuoteIndex = -1
  let closeQuoteIndex = -1

  for (let i = searchLimit; i < cursor; i++) {
    const ch = content[i]
    if (ch !== '"' && ch !== "'" && ch !== '`') {
      continue
    }
    if (isEscaped(i)) {
      continue
    }

    // Found a potential opening quote at `i`. Try to find its matching close.
    const q = ch
    let j = i + 1
    let foundClose = false
    while (j < len) {
      const nextChar = content[j]
      if (nextChar === '\\') {
        j += 2
        continue
      }
      if (q === '`' && nextChar === '$' && content[j + 1] === '{') {
        const end = skipTemplateExpression(j + 1)
        if (end < j) {
          break
        }
        j = end + 1
        continue
      }
      if (nextChar === q && !isEscaped(j)) {
        foundClose = true
        break
      }
      j++
    }

    const effectiveEnd = foundClose ? j : len

    // If the cursor lies within this string literal, we've found the right one.
    if (cursor > i && cursor <= effectiveEnd) {
      openQuoteIndex = i
      closeQuoteIndex = foundClose ? j : -1
      break
    }

    // Otherwise skip ahead past this string and continue searching.
    if (foundClose) {
      i = j
    }
  }

  if (openQuoteIndex === -1) {
    return null
  }

  const effectiveEnd = closeQuoteIndex === -1 ? len : closeQuoteIndex

  // --- Step 2: Scan Backwards for Colon (:) with bracket/comment awareness ---
  const findColonBefore = (index: number) => {
    let i = index - 1
    while (i >= searchLimit) {
      const cur = content[i]!
      if (/\s/.test(cur)) {
        i--
        continue
      }
      // block comment end (*/)
      if (cur === '/' && i - 1 >= 0 && content[i - 1] === '*') {
        let j = i - 2
        while (j >= searchLimit) {
          if (content[j] === '/' && content[j + 1] === '*') {
            i = j - 1
            break
          }
          j--
        }
        if (j < searchLimit) {
          return -1
        }
        continue
      }
      // skip balanced closers like ], ), }
      if (cur === ']' || cur === ')' || cur === '}') {
        const openCh = cur === ']' ? '[' : cur === ')' ? '(' : '{'
        const openIdx = findMatchingOpenForClose(i, openCh, cur)
        if (openIdx === -1) {
          return -1
        }
        i = openIdx - 1
        continue
      }
      if (content[i] === ':') {
        return i
      }
      i--
    }
    return -1
  }

  const colonIndex = findColonBefore(openQuoteIndex)
  if (colonIndex === -1) {
    return null
  }

  // --- Step 3: Scan Backwards for the Key ---
  let ptr = colonIndex - 1
  while (ptr >= searchLimit && /\s/.test(content[ptr]!)) {
    ptr--
  }

  const keyEnd = ptr + 1
  let rawKeyStart = ptr
  let key = ''

  const c = content[ptr]!
  if (c === '"' || c === "'") {
    const keyQuote = c
    // find opening quote
    let j = ptr - 1
    while (j >= searchLimit) {
      if (content[j] === keyQuote && !isEscaped(j)) {
        break
      }
      j--
    }
    if (j < searchLimit) {
      return null
    }
    rawKeyStart = j
    key = content.slice(j + 1, ptr) // inner content
  } else if (/[\w$]/.test(c)) {
    let j = ptr
    while (j >= searchLimit && /[\w$]/.test(content[j]!)) {
      j--
    }
    rawKeyStart = j + 1
    key = content.slice(rawKeyStart, keyEnd)
  } else if (c === ']') {
    const openIdx = findMatchingOpenForClose(ptr, '[', ']')
    if (openIdx === -1) {
      return null
    }
    rawKeyStart = openIdx
    key = content.slice(rawKeyStart, keyEnd) // include brackets
  } else {
    return null
  }

  // --- Step 4: (Optional) Context Check ---
  let contextPtr = rawKeyStart - 1
  while (contextPtr >= searchLimit && /\s/.test(content[contextPtr]!)) {
    contextPtr--
  }

  if (content.slice(Math.max(0, rawKeyStart - 5), rawKeyStart).trim() === 'case') {
    return null
  }
  if (content[contextPtr] === '?') {
    return null
  }

  return {
    key,
    valueStart: openQuoteIndex,
    valueEnd: effectiveEnd,
    valueContent: content.slice(openQuoteIndex + 1, effectiveEnd),
  }
}

export interface ObjectCompletionOptions {
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
  const { debug } = options

  const extractor: AutoCompleteExtractor = {
    name: 'object-completion',
    extract({ content, cursor }) {
      const objectMatch = scanObjectValueAtCursor(content, cursor)

      if (!objectMatch) {
        debug?.(`No object. cursor=${cursor}`)
        return null
      }

      const pos: StringPosition = {
        start: objectMatch.valueStart,
        end: objectMatch.valueEnd,
        content: objectMatch.valueContent,
      }

      debug?.(`Found object property: [${objectMatch.key}]`)

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
