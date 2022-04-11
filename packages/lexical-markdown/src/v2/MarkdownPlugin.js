/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  ElementNode,
  LexicalEditor,
  LexicalNode,
  TextFormatType,
  TextNode,
} from 'lexical';
import type {Array} from 'yjs';

import {$isCodeNode} from '@lexical/code';
import {$createLinkNode} from '@lexical/link';
import {
  $createRangeSelection,
  $createTextNode,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setSelection,
} from 'lexical';

export type BlockTransformer = [RegExp, BlockReplaceFn];

export type TextTransformer = $ReadOnly<{
  format: $ReadOnlyArray<TextFormatType>,
  tag: string,
}>;

export type BlockReplaceFn = (
  parentNode: ElementNode,
  children: Array<LexicalNode>,
  match: Array<string>,
) => void;

function runBlockTransformers(
  parentNode: ElementNode,
  anchorNode: TextNode,
  anchorOffset: number,
  blockTransformers: $ReadOnlyArray<BlockTransformer>,
): boolean {
  const grandParentNode = parentNode.getParent();
  if (
    !$isRootNode(grandParentNode) ||
    parentNode.getFirstChild() !== anchorNode
  ) {
    return false;
  }

  const textContent = anchorNode.getTextContent();
  // Checking for anchorOffset position to prevent any checks for cases when caret is too far
  // from a line start to be a part of block-level markdown trigger.
  //
  // TODO:
  // Any better way to prevent magic numbers? In general block level triggers are
  // short, but list triggers might have several spaces in front to indicate nesting
  if (anchorOffset > 20 || textContent[anchorOffset - 1] !== ' ') {
    return false;
  }

  for (let i = 0; i < blockTransformers.length; i++) {
    const [matcher, replacer] = blockTransformers[i];
    const match = textContent.match(matcher);
    if (match && match[0].length === anchorOffset) {
      const nextSiblings = anchorNode.getNextSiblings();
      const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
      leadingNode.remove();
      const siblings = remainderNode
        ? [remainderNode, ...nextSiblings]
        : nextSiblings;
      replacer(parentNode, siblings, match);
      return true;
    }
  }

  return false;
}

