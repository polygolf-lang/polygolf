import { mapToPrefixAndInfix } from "../../plugins/ops";
import { printLnToPrint } from "../../plugins/print";
import {
  type Language,
  defaultDetokenizer,
  required,
  search,
} from "../../common/Language";

import emitProgram, { emitProgramLinearly } from "./emit";
import {
  decomposeExpressions,
  extractConditions,
  limitSetOp,
  powerToForRange,
  printTextLiteral,
  mapOpsToConditionals,
} from "./plugins";

/*
# Compilation to Hexagony comprises of 3 steps:

1. Transforming the input AST to an equivalent AST using only low level constructs. The only allowed variable types are ints and only allowed nodes are

- `Block`
- `UnaryOp` - one of `0123456789()~,;?!` applied to an `Identifier`
- `Assignment` of an `IntegerLiteral` (with a value that can directly be emitted) to an `Identifier`
- `Assignment` of an `Identifier` to a different `Identifier`
- `Assignment` of a `BinaryOp` to an `Identifier` where the `BinaryOp`'s op is one of `+-*:%` and both args are `Identifiers`
- `WhileStatement` where condition is of the form `($id > 0)` and body is allowed node
- `IfStatement` where condition is of the form `($id > 0)` and both branches are allowed nodes

Note that a>b is equivalent to (a-b)>0 and a!=b is equivalent to a-b!=0 and c!=0 is equivalent to c\*c>0.

This is done using plugins.

2. Mapping variables to registers. This is done by a DFS bruteforce. Multiple variables can map to the same registers, if their usage of the register would not overlap.
   Sometimes, it's not possible to map a variable to a single register in which case a copy isntruction will need to be inserted.
   This is done using a plugin and after it is done, the only allowed nodes are `FunctionCall` where the function is a string of Hexagony operators and there are no arguments or the function is one of "While", "WhileNot" or "If" and arguments are FunctionCalls.

3. Emitting the hexagony. There are multiple template factories, one or more is selected based on the length and structure of the HexagonyBlock program.

*/

const hexagonyLanguage: Language = {
  name: "Hexagony",
  extension: "hexagony",
  emitter: emitProgram,
  noEmitter: emitProgramLinearly,
  detokenizer: defaultDetokenizer(undefined, 2),

  phases: [
    search(limitSetOp(128)),
    required(
      mapOpsToConditionals,
      extractConditions,
      decomposeExpressions,
      powerToForRange,
      mapToPrefixAndInfix({
        add: "+",
        sub: "-",
        neg: "~",
        mul: "*",
        div: ":",
        mod: "%",
      }),
      printLnToPrint,
      printTextLiteral,
      limitSetOp(99999),
      mapToPrefixAndInfix({ "putc[byte]": ";", "print[Int]": "!" }),
    ),
  ],
};

export default hexagonyLanguage;
