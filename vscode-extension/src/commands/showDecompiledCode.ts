/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as tempDir from "temp-dir";
import { DecompiledTreeProvider } from "../decompiler/DecompiledTreeProvider";
import { DecompiledCode, LanguageName } from "../protocol/DecompileResponse";
import { MemberNode } from "../decompiler/MemberNode";
import {
  getIconByTokenType,
  ThenableTreeIconPath,
} from "../decompiler/decompilerUtils";
import { CodeViewerManager } from "../codeviewer/CodeViewerManager";

let lastSelectedNode: MemberNode | undefined = undefined;

export function registerShowDecompiledCode(
  context: vscode.ExtensionContext,
  decompiledTreeProvider: DecompiledTreeProvider,
  codeViewerManager: CodeViewerManager
) {
  return vscode.commands.registerCommand(
    "showDecompiledCode",
    async (node: MemberNode) => {
      if (lastSelectedNode === node) {
        return;
      }

      lastSelectedNode = node;
      const codeViewer = codeViewerManager.createViewer(node);
      codeViewer.show(vscode.ViewColumn.One);
    }
  );
}
