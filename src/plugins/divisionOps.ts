import { getType } from "../common/getType";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { Path, Visitor } from "../common/traverse";
import { leq, polygolfOp } from "../IR";

export const modToRem: GolfPlugin = {
  tag: "golf",
  name: "modToRem",
  *visit(spine: Spine) {
    const node = spine.node;
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      // temporary "as any" to delay making the whole code base immutable
      const rightType = getType(node.args[1] as any, program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        // temporary "as any" to delay making the whole code base immutable
        yield polygolfOp("rem", ...(node.args as any));
      } else {
        yield polygolfOp(
          "rem",
          // temporary "as any" to delay making the whole code base immutable
          polygolfOp(
            "add",
            polygolfOp("rem", ...(node.args as any)),
            node.args[1] as any
          ),
          node.args[1] as any
        );
      }
    }
  },
};

export const divToTruncdiv: Visitor = {
  tag: "mutatingVisitor",
  name: "divToTruncdiv",
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "trunc_div";
      } else {
        throw new Error("Not implemented.");
      }
    }
  },
};
