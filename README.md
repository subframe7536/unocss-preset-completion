# unocss-preset-custom-completion [![npm](https://img.shields.io/npm/v/unocss-preset-custom-completion)](https://npmjs.com/package/unocss-preset-custom-completion)

Custom auto completion preset for UnoCSS

## Features
- 🔥 Description of the preset

## Usage

```shell
pnpm i -D unocss-preset-custom-completion unocss
```

```ts
// uno.config.ts
import { defineConfig } from 'unocss'
import { presetCompletion } from 'unocss-preset-custom-completion'

export default defineConfig({
  presets: [
    // ...
    presetCompletion(),
  ],
})
```

## License

[MIT](./LICENSE) License © 2023 [zyyv](https://github.com/zyyv)
