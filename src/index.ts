/* eslint-disable no-cond-assign */
import type { AutoCompleteExtractor, AutoCompleteExtractorResult, Preset } from '@unocss/core'

export interface CompletionOptions {
  /**
   * Array of function names that trigger class name autocomplete suggestions.
   * @default ['clsx', 'cn', 'classnames', 'cls']
   */
  autocompleteFunctions?: string[]
}

interface FunctionCall {
  functionName: string
  argsStart: number
  argsEnd: number
  argsContent: string
}

function scanForFunctionCalls(content: string, autocompleteFunctions: string[]): FunctionCall[] {
  const results: FunctionCall[] = []
  for (const fn of autocompleteFunctions) {
    let idx = 0
    while ((idx = content.indexOf(`${fn}(`, idx)) !== -1) {
      const functionName = fn
      const argsStart = idx + fn.length + 1
      let parenCount = 1
      let i = argsStart
      while (i < content.length && parenCount > 0) {
        if (content[i] === '(') {
          parenCount++
        } else if (content[i] === ')') {
          parenCount--
        }
        i++
      }
      const argsEnd = i - 1
      const argsContent = content.slice(argsStart, argsEnd)
      results.push({ functionName, argsStart, argsEnd, argsContent })
      idx = argsEnd + 1
    }
  }
  return results
}

interface StringLiteral {
  start: number
  end: number
  content: string
}
function scanStringLiterals(argsContent: string, argsStart: number): StringLiteral[] {
  const literals: StringLiteral[] = []
  let i = 0
  while (i < argsContent.length) {
    const quote = argsContent[i]
    if (quote === '"' || quote === '\'' || quote === '`') {
      let j = i + 1
      let escaped = false
      while (j < argsContent.length) {
        if (!escaped && argsContent[j] === quote) {
          break
        }
        escaped = argsContent[j] === '\\' && !escaped
        j++
      }
      if (j < argsContent.length) {
        literals.push({
          start: argsStart + i,
          end: argsStart + j,
          content: argsContent.slice(i + 1, j),
        })
        i = j + 1
      } else {
        i++
      }
    } else {
      i++
    }
  }
  return literals
}

export function presetCompletion(options: CompletionOptions = {}): Preset {
  const { autocompleteFunctions = ['clsx', 'cn', 'classnames', 'cls'] } = options

  // Use code scan instead of regexp to extract class
  const extractor: AutoCompleteExtractor = {
    name: 'class-functions',
    extract({ content, cursor }): AutoCompleteExtractorResult | null {
      const calls = scanForFunctionCalls(content, autocompleteFunctions)
      for (const call of calls) {
        if (cursor < call.argsStart || cursor > call.argsEnd) {
          continue
        }

        const literals = scanStringLiterals(call.argsContent, call.argsStart)
        for (const literal of literals) {
          if (cursor >= literal.start && cursor <= literal.end) {
            const stringContent = literal.content
            const cursorRel = cursor - (literal.start + 1)
            // Find token boundaries
            const lastSpace = stringContent.lastIndexOf(' ', cursorRel - 1)
            const tokenStartRel = lastSpace === -1 ? 0 : lastSpace + 1
            const nextSpace = stringContent.indexOf(' ', cursorRel)
            const tokenEndRel = nextSpace === -1 ? stringContent.length : nextSpace
            const extracted = stringContent.slice(tokenStartRel, cursorRel)

            const start = literal.start + 1 + tokenStartRel
            const end = literal.start + 1 + tokenEndRel
            return {
              extracted,
              resolveReplacement: (suggestion: string) => ({
                start,
                end,
                replacement: suggestion,
              }),
            }
          }
        }
      }
      return null
    },
  }
  return {
    name: 'unocss-preset-custom-completion',
    autocomplete: {
      extractors: [extractor],
    },
  }
}
