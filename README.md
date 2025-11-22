# unocss-preset-completion [![npm](https://img.shields.io/npm/v/unocss-preset-completion)](https://npmjs.com/package/unocss-preset-completion)

Custom auto completion preset for UnoCSS

## Features

- Auto completion support in Function, like `clsx()`, `cn()` and so on
- Auto completion support in Object Property, like `const variant = { normal: 'text-red' }` and so on
- Auto completion support in CSS Directive, like `--at-apply`, `--uno` and so on
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
import { presetDirectiveCompletion, presetFunctionCompletion, presetObjectCompletion } from 'unocss-preset-completion'

export default defineConfig({
  presets: [
    // ...
    presetFunctionCompletion({
      // optional
      autocompleteFunctions: ['youCustomFunction']
    }),
    presetDirectiveCompletion({
      // optional
      directives: ['--your-directive']
    }),
    presetObjectCompletion(),
  ],
})
```

## License

MIT
