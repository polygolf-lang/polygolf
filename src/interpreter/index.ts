import { programToSpine } from "../common/Spine";
import { Node, block, functionCall, isBuiltinIdent, isOfKind } from "../IR";
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
      name: "instrumentInNogolf",
      visit(node, spine, context) {
        if (context.options.level === "nogolf") {
          const parent = spine.parent?.node;
          if (
            parent !== undefined &&
            spine.pathFragment === "body" &&
            isOfKind("While", "ForEach", "ForEachKey", "ForCLike")(parent) &&
            (node.kind !== "Block" ||
              node.children[0].kind !== "FunctionCall" ||
              !isBuiltinIdent("instrument")(node.children[0].func))
          ) {
            return block([functionCall("instrument"), node]);
          }
        }
      },
    }),
  ],
};

export function getOutput(program: Node): string {
  const spine = programToSpine(program);
  if (spine.someNode(readsFromInput))
    throw new PolygolfError("Program reads from input.");
  const jsCode = compileVariant(
    program,
    {
      codepointRange: [1, Infinity],
      getAllVariants: false,
      level: "nogolf",
      objective: "chars",
      restrictFrontend: false,
      skipTypecheck: false,
    },
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
  eval(jsCode.result);
  return output;
}
