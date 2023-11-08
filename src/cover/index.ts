import { getExampleOpCodeArgTypes } from "../common/getType";
import { Language } from "../common/Language";
import {
  FrontendOpCodes,
  OpCode,
  annotate,
  assignment,
  builtin,
  op,
} from "../IR";
import languages from "../languages/languages";
import { compileVariant } from "../common/compile";
import { printTable } from "console-table-printer";

interface LanguageCoverSurveyConfig {
  inputs: "literal" | "builtin";
  outputs: "discard" | "assign"; // | "print" ?
}

const languageConfigs: Record<
  (typeof languages)[number]["name"],
  LanguageCoverSurveyConfig
> = {};

function isCompilable(opCode: OpCode, lang: Language) {
  const program = assignment(
    "x",
    op(
      opCode,
      ...getExampleOpCodeArgTypes(opCode).map((x, i) =>
        annotate(builtin("abcdefgh"[i]), x),
      ),
    ),
  );
  const result = compileVariant(
    program,
    {
      codepointRange: [1, Infinity],
      getAllVariants: true,
      level: "nogolf",
      objective: "bytes",
      restrictFrontend: false,
      skipTypecheck: true,
    },
    lang,
  );
  return typeof result.result === "string";
}

printTable(
  FrontendOpCodes.map((opCode) => ({
    opCode,
    ...Object.fromEntries(
      languages.map((lang) => [
        lang.extension,
        isCompilable(opCode, lang) ? "✔️ " : "🔴",
      ]),
    ),
  })),
);
