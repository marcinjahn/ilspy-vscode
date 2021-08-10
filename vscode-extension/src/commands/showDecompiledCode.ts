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
import CodeViewer from "../codeviewer/CodeViewer";
import { MemberNode } from "../decompiler/MemberNode";
import {
  getIconByTokenType,
  ThenableTreeIconPath,
} from "../decompiler/decompilerUtils";

let lastSelectedNode: MemberNode | undefined = undefined;

export function registerShowDecompiledCode(
  context: vscode.ExtensionContext,
  decompiledTreeProvider: DecompiledTreeProvider
) {
  return vscode.commands.registerCommand(
    "showDecompiledCode",
    async (node: MemberNode) => {
      if (lastSelectedNode === node) {
        return;
      }

      lastSelectedNode = node;
      if (node.decompiled) {
        showCode(context, node.name, getIconByTokenType(node), node.decompiled);
      } else {
        const code = await decompiledTreeProvider.getCode(node);
        node.decompiled = code;
        showCode(context, node.name, getIconByTokenType(node), node.decompiled);
      }
    }
  );
}

function showCode(
  context: vscode.ExtensionContext,
  title: string,
  iconPath: ThenableTreeIconPath | undefined,
  code?: DecompiledCode
) {
  if (code?.[LanguageName.IL] && code?.[LanguageName.CSharp]) {
    showCodeInEditor(
      context,
      title,
      iconPath,
      code[LanguageName.CSharp],
      "csharp",
      vscode.ViewColumn.One
    );
  }
}

function showCodeInEditor(
  context: vscode.ExtensionContext,
  title: string,
  iconPath: ThenableTreeIconPath | undefined,
  code: string,
  language: string,
  viewColumn: vscode.ViewColumn
) {
  const codeViewer = new CodeViewer(context);
  codeViewer.show(viewColumn);
  codeViewer.setTitle(title);
  codeViewer.setIconPath(iconPath);
  codeViewer.setCode(code);
}
