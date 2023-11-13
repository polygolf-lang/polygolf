import { type TokenTree } from "../../common/Language";
import { joinTrees } from "../../common/emit";
import {
  block,
  type Node,
  id,
  type IR,
  isIntLiteral,
  text,
  toString,
  variants,
  type Variants,
} from "../../IR";

/*
How Polygolf nodes should be emitted to strings.

Boolean flags should be reflected in the callee name.
All paramaters that are not `Node`s should be listed first.
- strings as Texts
- numbers/bigints as Integers
- arrays as blocks
Then, all Node children should follow in order that is typical in languages.
If the last child is an array of Nodes argument, it should be emitted as individual arguments,
instead of as a block.
*/

export default function emitProgram(program: IR.Node): TokenTree {
  return emitNode(program, true);
}

function emitVariants(expr: Variants, indent = false): TokenTree {
  if (indent || expr.variants.some((x) => x.kind === "Block")) {
    return [
      "{",
      "$INDENT$",
      "\n",
      joinTrees(
        ["$DEDENT$", "\n", "/", "$INDENT$", "\n"],
        expr.variants.map((x) => emitNode(x, true)),
      ),
      "$DEDENT$",
      "\n",
      "}",
    ];
  }
  return [
    "{",
    joinTrees(
      "/",
      expr.variants.map((x) => emitNode(x, true)),
    ),
    "}",
  ];
}

export function emitArrayOfNodes(exprs: readonly Node[]) {
  return [
    "{",
    joinTrees(
      [],
      exprs.map((x) => emitNode(x, true)),
    ),
    "}",
  ];
}

export function emitNode(
  expr: Node,
  asStatement = false,
  indent = false,
): TokenTree {
  let res = emitNodeWithoutAnnotation(expr, asStatement, indent);
  if (asStatement) {
    if (expr.kind !== "Block") res = [res, ";"];
  } else {
    if (expr.type !== undefined) {
      res = [res, ":", toString(expr.type)];
    }
    if (expr.targetType !== undefined) {
      res = [res, ":", JSON.stringify(expr.targetType)];
    }
  }
  return res;
}

