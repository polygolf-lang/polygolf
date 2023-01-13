import {
  emitStringLiteral,
  joinGroups,
} from "../../common/emit";
import { IR } from "../../IR";
import { getType } from "../../common/getType";
import {
  emitOperand,
  emitReg,
  immOperand,
  Operand,
  operandIsConstant,
  labelOperand,
  memOperand,
  regOperand,
  RegOperand,
  resize,
} from "./operand";

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

// allowed output registers
type PossibleReg = "any" | number;

// [used as temporary, [variable name, matches memory copy][]]
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

function regIsFree(reg: number): boolean {
  if (reg < 0) {
    throw new Error("Checking if nonreg is free");
  }
  const [usedForTemp, usesForVars] = regAllocations[reg];
  return !usedForTemp && usesForVars.length === 0;
}

function getFreeReg(options: PossibleReg, prefer?: number): [string[], number] {
  const code: string[] = [];
  let reg;
  switch (options) {
    case "any": {
      if (
        prefer !== undefined &&
        regIsFree(prefer)
      ) {
        reg = prefer;
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
      reg = options;
      const [usedForTemp, usesForVars] = regAllocations[reg];
      if (usedForTemp) {
        throw new Error(options + " already used for temp");
      }
      if (usesForVars.length !== 0) {
        // TODO: use spillRegVars
        for (const [name, dirty] of usesForVars) {
          if (dirty) {
            code.push(`movq ${emitReg(reg,64)}, ${name}\n`);
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

function allocateTempReg(options: PossibleReg, prefer?: number): [string[], number] {
  const [code, reg] = getFreeReg(options, prefer);
  regAllocations[reg][0] = true;
  return [code, reg];
}

function allocateTempLoc(
  options: PossibleReg,
  size: 8 | 16 | 32 | 64,
  prefer?: number,
): [string[], RegOperand] {
  const [code, reg] = allocateTempReg(options, prefer);
  return [code, regOperand(reg, size)];
}

function allocateVarReg(options: PossibleReg, variable: string, prefer?: number): [string[], number] {
  const [code, reg] = getFreeReg(options, prefer);
  regAllocations[reg][1].push([variable, true]);
  return [code, reg];
}

function allocateVarLoc(
  options: PossibleReg,
  variable: string,
  size: 8 | 16 | 32 | 64,
  prefer?: number,
): [string[], RegOperand] {
  const [code, reg] = allocateVarReg(options, variable, prefer);
  return [code, regOperand(reg, size)];
}

function freeTempReg(reg: number) {
  // not a register
  if (reg < 0) {
    return;
  }
  const usedForTemp = regAllocations[reg][0];
  if (!usedForTemp) {
    throw new Error("freeTempReg of register without temporary");
  }
  regAllocations[reg][0] = false;
}

function freeTempLoc(loc: Operand) {
  if (loc.type === "register") {
    freeTempReg(loc.number);
  }
}

function freeVarReg(reg: number, variable: string): boolean {
  // not a register
  if (reg < 0) {
    throw new Error("freeVarReg of nonreg");
  }
  const usesForVars = regAllocations[reg][1];
  const varIndex = usesForVars.findIndex((x) => x[0] === variable);
  if (varIndex < 0) {
    throw new Error("freeVarReg of register without variable");
  }
  return usesForVars.splice(varIndex, 1)[0][1];
}

function spillRegVars(reg: number, exceptVar?: string): string[] {
  const usesForVars = regAllocations[reg][1];
  const newUsesForVars: [string, boolean][] = [];
  const code = [];
  if (usesForVars.length !== 0) {
    for (const [name, dirty] of usesForVars) {
      if (name === exceptVar) {
        newUsesForVars.push([name, true]);
        continue;
      }
      if (dirty) {
        code.push(`movq ${emitReg(reg,64)}, ${name}\n`);
      }
    }
    regAllocations[reg][1] = newUsesForVars;
  }
  return code;
}

function spillRegsVars(regs: number[]): string[] {
  const code = [];
  for(const i of regs){
    code.push(...spillRegVars(i));
  }
  return code;
}

function saveTempRegs(regs: number[]): [string[], number[]] {
  const code = [];
  const saved = [];
  for (const reg of regs) {
    const usedForTemp = regAllocations[reg][0];
    if (usedForTemp) {
      code.push(`push ${emitReg(reg,64)}\n`);
      saved.push(reg);
      regAllocations[reg][0] = false;
    }
  }
  return [code, saved];
}

function restoreRegs(regs: number[]): string[] {
  const code = [];
  for (let i = regs.length - 1; i >= 0; i--) {
    const reg = regs[i];
    code.push(`pop ${emitReg(reg,64)}\n`);
    if (regAllocations[reg][0]) {
      throw new Error("restoreRegs onto occupied reg");
    }
    regAllocations[reg][0] = true;
  }
  return code;
}

type PossibleLocation = {
  readonly maxImmBits: 0 | 8 | 32 | 64,
  readonly possibleRegs: PossibleReg,
  readonly canBeMemory: boolean,
  readonly minCorrectBits: 32 | 64,
  readonly outputSize: 32 | 64,
  readonly extensionType: "any" | "zero"
};

// Allocate a register according to `options`, and generate code
// to move `current` there if necessary. Run this function after
// `restoreRegs`, but include its code before the restore code.
// TODO: 32 bit
function movTempAlloc(
  current: Operand,
  options: PossibleLocation,
): [string[], RegOperand] {
  const [spillCode, outputLoc] = allocateTempLoc(
    options.possibleRegs,
    options.outputSize,
    current.type === "register" ? current.number : undefined,
  );
  if (current.type === "register" && current.number === outputLoc.number) {
    return [spillCode, outputLoc];
  } else {
    //tag
    const currentSize =
      current.type === "immediate" ? options.outputSize : current.size;
    if (currentSize !== options.outputSize && options.extensionType !== "any") {
      throw new Error("Nontrivial extension in movTempAlloc");
    }
    const resizedOutputLoc: Operand = resize(outputLoc, currentSize);
    return [
      [
        ...spillCode,
        `mov ${emitOperand(current)}, ${emitOperand(resizedOutputLoc)}\n`,
      ],
      outputLoc,
    ];
  }
  // const [spillCode, outputLoc] = allocateTempLoc(
  //   options,
  //   current.type === "immediate" ? size : current.size,
  //   current.type === "register" ? current.number : undefined,
  // );
  // if (current.type === "register" && current.number === outputLoc.number) {
  //   return [spillCode, outputLoc];
  // } else {
  //   if (current.type !== "immediate" && current.size !== 64) {
  //     throw new Error("movTempAlloc from non-64-bit source");
  //   }
  //   return [
  //     [
  //       ...spillCode,
  //       `mov ${emitOperand(resize(current, size))}, ${emitOperand(outputLoc)}\n`,
  //     ],
  //     outputLoc,
  //   ];
  // }
}

// TODO: merge with movTempAlloc
function movVarAlloc(
  current: Operand,
  options: PossibleReg,
  variable: string
): [string[], RegOperand] {
  const [spillCode, outputLoc] = allocateVarLoc(
    options,
    variable,
    64,
    current.type === "register" ? current.number : undefined,
  );
  if (current.type === "register" && current.number === outputLoc.number) {
    return [spillCode, outputLoc];
  } else {
    if (current.type !== "immediate" && current.size !== 64) {
      throw new Error("movVarAlloc from non-64-bit source");
    }
    return [
      [
        ...spillCode,
        `mov ${emitOperand(current)}, ${emitOperand(outputLoc)}\n`,
      ],
      outputLoc,
    ];
  }
}

function attachVarToReg(reg: number, variable: string, dirty: boolean) {
  if (reg < 0) {
    throw new Error("attachVarToReg of nonreg");
  }
  regAllocations[reg][1].push([variable, dirty]);
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
        ret.push(`movq ${emitReg(i, 64)}, ${name}\n`);
      }
    }
  }
  for (let i = 0; i < state.length; i++) {
    let newRegState: [string, boolean][] = [];
    for (const [name, dirty] of state[i][1]) {
      ret.push(`movq ${name}, ${emitReg(i, 64)}\n`);
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
function findVarReg(variable: string): number | undefined {
  for (let i = 0; i < regAllocations.length; i++) {
    const usesForVars = regAllocations[i][1];
    if (usesForVars.some((x) => x[0] === variable)) {
      return i;
    }
  }
  return undefined;
}

// TODO: no undefined arg
function getTypeSize(program: IR.Program, type: IR.ValueType | undefined): 32 | 64 {
  if (type === undefined) {
    throw new Error("getTypeSize of undefined type");
  }
  if (type.type !== "integer") {
    return 64;
  }
  if (type.low === undefined || type.low < 0n) {
    return 64;
  }
  if (type.high === undefined || type.high >= 2n ** 32n) {
    return 64;
  }
  return 32;
}

function getVarSize(program: IR.Program, variable: string): 32 | 64 {
  return getTypeSize(program, program.variables.get(variable));
}

// TODO: generate label names
const builtins = new Map<string, {args:number[], modifies:number[], returns?:number, code:string[]}>([
  ["text_length", {
    args: [6], // %rsi
    modifies: [0, 2, 7], // %rax, %rdx, %rdi
    returns: 2, // %rdx
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
    args: [6], // %rsi
    modifies: [0, 1, 2, 7, 11], // %rax, %rcx, %rdx, %rdi, %r11
    code: [
      "call text_length\n",
      "inc %eax\n",
      "mov %eax, %edi\n",
      "syscall\n",
    ],
  }],
  ["print_length", {
    args: [6, 2], // %rsi, %rdx
    modifies: [0, 2, 7, 11], // %rax, %rcx, %rdi, %r11
    code: [
      "push $1\n",
      "pop %rax\n",
      "mov %eax, %edi\n",
      "syscall\n",
    ],
  }],
  ["println", {
    args: [0], // %rax
    modifies: [0, 1, 2, 6, 7, 11], // %rax, %rcx, %rdx, %rsi, %rdi, %r11
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
    args: [6, 3], // %rsi, %rbx
    modifies: [0, 1, 2, 3, 7], // %rax, %rcx, %rdx, %rbx, %rdi
    returns: 7, // %rdi
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
    args: [6], // %rsi
    modifies: [0, 2, 6], // %rax, %rdx, %rsi
    returns: 2, // %rdx
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
  //   returns: 12, // %r12
  //   code: [],
  // }],
]);

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

function emitBlock(block: IR.Block, program: IR.Program): string[] {
  return joinGroups(
    block.children.map((stmt) => emitStatement(stmt, program)),
    ""
  );
}

function emitStatement(stmt: IR.Expr, program: IR.Program): string[] {
  switch (stmt.type) {
    case "Assignment": {
      if(stmt.variable.type === "IndexCall"){
        throw new Error("Assignment to index");
      }
      const varSize = getVarSize(program, stmt.variable.name);
      // TODO: can be memory, actually
      const [code, valueLoc] = emitExpr(
        stmt.expr,
        {
          maxImmBits: 32,
          possibleRegs: "any",
          canBeMemory: false,
          minCorrectBits: varSize,
          outputSize: 64,
          extensionType: "zero",
        },
        program,
      );
      const varReg = findVarReg(stmt.variable.name);
      if (varReg !== undefined) {
        freeVarReg(varReg, stmt.variable.name);
      }
      freeTempLoc(valueLoc);
      const outputCode = movVarAlloc(valueLoc, "any", stmt.variable.name)[0];
      return [
        ...code,
        ...outputCode,
      ];
    }
    case "Block":
      return emitBlock(stmt, program);
    case "IfStatement": {
      if (stmt.alternate !== undefined) {
        const ifAlternate = freshLabel("ifalternate");
        const ifBottom = freshLabel("ifbottom");
        const conditionJump = emitCondJump(
          stmt.condition,
          ifAlternate,
          true,
          program,
        );
        const branchAllocState = saveAllocState();
        const consequent = emitStatement(stmt.consequent, program);
        const allocState = saveAllocState();
        loadAllocState(branchAllocState);
        const alternate = emitStatement(stmt.alternate, program);
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
      const conditionJump = emitCondJump(
        stmt.condition,
        ifBottom,
        true,
        program,
      );
      const allocState = saveAllocState();
      const consequent = emitStatement(stmt.consequent, program);
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
      const varSize = getVarSize(program, stmt.variable.name);
      const varReg = findVarReg(stmt.variable.name);
      const sizeSuffix = {32: "l", 64: "q"}[varSize];
      const applyToRegister = varReg !== undefined;
      let varLoc;
      if (applyToRegister) {
        varLoc = regOperand(varReg!, varSize);
      } else {
        varLoc = labelOperand(stmt.variable.name, varSize);
      }
      if (stmt.name === "imul" && !applyToRegister) {
        // TODO deal with this
        throw new Error("RMW imul doesn't exist");
      }
      const [code, valueLoc] = emitExpr(
        stmt.right,
        {
          maxImmBits: 32,
          possibleRegs: "any",
          canBeMemory: applyToRegister,
          minCorrectBits: varSize,
          outputSize: varSize,
          extensionType: "any",
        },
        program,
      );
      let spillCode: string[] = [];
      if (varLoc.type === "register") {
        spillCode = spillRegVars(varLoc.number, stmt.variable.name);
      }
      freeTempLoc(valueLoc);
      const varOpString = emitOperand(varLoc);
      const valueOpString = emitOperand(valueLoc);
      let opInstruction =
        `${stmt.name}${sizeSuffix} ${valueOpString}, ${varOpString}\n`;
      if (
        (stmt.name === "add" && operandIsConstant(valueLoc, 1n)) ||
        (stmt.name === "sub" && operandIsConstant(valueLoc, -1n))
      ) {
        opInstruction = `inc${sizeSuffix} ${varOpString}\n`;
      }
      if (
        (stmt.name === "add" && operandIsConstant(valueLoc, -1n)) ||
        (stmt.name === "sub" && operandIsConstant(valueLoc, 1n))
      ) {
        opInstruction = `dec${sizeSuffix} ${varOpString}\n`;
      }
      return [
        ...code,
        ...spillCode,
        opInstruction,
      ];
    }
    case "VarDeclaration": {
      // TODO: only allocate 4 bytes for short vars
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
      const varSize = getVarSize(program, stmt.assignments.variable.name);
      const [code, valueLoc] = emitExpr(
        stmt.assignments.expr,
        {
          maxImmBits: 64,
          possibleRegs: "any",
          canBeMemory: true,
          minCorrectBits: varSize,
          outputSize: 64,
          extensionType: "zero",
        },
        program,
      );
      const varName = stmt.assignments.variable.name;
      freeOffset += 8;
      if (valueLoc.type === "immediate") {
        return [
          ...code,
          ...data([`${varName}:\n.quad ${valueLoc.value}\n`]),
        ];
      }
      freeTempLoc(valueLoc);
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
      const conditionJump = emitCondJump(
        stmt.condition,
        loopBottom,
        true,
        program,
      );
      const exitAllocState = saveAllocState();
      const loopBody = emitStatement(stmt.body, program);
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
      // TODO: fails if this allocates a return register
      return emitExpr(
        stmt,
        {
          maxImmBits: 64,
          possibleRegs: "any",
          canBeMemory: true,
          minCorrectBits: 32,
          outputSize: 32,
          extensionType: "any",
        },
        program,
      )[0];
  }
}

function emitCondJump(
  expr: IR.Expr,
  target: string,
  invert: boolean,
  program: IR.Program,
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
          // TODO: 32 bit compares
          const [leftCode, leftLoc] = emitExpr(
            expr.args[0],
            {
              maxImmBits: 0,
              possibleRegs: "any",
              canBeMemory: true,
              minCorrectBits: 64,
              outputSize: 64,
              extensionType: "any",
            },
            program,
          );
          const [rightCode, rightLoc] = emitExpr(
            expr.args[1],
            {
              maxImmBits: 32,
              possibleRegs: "any",
              canBeMemory: leftLoc.type !== "memory",
              minCorrectBits: 64,
              outputSize: 64,
              extensionType: "any",
            },
            program,
          );
          freeTempLoc(rightLoc);
          freeTempLoc(leftLoc);
          let jump = {
            lt: "jl",
            leq: "jle",
            gt: "jg",
            geq: "jge",
            eq: "je",
            neq: "jne",
          }[expr.ident.name];
          if (invert) {
            if (jump.match("jn") !== null) {
              jump = jump.replace("jn", "j");
            } else {
              jump = jump.replace("j", "jn");
            }
          }
          // TODO: template strings
          return [
            ...leftCode,
            ...rightCode,
            `cmpq ${emitOperand(rightLoc)}, ${emitOperand(leftLoc)}\n`,
            jump + " " + target + "\n",
          ];
        }
        case "and":
        case "or": {
          let type = expr.ident.name;
          if (invert) {
            type = type === "and" ? "or" : "and";
          }
          if (type === "and") {
            const andFail = freshLabel("andfail");
            const idkLabel = freshLabel("idk");
            const firstJump = emitCondJump(
              expr.args[0],
              andFail,
              !invert,
              program,
            );
            const firstAllocState = saveAllocState();
            const secondJump = emitCondJump(
              expr.args[1],
              target,
              invert,
              program,
            );
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
            const firstJump = emitCondJump(
              expr.args[0],
              target,
              invert,
              program,
            );
            const allocState = saveAllocState();
            const secondJump = emitCondJump(
              expr.args[1],
              orFail,
              !invert,
              program,
            );
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
          return emitCondJump(expr.args[0], target, !invert, program);
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
): [string[], Operand] {
  const maxImmBits = loc.maxImmBits;
  let canReturnImmediate = maxImmBits > 0;
  if(typeof value === "number") {
    canReturnImmediate &&= value >= -(2 ** maxImmBits) && value < 2 ** maxImmBits;
  } else {
    canReturnImmediate = maxImmBits >= 32;
  }
  if (canReturnImmediate) {
    return [code, immOperand(value)];
  }
  const [spillCode, valueLoc] = allocateTempLoc(loc.possibleRegs, loc.minCorrectBits);
  return [[
    ...code,
    ...spillCode,
    `mov $${value}, ${emitOperand(valueLoc)}\n`,
  ], valueLoc];
}

function emitExpr(
  expr: IR.Expr,
  loc: PossibleLocation,
  program: IR.Program,
): [string[], Operand] {
  switch (expr.type){
    case "BinaryOp": {
      // let opSize = getTypeSize(program, getType(expr, program));
      // if (opSize !== loc.outputSize) {
      //   throw new Error("BinaryOp size mismatch");
      // }
      // TODO: do something else
      const opSize = loc.outputSize;
      const [leftCode, leftLoc] = emitExpr(
        expr.left,
        {
          maxImmBits: expr.name === "imul" ? 32 : 0,
          possibleRegs: loc.possibleRegs,
          canBeMemory: false,
          minCorrectBits: opSize,
          outputSize: opSize,
          extensionType: "any",
        },
        program,
      );
      const triadicImul = leftLoc.type === "immediate" && expr.name === "imul";
      const [rightCode, rightLoc] = emitExpr(
        expr.right,
        {
          maxImmBits: triadicImul ? 0 : expr.name === "mov" ? 64 : 32,
          possibleRegs: "any",
          canBeMemory: true,
          minCorrectBits: opSize,
          outputSize: opSize,
          extensionType: "any",
        },
        program,
      );
      freeTempLoc(rightLoc);
      if (triadicImul) {
        const [spillCode, outputLoc] = allocateTempLoc(loc.possibleRegs, opSize);
        return [[
          ...leftCode,
          ...rightCode,
          ...spillCode,
          // TODO: template strings
          // "imul " + leftLoc + ", " + rightLoc + ", " + outputReg + "\n",
          `imul ${emitOperand(leftLoc)}, ${emitOperand(rightLoc)}, ${emitOperand(outputLoc)}\n`,

        ], outputLoc];
      }
      let leftOpString = emitOperand(leftLoc);
      if (rightLoc.type === "immediate" && expr.name === "imul") {
        // TODO: template strings
        leftOpString = leftOpString + ", " + leftOpString;
      }
      return [[
        ...leftCode,
        ...rightCode,
        // TODO: template strings
        expr.name + " " + emitOperand(rightLoc) + ", " + leftOpString + "\n",
      ], leftLoc];
    }
    case "FunctionCall":
      switch (expr.ident.name) {
        case "print":
          return emitFunctionCall(
            "print",
            expr.args,
            loc,
            program,
          );
        case "println":
          return emitFunctionCall(
            "println",
            expr.args,
            loc,
            program,
          );
        case "div":
        case "mod": {
          const [saveCode, savedRegs] = saveTempRegs([0, 2]); // %rax, %rdx
          const [leftCode, leftLoc] = emitExpr(
            expr.args[0],
            {
              maxImmBits: 0,
              possibleRegs: 0, // %rax
              canBeMemory: false,
              minCorrectBits: 64,
              outputSize: 64,
              extensionType: "any",
            },
            program,
          );
          // TODO: Allow more general possibleRegs so this can be
          // registers other than %rcx
          const [rightCode, rightLoc] = emitExpr(
            expr.args[1],
            {
              maxImmBits: 0,
              possibleRegs: 1, // %rcx
              canBeMemory: true,
              minCorrectBits: 64,
              outputSize: 64,
              extensionType: "any",
            },
            program,
          );
          freeTempLoc(leftLoc);
          freeTempLoc(rightLoc);
          const spillCode = spillRegsVars([0, 2]); // %rax, %rdx
          const restoreCode = restoreRegs(savedRegs);
          const preferReg = expr.ident.name === "div" ? 0 : 2; // %rax : %rdx
          const [outputCode, outputReg] = movTempAlloc(
            regOperand(preferReg, 64),
            loc,
          );
          return [[
            ...saveCode,
            ...leftCode,
            ...rightCode,
            ...spillCode,
            "xor %edx, %edx\n",
            `div ${emitOperand(rightLoc)}\n`,
            ...outputCode,
            ...restoreCode,
          ], outputReg];
        }
        case "load_r_b": 
        case "load_rr_b": 
        case "load_rr8_q": {
          // TODO: support imms
          // TODO: 32 bit
          // TODO: support returning memory operand
          const [, loadArgs, loadSize] = expr.ident.name.split("_");
          const useIndex = loadArgs.length > 1;
          const scale = loadArgs.length > 2 ? +loadArgs[2] : 1;
          const [baseCode, baseLoc] = emitExpr(
            expr.args[0],
            {
              maxImmBits: 0,
              possibleRegs: "any",
              canBeMemory: false,
              minCorrectBits: 64,
              outputSize: 64,
              extensionType: "any",
            },
            program,
          );
          if (baseLoc.type !== "register") {
            throw new Error("Non-reg load base");
          }
          let [indexCode, indexLoc]: [string[], Operand] = [
            [],
            immOperand(0n),
          ];
          if (useIndex) {
            // TODO: this can be an immediate
            [indexCode, indexLoc] = emitExpr(
              expr.args[1],
              {
                maxImmBits: 0,
                possibleRegs: "any",
                canBeMemory: false,
                minCorrectBits: 64,
                outputSize: 64,
                extensionType: "any",
              },
              program,
            );
            // TODO: For 12 days this gets a 32-bit result
            // for the second call
          }
          freeTempLoc(baseLoc);
          if (useIndex) {
            freeTempLoc(indexLoc);
          }
          const [spillCode, outputLoc] = allocateTempLoc(loc.possibleRegs, 64);
          const opcode = {
            b: "movsxb",
            w: "movsxw",
            l: "movsxd",
            q: "mov"
          }[loadSize];
          if (opcode === undefined) {
            throw new Error("Bad load size");
          }
          let loadOperand;
          if (useIndex) {
            if (indexLoc.type !== "register") {
              throw new Error("Non-reg load index");
            }
            if (![1, 2, 4, 8].includes(scale)){
              throw new Error("Bad load scale");
            }
            loadOperand = memOperand(
              undefined,
              baseLoc.number,
              indexLoc.number,
              scale as 1 | 2 | 4 | 8,
              64,
            );
          } else {
            loadOperand = memOperand(undefined, baseLoc.number, undefined, 1, 64);
          }
          return [[
            ...baseCode,
            ...indexCode,
            ...spillCode,
            `${opcode} ${emitOperand(loadOperand)}, ${emitOperand(outputLoc)}\n`,
          ], outputLoc];
        }
        case "repeat": {
          return emitFunctionCall("repeat", expr.args, loc, program);
        }
        case "text_length":
        case "print_length":
        case "text_to_int":{
          return emitFunctionCall(expr.ident.name, expr.args, loc, program);
        }
        case "argv": {
          return movTempAlloc(regOperand(12, 64), loc); // %r12
        }
        // case "hint_load": {
        //   const [code, valueLoc] = emitExpr(
        //     expr.args[0],
        //     {
        //       maxImmBits: 0,
        //       possibleRegs: "any",
        //       canBeMemory: false,
        //       minCorrectBits: 64,
        //       extensionType: "any",
        //     },
        //     program
        //   );
        //   freeTempLoc(valueLoc);
        //   return [code, immOperand(1n)];
        // }
        default:
          throw new Error("Unimplemented function " + expr.ident.name);
      }
    case "Identifier": {
      // TODO 32 bit
      const varReg = findVarReg(expr.name);
      const varSize = getVarSize(program, expr.name);
      if (varReg !== undefined) {
        if (
          loc.minCorrectBits < varSize &&
          loc.extensionType !== "any"
        ) {
          throw new Error("Identifier varReg requiring nontrivial extension");
        }
        // TODO: allow a var to be stored in multiple regs
        const varLoc = regOperand(varReg, varSize);
        const dirty = freeVarReg(varReg, expr.name);
        const [code, valueLoc] = movTempAlloc(
          varLoc,
          loc,
        );
        attachVarToReg(valueLoc.number, expr.name, dirty);
        return [code, valueLoc];
      }
      if (loc.canBeMemory) {
        if (loc.minCorrectBits < 64 && loc.extensionType !== "any") {
          throw new Error("Identifier memory with zero extension");
        }
        return [[], labelOperand(expr.name, loc.outputSize)];
      }
      if (loc.minCorrectBits < varSize && loc.extensionType !== "any") {
        throw new Error("Identifier boring with nontrivial extension");
      }
      const [spillCode, valueLoc] =
        allocateTempLoc(loc.possibleRegs, loc.outputSize);
      let movTargetLoc = valueLoc;
      if (valueLoc.type === "register") {
        movTargetLoc = resize(valueLoc, loc.minCorrectBits) as RegOperand;
      }
      // TODO: figure this out
      if (loc.extensionType === "any" && loc.outputSize >= varSize) {
        attachVarToReg(valueLoc.number, expr.name, false);
      }
      return [
        [
          ...spillCode,
          `mov ${expr.name}, ${emitOperand(movTargetLoc)}\n`,
        ],
        valueLoc,
      ];
    }
    case "IntegerLiteral": {
      return emitImmediate([], expr.value, loc);
    }
    case "ListConstructor": {
      const entryCodes: string[] = [];
      const entryValues: string[] = [];
      for (const i of expr.exprs) {
        const [entryCode, entryValue] = emitExpr(
          i,
          {
            maxImmBits: 64,
            possibleRegs: "any",
            canBeMemory: false,
            minCorrectBits: 64,
            outputSize: 64,
            extensionType: "any",
          },
          program
        );
        if (entryValue.type !== "immediate") {
          throw new Error("List constructor with nonconstant entry");
        }
        entryCodes.push(...entryCode);
        entryValues.push(".quad " + entryValue.value + "\n");
      }
      const listLabel = freshLabel("list");
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
      // TODO use emitImmediate
      // if(loc.maxImmBits >= 32) {
      //   return [stringData, immOperand(stringLabel)];
      // }
      // const [spillCode, valueLoc] = allocateTempLoc(loc.possibleRegs, 64);
      // return [[
      //   ...stringData,
      //   ...spillCode,
      //   `mov $${stringLabel}, ${valueLoc}\n`,
      // ], valueLoc];
      return emitImmediate(stringData, stringLabel, loc);
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
  returnIn: PossibleLocation,
  program: IR.Program,
): [string[], Operand] {
  const func = builtins.get(funcName)!;
  const [saveCode, savedRegs] = saveTempRegs(func.args.concat(func.modifies));
  const argsCode = [];
  for (let i = 0; i< args.length; i++) {
    argsCode.push(...emitExpr(
      args[i],
      {
        maxImmBits: 0,
        possibleRegs: func.args[i],
        canBeMemory: false,
        minCorrectBits: 64,
        outputSize: 64,
        extensionType: "any",
      },
      program,
    )[0]);
  }
  const spillCode = spillRegsVars(func.modifies);
  const funcCode = [`call ${funcName}\n`];
  for (const i of func.args) {
    freeTempReg(i);
  }
  const restoreCode = restoreRegs(savedRegs);
  let outputCode: string[] = [];
  let outputLoc: Operand = immOperand(1n);
  if (func.returns !== undefined) {
    [outputCode, outputLoc] = movTempAlloc(
      regOperand(func.returns, 64),
      returnIn,
    );
  }
  return [[
    ...saveCode,
    ...argsCode,
    ...spillCode,
    ...funcCode,
    ...outputCode,
    ...restoreCode,
  ], outputLoc];
}