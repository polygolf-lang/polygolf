import { emitStringLiteral, joinGroups } from "../../common/emit";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Expr, parent: IR.Node): string[] {
  const children = block.kind === "Block" ? block.children : [block];
  if (parent.kind === "Program" || parent.kind === "ForRange") {
    return joinGroups(children.map((stmt) => emitStatement(stmt, block)));
  }

  return [
    "{",
    ...joinGroups(children.map((stmt) => emitStatement(stmt, block))),
    "}",
  ];
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): string[] {
  switch (stmt.kind) {
    case "Block":
      return emitBlock(stmt, parent);
    case "ImportStatement":
      return [stmt.name, ...joinGroups(stmt.modules.map((x) => [x]))];
    case "WhileLoop":
      return [
        ...emitBlock(stmt.condition, stmt),
        ...emitBlock(stmt.body, stmt),
        "while",
      ];
    case "ForRange": {
      const low = emitExpr(stmt.low);
      const low0 = low.length === 1 && low[0] === "0";
      const high = emitExpr(stmt.high);
      const increment = emitExpr(stmt.increment);
      const increment1 = increment.length === 1 && increment[0] === "1";
      return [
        ...high,
        ",",
        ...(low0 ? [] : [...low, ">"]),
        ...(increment1 ? [] : [...increment, "%"]),
        "{",
        ":",
        ...emitExpr(stmt.variable),
        ";",
        ...emitBlock(stmt.body, stmt),
        "}",
        "%",
      ];
    }
    case "IfStatement":
      return [
        ...emitExpr(stmt.condition),
        ...emitBlock(stmt.consequent, stmt),
        ...(stmt.alternate !== undefined
          ? [...emitBlock(stmt.alternate, stmt)]
          : ["{}"]),
        "if",
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(
        `Unexpected node (${stmt.kind}) while emitting GolfScript`
      );
    default:
      return emitExpr(stmt);
  }
}

function emitExpr(expr: IR.Expr): string[] {
  switch (expr.kind) {
    case "Assignment":
      return [...emitExpr(expr.expr), ":", ...emitExpr(expr.variable), ";"];
    case "Identifier":
      return [expr.name];
    case "StringLiteral":
      return emitStringLiteral(expr.value, [
        [
          `"`,
          [
            [`\\`, `\\\\`],
            [`"`, `\\"`],
          ],
        ],
        [
          `"`,
          [
            [`\\`, `\\\\`],
            [`'`, `\\'`],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        ...joinGroups(expr.args.map((arg) => emitExpr(arg))),
        expr.ident.name,
      ];
    case "BinaryOp":
      return [...emitExpr(expr.left), ...emitExpr(expr.right), expr.name];
    case "UnaryOp":
      return [...emitExpr(expr.arg), expr.name];
    case "ListConstructor":
      return ["[", ...joinGroups(expr.exprs.map((x) => emitExpr(x))), "]"];
    case "ConditionalOp":
      return [
        ...emitExpr(expr.condition),
        ...emitExpr(expr.consequent),
        ...emitExpr(expr.alternate),
        "if",
      ];
    case "IndexCall":
      if (expr.oneIndexed)
        throw new Error("GolfScript only supports zeroIndexed access.");
      return [...emitExpr(expr.collection), ...emitExpr(expr.index), "="];
    case "RangeIndexCall": {
      const step = emitExpr(expr.step);
      const step1 = step.length === 1 && step[0] === "1";
      if (expr.oneIndexed)
        throw new Error("GolfScript only supports zeroIndexed access.");

      return [
        ...emitExpr(expr.collection),
        ...emitExpr(expr.high),
        "<",
        ...emitExpr(expr.low),
        ">",
        ...(step1 ? [] : [...step, "%"]),
      ];
    }
    default:
      throw new Error(
        `Unexpected node while emitting GolfScript: ${expr.kind}: ${
          "op" in expr ? expr.op ?? "" : ""
        }. `
      );
  }
}
