import type { StringPosition } from '../utils'
import type { AutoCompleteExtractor, Preset } from '@unocss/core'

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
export function scanObjectValueAtCursor(
  content: string,
  cursor: number,
): ObjectValueCall | null {
  // --- Step 1: Find the string literal boundaries surrounding the cursor ---
  // We reuse the logic from the previous steps, slightly optimized for this context
  const searchLimit = Math.max(0, cursor - 2000)

  let openQuoteIndex = -1
  let quoteChar = ''

  // Backward scan for opening quote
  for (let i = cursor - 1; i >= searchLimit; i--) {
    const char = content[i]
    if ((char === '"' || char === '\'' || char === '`')) {
      if (i > 0 && content[i - 1] === '\\') {
        continue
      } // skip escaped
      openQuoteIndex = i
      quoteChar = char
      break
    }
    // Optimization: Newlines usually break simple strings (except backticks)
    if (char === '\n' && quoteChar !== '`') {
      break
    }
  }

  if (openQuoteIndex === -1) {
    return null
  }

  // Forward scan for closing quote to validate string
  const len = content.length
  let closeQuoteIndex = -1
  for (let i = openQuoteIndex + 1; i < len; i++) {
    const char = content[i]
    if (char === '\\') {
      i++
      continue
    }
    if (char === quoteChar) {
      closeQuoteIndex = i
      break
    }
  }

  // The effective end of the string (handles unclosed strings while typing)
  const effectiveEnd = closeQuoteIndex === -1 ? len : closeQuoteIndex

  // Verify cursor is actually inside this string
  if (cursor <= openQuoteIndex || cursor > effectiveEnd) {
    return null
  }

  // --- Step 2: Scan Backwards for Colon (:) ---
  let ptr = openQuoteIndex - 1
  while (ptr >= searchLimit && /\s/.test(content[ptr])) {
    ptr--
  } // Skip whitespace

  if (content[ptr] !== ':') {
    return null // Not an object property (e.g. var x = "string")
  }
  ptr-- // Skip the colon

  // --- Step 3: Scan Backwards for the Key ---
  while (ptr >= searchLimit && /\s/.test(content[ptr])) {
    ptr--
  } // Skip whitespace

  const keyEnd = ptr + 1
  let keyStart = ptr

  const char = content[ptr]

  // Case A: Quoted Key -> { "default": ... }
  if (char === '"' || char === '\'') {
    const keyQuote = char
    ptr--
    while (ptr >= searchLimit) {
      if (content[ptr] === keyQuote && content[ptr - 1] !== '\\') {
        break
      }
      ptr--
    }
    keyStart = ptr
  } else if (/[\w$]/.test(char)) { // Case B: Identifier Key -> { default: ... }
    while (ptr >= searchLimit && /[\w$]/.test(content[ptr])) {
      ptr--
    }
    keyStart = ptr + 1
  } else if (char === ']') { // Case C: Computed Key -> { [getKey()]: ... } - Ignore for now or treat as valid
    // Determining the start of a computed key backwards is hard.
    // We just assume if we hit a ']', it's likely a valid key structure.
    keyStart = ptr // Approximate
  } else {
    // Hit an invalid character for a key (e.g. ? in a ternary)
    return null
  }

  // --- Step 4: (Optional) Context Check ---
  // To be 100% sure it's an object, the char before Key should be {, ,, or start of file.
  // However, `export const a = { key: "val" }` -> check for `{` or `,`
  // Ternary `true ? "a" : "b"` -> "a" matches "key", so we need to filter that out.

  let contextPtr = keyStart - 1
  while (contextPtr >= searchLimit && /\s/.test(content[contextPtr])) {
    contextPtr--
  }

  const prevChar = content[contextPtr]

  // Filter out Switch Case: `case "value":`
  // If we found a quoted key/value, it might be a switch case.
  if (content.slice(Math.max(0, keyStart - 5), keyStart).trim() === 'case') {
    return null
  }

  // Filter out Ternary: `condition ? true : "value"`
  // If the logic identified `true` as the key, the char before must not be `?`
  if (prevChar === '?') {
    return null
  }

  return {
    key: content.slice(keyStart, keyEnd),
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
 * Example: `const variants = { primary: "text-red" }`
 */
export function presetObjectCompletion(options: ObjectCompletionOptions = {}): Preset {
  const { debug } = options

  const extractor: AutoCompleteExtractor = {
    name: 'object-completion',
    extract({ content, cursor }) {
      const objectMatch = scanObjectValueAtCursor(content, cursor)

      if (!objectMatch) {
        debug?.(`No functions called. cursor=${cursor}`)
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
