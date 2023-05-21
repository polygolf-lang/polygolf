import { Language } from "../../common/Language";

import emitProgram from "./emit";

/*
# Compilation to Hexagony comprises of 4 steps:

1. Transforming the input AST to an equivalent AST using only low level constructs. The only allowed variable types are ints and only allowed nodes are

- `Block`
- `FunctionCall` - one of `0123456789()~,;?!` applied to an `Identifier`
- `Assignment` of an `IntegerLiteral` (with a value that can directly be emitted) to an `Identifier`
- `Assignment` of an `Identifier` to a different `Identifier`
- `Assignment` of a `BinaryOp` to an `Identifier` where the `BinaryOp`'s op is one of `+-*:%` and both args are `Identifiers`
- `WhileStatement` where condition is of the form `($id > 0)` and body is allowed node
- `IfStatement` where condition is of the form `($id > 0)` and both branches are allowed nodes

Note that a>b is equivalent to (a-b)>0 and a!=b is equivalent to a-b!=0 and c!=0 is equivalent to c\*c>0.

The plugin functionality is used for this step. The rest is very much custom for Hexagony.

2. Mapping variables to registers. This is done by a DFS bruteforce. Multiple variables can map to the same registers, if their usage of the register would not overlap.
   Sometimes, it's not possible to map a variable to a single register in which case a copy isntruction will need to be inserted.

3. Laying out the HexagonyBlocks in the hexagon. There are multiple template factories, one or more is selected based on the length and structure of the HexagonyBlock program.

*/

const hexagonyLanguage: Language = {
  name: "Hexagony",
  extension: "hexagony",
  emitter: emitProgram,
  golfPlugins: [],
  emitPlugins: [],
  finalEmitPlugins: [],
};

export default hexagonyLanguage;
