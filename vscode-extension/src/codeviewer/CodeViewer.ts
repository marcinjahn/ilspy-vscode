/*------------------------------------------------------------------------------------------------
 *  Copyright (c) 2021 ICSharpCode
 *  Licensed under the MIT License. See LICENSE.TXT in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as shiki from "shiki";

export default class CodeViewer {
  private webViewPanel?: vscode.WebviewPanel;

  constructor() {}

  show(viewColumn: vscode.ViewColumn) {
    if (!this.webViewPanel) {
      this.webViewPanel = vscode.window.createWebviewPanel(
        "ilspyCodeViewer",
        "ILSpy",
        viewColumn,
        {}
      );
    }
  }

  setCode(code: string) {
    if (this.webViewPanel) {
      const theme = getCurrentTheme();
      shiki
        .getHighlighter({
          theme: "dark-plus",
        })
        .then((highlighter) => {
          const formattedCode = highlighter.codeToHtml(code, "c#");
          if (this.webViewPanel) {
            this.webViewPanel.webview.html = this.getHtmlContent(formattedCode);
          }
        });
    }
  }

  private getHtmlContent(code: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ILSpy</title>
    <style>
        code {
            font-family: var(--vscode-editor-font-family) !important;
            font-size: var(--vscode-editor-font-size) !important;
            font-weight: var(--vscode-editor-font-weight) !important;
            tab-size: ${getEditorTabSize()}
        }
    </style>
</head>
<body>
    ${code}
</body>
</html>`;
  }
}

function getCurrentTheme() {
  return vscode.workspace.getConfiguration("workbench").get("colorTheme");
}

function getEditorTabSize() {
  return vscode.workspace.getConfiguration("editor").get("tabSize") ?? 4;
}
