import {
  emitStringLiteral,
  joinGroups,
} from "../../common/emit";
import { IR } from "../../IR";

// STUFF TO DO BEFORE UPLOADING:
// find the variable generator and use it for splitPrints
// also for freshLabel
// use 32 bit values where possible
// deal with signs correctly
// remove `section`
// eliminate spill/reload pairs in matchAllocState
// delete sus comments

// I wish JS had something like Haskell do notation
// TODO: always be in .text except during declarations
let section: ".text" | ".data" = ".text";

function setSection(newSection: ".text" | ".data"): string[] {
  if (section === newSection) {
    return [];
  }
  section = newSection;
  return [newSection + "\n"];
}

function text(code: string[]) : string[] {
  return setSection(".text").concat(code);
}

function data(code: string[]) : string[] {
  return setSection(".data").concat(code).concat(setSection(".text"));
}

type Reg =
  "%rax" | "%rcx" | "%rdx" | "%rbx" | "%rsp" | "%rbp" | "%rsi" | "%rdi" |
  "%r8" | "%r9" | "%r10" | "%r11" | "%r12" | "%r13" | "%r14" | "%r15";

// allowed output registers
type PossibleReg = "any" | "not%rax%rdx" | Reg;

const regNames = [
  "%rax",
  "%rcx",
  "%rdx",
  "%rbx",
  "%rsp",
  "%rbp",
  "%rsi",
  "%rdi"
];
for(let i = 8; i < 16; i++) {
  regNames.push(`%r${i}` as Reg);
}

// [used as temporary, [variable name, matches memory copy][]]
// TODO: index by name
// TODO: use a map for the vars stuff
let regAllocations: [boolean, [string, boolean][]][] = [
  [false, []],
  [false, []],
  [false, []],
  [false, []],
  [true, []], // %rsp
  [false, []],
  [false, []],
  [false, []],
  [false, []], // %r8
  [false, []],
  [false, []],
  [false, []],
  [true, []], // %r12, argv
  [true, []], // %r13, unallocated memory base
  [false, []],
  [false, []],
];

function regIsFree(regNum: number): boolean {
  // const regNum = regNames.indexOf(reg);
  if (regNum < 0) {
    throw new Error("Checking if nonreg is free");
  }
  const [usedForTemp, usesForVars] = regAllocations[regNum];
  return !usedForTemp && usesForVars.length === 0;
}

function getFreeReg(options: PossibleReg, prefer?: string): [string[], number] {
  const code: string[] = [];
  let reg;
  const preferNum = regNames.indexOf(prefer ?? "");
  switch (options) {
    case "any":
    case "not%rax%rdx": {
      if (
        preferNum > 0 &&
        regIsFree(preferNum) &&
        !(options === "not%rax%rdx" && [0, 2].includes(preferNum))
      ) {
        reg = preferNum
        break;
      }
      // %rax, %rdx, %rdi, %rsi
      const avoidRegs = [0, 2, 6, 7];
      reg = regAllocations.findIndex(
        (_, i) => regIsFree(i) && !avoidRegs.includes(i)
      );
      if (reg < 0) {
         reg = regAllocations.findIndex((_, i) => regIsFree(i));
      }
      break;
    }
    default: {
      reg = regNames.indexOf(options);
      const [usedForTemp, usesForVars] = regAllocations[reg];
      if (usedForTemp) {
        throw new Error(options + " already used for temp");
      }
      if (usesForVars.length !== 0) {
        for (const [name, dirty] of usesForVars) {
          if (dirty) {
            code.push(`movq ${reg}, ${name}\n`);
          }
        }
        regAllocations[reg][1] = [];
      }
    }
  }
  if (reg < 0) {
    throw new Error("Out of regs");
  }
  return [code, reg];
}

function allocateTempReg(options: PossibleReg, prefer?: string): [string[], string] {
  const [code, reg] = getFreeReg(options, prefer);
  regAllocations[reg][0] = true;
  return [code, regNames[reg]];
}

function allocateVarReg(options: PossibleReg, variable: string, prefer?: string): [string[], string] {
  const [code, reg] = getFreeReg(options, prefer);
  regAllocations[reg][1].push([variable, true]);
  return [code, regNames[reg]];
}

function freeTempReg(reg: string) {
  const regNum = regNames.indexOf(reg);
  // not a register
  if (regNum < 0) {
    return;
  }
  const usedForTemp = regAllocations[regNum][0];
  if (!usedForTemp) {
    throw new Error("freeTempReg of register without temporary");
  }
  regAllocations[regNum][0] = false;
}

