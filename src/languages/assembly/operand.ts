export interface BaseOperand {
  type: "register" | "immediate" | "memory",
}

export interface ImmOperand extends BaseOperand {
  type: "immediate",
  value: bigint | string,
}

export function immOperand(value: bigint | string): ImmOperand {
  return {
    type: "immediate",
    value: value,
  };
}

export interface RegOperand extends BaseOperand {
  type: "register",
  number: number,
  size: 8 | 16 | 32 | 64,
}

export function regOperand(number: number, size: 8 | 16 | 32 | 64): RegOperand {
  return {
    type: "register",
    number: number,
    size: size,
  }
}

export interface MemOperand extends BaseOperand {
  type: "memory",
  offset: number | string | undefined,
  base: number | undefined,
  index: number | undefined,
  scale: 1 | 2 | 4 | 8,
  size: 8 | 16 | 32 | 64,
}

export function memOperand(
  offset: number | string | undefined,
  base: number | undefined,
  index: number | undefined,
  scale: 1 | 2 | 4 | 8,
  size: 8 | 16 | 32 | 64,
): MemOperand {
  return {
    type: "memory",
    offset: offset,
    base: base,
    index: index,
    scale: scale,
    size: size,
  }
}

export function labelOperand(label: string, size: 8 | 16 | 32 | 64) {
  return memOperand(label, undefined, undefined, 1, size);
}

export type Operand = RegOperand | ImmOperand | MemOperand;

export function operandIsConstant(op: Operand, value: bigint) {
  if (op.type !== "immediate") {
    return false;
  }
  return op.value === value;
}

export function resize(op: Operand, size: 8 | 16 | 32 | 64) {
  switch (op.type) {
    case "immediate":
      return op;
    case "register":
      return regOperand(op.number, size);
    case "memory":
      return memOperand(op.offset, op.base, op.index, op.scale, size);
  }
}

const regNames: string[][] = []
for (let i of "acdb") {
  regNames.push([`%${i}l`, `%${i}x`, `%e${i}x`, `%r${i}x`]);
}
for (let i of ["sp", "bp", "si", "di"]) {
  regNames.push([`%${i}l`, `%${i}`, `%e${i}`, `%r${i}`]);
}
for (let i = 8; i < 16; i++) {
  regNames.push([`%r${i}b`, `%r${i}w`, `%r${i}d`, `%r${i}`]);
}

export function emitOperand(op: Operand): string {
  switch (op.type) {
    case "immediate":
      return `$${op.value}`;
    case "register": {
      const nameIndex = [8, 16, 32, 64].indexOf(op.size);
      return regNames[op.number][nameIndex];
    }
    case "memory": {
      let output = (op.offset ?? "").toString();
      if (op.base === undefined && op.index === undefined) {
        return output;
      }
      output += "(";
      if (op.base !== undefined) {
        output += regNames[op.base][3];
      }
      if (op.index === undefined) {
        return output + ")";
      }
      output += `,${regNames[op.index][3]}`;
      if (op.scale > 1) {
        output += `,${op.scale}`;
      }
      return output + ")";
    }
  }
}

export function emitReg(number: number, size: 8 | 16 | 32 | 64) {
  return emitOperand(regOperand(number, size));
}