/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority, LexicalCommand} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  createCommand,
} from 'lexical';
import {useEffect} from 'react';

import {$createEmbedNode} from '../nodes/EmbedNode.jsx';
import {$createYouTubeNode, YouTubeNode} from '../nodes/YouTubeNode.jsx';

const EditorPriority: CommandListenerEditorPriority = 0;

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand();

export default function YouTubePlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error('YouTubePlugin: YouTubeNode not registered on editor');
    }

    return editor.registerCommand(
      INSERT_YOUTUBE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const focusNode = selection.focus.getNode();
        if (focusNode !== null) {
          const embedNode = $createEmbedNode();
          const youTubeNode = $createYouTubeNode(payload);
          const topLevelNode = focusNode.getTopLevelElementOrThrow();
          topLevelNode.insertAfter(embedNode);
          embedNode.append(youTubeNode);
          embedNode.insertAfter($createParagraphNode());
        }
        return true;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
