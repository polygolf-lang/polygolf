import { Language } from "common/Language";
import luaLanguage from "./lua";
import nimLanguage from "./nim";
import polygolfLanguage from "./polygolf";
import pythonLanguage from "./python";

const languages = [
  luaLanguage,
  nimLanguage,
  pythonLanguage,
  polygolfLanguage(true),
];

export default languages;

export function findLang(nameOrExt: string): Language | undefined {
  return languages.find(
    (x) => x.name.toLowerCase() === nameOrExt.toLowerCase()
  ); // TODO add .extension to Language and search that too
}
