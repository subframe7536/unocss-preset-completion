import type { StringPosition } from '../utils'
import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { generateCompletionResult } from '../utils'

interface FunctionCall {
  fnName: string
  argsStart: number
  argsContent: string
}

/**
 * Scans the content to find the innermost function call at the cursor position,
 * supporting function calls that span multiple lines.
 *
 * @param content - The full content of the file.
 * @param cursor - The current cursor position.
 * @param allowedFunctions - List of function names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanFunctionCallAtCursor(
  content: string,
  cursor: number,
  allowedFunctions: Set<string>,
): FunctionCall | null {
  let currentIdx = cursor

  // Limit backward search to avoid freezing on massive minified files (heuristic: 2000 chars)
  const searchLimit = Math.max(0, cursor - 2000)

  while (currentIdx >= searchLimit) {
    // 1. Find the nearest '(' before cursor
    const openParen = content.lastIndexOf('(', currentIdx)
    if (openParen === -1 || openParen < searchLimit) {
      break
    }

    // 2. Check the word preceding the '('
    // Skip whitespace between identifier and '('
    let idEnd = openParen
    while (idEnd > 0 && /\s/.test(content.charAt(idEnd - 1))) {
      idEnd--
    }

    // Read the identifier backwards. Stop when a non-identifier character is found.
    let idStart = idEnd
    while (idStart > 0) {
      const ch = content.charAt(idStart - 1)
      // Identifier characters: letters, digits, underscore and dollar
      if (/[\w$]/.test(ch)) {
        idStart--
      } else {
        break
      }
    }

    const fnName = content.slice(idStart, idEnd)

    // 3. Is this a target function?
    if (allowedFunctions.has(fnName)) {
      // 4. Verify the cursor is actually *inside* the parentheses of this function.
      // We know cursor > openParen (because we searched backwards).
      // We just need to find the matching closing paren and ensure cursor < closingParen.

      let parenCount = 1
      let i = openParen + 1
      const len = content.length

      // Find the matching closing parenthesis for this openParen
      while (i < len) {
        const char = content[i]
        if (char === '(') {
          parenCount++
        } else if (char === ')') {
          parenCount--
          if (parenCount === 0) {
            break
          }
        }
        i++
      }

      const closeParen = i

      if (parenCount === 0 && cursor <= closeParen) {
        return {
          fnName,
          argsStart: openParen + 1,
          argsContent: content.slice(openParen + 1, closeParen),
        }
      }
    }

    // Continue search backwards from before this parenthesis
    currentIdx = openParen - 1
  }

  return null
}

/**
 * Scans the string content to find the string literal at the cursor position.
 * Handles escaped quotes and unclosed strings (e.g. while typing).
 *
 * @param content - The content of the function arguments (between parentheses).
 * @param start - The global starting index of `content`.
 * @param cursor - The global cursor position.
 * @returns The position and content of the string literal if found, otherwise `null`.
 */
export function scanStringLiterals(
  content: string,
  start: number,
  cursor: number,
): StringPosition | null {
  const len = content.length

  for (let i = 0; i < len; i++) {
    const char = content[i]

    // Check if we found the start of a string literal
    if (char === '"' || char === '\'' || char === '`') {
      const quote = char
      const startIndex = i
      const globalStart = start + startIndex

      // Look forward to find the closing quote
      let closed = false
      let j = i + 1

      while (j < len) {
        const nextChar = content[j]

        // Handle escaped characters (e.g. 'don\'t')
        if (nextChar === '\\') {
          j += 2
          continue
        }

        // Found the matching closing quote
        if (nextChar === quote) {
          const globalEnd = start + j
          closed = true

          // Check if the cursor is inside this string
          // We use > globalStart to ensure we aren't on the opening quote
          // We use <= globalEnd to allow the cursor to be right at the closing quote (e.g. 'foo|')
          if (cursor > globalStart && cursor <= globalEnd) {
            return {
              start: globalStart,
              end: globalEnd,
              content: content.slice(startIndex + 1, j),
            }
          }

          // Advance the main loop counter to the end of this string
          i = j
          break
        }
        j++
      }

      // Handle unclosed strings (common while the user is actively typing)
      // Example: clsx('text-red|
      if (!closed) {
        // If the cursor is anywhere after the opening quote
        if (cursor > globalStart) {
          return {
            start: globalStart,
            // We treat the end of the content as the virtual end of the string
            end: start + len,
            content: content.slice(startIndex + 1),
          }
        }
        // If unclosed and cursor not inside, we stop processing because
        // the rest of the content is technically part of this invalid string.
        break
      }
    }
  }

  return null
}
/**
 * @deprecated use {@link FunctionCompletionOptions} instead
 */
export interface ClassCompletionOptions extends FunctionCompletionOptions { }
/**
 * @deprecated use {@link FunctionCompletionOptions} instead
 */
export interface CompletionOptions extends FunctionCompletionOptions {}
export interface FunctionCompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']
   */
  autocompleteFunctions?: string[]
  debug?: (msg: string) => void
}

export const DEFAULT_FUNCTIONS = ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']

/**
 * Preset to enable UnoCSS autocomplete inside Functions.
 * @param options - Configuration options for the preset.
 */
export function presetFunctionCompletion(options: FunctionCompletionOptions = {}): Preset {
  const {
    autocompleteFunctions = DEFAULT_FUNCTIONS,
    debug,
  } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const call = scanFunctionCallAtCursor(content, cursor, new Set(autocompleteFunctions))
      if (!call) {
        debug?.(`No functions called. cursor=${cursor}, fn=[${autocompleteFunctions}]`)
        return null
      }

      const pos = scanStringLiterals(call.argsContent, call.argsStart, cursor)
      if (!pos) {
        debug?.(`No string literal inside function ${call.fnName}()`)
        return null
      }

      return generateCompletionResult(cursor, pos, debug)
    },
  }
  return {
    name: 'unocss-preset-fn-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}

/**
 * @deprecated use {@link presetFunctionCompletion} instead
 */
export const presetCompletion = presetFunctionCompletion
/**
 * @deprecated use {@link presetFunctionCompletion} instead
 */
export const presetClassCompletion = presetFunctionCompletion