function emitNodeWithoutAnnotation(
  expr: Node,
  asStatement = false,
  indent = false,
): TokenTree {
  function emitSexpr(op: string, ...args: (TokenTree | Node)[]): TokenTree {
    const isNullary = [
      "argv",
      "argc",
      "true",
      "false",
      "read[codepoint]",
      "read[byte]",
      "read[Int]",
      "read[line]",
    ].includes(op);
    if (op === "@") op = expr.kind;
    op = op
      .split(/\.?(?=[A-Z])/)
      .join("_")
      .toLowerCase();
    const result: TokenTree = [];
    if (!asStatement && !isNullary) result.push("(");
    if (indent) result.push("$INDENT$", "\n");
    if (opAliases[op] !== undefined && args.length === 2) {
      let a = args[0];
      result.push(typeof a === "string" || !("kind" in a) ? a : emitNode(a));
      result.push(opAliases[op]);
      a = args[1];
      result.push(typeof a === "string" || !("kind" in a) ? a : emitNode(a));
    } else {
      op = opAliases[op] ?? op;
      result.push(op);
      result.push(
        joinTrees(
          [],
          args.map((x) =>
            typeof x === "string" || !("kind" in x) ? [x] : emitNode(x),
          ),
        ),
      );
    }
    if (!asStatement) {
      if (indent) result.push("$DEDENT$", "\n");
      if (!isNullary) result.push(")");
    }
    return result;
  }
  switch (expr.kind) {
    case "Block":
      return joinTrees(
        "\n",
        expr.children.map((x) => emitNode(x, true)),
      );
    case "Variants":
      return emitVariants(expr, indent);
    case "KeyValue":
      return emitSexpr("key_value", expr.key, expr.value);
    case "Function":
      return emitSexpr("func", ...expr.args, expr.expr);
    case "Op":
      return emitSexpr(expr.op, ...expr.args);
    case "Assignment":
      return emitSexpr("assign", expr.variable, expr.expr);
    case "FunctionCall": {
      const id = emitNode(expr.func);
      if (typeof id === "string" && id.startsWith("$")) {
        return emitSexpr(id, ...expr.args);
      }
      return emitSexpr("@", id, ...expr.args);
    }
    case "Identifier":
      if (expr.builtin) {
        return emitSexpr("Builtin", text(expr.name));
      } else if (/^\w+$/.test(expr.name)) {
        return "$" + expr.name;
      }
      return emitSexpr("id", text(expr.name));
    case "Text":
      return JSON.stringify(expr.value);
    case "Integer":
      return expr.value.toString();
    case "Array":
      return emitSexpr("array", ...expr.exprs);
    case "List":
      return emitSexpr("list", ...expr.exprs);
    case "Set":
      return emitSexpr("set", ...expr.exprs);
    case "Table":
      return emitSexpr("table", ...expr.kvPairs);
    case "ConditionalOp":
      return emitSexpr(
        expr.isSafe ? "conditional" : "unsafe_conditional",
        expr.condition,
        expr.consequent,
        expr.alternate,
      );
    case "While":
      return emitSexpr(
        "while",
        expr.condition,
        emitNode(expr.body, false, true),
      );
    case "ForRange": {
      if (expr.inclusive) {
        return emitSexpr(
          "for_range_inclusive",
          expr.variable ?? id("_"),
          expr.start,
          expr.end,
          expr.increment,
          emitNode(expr.body, false, true),
        );
      }
      let args: Node[] = [];
      if (!isIntLiteral(1n)(expr.increment)) args = [expr.increment, ...args];
      args = [expr.end, ...args];
      if (!isIntLiteral(0n)(expr.start) || args.length > 1)
        args = [expr.start, ...args];
      if (expr.variable !== undefined || args.length > 1)
        args = [expr.variable ?? id("_"), ...args];
      return emitSexpr("for", ...args, emitNode(expr.body, false, true));
    }
    case "ForArgv":
      return emitSexpr(
        "for_argv",
        expr.variable,
        expr.argcUpperBound.toString(),
        emitNode(expr.body, false, true),
      );
    case "If":
      return emitSexpr(
        "if",
        expr.condition,
        emitNode(expr.consequent, false, true),
        ...(expr.alternate === undefined
          ? []
          : emitNode(expr.alternate, false, true)),
      );

    case "ImplicitConversion":
      return emitSexpr("@", text(expr.behavesLike), expr.expr);
    case "VarDeclaration":
      return emitSexpr("@", { ...expr.variable, type: expr.variableType });
    case "VarDeclarationWithAssignment":
      return emitSexpr("@", expr.assignment);
    case "VarDeclarationBlock":
      return emitSexpr("@", ...expr.children.map((x) => emitNode(x)));
    case "ManyToManyAssignment":
      return emitSexpr(
        "@",
        emitArrayOfNodes(expr.variables),
        emitArrayOfNodes(expr.exprs),
      );
    case "OneToManyAssignment":
      return emitSexpr("@", variants([block(expr.variables)]), expr.expr);
    case "MutatingInfix":
      return emitSexpr("@", text(expr.name), expr.variable, expr.right);
    case "IndexCall":
      return emitSexpr(
        expr.oneIndexed ? "IndexCallOneIndexed" : "@",
        expr.collection,
        expr.index,
      );
    case "RangeIndexCall":
      return emitSexpr(
        expr.oneIndexed ? "RangeIndexCallOneIndexed" : "@",
        expr.collection,
        expr.low,
        expr.high,
        expr.step,
      );
    case "MethodCall":
      return emitSexpr("@", expr.object, text(expr.ident.name), ...expr.args);
    case "PropertyCall":
      return emitSexpr("@", expr.object, text(expr.ident.name));
    case "Infix":
      return emitSexpr("@", text(expr.name), expr.left, expr.right);
    case "Prefix":
    case "Postfix":
      return emitSexpr("@", text(expr.name), expr.arg);
    case "Import":
      return emitSexpr(
        "@",
        ...[expr.name, ...expr.modules].map((x) => JSON.stringify(x)),
      );
    case "ForDifferenceRange":
      return emitSexpr(
        "@",
        expr.variable,
        expr.start,
        expr.difference,
        expr.increment,
        emitNode(expr.body, false, true),
      );
    case "ForEach":
      return emitSexpr(
        "@",
        expr.variable,
        expr.collection,
        emitNode(expr.body, false, true),
      );
    case "ForEachKey":
      return emitSexpr(
        "@",
        expr.variable,
        expr.table,
        emitNode(expr.body, false, true),
      );
    case "ForEachPair":
      return emitSexpr(
        "@",
        expr.keyVariable,
        expr.valueVariable,
        expr.table,
        emitNode(expr.body, false, true),
      );
    case "ForCLike":
      return emitSexpr(
        "@",
        expr.init,
        expr.condition,
        expr.append,
        emitNode(expr.body, false, true),
      );
    case "NamedArg":
      return emitSexpr("@", text(expr.name), expr.value);
    case "AnyInteger":
      return emitSexpr("@", expr.low.toString(), expr.high.toString());
  }
}

const opAliases: Record<string, string> = {
  add: "+",
  neg: "-",
  sub: "-",
  mul: "*",
  pow: "^",
  bit_and: "&",
  bit_or: "|",
  bit_xor: "~",
  bit_not: "~",
  bit_shift_left: "<<",
  bit_shift_right: ">>",
  eq: "==",
  neq: "!=",
  leq: "<=",
  lt: "<",
  geq: ">=",
  gt: ">",
  length: "#",
  concat: "..",
  assign: "<-",
  key_value: "=>",
  mod: "mod",
  div: "div",
  at: "@",
  contains: "in",
};
