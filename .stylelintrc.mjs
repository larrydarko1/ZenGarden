import { stylelint } from '@larrydarko/lint-config/stylelint';

// `lowercaseCurrentColor`: `value-keyword-case` rewrites every `currentColor` to lowercase, after
// which the camel spelling never matches the token rule's ignore list.
// `referenceFiles`: _themes.scss declares the `--tokens` every component reads, so it is loaded for
// context — without it each `var(--token)` elsewhere looks undeclared.
export default stylelint({
    lowercaseCurrentColor: true,
    referenceFiles: ['src/renderer/styles/_themes.scss'],
});
