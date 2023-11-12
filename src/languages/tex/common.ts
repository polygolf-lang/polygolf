import { type IR, integerType, isOfKind, textType } from "../../IR";
import { EmitError } from "../../common/emit";

export type Immediate = IR.Identifier | IR.Integer;

// true = isAscii
export const texStringType = textType(integerType(0, "oo"), true);

export function assertIdentifier(
  n: IR.Node,
  detail: string,
): asserts n is IR.Identifier {
  if (n.kind !== "Identifier") throw new EmitError(n, detail);
}

const isImmediate = isOfKind("Identifier", "Integer");
export function assertImmediate(
  n: IR.Node,
  detail: string,
): asserts n is Immediate {
  if (!isImmediate(n)) throw new EmitError(n, detail);
}
