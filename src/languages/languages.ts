import { Language } from "common/Language";
import luaLanguage from "./lua";
import nimLanguage from "./nim";
import polygolfLanguage from "./polygolf";
import pythonLanguage from "./python";
import golfscriptLanguage from "./golfscript";

const languages = [golfscriptLanguage, luaLanguage, nimLanguage, pythonLanguage, polygolfLanguage];

export default languages;

export function findLang(nameOrExt: string): Language | undefined {
  return languages.find((x) =>
    [x.name.toLowerCase(), x.extension].includes(nameOrExt.toLowerCase())
  );
}
