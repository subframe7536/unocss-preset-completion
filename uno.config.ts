import type { UserConfig } from '@unocss/core'

import { appendFileSync } from 'node:fs'

import { presetWind3 } from '@unocss/preset-wind3'
import variantGroup from '@unocss/transformer-variant-group'

import { presetCompletion } from './src'

const path = '/Users/subf/Developer/front/unocss-preset-custom-completion/uno.log'
export default {
  presets: [
    presetWind3(),
    presetCompletion({
      debug(msg) {
        appendFileSync(path, `${msg}\n`, 'utf-8')
      },
    }),
  ],
  transformers: [
    variantGroup(),
  ],
} satisfies UserConfig
