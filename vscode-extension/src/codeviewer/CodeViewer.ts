/*------------------------------------------------------------------------------------------------
 *  Copyright (c) 2021 ICSharpCode
 *  Licensed under the MIT License. See LICENSE.TXT in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as shiki from "shiki";
import * as path from "path";
import { getIconByTokenType } from "../decompiler/decompilerUtils";
import { LanguageName } from "../protocol/DecompileResponse";
import { MemberNode } from "../decompiler/MemberNode";
import { DecompiledTreeProvider } from "../decompiler/DecompiledTreeProvider";
import { languageDisplayName } from "./languageDisplayName";

export default class CodeViewer {
  private webViewPanel?: vscode.WebviewPanel;
  private code: string = "";
  private _language: LanguageName;

  constructor(
    private context: vscode.ExtensionContext,
    initialLanguage: LanguageName,
    private memberNode: MemberNode,
    private decompiledTreeProvider: DecompiledTreeProvider,
    private onStateChanged: (
      viewer: CodeViewer,
      isActive: boolean,
      isAlive: boolean
    ) => void
  ) {
    this._language = initialLanguage;

    vscode.workspace.onDidChangeConfiguration(
      (change) => {
        if (change.affectsConfiguration("workbench.colorTheme")) {
          this.updateTheme();
        }
      },
      undefined,
      context.subscriptions
    );
  }

  public async show(viewColumn: vscode.ViewColumn) {
    if (!this.webViewPanel) {
      const node = this.memberNode;

      this.webViewPanel = vscode.window.createWebviewPanel(
        "ilspyCodeViewer",
        "ILSpy",
        viewColumn,
        {}
      );
      this.updateTitle();
      this.webViewPanel.iconPath = getIconByTokenType(node);
      this.webViewPanel.onDidChangeViewState(
        (e) => {
          this.onStateChanged(this, e.webviewPanel.visible, true);
        },
        null,
        this.context.subscriptions
      );
      this.webViewPanel.onDidDispose(
        () => {
          this.onStateChanged(this, false, false);
        },
        undefined,
        this.context.subscriptions
      );

      this.showCode();
      this.onStateChanged(this, true, true);
    }
  }

  get language() {
    return this._language;
  }

  set language(value: LanguageName) {
    this._language = value;
    this.updateTitle();
    this.showCode();
  }

  updateTheme() {
    this.setCode(this.code);
  }

  updateTitle() {
    if (this.webViewPanel) {
      this.webViewPanel.title = `${this.memberNode.name} (${
        languageDisplayName[this._language] ?? "decompiled"
      })`;
    }
  }

  async setCode(code: string) {
    this.code = code;
    if (this.webViewPanel) {
      const theme = await getThemeMatchingToVSCode();
      shiki
        .getHighlighter({
          theme,
        })
        .then((highlighter) => {
          const formattedCode = highlighter.codeToHtml(code, "c#");
          if (this.webViewPanel) {
            this.webViewPanel.webview.html = this.getHtmlContent(formattedCode);
          }
        });
    }
  }

  private async showCode() {
    const node = this.memberNode;
    if (node.decompiled) {
      this.setCode(node.decompiled[this._language] ?? "");
    } else {
      const code = await this.decompiledTreeProvider.getCode(node);
      node.decompiled = code;
      this.setCode(node.decompiled?.[this._language] ?? "");
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
        body {
          height: 100%;
          width: 100%;
        }
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

function getCurrentTheme(): string | undefined {
  return vscode.workspace.getConfiguration("workbench").get("colorTheme");
}

const themeMappings: { [key: string]: string } = {
  "Visual Studio Light": "light-plus",
  "Visual Studio 2019 Light": "light-plus",
  "Default Light+": "light-plus",
  "Visual Studio Dark": "dark-plus",
  "Visual Studio 2019 Dark": "dark-plus",
  "Default Dark+": "dark-plus",
};

async function getThemeMatchingToVSCode() {
  const currentTheme = getCurrentTheme();
  if (currentTheme) {
    if (themeMappings[currentTheme]) {
      return themeMappings[currentTheme];
    } else {
      const colorThemePath = getCurrentThemePath(currentTheme);
      if (colorThemePath) {
        const theme = await shiki.loadTheme(colorThemePath);
        theme.name = "something";
        return theme;
      }
    }
  }

  return "Default Dark+";
}

function getEditorTabSize() {
  return vscode.workspace.getConfiguration("editor").get("tabSize") ?? 4;
}

function getCurrentThemePath(themeName: string) {
  for (const ext of vscode.extensions.all) {
    const themes =
      ext.packageJSON.contributes && ext.packageJSON.contributes.themes;
    if (!themes) {
      continue;
    }
    const theme = themes.find(
      (theme: any) => theme.label === themeName || theme.id === themeName
    );
    if (theme) {
      return path.join(ext.extensionPath, theme.path);
    }
  }
}
