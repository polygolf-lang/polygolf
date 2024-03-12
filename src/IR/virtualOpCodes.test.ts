import { getInstantiatedOpCodeArgTypes } from "../common/getType";
import { argsOf, op } from "./exprs";
import { getVirtualOpCodes } from "./opcodes";
import { uniqueId } from "./terminals";
import { annotate } from "./types";

describe("Virtual opcodes consistency", () => {
  for (const virtualOpCode of getVirtualOpCodes()) {
    test(virtualOpCode, () => {
      const args = getInstantiatedOpCodeArgTypes(virtualOpCode).map((t) =>
        annotate(uniqueId("getTypeTest"), t),
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
