import type { AutoCompleteExtractorResult } from '@unocss/core'

export interface StringPosition {
  start: number
  end: number
  content: string
}

const escapeRegex = /[.*+?^${}()|[\]\\]/g

export function mergeOptionalRegexText(names: string[]): string {
  return names.map(fn =>
    fn.replace(escapeRegex, '\\$&'), // escape special regex chars
  ).join('|')
}

export function generateCompletionResult(
  cursor: number,
  pos: StringPosition,
  debug?: ((msg: string) => void) | undefined,
): AutoCompleteExtractorResult | null {
  if (cursor < pos.start || cursor > pos.end) {
    debug?.('The cursor does not in the function')
    return null
  }
  const stringContent = pos.content
  const cursorRel = cursor - (pos.start + 1)
  // Find token boundaries
  const lastSpace = stringContent.lastIndexOf(' ', cursorRel - 1)
  let tokenStartRel = lastSpace === -1 ? 0 : lastSpace + 1
  const leftParen = stringContent.lastIndexOf('(', cursorRel - 1)
  if (leftParen !== -1 && leftParen > tokenStartRel) {
    tokenStartRel = leftParen + 1
  }

  const nextSpace = stringContent.indexOf(' ', cursorRel)
  let tokenEndRel = nextSpace === -1 ? stringContent.length : nextSpace
  let rightParen = stringContent.indexOf(')', cursorRel)
  if (rightParen !== -1 && rightParen < tokenEndRel) {
    tokenEndRel = rightParen
  }

  const extracted = stringContent.slice(tokenStartRel, cursorRel)

  const start = pos.start + 1 + tokenStartRel
  const end = pos.start + 1 + tokenEndRel
  debug?.(JSON.stringify(
    {
      from: stringContent,
      extracted,
      start,
      end,
      tokenStartRel,
      tokenEndRel,
      rightParen,
      nextSpace,
    },
    null,
    2,
  ))
  return {
    extracted,
    resolveReplacement: (suggestion: string) => ({
      start,
      end,
      replacement: suggestion,
    }),
  }
}
