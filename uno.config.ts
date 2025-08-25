import type { UserConfig } from '@unocss/core'

import { appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { presetWind3 } from '@unocss/preset-wind3'
import variantGroup from '@unocss/transformer-variant-group'

import { presetClassCompletion } from './src'

const path = `${tmpdir()}/uno.log`
export default {
  presets: [
    presetWind3(),
    presetClassCompletion({
      debug(msg) {
        appendFileSync(path, `${msg}\n`, 'utf-8')
      },
    }),
  ],
  transformers: [
    variantGroup(),
  ],
} satisfies UserConfig
