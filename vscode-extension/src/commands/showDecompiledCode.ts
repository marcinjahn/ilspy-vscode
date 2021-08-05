/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as tempDir from "temp-dir";
import {
  DecompiledTreeProvider,
  MemberNode,
} from "../decompiler/DecompiledTreeProvider";
import { DecompiledCode, LanguageName } from "../protocol/DecompileResponse";
import CodeViewer from "../codeviewer/CodeViewer";

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
        showCode(context, node.decompiled);
      } else {
        const code = await decompiledTreeProvider.getCode(node);
        node.decompiled = code;
        showCode(context, node.decompiled);
      }
    }
  );
}

function showCode(context: vscode.ExtensionContext, code?: DecompiledCode) {
  if (code?.[LanguageName.IL] && code?.[LanguageName.CSharp]) {
    // showCodeInEditor(code[LanguageName.IL], "text", vscode.ViewColumn.Two);
    showCodeInEditor(
      context,
      code[LanguageName.CSharp],
      "csharp",
      vscode.ViewColumn.One
    );
  }
}

function showCodeInEditor(
  context: vscode.ExtensionContext,
  code: string,
  language: string,
  viewColumn: vscode.ViewColumn
) {
  // const tempFileName = new Date().getTime().toString();
  // const untitledFileName = `${path.join(tempDir, tempFileName)}.${
  //   language === "csharp" ? "cs" : "il"
  // }`;
  // const writeStream = fs.createWriteStream(untitledFileName, { flags: "w" });
  // writeStream.write(code);
  // writeStream.on("finish", async () => {
  //   try {
  //     const document = await vscode.workspace.openTextDocument(
  //       untitledFileName
  //     );
  //     await vscode.window.showTextDocument(document, viewColumn, true);
  //     await vscode.commands.executeCommand("revealLine", {
  //       lineNumber: 1,
  //       at: "top",
  //     });
  //   } catch (errorReason) {
  //     vscode.window.showErrorMessage(
  //       "[Error] ilspy-vscode encountered an error while trying to open text document: " +
  //         errorReason
  //     );
  //   }
  // });
  // writeStream.end();

  const codeViewer = new CodeViewer(context);
  codeViewer.show(viewColumn);
  codeViewer.setCode(code);
}