function freeVarReg(reg: string, variable: string): boolean {
  const regNum = regNames.indexOf(reg);
  // not a register
  if (regNum < 0) {
    throw new Error("freeVarReg of nonreg");
  }
  const [, usesForVars] = regAllocations[regNum];
  const varIndex = usesForVars.findIndex((x) => x[0] === variable);
  if (varIndex < 0) {
    throw new Error("freeVarReg of register without variable");
  }
  const [, dirty] = usesForVars.splice(varIndex, 1)[0];
  return dirty;
  // regAllocations[regNum][0] = false;
}

// function spillVar(reg: string, variable: string): string[] {
//   const dirty = freeVarReg(reg, variable)
//   if (dirty) {
//     return [`movq ${reg}, ${variable}`];
//   } else {
//     return [];
//   }
// }

function spillRegVars(reg: string, exceptVar?: string): string[] {
  const regNum = regNames.indexOf(reg);
  const usesForVars = regAllocations[regNum][1];
  const newUsesForVars: [string, boolean][] = [];
  const code = [];
  if (usesForVars.length !== 0) {
    // throw new Error("saveRegs applied to reg with variable");
    // const [name, dirty] = regState;
    // if (dirty) {
    //   code.push(`movq ${reg}, ${name}\n`);
    // }
    // regAllocations[regNum] = false;
    for (const [name, dirty] of usesForVars) {
      if (name === exceptVar) {
        newUsesForVars.push([name, true]);
        continue;
      }
      if (dirty) {
        code.push(`movq ${reg}, ${name}\n`);
      }
    }
    regAllocations[regNum][1] = newUsesForVars;
  }
  return code;
}

function spillRegsVars(regs: string[]): string[] {
  const code = [];
  for(const i of regs){
    code.push(...spillRegVars(i));
  }
  return code;
}

// code to save regs, regs saved
// function saveRegs(regs: string[]): [string[], string[]] {
//   const [saveCode, savedRegs] = saveTempRegs(regs);
//   return [saveCode.concat(spillRegsVars(regs)), savedRegs];
// }


function saveTempRegs(regs: string[]): [string[], string[]] {
  const code = [];
  const saved = [];
  for (const reg of regs) {
    const regNum = regNames.indexOf(reg);
    const usedForTemp = regAllocations[regNum][0];
    if (usedForTemp) {
      code.push(`push ${reg}\n`);
      saved.push(reg);
      regAllocations[regNum][0] = false;
    }
  }
  return [code, saved];
}

function restoreRegs(regs: string[]): string[] {
  const code = [];
  for (let i = regs.length - 1; i >= 0; i--) {
    code.push(`pop ${regs[i]}\n`);
    const regNum = regNames.indexOf(regs[i]);
    if (regAllocations[regNum][0]) {
      throw new Error("restoreRegs onto occupied reg");
    }
    regAllocations[regNum][0] = true;
  }
  return code;
}

// Allocate a register according to `options`, and generate code
// to move `current` there if necessary. Run this function after
// `restoreRegs`, but include its code before the restore code.
function movTempAlloc(current: string, options: PossibleReg): [string[], string] {
  const [spillCode, outputReg] = allocateTempReg(options, current);
  if (current === outputReg) {
    return [spillCode, current];
  } else {
    return [[...spillCode, `mov ${current}, ${outputReg}\n`], outputReg];
  }
}

function movVarAlloc(current: string, options: PossibleReg, variable: string): [string[], string] {
  const [spillCode, outputReg] = allocateVarReg(options, variable, current);
  if (current === outputReg) {
    return [spillCode, current];
  } else {
    return [[...spillCode, `mov ${current}, ${outputReg}\n`], outputReg];
  }
}

function attachVarToReg(reg: string, variable: string, dirty: boolean) {
  const regNum = regNames.indexOf(reg);
  if (regNum < 0) {
    throw new Error("attachVarToReg of nonreg");
  }
  regAllocations[regNum][1].push([variable, dirty]);
}

function saveAllocState(): [boolean, [string, boolean][]][] {
  // TODO: manual deepcopying is annoying
  const ret: [boolean, [string, boolean][]][] = [];
  for (const i of regAllocations) {
    const vars: [string, boolean][] = [];
    for (const j of i[1]) {
      vars.push([j[0], j[1]]);
    }
    ret.push([i[0], vars]);
  }
  return ret;
}

