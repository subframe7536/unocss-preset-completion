# unocss-preset-completion [![npm](https://img.shields.io/npm/v/unocss-preset-completion)](https://npmjs.com/package/unocss-preset-completion)

Custom auto completion preset for UnoCSS

## Features

- Auto completion support in functions, like `clsx()`, `cn()` and so on
- Auto completion support in css directives, like `--at-apply`, `--uno` and so on
- Customizable

## Install

```sh
npm i -D unocss-preset-completion unocss
```
```sh
yarn i -D unocss-preset-completion unocss
```
```sh
pnpm i -D unocss-preset-completion unocss
```
```sh
bun i -D unocss-preset-completion unocss
```

## Usage

```ts
// uno.config.ts
import { defineConfig } from 'unocss'
import { presetClassCompletion, presetDirectiveCompletion } from 'unocss-preset-completion'

export default defineConfig({
  presets: [
    // ...
    presetClassCompletion(),
    presetDirectiveCompletion(),
  ],
})
```

### Customization

```ts
// uno.config.ts
import { defineConfig } from 'unocss'
import { presetCompletion } from 'unocss-preset-completion'

export default defineConfig({
  presets: [
    // ...
    presetCompletion({
      autocompleteFunctions: ['youCustomFunction']
    }),
    presetDirectiveCompletion({
      directives: ['--your-directive']
    }),
  ],
})
```

## License

MIT
