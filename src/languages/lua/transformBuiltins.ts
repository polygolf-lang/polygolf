import {
  IR,
  arrayGet,
  binaryOp,
  functionCall,
  int,
  methodCall,
  unaryOp,
  Path,
  programToPath,
} from "../../IR";

/**
 * Replace all of the applications in `program` with the correct nodes:
 * FunctionCall, MethodCall, BinaryOp, UnaryOp
 *
 * Postcondition: all Application nodes have been removed
 */
export default function transformBuiltins(program: IR.Program): IR.Program {
  const path = programToPath(program);
  path.visit({
    enter(path: Path) {
      const node = path.node;
      if (node.type === "Application") {
        const func = applicationMap.get(node.name);
        if (func === undefined) throw `Undefined function ${node.name}`;
        path.replaceWith(func(node.args));
        return;
      }
    },
  });
  return program;
}

const applicationMap = new Map(
  Object.entries({
    print: call("io.write"),
    println: call("print"),
    str_length: method("len"),
    int_to_str: call("tostring"),
    str_to_int: prefix("~~"),
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
    // TODO: create a mixin to put a +1 in every array_get before language-specific transforms
    array_get: (args: IR.Expr[]) =>
      arrayGet(args[0], binaryOp("+", args[1], int(1n))),
    str_get_byte: (args: IR.Expr[]) =>
      methodCall(args[0], "byte", [binaryOp("+", args[1], int(1n))]),
    str_concat: infix(".."),
  })
) as Map<IR.Builtin, (args: IR.Expr[]) => IR.Expr>;

function call(s: string) {
  return (args: IR.Expr[]) => functionCall(s, args);
}

function method(s: string) {
  return (args: IR.Expr[]) => methodCall(args[0], s, args.slice(1));
}

function infix(s: string) {
  return (args: IR.Expr[]) => binaryOp(s, args[0], args[1]);
}

function prefix(s: string) {
  return (args: IR.Expr[]) => unaryOp(s, args[0]);
}
