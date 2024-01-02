import { programToSpine } from "../common/Spine";
import {
  type Node,
  block,
  functionCall,
  isBuiltinIdent,
  isOfKind,
} from "../IR";
import { readsFromInput } from "../common/symbols";
import { PolygolfError } from "../common/errors";
import { compileVariant } from "../common/compile";
import javascriptLanguage from "../languages/javascript";
import { required } from "../common/Language";
import { addVarDeclarations } from "../plugins/block";

const javascriptForInterpreting = {
  ...javascriptLanguage,
  phases: [
    ...javascriptLanguage.phases,
    required(addVarDeclarations, {
      name: "instrument",
      visit(node, spine) {
        const parent = spine.parent?.node;
        if (
          parent !== undefined &&
          spine.pathFragment === "body" &&
          isOfKind("While", "ForEach", "ForCLike")(parent) &&
          (node.kind !== "Block" ||
            node.children[0].kind !== "FunctionCall" ||
            !isBuiltinIdent("instrument")(node.children[0].func))
        ) {
          return block([functionCall("instrument"), node]);
        }
      },
    }),
  ],
};

const outputCache = new Map<Node, unknown>();

export function getOutput(program: Node) {
  if (!outputCache.has(program)) {
    try {
      outputCache.set(program, _getOutput(program));
    } catch (e) {
      outputCache.set(program, e);
    }
  }
  const res = outputCache.get(program);
  if (typeof res === "string") return res;
  throw res;
}

function _getOutput(program: Node): string {
  const spine = programToSpine(program);
  if (spine.someNode(readsFromInput))
    throw new PolygolfError("Program reads from input.");
  const jsCode = compileVariant(
    program,
    { level: "nogolf" },
    javascriptForInterpreting,
  );
  if (typeof jsCode.result !== "string") {
    throw jsCode.result;
  }
  let output = "";
  function print(x: string) {
    output += x + "\n";
  }
  function write(x: string) {
    output += x;
  }
  const start = Date.now();
  function instrument() {
    if (Date.now() - start > 500)
      throw new PolygolfError("Program took too long to interpret.");
  }
  /* eslint-disable */
  new Function("print", "write", "instrument", jsCode.result)(
    print,
    write,
    instrument,
  );
  /* eslint-enable */
  return output;
}
