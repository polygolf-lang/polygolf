import { PolygolfError } from "@/common/errors";
import { TokenTree } from "@/common/Language";
import { Expr, Program } from "../../IR";
import { Pointer, ProgramEdgeData, resolveEdges } from "./memory";
import { isIdentifier } from "@babel/types";
import { EmitError } from "@/common/emit";

export default function emitProgram(program: Program): TokenTree {
  const edgeData = resolveEdges(program);
  const pointer = new Pointer({ x: 0, y: 0, i: 0 }, true);
  return emitExpr(program.body, edgeData, pointer);
}

function emitExpr(
  expr: Expr,
  edgeData: ProgramEdgeData,
  pointer: Pointer
): TokenTree {
  const edges = edgeData.get(expr);
  if (edges === undefined)
    throw new PolygolfError(`Cannot emit expr.`, expr.source);
  switch (expr.kind) {
    case "FunctionCall":
      if (isIdentifier(expr.func))
        return [pointer.goTo(edges.appliedTo), expr.func.name];
      throw new EmitError(expr);
    case "Assignment":
      switch (expr.expr.kind) {
        case "IntegerLiteral":
          return [
            pointer.goTo(edges.appliedTo),
            String.fromCodePoint(Number(expr.expr.value)),
          ];
        case "Identifier":
          return [pointer.goAlongAndCopy(edges.postCopyPath ?? [])];
        case "BinaryOp":
          if (
            expr.expr.left.kind === "Identifier" &&
            expr.expr.right.kind === "Identifier"
          ) {
            return [
              (edges.preCopyPaths ?? []).map((x) => pointer.goAlongAndCopy(x)),
              pointer.goTo(edges.appliedTo, edges.isCw),
              expr.expr.name,
              pointer.goAlongAndCopy(edges.postCopyPath ?? []),
            ];
          }
      }
  }
  throw new PolygolfError(`Cannot emit node ${expr.kind}.`, expr.source);
}
