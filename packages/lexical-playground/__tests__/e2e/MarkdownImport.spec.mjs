/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {redo, undo} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Markdown import', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    initialize({isCollab, page});
  });

  test('can convert markdown text into rich text', async ({page, isCollab}) => {
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain': MARKDOWN,
    });
    // Undo/redo is not tested in collab
    const originalHTML = isCollab
      ? null
      : await page.innerHTML('div[contenteditable="true"]');
    await waitForSelector(page, '.action-button .markdown');
    await click(page, '.action-button .markdown');
    await assertHTML(page, TRANSFORMED_HTML);

    if (!isCollab) {
      await undo(page);
      await assertHTML(page, originalHTML);
      await redo(page);
      await assertHTML(page, TRANSFORMED_HTML);
    }
  });
});

const MARKDOWN = `# Markdown Import
### Formatting
This is *italic*, _italic_, **bold**, __bold__, ~~strikethrough~~ text
This is *__~~bold italic strikethrough~~__* text, ___~~this one too~~___
It ~~___works [with links](https://lexical.io)___~~ too
### Headings
# h1 Heading
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading
### Horizontal Rules
---
### Blockquotes
> Blockquotes text goes here
### Unordered lists
- Create a list with \`+\`, \`-\`, or \`*\`
    - Lists can be indented with 2 spaces
        - Very easy
### Ordered lists
1. Oredered lists started with numbers as \`1.\`
    1. And can be nested as well

31. Have any starting number
### Inline code
Inline \`code\` format which also \`preserves **_~~any markdown-like~~_** text\` within
### Code blocks
\`\`\`
// Some comments
1 + 1 = 2;
**_~~1~~_**
\`\`\``;

const TRANSFORMED_HTML = html`
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Markdown Import</span>
  </h1>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Formatting</span>
  </h3>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <em class="PlaygroundEditorTheme__textItalic" data-lexical-text="true">
      italic
    </em>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">
      bold
    </strong>
    <span data-lexical-text="true">,</span>
    <span
      class="PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      strikethrough
    </span>
    <span data-lexical-text="true">text</span>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">This is</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      bold italic strikethrough
    </strong>
    <span data-lexical-text="true">text,</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      this one too
    </strong>
  </p>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">It</span>
    <strong
      class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
      data-lexical-text="true">
      works
    </strong>
    <a
      href="https://lexical.io"
      class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
      dir="ltr">
      <strong
        class="PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__textStrikethrough"
        data-lexical-text="true">
        with links
      </strong>
    </a>
    <span data-lexical-text="true">too</span>
  </p>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Headings</span>
  </h3>
  <h1 class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h1 Heading</span>
  </h1>
  <h2 class="PlaygroundEditorTheme__h2 PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h2 Heading</span>
  </h2>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h3 Heading</span>
  </h3>
  <h4 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h4 Heading</span>
  </h4>
  <h5 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h5 Heading</span>
  </h5>
  <h6 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">h6 Heading</span>
  </h6>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Horizontal Rules</span>
  </h3>
  <div
    contenteditable="false"
    style="display: contents;"
    data-lexical-decorator="true">
    <hr />
  </div>
  <p class="PlaygroundEditorTheme__paragraph"><br /></p>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Blockquotes</span>
  </h3>
  <blockquote
    class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Blockquotes text goes here</span>
  </blockquote>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Unordered lists</span>
  </h3>
  <ul class="PlaygroundEditorTheme__ul">
    <li
      value="1"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">Create a list with</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">+</span>
      </code>
      <span data-lexical-text="true">,</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">-</span>
      </code>
      <span data-lexical-text="true">, or</span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">*</span>
      </code>
    </li>
    <li
      value="2"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
      <ul class="PlaygroundEditorTheme__ul">
        <li
          value="1"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">
            Lists can be indented with 2 spaces
          </span>
        </li>
        <li
          value="2"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
          <ul class="PlaygroundEditorTheme__ul">
            <li
              value="1"
              class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">Very easy</span>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Ordered lists</span>
  </h3>
  <ol class="PlaygroundEditorTheme__ol1">
    <li
      value="1"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">
        Oredered lists started with numbers as
      </span>
      <code data-lexical-text="true">
        <span class="PlaygroundEditorTheme__textCode">1.</span>
      </code>
    </li>
    <li
      value="2"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__nestedListItem">
      <ol class="PlaygroundEditorTheme__ol2">
        <li
          value="1"
          class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">And can be nested as well</span>
        </li>
      </ol>
    </li>
  </ol>
  <p class="PlaygroundEditorTheme__paragraph"><br /></p>
  <ol start="31" class="PlaygroundEditorTheme__ol1">
    <li
      value="31"
      class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
      dir="ltr">
      <span data-lexical-text="true">Have any starting number</span>
    </li>
  </ol>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Inline code</span>
  </h3>
  <p
    class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
    dir="ltr">
    <span data-lexical-text="true">Inline</span>
    <code data-lexical-text="true">
      <span class="PlaygroundEditorTheme__textCode">code</span>
    </code>
    <span data-lexical-text="true">format which also</span>
    <code data-lexical-text="true">
      <span class="PlaygroundEditorTheme__textCode">
        preserves **_~~any markdown-like~~_** text
      </span>
    </code>
    <span data-lexical-text="true">within</span>
  </p>
  <h3 class="PlaygroundEditorTheme__ltr" dir="ltr">
    <span data-lexical-text="true">Code blocks</span>
  </h3>
  <code
    class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
    spellcheck="false"
    dir="ltr"
    data-highlight-language="javascript"
    data-gutter="123">
    <span class="PlaygroundEditorTheme__tokenComment" data-lexical-text="true">
      // Some comments
    </span>
    <br />
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      +
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      =
    </span>
    <span data-lexical-text="true"></span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      2
    </span>
    <span
      class="PlaygroundEditorTheme__tokenPunctuation"
      data-lexical-text="true">
      ;
    </span>
    <br />
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      **
    </span>
    <span data-lexical-text="true">_</span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">
      1
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      ~
    </span>
    <span data-lexical-text="true">_</span>
    <span class="PlaygroundEditorTheme__tokenOperator" data-lexical-text="true">
      **
    </span>
  </code>
`;