function matchAllocState(state: [boolean, [string, boolean][]][]): string[] {
  const ret = [];
  for (let i = 0; i < state.length; i++) {
    if (state[i][0] !== regAllocations[i][0]) {
      throw new Error("Mismatched temporaries in matchAllocState");
    }
    if (state[i][1].length > 1) {
      throw new Error("Can't match a state with overlapping variables");
    }
    for (const [name, dirty] of regAllocations[i][1]) {
      if (dirty) {
        ret.push(`movq ${regNames[i]}, ${name}\n`);
      }
    }
  }
  for (let i = 0; i < state.length; i++) {
    let newRegState: [string, boolean][] = [];
    for (const [name, dirty] of state[i][1]) {
      ret.push(`movq ${name}, ${regNames[i]}\n`);
      newRegState = [[name, dirty]];
    }
    regAllocations[i][1] = newRegState;
  }
  return ret;
}

function loadAllocState(state: [boolean, [string, boolean][]][]) {
  regAllocations = state;
}

// register a variable is in, if any
function findVarReg(variable: string): string | undefined {
  for (let i = 0; i < regAllocations.length; i++) {
    const usesForVars = regAllocations[i][1];
    if (
      usesForVars.some((x) => x[0] === variable)
    ) {
      return regNames[i];
    }
  }
  return undefined;
}

// TODO: generate label names
const builtins = new Map<string, {args:Reg[], modifies:Reg[], returns?:Reg, code:string[]}>([
  ["text_length", {
    args: ["%rsi"],
    modifies: ["%rax", "%rdx", "%rdi"],
    returns: "%rdx",
    code: [
      "mov %rsi, %rdi\n",
      "xor %eax, %eax\n",
      "cltd\n",
      "sub %edi, %edx\n",
      `text_length_loop:\n`,
      "scasb\n",
      `jnz text_length_loop\n`,
      "add %edi, %edx\n",
      "dec %edx\n",
    ],
  }],
  ["print", {
    args: ["%rsi"],
    modifies: ["%rax", "%rcx", "%rdx", "%rdi", "%r11"],
    code: [
      "call text_length\n",
      "inc %eax\n",
      "mov %eax, %edi\n",
      "syscall\n",
    ],
  }],
  ["print_length", {
    args: ["%rsi", "%rdx"],
    modifies: ["%rax", "%rcx", "%rdi", "%r11"],
    code: [
      "push $1\n",
      "pop %rax\n",
      "mov %eax, %edi\n",
      "syscall\n",
    ],
  }],
  ["println", {
    args: ["%rax"],
    modifies: ["%rax", "%rcx", "%rdx", "%rsi", "%rdi", "%r11"],
    code: [
      "or $-1, %edi\n",
      "movb $10, (%rdi)\n",
      "mov %edi, %esi\n",
      `println_loop:\n`,
      "xor %edx, %edx\n",
      "divq (%rdi)\n",
      "add $'0', %dl\n",
      "dec %esi\n",
      "mov %dl, (%rsi)\n",
      "test %rax, %rax\n",
      `jnz println_loop\n`,
      "cltd\n",
      "sub %esi, %edx\n",
      "inc %eax\n",
      "mov %eax, %edi\n",
      "syscall\n",
    ],
  }],
  ["repeat", {
    args: ["%rsi", "%rbx"],
    modifies: ["%rax", "%rcx", "%rdx", "%rbx", "%rdi"],
    returns: "%rdi",
    code: [
      "call text_length\n",
      "mov %r13d, %edi\n",
      `repeat_loop:\n`,
      "mov %edx, %ecx\n",
      "rep movsb\n",
      "sub %rdx, %rsi\n",
      "dec %ebx\n",
      `jnz repeat_loop\n`,
      "scasb\n",
      "xchg %r13, %rdi\n",
    ],
  }],
  ["text_to_int", {
    args: ["%rsi"],
    modifies: ["%rsi", "%rax", "%rdx"],
    returns: "%rdx",
    code: [
      "xor %eax, %eax\n",
      "cltd\n",
      "text_to_int_loop:\n",
      "lodsb\n",
      "sub $'0', %al\n",
      "js text_to_int_done\n",
      "imul $10, %rdx, %rdx\n",
      "add %rax, %rdx\n",
      "jmp text_to_int_loop\n",
      "text_to_int_done:\n",
    ],
  }],
  // ["argv", {
  //   args: [],
  //   modifies: [],
  //   returns: "%r12",
  //   code: [],
  // }],
]);

// max immediate bits, possible regs, allow memory
type PossibleLocation = [0 | 8 | 32 | 64, PossibleReg, boolean];

let freeOffset = 0;

let freshLabelNum = 0;

