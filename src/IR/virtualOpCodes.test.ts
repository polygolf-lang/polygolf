import { VirtualOpCodes } from "./opcodes";
import { getInstantiatedOpCodeArgTypes } from "../common/getType";
import { argsOf, op } from "./exprs";
import { id } from "./terminals";
import { annotate } from "./types";

describe("Virtual opcodes consistency", () => {
  for (const virtualOpCode of VirtualOpCodes) {
    test(virtualOpCode, () => {
      const args = getInstantiatedOpCodeArgTypes(virtualOpCode).map((t) =>
        annotate(id("x"), t),
      );
      const node = op.unsafe(virtualOpCode)(...args);
      const deconstructedArgs = argsOf(virtualOpCode)(node);
      expect(deconstructedArgs).toBeDefined();
      expect(args.length).toEqual(deconstructedArgs?.length);
      args.forEach((arg, i) => {
        expect(arg).toEqual(deconstructedArgs?.[i]);
      });
    });
  }
});
