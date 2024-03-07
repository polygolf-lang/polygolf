import { builtin, listType, op, succ, textType } from "../../IR";
import { mapOps } from "../../plugins/ops";
import type { Language } from "../../common/Language";
import pythonLanguage from "../python";
import { CoconutEmitter } from "./emit";

const coconutLanguage: Language = {
  name: "Coconut",
  extension: "coco",
  emitter: new CoconutEmitter(),
  phases: pythonLanguage.phases.map((phase) => ({
    mode: phase.mode,
    plugins: phase.plugins.map((plugin) =>
      plugin.name === "useSysArgv"
        ? {
            ...mapOps({
              argv: () => builtin("os.sys.argv[1:]"),

              "at[argv]": (a) =>
                op["at[List]"](
                  { ...builtin("os.sys.argv"), type: listType(textType()) },
                  succ(a),
                ),
            }),
            name: "useSysArgv",
          }
        : plugin,
    ),
  })),
};

export default coconutLanguage;
