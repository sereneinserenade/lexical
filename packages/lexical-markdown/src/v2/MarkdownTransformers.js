/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {BlockReplaceFn, BlockTransformer} from './MarkdownPlugin';
import type {HeadingTagType} from '@lexical/rich-text';
import type {ElementNode} from 'lexical';

import {$createCodeNode} from '@lexical/code';
import {$createListItemNode, $createListNode, $isListNode} from '@lexical/list';
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';

const replaceWithBlock = (
  createNode: (match: Array<string>) => ElementNode,
): BlockReplaceFn => {
  return (parentNode, children, match) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  };
};

const listReplace = (listTag: 'ul' | 'ol'): BlockReplaceFn => {
  return (parentNode, children, match) => {
    const previousNode = parentNode.getPreviousSibling();
    const listItem = $createListItemNode();
    if ($isListNode(previousNode) && previousNode.getTag() === listTag) {
      previousNode.append(listItem);
      parentNode.remove();
    } else {
      const list = $createListNode(
        listTag,
        listTag === 'ol' ? Number(match[2]) : undefined,
      );
      list.append(listItem);
      parentNode.replace(list);
    }
    listItem.append(...children);
    listItem.select(0, 0);
    const indent = Math.floor(match[1].length / 4);
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};

export const HEADING: BlockTransformer = [
  /^(#{1,6})\s/,
  replaceWithBlock((match) => {
    // $FlowExpectedError
    const tag: HeadingTagType = 'h' + match[1].length;
    return $createHeadingNode(tag);
  }),
];

export const QUOTE: BlockTransformer = [
  /^>\s/,
  replaceWithBlock(() => $createQuoteNode()),
];

export const CODE: BlockTransformer = [
  /^```(\w{1,10})?\s/,
  replaceWithBlock((match) => {
    return $createCodeNode(match ? match[1] : undefined);
  }),
];

export const UNORDERED_LIST: BlockTransformer = [
  /^(\s*)[-*+]\s/,
  listReplace('ul'),
];

export const ORDERED_LIST: BlockTransformer = [
  /^(\s*)(\d{1,}).\s/,
  listReplace('ol'),
];

// Note that space for HR is optional: it's still checked while typing
// but not required for importing
export const HR: BlockTransformer = [
  /^(---|\*\*\*|___)\s?$/,
  (parentNode) => {
    const line = $createHorizontalRuleNode();
    parentNode.insertBefore(line);
    parentNode.select(0, 0);
  },
];

export const BLOCK_TRANSFORMERS: Array<BlockTransformer> = [
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  HR,
];

// Order of text transformers is important:
//
// - code should go first as it prevents any transformations inside,
// - then longer tags match (e.g. ** or __ should go before * or _)
export const TEXT_TRANSFORMERS = [
  {format: ['code'], tag: '`'},
  {format: ['bold', 'italic'], tag: '***'},
  {format: ['bold', 'italic'], tag: '___'},
  {format: ['bold'], tag: '**'},
  {format: ['bold'], tag: '__'},
  {format: ['strikethrough'], tag: '~~'},
  {format: ['italic'], tag: '*'},
  {format: ['italic'], tag: '_'},
];
