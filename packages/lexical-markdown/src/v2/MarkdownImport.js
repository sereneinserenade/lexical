/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {BlockTransformer, TextTransformer} from './MarkdownPlugin';
import type {CodeNode} from '@lexical/code';
import type {RootNode, TextNode} from 'lexical';

import {$createCodeNode} from '@lexical/code';
import {$createLinkNode} from '@lexical/link';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

const CODE_BLOCK_REG_EXP = /^```(\w{1,10})?\s?$/;
const LINK_REG_EXP = /(?:\[([^[]+)\])(?:\(([^(]+)\))/;
const TEXT_TRANSFORMER_REG_EXP = /(`|\*{1,3}|_{1,3}|~~)((?!\s)(.+?)(?!\s))\1/;

export function fromMarkdown(
  markdownString: string,
  blockTransformers: Array<BlockTransformer>,
  textTransformers: Array<TextTransformer>,
): void {
  const lines = markdownString.split('\n');
  const linesLength = lines.length;
  const root = $getRoot();
  root.clear();

  // TODO:
  // This can be done once, not on each import call
  const textTransformersByTag = {};
  for (const transformer of textTransformers) {
    textTransformersByTag[transformer.tag] = transformer;
  }

  for (let i = 0; i < linesLength; i++) {
    const lineText = lines[i];

    // Codeblocks are processed first as anything inside such block
    // is ignored during further processing
    const [codeBlockNode, shiftedIndex] = runCodeBlockTransformers(
      lines,
      i,
      root,
    );
    if (codeBlockNode != null) {
      i = shiftedIndex;
      continue;
    }

    runBlockTransformers(
      lineText,
      root,
      blockTransformers,
      textTransformersByTag,
    );
  }

  root.selectEnd();
}

function runBlockTransformers(
  lineText: string,
  rootNode: RootNode,
  blockTransformers: Array<BlockTransformer>,
  textTransformersByTag: $ReadOnly<{[string]: TextTransformer}>,
) {
  const textNode = $createTextNode(lineText);
  const elementNode = $createParagraphNode();
  elementNode.append(textNode);
  rootNode.append(elementNode);

  for (const [matcher, replacer] of blockTransformers) {
    const match = lineText.match(matcher);
    if (match) {
      textNode.setTextContent(lineText.slice(match[0].length));
      replacer(elementNode, [textNode], match);
      break;
    }
  }

  runTextTransformers(textNode, textTransformersByTag);
}

function runTextTransformers(
  textNode: TextNode,
  textTransformersByTag: $ReadOnly<{[string]: TextTransformer}>,
) {
  const textContent = textNode.getTextContent();
  const match = textContent.match(TEXT_TRANSFORMER_REG_EXP);

  if (!match) {
    // When done with text transformers can check for links. Text transformers are executed first
    // as it might contain inline code blocks which prevent any further transformations
    runLinkTransformers(textNode);
    return;
  }

  let currentNode, remainderNode;
  // If matching full content there's no need to run splitText and can
  // reuse existing textNode to update its content and apply format
  if (match[0] === textContent) {
    currentNode = textNode;
  } else {
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    if (startIndex === 0) {
      [currentNode, remainderNode] = textNode.splitText(endIndex);
    } else {
      [, currentNode, remainderNode] = textNode.splitText(startIndex, endIndex);
    }
  }
  currentNode.setTextContent(match[2]);

  const transformer = textTransformersByTag[match[1]];
  if (transformer) {
    for (const format of transformer.format) {
      if (!currentNode.hasFormat(format)) {
        currentNode.toggleFormat(format);
      }
    }
  }

  // Recursively run over inner text if it's not inline code
  if (!currentNode.hasFormat('code')) {
    runTextTransformers(currentNode, textTransformersByTag);
  }

  // Run over remaining text if any
  if (remainderNode) {
    runTextTransformers(remainderNode, textTransformersByTag);
  }
}

function runCodeBlockTransformers(
  lines: Array<string>,
  startLineIndex: number,
  rootNode: RootNode,
): [CodeNode | null, number] {
  const openMatch = lines[startLineIndex].match(CODE_BLOCK_REG_EXP);

  if (openMatch) {
    let endLineIndex = startLineIndex;
    const linesLength = lines.length;
    while (++endLineIndex < linesLength) {
      const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);
      if (closeMatch) {
        const codeBlockNode = $createCodeNode(openMatch[1]);
        const textNode = $createTextNode(
          lines.slice(startLineIndex + 1, endLineIndex).join('\n'),
        );
        codeBlockNode.append(textNode);
        rootNode.append(codeBlockNode);
        return [codeBlockNode, endLineIndex];
      }
    }
  }

  return [null, startLineIndex];
}

function runLinkTransformers(textNode_: TextNode) {
  let textNode = textNode_;

  while (textNode) {
    const match = textNode.getTextContent().match(LINK_REG_EXP);
    if (!match) {
      return false;
    }

    const [fullMatch, linkText, linkUrl] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    let replaceNode;
    if (startIndex === 0) {
      [replaceNode, textNode] = textNode.splitText(endIndex);
    } else {
      [, replaceNode, textNode] = textNode.splitText(startIndex, endIndex);
    }

    const linkNode = $createLinkNode(linkUrl);
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(replaceNode.getFormat());
    linkNode.append(linkTextNode);
    replaceNode.replace(linkNode);
  }
}
