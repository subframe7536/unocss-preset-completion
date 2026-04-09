import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: { oxc: true },
  exports: true,
})
