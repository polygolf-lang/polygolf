import { groupby } from "../common/arrays";
import {
  expectedTypesAsStrings,
  getGenericOpCodeArgTypes,
  getOpCodeTypeFromTypes,
} from "../common/getType";
import {
  type OpCode,
  OpCodesUser,
  toString,
  userName,
  opCodeDescriptions,
  defaults,
} from "../IR";
import fs from "fs";
import path from "path";
import { debugEmit } from "../common/compile";

let result = `# OpCodes
Hover opcode name to see a description.

| Alias | Full name | Input | Output |
|-------|-----------|-------|--------|
`;

function getOpCodeOutputType(opCode: OpCode) {
  try {
    return toString(
      getOpCodeTypeFromTypes(opCode, getGenericOpCodeArgTypes(opCode), true),
    );
  } catch {
    return "?";
  }
}

for (const [alias, opCodes] of groupby(OpCodesUser, userName).entries()) {
  result += `| ${alias.replace("|", "\\|")} | ${opCodes
    .map((x) => `[${x}](## ${JSON.stringify(opCodeDescriptions[x])})`)
    .join("<br>")} | ${opCodes
    .map(
      (x) =>
        "[" +
        expectedTypesAsStrings(x)
          .map(
            (a, i) =>
              a +
              ((defaults[x] ?? [])[i] !== undefined
                ? ` = ${debugEmit(defaults[x]![i]!)}`
                : ""),
          )
          .join(", ") +
        "]",
    )
    .join("<br>")} | ${opCodes.map(getOpCodeOutputType).join("<br>")} |\n`;
}

fs.writeFileSync(
  path.join(process.cwd(), "docs", "opcodes.generated.md"),
  result,
);
