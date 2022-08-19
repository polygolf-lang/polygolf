import { IR } from "../../IR";

import emitProgram from "./emit";
import transformBuiltins from "./transformBuiltins";

export default function lua(program: IR.Program): string {
  // mixins would go here to pre-process the IR
  return emitProgram(transformBuiltins(program));
}
