import { groupby } from "../common/arrays";
import {
  expectedTypesToString,
  getGenericOpCodeArgTypes,
  getOpCodeTypeFromTypes,
} from "../common/getType";
import {
  type OpCode,
  OpCodesUser,
  opCodeDefinitions,
  toString,
  userName,
} from "../IR";
import fs from "fs";
import path from "path";

let result = `# OpCodes

| Alias | Full name | Input | Output |
|-------|-----------|-------|--------|
`;

function getOpCodeOutputType(opCode: OpCode) {
  try {
    return toString(
      getOpCodeTypeFromTypes(opCode, getGenericOpCodeArgTypes(opCode)),
    );
  } catch {
    return "?";
  }
}

for (const [alias, opCodes] of groupby(OpCodesUser, userName).entries()) {
  result += `| ${alias.replace("|", "\\|")} | ${opCodes.join(
    "<br>",
  )} | ${opCodes
    .map((x) => expectedTypesToString(opCodeDefinitions[x].args))
    .join("<br>")} | ${opCodes.map(getOpCodeOutputType).join("<br>")} |\n`;
}

fs.writeFileSync(
  path.join(process.cwd(), "docs", "opcodes.generated.md"),
  result,
);
