import { LanguageName } from "../protocol/DecompileResponse";

export const languageDisplayName: { [key: string]: string } = {
  [LanguageName.CSharp]: "C#",
  [LanguageName.IL]: "IL",
};

export const languageFromDisplayName = (name?: string) =>
  Object.entries(languageDisplayName).find((entry) => entry[1] === name)?.[0];
