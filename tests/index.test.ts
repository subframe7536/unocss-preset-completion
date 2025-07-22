import { createGenerator } from '@unocss/core'
import { presetWind3 } from '@unocss/preset-wind3'
import { expect, it } from 'bun:test'

import { presetCompletion } from '../src'

it('test extractors', async () => {
  const uno = await createGenerator({
    presets: [presetWind3(), presetCompletion()],
  })
  expect(await uno.applyExtractors(`
    export default function Icon(props: Props) {
      return <div class={cls(\`i-\${props.name} text-red\`, props.class)} title={props.title || props.name} />
    }
  `)).toMatchInlineSnapshot(`
    Set {
      "export",
      "default",
      "function",
      "Icon(props",
      "Props)",
      "return",
      "<div",
      "class=",
      "cls(",
      "i-$",
      "props.name",
      "text-red",
      ",",
      "props.class)",
      "title=",
      "props.title",
      "/>",
    }
  `)
})
