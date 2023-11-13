import { getExampleOpCodeArgTypes, getType } from "../common/getType";
import type { Language } from "../common/Language";
import {
  FrontendOpCodes,
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
  type Type,
  booleanType,
  text,
  getLiteralOfType,
  OpCodes,
} from "../IR";
import languages from "../languages/languages";
import { isCompilable } from "../common/compile";
import asTable from "as-table";
import { mapObjectValues } from "../common/arrays";
import yargs from "yargs";

const options = yargs()
  .options({
    all: {
      alias: "a",
      description: "Print rows that are all true",
      type: "boolean",
    },
  })
  .parseSync(process.argv.slice(2));

/**
 * To find out whether certain node is compilable in a given language, we must be sure that all its children are compilable.
 * This aims at providing basic compilable building blocks.
 */
interface LangCoverConfig {
  expr: (x?: Type) => Node; // returns any node of given type (or 0..0)
  stmt: (x?: Node) => Node; // returns any node of type void containing given Node (or any)
}

const langs = languages.filter((x) => x.name !== "Polygolf") as (Language &
  LangCoverConfig)[];

let nextBuiltinState = -1;
function nextBuiltin(x: Type) {
  if (x.kind === "integer") x = integerType(0, 64);
  nextBuiltinState = (nextBuiltinState + 1) % 26;
  return annotate(builtin(String.fromCharCode(65 + nextBuiltinState)), x);
}

for (const lang of langs) {
  const compilesAssignment = isCompilable(assignment(id("x"), int(0)), lang);
  const compilesPrintInt = isCompilable(op("print_int", int(0)), lang);
  const compilesPrint = isCompilable(op("print", text("x")), lang);

  lang.stmt = function (x: Node | undefined) {
    x ??= compilesPrintInt ? int(0) : text("x");
    const type = getType(x, x);
    if (compilesPrint && type.kind === "text") return op("print", x);
    if (compilesPrintInt && type.kind === "integer") return op("print_int", x);
    if (compilesAssignment) return assignment(id("x"), x);
    return x;
  };

  lang.expr = function (x: Type = integerType(1, 1)) {
    const literal = getLiteralOfType(x, true);
    return isCompilable(literal, lang) ? literal : nextBuiltin(x);
  };
}

type Table = Record<string, Record<string, unknown>>;
type CoverTableRecipe = Record<string, (x: LangCoverConfig) => Node>;

function printTable(name: string, x: Table) {
  console.log(
    "\n" +
      asTable(
        Object.entries(x)
          .filter(
            ([k, v]) =>
              options.all === true || Object.values(v).some((x) => x !== true),
          )
          .map(([k, v]) => ({
            [name]: k.padEnd(25),
            ...mapObjectValues(v, (v2) =>
              v2 === true
                ? "✔️"
                : v2 === false
                ? "❌"
                : v2 === undefined
                ? ""
                : v2,
            ),
          })),
      ).replaceAll("❌ ", "❌"), // no table generating library I tried was able to align ❌ correctly
  );
}

function runCoverTableRecipe(recipe: CoverTableRecipe): Table {
  return mapObjectValues(recipe, (f) =>
    Object.fromEntries(
      langs.map((lang) => [
        lang.extension.padEnd(3),
        isCompilable(f(lang), lang),
      ]),
    ),
  );
}

const features: CoverTableRecipe = {
  assignment: (lang) => assignment(id("x"), lang.expr()),
  builtin: (lang) => lang.stmt(nextBuiltin(integerType(0, 0))),
  discard: (lang) => lang.expr(),
  bigint: (lang) => lang.stmt(int(10n ** 40n)),
  if: (lang) => ifStatement(lang.expr(booleanType), lang.stmt(), lang.stmt()),
  for: (lang) =>
    forRange(
      id("x"),
      lang.expr(integerType(4, 4)),
      lang.expr(integerType(10, 10)),
      int(1),
      lang.stmt(),
    ),
  "for with step": (lang) =>
    forRange(
      id("x"),
      lang.expr(integerType(4, 4)),
      lang.expr(integerType(10, 10)),
      lang.expr(integerType(3, 3)),
      lang.stmt(),
    ),
  while: (lang) => whileLoop(lang.expr(booleanType), lang.stmt()),
  for_argv: (lang) => forArgv(id("x"), 100, lang.stmt()),
  conditional: (lang) =>
    conditional(lang.expr(booleanType), lang.expr(), lang.expr()),
  unsafe_conditional: (lang) =>
    conditional(lang.expr(booleanType), lang.expr(), lang.expr()),
  any_int: () => anyInt(10n, 20n),
  list: (lang) => list([lang.expr()]),
  array: (lang) => array([lang.expr()]),
  set: (lang) => set([lang.expr()]),
  table: (lang) => table([keyValue(lang.expr(), lang.expr())]),
  function: () => func(["x", "y"], id("x")),
};

const opCodes: CoverTableRecipe = Object.fromEntries(
  FrontendOpCodes.map((opCode) => [
    opCode,
    (lang) =>
      lang.stmt(
        op(
          opCode,
          ...getExampleOpCodeArgTypes(opCode).map((x) => lang.expr(x)),
        ),
      ),
  ]),
);

printTable("Features", runCoverTableRecipe(features));
printTable("OpCodes", runCoverTableRecipe(opCodes));

if (options.all === true) {
  printTable(
    "Backend OpCodes",
    runCoverTableRecipe(
      Object.fromEntries(
        OpCodes.filter((x) => !FrontendOpCodes.includes(x as any)).map(
          (opCode) => [
            opCode,
            (lang) =>
              lang.stmt(
                op(
                  opCode,
                  ...getExampleOpCodeArgTypes(opCode).map((x) => lang.expr(x)),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}