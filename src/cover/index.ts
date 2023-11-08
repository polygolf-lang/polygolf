import { getExampleOpCodeArgTypes } from "../common/getType";
import type { Language } from "../common/Language";
import {
  FrontendOpCodes,
  type OpCode,
  annotate,
  assignment,
  builtin,
  integerType,
  op,
  type Node,
  int,
  id,
  func,
  ifStatement,
  forRange,
  whileLoop,
  forArgv,
  conditional,
  list,
  array,
  set,
  table,
  keyValue,
  anyInt,
} from "../IR";
import languages from "../languages/languages";
import { compileVariant } from "../common/compile";
import asTable from "as-table";

const langs = languages.filter((x) => x.name !== "Polygolf");

function getProgramFromOpCode(opCode: OpCode): Node {
  return assignment(
    "x",
    op(
      opCode,
      ...getExampleOpCodeArgTypes(opCode).map((x, i) =>
        annotate(
          builtin("abcdefgh"[i]),
          x.kind === "integer" ? integerType(0, 5) : x,
        ),
      ),
    ),
  );
}

function isCompilable(program: Node, lang: Language) {
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

const anyStmt = int(0);
const conditionExpr = op("true");

const features = {
  assignment: assignment(id("x"), int(0)),
  discard: int(0),
  bigint: int(10n ** 40n),
  if: ifStatement(conditionExpr, anyStmt, anyStmt),
  for: forRange(id("i"), int(4), int(10), int(1), anyStmt),
  "for with step": forRange(id("i"), int(4), int(10), int(1), anyStmt),
  while: whileLoop(conditionExpr, anyStmt),
  for_argv: forArgv(id("x"), 100, anyStmt),
  conditional: conditional(conditionExpr, int(0), int(0)),
  unsafe_conditional: conditional(conditionExpr, int(0), int(0), false),
  any_int: anyInt(10n, 20n),
  list: list([int(0)]),
  array: array([int(0)]),
  set: set([int(0)]),
  table: table([keyValue(int(0), int(0))]),
  function: func(["x", "y"], id("x")),
};

function printTable(x: Record<string, unknown>[]) {
  console.log(asTable(x).replaceAll("❌ ", "❌"));
}

printTable(
  Object.entries(features).map(([k, v]) => ({
    feature: k,
    ...Object.fromEntries(
      langs.map((lang) => [
        lang.extension,
        isCompilable(v, lang) ? "✔️  " : "❌ ",
      ]),
    ),
  })),
);
console.log("");

printTable(
  FrontendOpCodes.map((opCode) => ({
    opCode,
    ...Object.fromEntries(
      langs.map((lang) => [
        lang.extension,
        isCompilable(getProgramFromOpCode(opCode), lang) ? "✔️  " : "❌ ",
      ]),
    ),
  })),
);
