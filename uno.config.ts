import type { UserConfig } from '@unocss/core'

import { presetWind3 } from '@unocss/preset-wind3'

import { presetCompletion } from './src'

export default {
  presets: [
    presetWind3(),
    presetCompletion(),
  ],
} satisfies UserConfig
