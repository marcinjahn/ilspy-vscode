import * as path from "path";
import { MemberNode } from "./MemberNode";
import { TokenType } from "./TokenType";
import { MemberSubKind } from "./MemberSubKind";
import { Uri } from "vscode";

export interface ThenableTreeIconPath {
  light: Uri;
  dark: Uri;
}

export function getIconByTokenType(node: MemberNode): ThenableTreeIconPath {
  let name: string | undefined;

  switch (node.type) {
    case TokenType.AssemblyDefinition:
      name = "Assembly";
      break;
    case TokenType.NamespaceDefinition:
      name = "Namespace";
      break;
    case TokenType.EventDefinition:
      name = "Event";
      break;
    case TokenType.FieldDefinition:
      name = "Field";
      break;
    case TokenType.MethodDefinition:
      name = "Method";
      break;
    case TokenType.TypeDefinition:
      switch (node.memberSubKind) {
        case MemberSubKind.Enum:
          name = "EnumItem";
          break;
        case MemberSubKind.Interface:
          name = "Interface";
          break;
        case MemberSubKind.Struct:
          name = "Structure";
          break;
        default:
          name = "Class";
          break;
      }
      break;
    case TokenType.LocalConstant:
      name = "Constant";
      break;
    case TokenType.PropertyDefinition:
      name = "Property";
      break;
    default:
      name = "Misc";
      break;
  }

  const normalName = name + "_16x.svg";
  const inverseName = name + "_inverse_16x.svg";
  const lightIconPath = path.join(
    __dirname,
    "..",
    "..",
    "resources",
    normalName
  );
  const darkIconPath = path.join(
    __dirname,
    "..",
    "..",
    "resources",
    inverseName
  );

  return {
    light: Uri.file(lightIconPath),
    dark: Uri.file(darkIconPath),
  };
}
