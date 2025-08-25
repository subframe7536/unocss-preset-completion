export interface StringPosition {
  start: number
  end: number
  content: string
}

/* eslint-disable no-cond-assign */
interface FunctionCall {
  fnName: string
  argsStart: number
  argsContent: string
}

const escapeRegex = /[.*+?^${}()|[\]\\]/g

export function mergeOptionalRegexText(names: string[]): string {
  return names.map(fn =>
    fn.replace(escapeRegex, '\\$&'), // escape special regex chars
  ).join('|')
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

/**
 * Scans the content to find the innermost function call at the cursor position,
 * supporting function calls that span multiple lines.
 *
 * @param content - The full content of the file.
 * @param cursor - The current cursor position.
 * @param directives - List of directive names to look for.
 * @returns A `FunctionCall` object if a matching function call is found, otherwise `null`.
 */
export function scanForDirectives(
  content: string,
  cursor: number,
  directives: string[],
): StringPosition & { directiveName: string } | null {
  // Build regex to match any of the given directive names followed by ':'
  const regex = new RegExp(`(${mergeOptionalRegexText(directives)})\\s*:\\s*([^;]+);`, 'g')
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

  return {
    directiveName: state.directiveName,
    start: state.argsStart,
    end: state.argsStart + state.argsContent.length,
    content: state.argsContent,
  }
}
