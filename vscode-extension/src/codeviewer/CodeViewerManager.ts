import * as vscode from "vscode";
import { DecompiledTreeProvider } from "../decompiler/DecompiledTreeProvider";
import { MemberNode } from "../decompiler/MemberNode";
import { LanguageName } from "../protocol/DecompileResponse";
import CodeViewer from "./CodeViewer";
import {
  languageDisplayName,
  languageFromDisplayName,
} from "./languageDisplayName";

const languageSelectorCommandId = "ilspy.selectLanguage";

export class CodeViewerManager {
  private viewers: CodeViewer[] = [];
  private _activeViewer?: CodeViewer;
  private languageSelectorStatusBarItem?: vscode.StatusBarItem;

  constructor(
    private context: vscode.ExtensionContext,
    private decompiledTreeProvider: DecompiledTreeProvider
  ) {
    this.onViewerStateChanged = this.onViewerStateChanged.bind(this);

    context.subscriptions.push(this.registerLanguageSelectorCommand());
    context.subscriptions.push(this.registerLanguageSelectorButton());
  }

  public get activeViewer() {
    return this._activeViewer;
  }

  public createViewer(memberNode: MemberNode) {
    const newViewer = new CodeViewer(
      this.context,
      getDefaultOutputLanguage(),
      memberNode,
      this.decompiledTreeProvider,
      this.onViewerStateChanged
    );
    this.viewers.push(newViewer);
    return newViewer;
  }

  public removeViewer(viewer: CodeViewer) {
    const index = this.viewers.indexOf(viewer);
    if (index > -1) {
      this.viewers.splice(index, 1);
    }
  }

  public registerLanguageSelectorCommand() {
    return vscode.commands.registerCommand(
      languageSelectorCommandId,
      async () => {
        const language = await vscode.window.showQuickPick(
          Object.values(languageDisplayName),
          {
            title: "Please select language of decompiled code output",
          }
        );
        if (language) {
          this.selectLanguageInCurrentViewer(
            languageFromDisplayName(language) as LanguageName
          );
        }
      }
    );
  }

  public registerLanguageSelectorButton() {
    if (!this.languageSelectorStatusBarItem) {
      this.languageSelectorStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
      );
      this.languageSelectorStatusBarItem.command = languageSelectorCommandId;
      this.languageSelectorStatusBarItem.tooltip =
        "Language of decompiled code";
      this.languageSelectorStatusBarItem.hide();
    }

    return this.languageSelectorStatusBarItem;
  }

  private onViewerStateChanged(
    viewer: CodeViewer,
    isActive: boolean,
    isAlive: boolean
  ) {
    if (isAlive) {
      if (isActive) {
        this._activeViewer = viewer;
        setCodeViewerActiveContext(true);
        if (this.languageSelectorStatusBarItem) {
          this.languageSelectorStatusBarItem.text = formatButtonText(
            viewer.language
          );
        }
        this.languageSelectorStatusBarItem?.show();
      } else {
        this._activeViewer = undefined;
        setCodeViewerActiveContext(false);
        this.languageSelectorStatusBarItem?.hide();
      }
    } else {
      if (viewer === this.activeViewer) {
        this._activeViewer = undefined;
        setCodeViewerActiveContext(false);
        this.languageSelectorStatusBarItem?.hide();
      }
      this.removeViewer(viewer);
    }
  }

  private selectLanguageInCurrentViewer(language: LanguageName) {
    if (this._activeViewer) {
      this._activeViewer.language = language;
    }
    if (this.languageSelectorStatusBarItem) {
      this.languageSelectorStatusBarItem.text = formatButtonText(language);
    }
  }
}

function setCodeViewerActiveContext(active: boolean) {
  vscode.commands.executeCommand(
    "setContext",
    "ilspy.codeViewerActive",
    active
  );
}

function formatButtonText(language: LanguageName) {
  return `ILSpy: ${languageDisplayName[language]}`;
}

function getDefaultOutputLanguage() {
  return languageFromDisplayName(
    vscode.workspace.getConfiguration("ilspy").get("defaultOutputLanguage") ??
      "C#"
  ) as LanguageName;
}
