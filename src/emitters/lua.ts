import * as IR from "../types/IR";

export default function lua(program: IR.Program): string {
  // mixins would go here to pre-process the IR
  return emitBlock(program.block);
}

function emitBlock(block: IR.Block): string {
  return block.children.map((stmt) => emitStatement(stmt, block)).join("\n");
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string {
  switch (stmt.type) {
    case "WhileLoop":
      return (
        `while ${emitExpr(stmt.condition, stmt)} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    case "IfStatement":
      return (
        `if ${emitExpr(stmt.condition, stmt)}then\n` +
        emitBlock(stmt.consequent) +
        "\nelse\n" +
        emitBlock(stmt.alternate) +
        "\nend"
      );
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(expr: IR.Expr, parent: IR.Node): string {
  const inner = emitExprNoParens(expr, parent);
  return needsParens(expr, parent) ? "(" + inner + ")" : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 *
 * TODO: Go through a Lua AST so this happens after stuff like method calls
 * are created from applications. For now this is loose and still slightly
 * over-parenthesizes.
 */
function needsParens(expr: IR.Expr, parent: IR.Node): boolean {
  if (parent.type !== "Application") return false;
  if (expr.type !== "Application") return false;
  return true;
}

function emitExprNoParens(expr: IR.Expr, parent: IR.Node): string {
  switch (expr.type) {
    case "Assignment":
      return `${emitExpr(expr.variable, expr)}=${emitExpr(expr.expr, expr)}`;
    case "Application":
      return emitApplication(expr, parent);
    case "Identifier":
      return expr.name;
    case "StringLiteral":
      // TODO: special string handling
      return JSON.stringify(expr.value);
    case "IntegerLiteral":
      // TODO: avoid exponential notation
      return expr.value.toString();
  }
}

function emitApplication(expr: IR.Application, parent: IR.Node): string {
  const func = applicationMap.get(expr.name);
  if (func === undefined) throw `Undefined function ${expr.name}`;
  const args = expr.args.map((arg) => emitExpr(arg, expr));
  return func(args);
}

const applicationMap = new Map(
  Object.entries({
    print: call("io.write"),
    println: call("print"),
    str_length: method("len"),
    int_to_str: call("tostring"),
    str_to_int: prefix("~~"),
    sort: call("sort"),
    bitnot: prefix("~"),
    neg: prefix("-"),
    add: infix("+"),
    sub: infix("-"),
    mul: infix("*"),
    div: infix("//"),
    exp: infix("^"),
    mod: infix("%"),
    bitand: infix("&"),
    bitor: infix("|"),
    bitxor: infix("~"),
    lt: infix("<"),
    leq: infix("<="),
    eq: infix("=="),
    geq: infix(">="),
    gt: infix(">"),
    array_get: (args: string[]) => `(${args[0]})[(${args[1]})+1]`,
    str_get_byte: method("byte"),
    str_concat: infix(".."),
  })
) as Map<IR.Builtin, (args: string[]) => string>;

function infix(s: string) {
  return (args: string[]) => args[0] + s + args[1];
}

function call(s: string) {
  return (args: string[]) => s + "(" + args.join(",") + ")";
}

function method(s: string) {
  return (args: string[]) =>
    args[0] + ":" + s + "(" + args.slice(1).join(",") + ")";
}

function prefix(s: string) {
  return (args: string[]) => s + args[0];
}
