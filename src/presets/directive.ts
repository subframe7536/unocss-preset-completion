/* eslint-disable no-cond-assign */
import type { StringPosition } from '../utils'
import type {
  Arrayable,
  AutoCompleteExtractor,
  AutoCompleteExtractorResult,
  Preset,
} from '@unocss/core'

import { toArray } from '@unocss/core'

import { generateCompletionResult, mergeOptionalRegexText } from '../utils'

/**
 * Scans the content to find the innermost function call at the cursor position,
 * supporting function calls that span multiple lines.
 *
 * @param content - The full content of the file.
 * @param cursor - The current cursor position.
 * @param directives - List of directive names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanForDirectivesAtCursor(
  content: string,
  cursor: number,
  directives: string[],
): StringPosition & { directiveName: string } | null {
  // Build regex to match any of the given directive names followed by ':'
  const regex = new RegExp(`(${mergeOptionalRegexText(directives)})\\s*:\\s*([^;]+?);`, 'g')
  let state: {
    directiveName: string
    start: number
    argsStart: number
    argsContent: string
  } | undefined

  let arr: RegExpExecArray | null
  while ((arr = regex.exec(content)) !== null) {
    const fnName = arr[1]
    const start = arr.index
    const argsStart = start + fnName.length + 1

    if (argsStart > cursor) {
      break
    }

    if (!state || state.start < start) {
      state = { directiveName: fnName, start, argsStart, argsContent: arr[2] }
    }
  }
  if (!state) {
    return null
  }

  // Adjust argsContent to handle multiline content manually
  const argsContent = state.argsContent.replace(/[\r\n]+/g, ' ') // Replace newlines with spaces for compatibility

  return {
    directiveName: state.directiveName,
    start: state.argsStart,
    end: state.argsStart + argsContent.length,
    content: argsContent,
  }
}

export interface DirectiveCompletionOptions {
  /**
   * `applyVariable` option in `transformerDirectives()`
   * @default ['--at-apply', '--uno-apply', '--uno']
   */
  directives?: Arrayable<`--${string}`>
  debug?: (msg: string) => void
}

/**
 * Preset to enable UnoCSS autocomplete inside CSS Directives.
 * @param options - Configuration options for the preset.
 */
export function presetDirectivesCompletion(options: DirectiveCompletionOptions = {}): Preset {
  const {
    directives = ['--at-apply', '--uno-apply', '--uno'],
    debug,
  } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'css-directives',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const position = scanForDirectivesAtCursor(content, cursor, toArray(directives))
      if (!position) {
        debug?.(`No directive detected. cursor=${cursor}, directives=[${directives}]`)
        return null
      }

      const result = generateCompletionResult(cursor, position)
      if (!result) {
        debug?.(`No item inside directive ${position.directiveName}`)
      }
      return result
    },
  }
  return {
    name: 'unocss-preset-css-directives-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