function runLinkTransform(anchorNode: TextNode, anchorOffset: number): boolean {
  let textContent = anchorNode.getTextContent();

  // Quick check if we're possibly at the end of link markdown
  if (textContent[anchorOffset - 1] !== ')') {
    return false;
  }

  // If typing in the middle of content, remove the tail to do
  // reg exp match up to a string end (caret position)
  if (anchorOffset < textContent.length) {
    textContent = textContent.slice(0, anchorOffset);
  }

  const match = textContent.match(/(?:\[([^[]+)\])(?:\(([^(]+)\))$/);
  if (match === null) {
    return false;
  }

  const [fullMatch, linkText, linkUrl] = match;

  const startIndex = anchorOffset - fullMatch.length;
  let replaceNode;
  if (startIndex === 0) {
    [replaceNode] = anchorNode.splitText(anchorOffset);
  } else {
    [, replaceNode] = anchorNode.splitText(startIndex, anchorOffset);
  }

  const linkNode = $createLinkNode(linkUrl);
  linkNode.append($createTextNode(linkText));
  replaceNode.replace(linkNode);
  linkNode.select();

  return true;
}

function runTextTransformers(
  editor: LexicalEditor,
  anchorNode: TextNode,
  anchorOffset: number,
  textTransformers: $ReadOnly<{[string]: $ReadOnlyArray<TextTransformer>}>,
): boolean {
  const textContent = anchorNode.getTextContent();
  const closeTagEndIndex = anchorOffset - 1;
  const closeChar = textContent[closeTagEndIndex];

  // Quick check if we're possibly at the end of inline markdown style
  const matchers = textTransformers[closeChar];
  if (!matchers) {
    return false;
  }

  for (const matcher of matchers) {
    const {tag} = matcher;
    const tagLength = tag.length;
    const closeTagStartIndex = closeTagEndIndex - tagLength + 1;

    // If tag is not single char check if rest of it matches with text content
    if (tagLength > 1) {
      if (
        !isEqualSubString(textContent, closeTagStartIndex, tag, 0, tagLength)
      ) {
        continue;
      }
    }

    // Space before closing tag cancels inline markdown
    if (textContent[closeTagStartIndex - 1] === ' ') {
      continue;
    }

    const closeNode = anchorNode;
    let openNode = closeNode;

    let openTagStartIndex = getOpenTagStartIndex(
      textContent,
      closeTagStartIndex,
      tag,
    );

    // Go through text node siblings and search for opening tag
    // if haven't found it within the same text node as closing tag
    let sibling = openNode;
    while (openTagStartIndex < 0 && (sibling = sibling.getPreviousSibling())) {
      if ($isLineBreakNode(sibling)) {
        break;
      }

      if ($isTextNode(sibling)) {
        const siblingTextContent = sibling.getTextContent();
        openNode = sibling;
        openTagStartIndex = getOpenTagStartIndex(
          siblingTextContent,
          siblingTextContent.length,
          tag,
        );
      }
    }

    // Opening tag is not found
    if (openTagStartIndex < 0) {
      continue;
    }

    // No content between opening and closing tag
    if (
      openNode === closeNode &&
      openTagStartIndex + tagLength === closeTagStartIndex
    ) {
      continue;
    }

    // Checking longer tags for repeating chars (e.g. *** vs **)
    const prevOpenNodeText = openNode.getTextContent();
    if (
      openTagStartIndex > 0 &&
      prevOpenNodeText[openTagStartIndex - 1] === closeChar
    ) {
      continue;
    }

    // Clean text from opening and closing tags (starting from closing tag
    // to prevent any offset shifts if we start from opening one)
    const prevCloseNodeText = closeNode.getTextContent();
    const closeNodeText =
      prevCloseNodeText.slice(0, closeTagStartIndex) +
      prevCloseNodeText.slice(closeTagEndIndex + 1);
    closeNode.setTextContent(closeNodeText);

    const openNodeText =
      openNode === closeNode ? closeNodeText : prevOpenNodeText;
    openNode.setTextContent(
      openNodeText.slice(0, openTagStartIndex) +
        openNodeText.slice(openTagStartIndex + tagLength),
    );

    const newSelection = $createRangeSelection();
    $setSelection(newSelection);

    // Adjust offset based on deleted chars
    const newOffset =
      closeTagEndIndex - tagLength * (openNode === closeNode ? 2 : 1) + 1;
    newSelection.anchor.set(openNode.__key, openTagStartIndex, 'text');
    newSelection.focus.set(closeNode.__key, newOffset, 'text');

    // Apply formatting to selected text
    for (const format of matcher.format) {
      if (!newSelection.hasFormat(format)) {
        // Internaly mark format change time stamp to avoid format auto
        editor._latestFormatChange = Date.now();
        newSelection.formatText(format);
      }
    }

    // Collapse selection up to the focus point
    newSelection.anchor.set(
      newSelection.focus.key,
      newSelection.focus.offset,
      newSelection.focus.type,
    );

    // Remove formatting from collapsed selection
    for (const format of matcher.format) {
      if (newSelection.hasFormat(format)) {
        newSelection.toggleFormat(format);
      }
    }

    return true;
  }

  return false;
}

function getOpenTagStartIndex(
  string: string,
  maxIndex: number,
  tag: string,
): number {
  const tagLength = tag.length;
  for (let i = maxIndex; i >= tagLength; i--) {
    const startIndex = i - tagLength;
    if (
      isEqualSubString(string, startIndex, tag, 0, tagLength) &&
      // Space after opening tag cancels transformation
      string[startIndex + tagLength] !== ' '
    ) {
      return startIndex;
    }
  }
  return -1;
}

function isEqualSubString(
  stringA: string,
  aStart: number,
  stringB: string,
  bStart: number,
  length: number,
): boolean {
  for (let i = 0; i < length; i++) {
    if (stringA[aStart + i] !== stringB[bStart + i]) {
      return false;
    }
  }
  return true;
}

export function registerMarkdownPlugin(
  editor: LexicalEditor,
  blockTransformers: Array<BlockTransformer>,
  textTransformers: Array<TextTransformer>,
): () => void {
  const textTransformersIndex: {[string]: Array<TextTransformer>} = {};
  for (const transformer of textTransformers) {
    const lastChar = transformer.tag[transformer.tag.length - 1];
    if (textTransformersIndex[lastChar]) {
      textTransformersIndex[lastChar].push(transformer);
    } else {
      textTransformersIndex[lastChar] = [transformer];
    }
  }

  const transform = (
    parentNode: ElementNode,
    anchorNode: TextNode,
    anchorOffset: number,
  ) => {
    if (
      runBlockTransformers(
        parentNode,
        anchorNode,
        anchorOffset,
        blockTransformers,
      )
    ) {
      return;
    }

    if (runLinkTransform(anchorNode, anchorOffset)) {
      return;
    }

    runTextTransformers(
      editor,
      anchorNode,
      anchorOffset,
      textTransformersIndex,
    );
  };

  return editor.registerUpdateListener(
    ({tags, dirtyLeaves, editorState, prevEditorState}) => {
      // Ignore updates from undo/redo (as changes already calculated)
      if (tags.has('historic')) {
        return;
      }

      const selection = editorState.read(() => $getSelection());
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
      }

      const anchorKey = selection.anchor.key;
      const anchorNode = editorState._nodeMap.get(anchorKey);
      if (!dirtyLeaves.has(anchorKey) || !$isTextNode(anchorNode)) {
        return;
      }

      editor.update(() => {
        // Markdown is not available inside code
        if (anchorNode.hasFormat('code')) {
          return;
        }

        const parentNode = anchorNode.getParent();
        if (parentNode === null || $isCodeNode(parentNode)) {
          return;
        }

        transform(parentNode, anchorNode, selection.anchor.offset);
      });
    },
  );
}
