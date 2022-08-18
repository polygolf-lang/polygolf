import * as IR from "../types/IR";

export default function lua(program: IR.Program): string {
  // mixins would go here to pre-process the IR
  return emitBlock(program);
}

function emitBlock(block: IR.Block): string {
  return block.children.map(emitStatement).join("\n");
}

function emitStatement(stmt: IR.Statement): string {
  switch (stmt.type) {
    case "WhileLoop":
      return (
        `while ${emitExpr(stmt.condition)} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    case "IfStatement":
      return (
        `if ${emitExpr(stmt.condition)}then\n` +
        emitBlock(stmt.consequent) +
        "\nelse\n" +
        emitBlock(stmt.alternate) +
        "\nend"
      );
    default:
      return emitExpr(stmt);
  }
}

function emitExpr(expr: IR.Expr): string {
  switch (expr.type) {
    case "Assignment":
      return `${emitExpr(expr.variable)}=${emitExpr(expr.expr)}`;
    case "Application":
      return emitApplication(expr);
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

function emitApplication(expr: IR.Application): string {
  const func = applicationMap.get(expr.name);
  if (func === undefined) throw `Undefined function ${expr.name}`;
  return func(expr.args);
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
    array_get: arrayGet,
    str_get_byte: method("byte"),
    str_concat: infix(".."),
  })
) as Map<IR.Builtin, (args: IR.Expr[]) => string>;

// TODO for many of these: remove unnecessary parentheses
// need to consider path
function infix(s: string) {
  return (args: IR.Expr[]) =>
    "(" + emitExpr(args[0]) + s + emitExpr(args[1]) + ")";
}

function call(s: string) {
  return (args: IR.Expr[]) => s + "(" + args.map(emitExpr).join(",") + ")";
}

function method(s: string) {
  return (args: IR.Expr[]) =>
    `(${emitExpr(args[0])}):` +
    s +
    `(${args.slice(1).map(emitExpr).join(",")})`;
}

function prefix(s: string) {
  return (args: IR.Expr[]) => s + "(" + emitExpr(args[0]) + ")";
}

function arrayGet(args: IR.Expr[]) {
  return `(${emitExpr(args[0])})[(${emitExpr(args[1])})+1]`;
}
