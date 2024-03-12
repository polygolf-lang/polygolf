import { getInstantiatedOpCodeArgTypes, getType } from "../common/getType";
import type { Language } from "../common/Language";
import {
  annotate,
  assignment,
  builtin,
  integerType,
  op,
  type Node,
  int,
  id,
  uniqueId,
  func,
  ifStatement,
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
  PhysicalOpCodesUser,
  isSubtype,
  type OpCode,
  forRangeCommon,
} from "../IR";
import languages from "../languages/languages";
import { isCompilable } from "../common/compile";
import asTable from "as-table";
import { mapObjectValues } from "../common/arrays";
import yargs from "yargs";
import fs from "fs";

const options = yargs()
  .options({
    all: {
      alias: "a",
      description:
        "Print rows that are all true or all false & backend only opcodes",
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

const langs = languages.filter(
  (x) => x.name !== "Polygolf" && x.name !== "Text",
) as (Language & LangCoverConfig)[];

let nextBuiltinState = -1;
function nextBuiltin(x: Type) {
  if (x.kind === "integer")
    x = isSubtype(x, integerType(-Infinity, 0))
      ? integerType(-64, -1)
      : integerType(0, 64);
  nextBuiltinState = (nextBuiltinState + 1) % 26;
  return annotate(builtin(String.fromCharCode(65 + nextBuiltinState)), x);
}

for (const lang of langs) {
  const compilesAssignment = isCompilable(assignment(id("x"), int(0)), lang);
  const compilesPrintInt = isCompilable(op["print[Int]"](int(0)), lang);
  const compilesPrint = isCompilable(op["print[Text]"](text("x")), lang);

  lang.stmt = function (x: Node | undefined) {
    x ??= compilesPrintInt ? int(0) : text("x");
    const type = getType(x, x);
    if (compilesPrint && type.kind === "text") return op["print[Text]"](x);
    if (compilesPrintInt && type.kind === "integer") return op["print[Int]"](x);
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

let results: Table = {};

function printTable(name: string, x: Table) {
  results = { ...results, ...x };
  console.log(
    "\n" +
      asTable([
        {
          [name]: "",
          ...mapObjectValues(
            Object.values(x)[0],
            (v, k) =>
              `${Math.floor(
                (100 *
                  Object.values(x)
                    .map((x) => x[k])
                    .filter((x) => x === true).length) /
                  Object.values(x).length,
              )}%`,
          ),
        },
        ...Object.entries(x)
          .filter(
            ([k, v]) =>
              options.all === true ||
              Object.values(v).some((x, _, a) => x !== a[0]),
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
      ]).replaceAll("❌ ", "❌"), // no table generating library I tried was able to align ❌ correctly
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
    forRangeCommon(
      [
        "x",
        lang.expr(integerType(4, 4)),
        lang.expr(integerType(10, 10)),
        int(1),
      ],
      lang.stmt(),
    ),
  "for with step": (lang) =>
    forRangeCommon(
      [
        "x",
        lang.expr(integerType(4, 4)),
        lang.expr(integerType(10, 10)),
        lang.expr(integerType(3, 3)),
      ],
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

const tryAsMutation: OpCode[] = [
  "with_at[Array]",
  "with_at[List]",
  "with_at_back[List]",
  "with_at[Table]",
  "append",
];

const opCodes: CoverTableRecipe = Object.fromEntries(
  PhysicalOpCodesUser.flatMap((opCode) =>
    (tryAsMutation.includes(opCode) ? [false, true] : [false]).map(
      (asMutation) =>
        asMutation
          ? [
              opCode + "<-",
              (lang) => {
                const types = getInstantiatedOpCodeArgTypes(opCode);
                const variable = {
                  ...uniqueId("cover", true),
                  type: types[0],
                };
                return assignment(
                  variable,
                  op.unsafe(opCode)(
                    ...types.map((x, i) => (i < 1 ? variable : lang.expr(x))),
                  ),
                );
              },
            ]
          : [
              opCode,
              (lang) =>
                lang.stmt(
                  op.unsafe(opCode)(
                    ...getInstantiatedOpCodeArgTypes(opCode).map((t, i) =>
                      lang.expr(
                        opCode === "range_excl" && i === 1
                          ? integerType(10, 10)
                          : t,
                      ),
                    ),
                  ),
                ),
            ],
    ),
  ),
);

printTable("Features", runCoverTableRecipe(features));
printTable("OpCodes", runCoverTableRecipe(opCodes));

if (options.all === true) {
  printTable(
    "Backend OpCodes",
    runCoverTableRecipe(
      Object.fromEntries(
        OpCodes.filter((x) => !PhysicalOpCodesUser.includes(x as any)).map(
          (opCode) => [
            opCode,
            (lang) =>
              lang.stmt(
                op.unsafe(opCode)(
                  ...getInstantiatedOpCodeArgTypes(opCode).map((x) =>
                    lang.expr(x),
                  ),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

fs.writeFileSync(
  `cover${options.all === true ? "-all" : ""}.json`,
  JSON.stringify(results),
  { encoding: "utf-8" },
);
