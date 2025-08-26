/* eslint-disable no-cond-assign */
import type { StringPosition } from '../utils'
import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

import { generateCompletionResult, mergeOptionalRegexText } from '../utils'

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
 * @param autocompleteFunctions - List of function names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanForFunctionCall(
  content: string,
  cursor: number,
  autocompleteFunctions: string[],
): FunctionCall | null {
  // Build regex to match any of the given function names followed by '('
  const regex = new RegExp(`(${mergeOptionalRegexText(autocompleteFunctions)})\\s*\\(`, 'g')
  let state: { fnName: string, start: number, argsStart: number } | undefined

  let arr: RegExpExecArray | null
  while ((arr = regex.exec(content)) !== null) {
    const fnName = arr[1]
    const start = arr.index
    const argsStart = start + fnName.length + 1

    if (argsStart > cursor) {
      break
    }

    // Only consider functions whose opening '(' is before the cursor
    if (!state || state.start < start) {
      state = { fnName, start, argsStart }
    }
  }

  if (!state) {
    return null
  }

  const { fnName, argsStart } = state

  // Find matching closing parenthesis with proper nesting
  let parenCount = 1
  let i = argsStart

  while (i < content.length && parenCount > 0) {
    const char = content[i]
    if (char === '(') {
      parenCount++
    } else if (char === ')') {
      parenCount--
    }
    i++
  }

  if (parenCount === 0) {
    const argsEnd = i - 1

    // Confirm that the cursor is within the argument bounds
    if (cursor >= argsStart && cursor <= argsEnd) {
      return {
        fnName,
        argsStart,
        argsContent: content.slice(argsStart, argsEnd),
      }
    }
  }

  return null
}

// This regex is compatible with older JS environments. It mimics the 's' (dotAll)
// flag by using `[\s\S]` to match any character, including newlines, after an escape character.
// eslint-disable-next-line regexp/no-unused-capturing-group
const stringLiteralRegex = /("(?:\\[\s\S]|[^"\\])*")|('(?:\\[\s\S]|[^'\\])*')|(`(?:\\[\s\S]|[^`\\])*`)/g

/**
 * Scans the arguments of a function call to extract string literals using a regular expression.
 * @param argsContent - The content of the arguments.
 * @param argsStart - The starting position of the arguments in the content.
 * @returns An array of `StringLiteral` objects representing the string literals found.
 */
export function scanStringLiterals(argsContent: string, argsStart: number): StringPosition[] {
  const literals: StringPosition[] = []
  let match: RegExpExecArray | null

  while ((match = stringLiteralRegex.exec(argsContent)) !== null) {
    const fullMatch = match[0]

    literals.push({
      start: argsStart + match.index,
      end: argsStart + match.index + fullMatch.length - 1,
      content: fullMatch.slice(1, -1),
    })
  }

  return literals
}

export interface ClassCompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']
   */
  autocompleteFunctions?: string[]
  debug?: (msg: string) => void
}

/**
 * @deprecated use {@link ClassCompletionOptions} instead
 */
export type CompletionOptions = ClassCompletionOptions

export const DEFAULT_FUNCTIONS = ['clsx', 'cn', 'classnames', 'cls', 'cva', 'tv']

/**
 * Creates a preset for UnoCSS that add autocomplete support in functions.
 * @param options - Configuration options for the preset.
 */
export function presetClassCompletion(options: ClassCompletionOptions = {}): Preset {
  const {
    autocompleteFunctions = DEFAULT_FUNCTIONS,
    debug,
  } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const call = scanForFunctionCall(content, cursor, autocompleteFunctions)
      if (!call) {
        debug?.(`No functions called. cursor=${cursor}, fn=[${autocompleteFunctions}]`)
        return null
      }

      const postions = scanStringLiterals(call.argsContent, call.argsStart)
      const result = generateCompletionResult(cursor, postions)
      if (!result) {
        debug?.(`No args inside function ${call.fnName}()`)
      }
      return result
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
 * @deprecated use {@link presetClassCompletion} instead
 */
export const presetCompletion = presetClassCompletion
