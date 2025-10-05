import type { UserConfig } from '@unocss/core'
import type { Theme } from '@unocss/preset-wind3'

import { appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { presetWind3 } from '@unocss/preset-wind3'
import directives from '@unocss/transformer-directives'
import variantGroup from '@unocss/transformer-variant-group'

import { presetClassCompletion, presetDirectivesCompletion } from './src'

const path = `${tmpdir()}/uno.log`
export default {
  presets: [
    presetWind3(),
    presetClassCompletion({
      debug(msg) {
        appendFileSync(path, `${msg}\n`, 'utf-8')
      },
    }),
    presetDirectivesCompletion(),
  ],
  transformers: [
    variantGroup(),
    directives(),
  ],
  shortcuts: {
    'animate-out': 'transition-color',
    'animate-in': 'transition-border',
  },
  theme: {
    colors: {
      ring: 'var(--ring)',
      background: 'var(--background)',
    },
  },
} satisfies UserConfig<Theme>
