import { type Language } from "common/Language";
import luaLanguage from "./lua";
import nimLanguage from "./nim";
import polygolfLanguage from "./polygolf";
import pythonLanguage from "./python";
import swiftLanguage from "./swift";
import golfscriptLanguage from "./golfscript";
import javascriptLanguage from "./javascript";
import textLanguage from "./text";

const languages = [
  golfscriptLanguage,
  luaLanguage,
  nimLanguage,
  pythonLanguage,
  swiftLanguage,
  polygolfLanguage,
  javascriptLanguage,
  textLanguage,
];

export default languages;

export function findLang(nameOrExt: string): Language | undefined {
  return languages.find((x) =>
    [x.name.toLowerCase(), x.extension].includes(nameOrExt.toLowerCase()),
  );
}
