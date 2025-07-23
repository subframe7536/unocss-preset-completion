# unocss-preset-completion [![npm](https://img.shields.io/npm/v/unocss-preset-completion)](https://npmjs.com/package/unocss-preset-completion)

Custom auto completion preset for UnoCSS

## Features

- Auto completion support in functions, like `clsx()`, `cn()` and so on
- Customizable auto completion functions

## Usage

```shell
pnpm i -D unocss-preset-completion unocss
```

```ts
// uno.config.ts
import { defineConfig } from 'unocss'
import { presetCompletion } from 'unocss-preset-completion'

export default defineConfig({
  presets: [
    // ...
    presetCompletion(),
  ],
})
```

## License

MIT
