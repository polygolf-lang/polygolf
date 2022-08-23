import { Path } from "../../common/traverse";
import { IR, binaryOp, functionCall, int, methodCall, unaryOp } from "../../IR";

/**
 * Replace all of the applications in `program` with the correct nodes:
 * FunctionCall, MethodCall, BinaryOp, UnaryOp
 *
 * Postcondition: all Application nodes have been removed
 */
export default {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Application") {
      const func = applicationMap.get(node.name);
      if (func === undefined)
        throw new Error(`Undefined function ${node.name}`);
      path.replaceWith(func(node.args));
    }
  },
};

const applicationMap = new Map(
  Object.entries({
    print: call("io.write"),
    println: call("print"),
    str_length: method("len"),
    int_to_str: call("tostring"),
    // TODO: use str_to_int node
    str_to_int: (args: IR.Expr[]) =>
      unaryOp("bitnot", unaryOp("bitnot", args[0])),
    str_get_byte: (args: IR.Expr[]) =>
      methodCall(args[0], "byte", [binaryOp("add", args[1], int(1n))]),
  })
) as Map<IR.Builtin, (args: IR.Expr[]) => IR.Expr>;

function call(s: string) {
  return (args: IR.Expr[]) => functionCall(s, args);
}

function method(s: string) {
  return (args: IR.Expr[]) => methodCall(args[0], s, args.slice(1));
}