export default function emitProgram(program: IR.Program): string[] {
  section = ".text";
  freeOffset = 0;
  freshLabelNum = 0;
  const code = [
    ...data(["database:"]),
    ".comm xxxx, 0xffffffff\n",
    "mov $freeptr, %r13d\n",
    "pop %r14\n",
    "pop %rax\n",
    "push %rsp\n",
    "pop %r12\n",
    ...emitStatement(program.body, program),
    `freeptr=database+${freeOffset}\n`,
    "hlt\n",
  ];
  for (const i of program.dependencies) {
    // TODO: avoid needing to hardcode all possible dependencies
    // to make the typechecker happy
    code.push(
      `${i}:\n`,
      ...builtins.get(i)!.code,
      "ret\n"
    );
  }
  return code;
}

// TODO: check actual variable names
function freshLabel(name: string): string {
  return `${name}${freshLabelNum++}`;
}

function emitBlock(block: IR.Block): string[] {
  return joinGroups(
    block.children.map((stmt) => emitStatement(stmt, block)),
    ""
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): string[] {
  switch (stmt.type) {
    case "Assignment": {
      if(stmt.variable.type === "IndexCall"){
        throw new Error("Assignment to index");
      }
      const [code, valueLoc] = emitExpr(stmt.expr, [32, "any", false]);
      const varReg = findVarReg(stmt.variable.name);
      if (varReg !== undefined) {
        freeVarReg(varReg, stmt.variable.name);
      }
      freeTempReg(valueLoc);
      const outputCode = movVarAlloc(valueLoc, "any", stmt.variable.name)[0];
      return [
        ...code,
        ...outputCode,
      ];
    }
    case "Block":
      return emitBlock(stmt);
    case "IfStatement": {
      if (stmt.alternate !== undefined) {
        const ifAlternate = freshLabel("ifalternate");
        const ifBottom = freshLabel("ifbottom");
        const conditionJump = emitCondJump(stmt.condition, ifAlternate, true);
        const branchAllocState = saveAllocState();
        const consequent = emitStatement(stmt.consequent, stmt);
        const allocState = saveAllocState();
        loadAllocState(branchAllocState);
        const alternate = emitStatement(stmt.alternate, stmt);
        const matchCode = matchAllocState(allocState);
        loadAllocState(allocState);
        return [
          ...conditionJump,
          ...consequent,
          `jmp ${ifBottom}\n`,
          `${ifAlternate}:\n`,
          ...alternate,
          ...matchCode,
          `${ifBottom}:\n`,
        ];
      }
      const ifBottom = freshLabel("ifbottom");
      const conditionJump = emitCondJump(stmt.condition, ifBottom, true);
      const allocState = saveAllocState();
      const consequent = emitStatement(stmt.consequent, stmt);
      const matchCode = matchAllocState(allocState);
      loadAllocState(allocState);
      return [
        ...conditionJump,
        ...consequent,
        ...matchCode,
        ifBottom + ":\n",
      ];
    }
    case "MutatingBinaryOp": {
      if (stmt.variable.type === "IndexCall") {
        throw new Error("Mutating an index");
      }
      let varLoc = findVarReg(stmt.variable.name);
      let applyToRegister = true;
      if (varLoc === undefined) {
        varLoc = stmt.variable.name;
        applyToRegister = false;
      }
      if (stmt.name === "imul" && !applyToRegister) {
        throw new Error("RMW imul doesn't exist");
      }
      const [code, valueLoc] = emitExpr(stmt.right, [32, "any", applyToRegister]);
      let spillCode: string[] = [];
      if (applyToRegister) {
        spillCode = spillRegVars(varLoc, stmt.variable.name);
      }
      freeTempReg(valueLoc);
      let opInstruction = `${stmt.name}q ${valueLoc}, ${varLoc}\n`;
      if (
        (stmt.name === "add" && valueLoc === "$1") ||
        (stmt.name === "sub" && valueLoc === "$-1")
      ) {
        opInstruction = `incq ${varLoc}\n`;
      }
      if (
        (stmt.name === "add" && valueLoc === "$-1") ||
        (stmt.name === "sub" && valueLoc === "$1")
      ) {
        opInstruction = `decq ${varLoc}\n`;
      }
      return [
        ...code,
        ...spillCode,
        opInstruction,
      ];
    }
    case "VarDeclaration": {
      freeOffset += 8;
      return [
        ...data([stmt.variable.name + ":\n.quad 0\n"]),
      ];
    }
    case "VarDeclarationWithAssignment": {
      if(stmt.assignments.type === "ManyToManyAssignment"){
        throw new Error("ManyToMany declaration");
      }
      if(stmt.assignments.variable.type === "IndexCall"){
        throw new Error("Declaration of index (why?)");
      }
      const [code, valueLoc] = emitExpr(stmt.assignments.expr, [64, "any", true]);
      const varName = stmt.assignments.variable.name;
      freeOffset += 8;
      if (valueLoc[0] === "$") {
        return [
          ...code,
          ...data([varName + ":\n.quad " + valueLoc.slice(1) + "\n"]),
        ];
      }
      freeTempReg(valueLoc);
      return [
        ...code,
        ...data([varName + ":\n.quad 0\n"]),
        "mov " + valueLoc + ", " + varName + "\n",
      ];
    }
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "WhileLoop": {
      const loopTop = freshLabel("looptop");
      const loopBottom = freshLabel("loopbottom");
      const allocState = saveAllocState();
      const conditionJump = emitCondJump(stmt.condition, loopBottom, true);
      const exitAllocState = saveAllocState();
      const loopBody = emitStatement(stmt.body, stmt);
      const matchCode = matchAllocState(allocState);
      loadAllocState(exitAllocState);
      return [
        `${loopTop}:\n`,
        ...conditionJump,
        ...loopBody,
        ...matchCode,
        `jmp ${loopTop}\n`,
        `${loopBottom}:\n`,
      ];
    }
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Assembly`);
    default:
      // fails if this allocates a return register
      return emitExpr(stmt, [64, "any", true])[0];
  }
}

function emitCondJump(
  expr: IR.Expr,
  target: string,
  invert: boolean = false,
): string[] {
  switch (expr.type) {
    case "FunctionCall":
      switch (expr.ident.name) {
        case "lt":
        case "leq":
        case "gt":
        case "geq":
        case "eq": 
        case "neq": {
          const [leftCode, leftLoc] = emitExpr(expr.args[0], [0, "any", true]);
          const [rightCode, rightLoc] = emitExpr(
            expr.args[1],
            [32, "any", leftLoc[0] === "$" || leftLoc[0] === "%"],
          );
          freeTempReg(rightLoc);
          freeTempReg(leftLoc);
          let jump = {
            lt: "jl",
            leq: "jle",
            gt: "jg",
            geq: "jge",
            eq: "je",
            neq: "jne",
          }[expr.ident.name];
          if (invert) {
            if (jump.match("jn") !== undefined) {
              jump = jump.replace("jn", "j");
            } else {
              jump = jump.replace("j", "jn");
            }
          }
          return [
            ...leftCode,
            ...rightCode,
            "cmpq " + rightLoc + ", " + leftLoc + "\n",
            jump + " " + target + "\n",
          ];
        }
        case "and":
        case "or": {
          // throw new Error("And/or branches need allocstate handling");
          let type = expr.ident.name;
          if (invert) {
            type = type === "and" ? "or" : "and";
          }
          if (type === "and") {
            const andFail = freshLabel("andfail");
            const idkLabel = freshLabel("idk");
            const firstJump = emitCondJump(expr.args[0], andFail, !invert);
            const firstAllocState = saveAllocState();
            const secondJump = emitCondJump(expr.args[1], target, invert);
            const allocState = saveAllocState();
            loadAllocState(firstAllocState);
            const matchCode = matchAllocState(allocState);
            // loadAllocState(allocState);
            return [
              ...firstJump,
              ...secondJump,
              `jmp ${idkLabel}\n`,
              `${andFail}:\n`,
              ...matchCode,
              `${idkLabel}:\n`,
            ];
          } else {
            const orFail = freshLabel("orfail");
            const firstJump = emitCondJump(expr.args[0], target, invert);
            const allocState = saveAllocState();
            const secondJump = emitCondJump(expr.args[1], orFail, !invert);
            const otherAllocState = saveAllocState();
            const matchCode = matchAllocState(allocState);
            loadAllocState(otherAllocState);
            const otherMatchCode = matchAllocState(allocState);
            return [
              ...firstJump,
              ...secondJump,
              ...matchCode,
              `jmp ${target}\n`,
              `${orFail}:\n`,
              ...otherMatchCode,
            ];
          }
        }
        case "not": {
          return emitCondJump(expr.args[0], target, !invert);
        }
        default:
          throw new Error(
            `Unexpected condition while emitting Assembly: ${expr.type}: ${String(
              "op" in expr ? expr.op : ""
            )}. `
          );
      }
    default:
      throw new Error(
        `Unexpected condition while emitting Assembly: ${expr.type}: ${String(
          "op" in expr ? expr.op : ""
        )}. `
      );
  }
}

function emitImmediate(
  code: string[],
  value: bigint | string,
  loc: PossibleLocation
): [string[], string] {
  let canReturnImmediate = loc[0] > 0;
  if(typeof value === "number") {
    // const lowerBound = {0 : 0n, 8 : -128n, 32: -(2n**31n), 64: -(2n**63n)}[loc[0]];
    // const upperBound = {0 : -1n, 8 : 127n, 32: 2n**31n-1n, 64: 2n**63n-1n}[loc[0]];
    canReturnImmediate &&= value >= -(2**loc[0]) && value < 2**loc[0];
  } else {
    canReturnImmediate = loc[0] >= 32;
  }
  if (canReturnImmediate) {
    return [code, `$${value}`];
  }
  const [spillCode, valueLoc] = allocateTempReg(loc[1]);
  return [[
    ...code,
    ...spillCode,
    `mov $${value}, ${valueLoc}\n`,
  ], valueLoc];
}

function emitExpr(expr: IR.Expr, loc: PossibleLocation): [string[], string] {
  switch (expr.type){
    case "BinaryOp": {
      const [leftCode, leftLoc] = emitExpr(
        expr.left,
        [expr.name === "imul" ? 32 : 0, loc[1], false]);
      const triadicImul = leftLoc[0] === "$" && expr.name === "imul";
      const [rightCode, rightLoc] = emitExpr(
        expr.right,
        triadicImul ?
          [0, "any", true]
        :
          [expr.name === "mov" ? 64 : 32, "any", true],
      );
      freeTempReg(rightLoc);
      if (triadicImul) {
        const [spillCode, outputReg] = allocateTempReg(loc[1]);
        return [[
          ...leftCode,
          ...rightCode,
          ...spillCode,
          "imul " + leftLoc + ", " + rightLoc + ", " + outputReg + "\n",
        ], outputReg];
      }
      let output = leftLoc;
      if (rightLoc[0] === "$" && expr.name === "imul") {
        output = leftLoc + ", " + leftLoc;
      }
      return [[
        ...leftCode,
        ...rightCode,
        expr.name + " " + rightLoc + ", " + output + "\n",
      ], leftLoc];
    }
    case "FunctionCall":
      switch (expr.ident.name) {
        case "print":
          return emitFunctionCall("print", expr.args, loc[1]);
          // if (expr.args.length > 1) {
          //   throw new Error("Too many print args");
          // }
          // if (expr.args[0].valueType?.type === "text") {
          //   const [saveCode2, savedRegs2] = saveRegs(["%rsi"])
          //   const [code, valueLoc] = emitExpr(expr.args[0], [0, "%rsi", false]);
          //   // doesn't modify %rsi, so no need to spill vars
          //   const [saveCode, savedRegs] = saveRegs(["%rax", "%rcx", "%rdx", "%rdi", "%r11"]);
          //   freeTempReg(valueLoc);
          //   const restoreCode = restoreRegs(savedRegs2.concat(savedRegs));
          //   const lenLoop = freshLabel("lenloop");
          //   return [[
          //     ...saveCode2,
          //     ...code,
          //     ...saveCode,
          //     "mov %esi, %edi\n",
          //     "xor %eax, %eax\n",
          //     "cltd\n",
          //     "sub %edi, %edx\n",
          //     `${lenLoop}:\n`,
          //     "scasb\n",
          //     `jnz ${lenLoop}\n`,
          //     "add %edi, %edx\n",
          //     "dec %edx\n",
          //     "inc %eax\n",
          //     "mov %eax, %edi\n",
          //     "syscall\n",
          //     ...restoreCode,
          //   ], "$0"];
          // }
          // throw new Error("Printing unimplemented type");
        case "println":
          return emitFunctionCall("println", expr.args, loc[1]);
          // if (expr.args.length > 1) {
          //   throw new Error("Too many println args");
          // }
          // if (expr.args[0].valueType?.type === "integer") {
          //   const [saveCode2, savedRegs2] = saveTempRegs(["%rax"])
          //   const [code, valueLoc] = emitExpr(expr.args[0], [0, "%rax", false]);
          //   const spillCode = spillRegVars("%rax");
          //   const [saveCode, savedRegs] = saveRegs(["%rbx", "%rcx", "%rdx", "%rsi", "%rdi", "%r11"]);
          //   freeTempReg(valueLoc);
          //   const restoreCode = restoreRegs(savedRegs2.concat(savedRegs));
          //   const printLoop = freshLabel("printloop");
          //   return [[
          //     ...saveCode2,
          //     ...code,
          //     ...spillCode,
          //     ...saveCode,
          //     "or $-1, %ebx\n",
          //     "movb $10, (%rbx)\n",
          //     "mov %ebx, %esi\n",
          //     `${printLoop}:\n`,
          //     "xor %edx, %edx\n",
          //     "divq (%rbx)\n",
          //     "add $'0', %dl\n",
          //     "dec %esi\n",
          //     "mov %dl, (%rsi)\n",
          //     "test %rax, %rax\n",
          //     `jnz ${printLoop}\n`,
          //     "cltd\n",
          //     "sub %esi, %edx\n",
          //     "inc %eax\n",
          //     "mov %eax, %edi\n",
          //     "syscall\n",
          //     ...restoreCode,
          //   ], "$0"];
          // }
          // throw new Error("Printlning unimplemented type");
        case "div":
        case "mod": {
          const [saveCode, savedRegs] = saveTempRegs(["%rax", "%rdx"]);
          const [leftCode, leftLoc] = emitExpr(expr.args[0], [0, "%rax", false]);
          const [rightCode, rightLoc] = emitExpr(expr.args[1], [0, "not%rax%rdx", true]);
          freeTempReg(leftLoc);
          freeTempReg(rightLoc);
          const spillCode = spillRegsVars(["%rax", "%rdx"]);
          const restoreCode = restoreRegs(savedRegs);
          const preferReg = expr.ident.name === "div" ? "%rax" : "%rdx";
          const [outputCode, outputReg] = movTempAlloc(preferReg, loc[1]);
          return [[
            ...saveCode,
            ...leftCode,
            ...rightCode,
            ...spillCode,
            "xor %edx, %edx\n",
            `div ${rightLoc}\n`,
            ...outputCode,
            ...restoreCode,
          ], outputReg];
        }
        case "load_r_b": 
        case "load_rr_b": 
        case "load_rr8_q": {
          // TODO: support imms
          const [, loadArgs, loadSize] = expr.ident.name.split("_");
          const useIndex = loadArgs.length > 1;
          const indexScale = loadArgs.length > 2 ? loadArgs[2] : 1;
          const [baseCode, baseLoc] = emitExpr(expr.args[0], [0, "any", false]);
          let [indexCode, indexLoc]: [string[], string] = [[], "$0"];
          if (useIndex) {
            [indexCode, indexLoc] = emitExpr(expr.args[1], [0, "any", false]);
          }
          freeTempReg(baseLoc);
          if (useIndex) {
            freeTempReg(indexLoc);
          }
          const [spillCode, outputReg] = allocateTempReg(loc[1]);
          const opcode = {
            b: "movsxb",
            w: "movsxw",
            l: "movsxd",
            q: "mov"
          }[loadSize]!;
          const indexSpec = useIndex ? "," + indexLoc : "";
          const scaleSpec = useIndex && indexScale > 1 ? `,${indexScale}` : "";
          return [[
            ...baseCode,
            ...indexCode,
            ...spillCode,
            `${opcode} (${baseLoc}${indexSpec}${scaleSpec}), ${outputReg}\n`,
          ], outputReg];
        }
        case "repeat": {
          return emitFunctionCall("repeat", expr.args, loc[1]);
          // // TODO: Allow the output to be stored in a register other than %rax
          // // while the function is executing
          // const [saveCode, savedRegs] = saveRegs(["%rax", "%rbx", "%rcx", "%rdx", "%rsi", "%rdi"]);
          // const [leftCode, leftLoc] = emitExpr(expr.args[0], [0, "%rdi", false]);
          // // TODO: more general target
          // const [rightCode, rightLoc] = emitExpr(expr.args[1], [0, "%rbx", false]);
          // const spillCode = spillRegsVars(["%rbx", "%rdi"]);
          // freeTempReg(leftLoc);
          // freeTempReg(rightLoc);
          // const restoreCode = restoreRegs(savedRegs);
          // const [outputCode, outputReg] = movTempAlloc("%rax", loc[1]);
          // const lenLoop = freshLabel("lenloop");
          // const repLoop = freshLabel("reploop");
          // return [[
          //   ...saveCode,
          //   ...leftCode,
          //   ...rightCode,
          //   ...spillCode,
          //   "mov %edi, %esi\n",
          //   "xor %eax, %eax\n",
          //   "cltd\n",
          //   "sub %edi, %edx\n",
          //   `${lenLoop}:\n`,
          //   "scasb\n",
          //   `jnz ${lenLoop}\n`,
          //   "add %edi, %edx\n",
          //   "dec %edx\n",
          //   "mov %r13d, %edi\n",
          //   "mov %edx, %eax\n",
          //   "imul %ebx, %eax\n",
          //   "xadd %eax, %r13d\n",
          //   `${repLoop}:\n`,
          //   "mov %edx, %ecx\n",
          //   "rep movsb\n",
          //   "sub %edx, %esi\n",
          //   "dec %ebx\n",
          //   `jnz ${repLoop}\n`,
          //   ...outputCode,
          //   ...restoreCode,
          // ], outputReg];
        }
        case "text_length":
        case "print_length":
        case "text_to_int":{
          return emitFunctionCall(expr.ident.name, expr.args, loc[1]);
        }
        case "argv": {
          return movTempAlloc("%r12", loc[1]);
        }
        case "hint_load": {
          const [code, valueLoc] = emitExpr(expr.args[0], [0, "any", false]);
          freeTempReg(valueLoc);
          return [code, "$1"];
        }
        default:
          throw new Error("Unimplemented function " + expr.ident.name);
      }
    case "Identifier": {
      const varReg = findVarReg(expr.name);
      if (varReg !== undefined) {
        // TODO: allow a var to be stored in multiple regs
        const dirty = freeVarReg(varReg, expr.name);
        const [code, valueLoc] = movTempAlloc(varReg, loc[1]);
        attachVarToReg(valueLoc, expr.name, dirty);
        return [code, valueLoc];
      }
      if (loc[2]) {
        return [[], expr.name];
      }
      const [spillCode, valueLoc] = allocateTempReg(loc[1]);
      attachVarToReg(valueLoc, expr.name, false);
      return [[...spillCode, `mov ${expr.name}, ${valueLoc}\n`], valueLoc];
    }
    case "IntegerLiteral": {
      return emitImmediate([], expr.value, loc);
      // const lowerBound = {0 : 0, 8 : -128, 32: -(2**31), 64: -(2**63)}[loc[0]];
      // const upperBound = {0 : -1, 8 : 127, 32: 2**31-1, 64: 2**63-1}[loc[0]];
      // if (expr.value >= lowerBound && expr.value <= upperBound) {
      //   return [[], `$${expr.value}`];
      // }
      // const [spillCode, valueLoc] = allocateTempReg(loc[1]);
      // // return [["mov $" + expr.value.toString() + ", " + reg + "\n"], valueLoc];
      // return [[...spillCode, `mov $${expr.value}, ${valueLoc}\n`], valueLoc];
    }
    case "ListConstructor": {
      const entryCodes: string[] = [];
      const entryValues: string[] = [];
      for (const i of expr.exprs) {
        const [entryCode, entryValue] = emitExpr(i, [64, "any", false]);
        if (entryValue[0] !== "$") {
          throw new Error("List constructor with nonconstant entry");
        }
        entryCodes.push(...entryCode);
        entryValues.push(".quad " + entryValue.slice(1) + "\n");
      }
      const listLabel = freshLabel("list");
      // TODO handle immediate-forbidden case
      // return [[
      //   ...entryCodes,
      //   ...data([
      //     listLabel + ":\n",
      //     ...entryValues,
      //   ]),
      // ], "$" + listLabel];
      return emitImmediate([
        ...entryCodes,
        ...data([
          listLabel + ":\n",
          ...entryValues,
        ]),
      ], listLabel, loc);
    }
    case "StringLiteral": {
      const stringLabel = freshLabel("string");
      const stringData = data([
        stringLabel + ":\n",
        ".asciz ",
        ...emitStringLiteral(expr.value, [
          [
            `"`,
            [
              [`\\`, `\\\\`],
              [`"`, `\\"`],
            ],
          ]
        ]),
        "\n",
      ]);
      freeOffset += expr.value.length + 1;
      if(loc[0] >= 32) {
        return [stringData, `$${stringLabel}`];
      }
      const [spillCode, valueLoc] = allocateTempReg(loc[1]);
      return [[
        ...stringData,
        ...spillCode,
        `mov $${stringLabel}, ${valueLoc}\n`,
      ], valueLoc];
    }
    default:
      throw new Error(
        `Unexpected node while emitting Assembly: ${expr.type}: ${String(
          "op" in expr ? expr.op : ""
        )}. `
      );
  }
}

function emitFunctionCall(
  funcName: string,
  args: IR.Expr[],
  returnIn: PossibleReg
): [string[], string] {
  const func = builtins.get(funcName)!;
  const [saveCode, savedRegs] = saveTempRegs(func.args.concat(func.modifies));
  const argsCode = [];
  for (let i = 0; i< args.length; i++) {
    argsCode.push(...emitExpr(args[i], [0, func.args[i], false])[0]);
  }
  const spillCode = spillRegsVars(func.modifies);
  // const funcCode = func.code;
  const funcCode = [`call ${funcName}\n`];
  for (const i of func.args) {
    freeTempReg(i);
  }
  const restoreCode = restoreRegs(savedRegs);
  let outputCode: string[] = [];
  let outputReg = "$1";
  if (func.returns !== undefined) {
    [outputCode, outputReg] = movTempAlloc(func.returns, returnIn);
  }
  return [[
    ...saveCode,
    ...argsCode,
    ...spillCode,
    ...funcCode,
    ...outputCode,
    ...restoreCode,
  ], outputReg];
}