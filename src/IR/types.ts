/** The type of the value of a node when evaluated */
export type ValueType =
  | { type: "void" }
  | { type: "number" }
  | { type: "string" }
  | { type: "boolean" }
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: "number" | "string"; value: ValueType }
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

export function simpleType(
  type: "void" | "number" | "string" | "boolean"
): ValueType {
  return { type };
}

export function tableType(
  key: "number" | "string",
  value: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "Table",
    key,
    value: typeof value === "string" ? simpleType(value) : value,
  };
}

export function setType(
  member: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "Set",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}

export function listType(
  member: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "List",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}

export function arrayType(
  member: ValueType | "void" | "number" | "string" | "boolean",
  length: number
): ValueType {
  return {
    type: "Array",
    member: typeof member === "string" ? simpleType(member) : member,
    length,
  };
}
