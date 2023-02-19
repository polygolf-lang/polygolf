import { PolygolfError } from "../common/errors";
import {
  BaseExpr,
  Expr,
  id,
  Identifier,
  Type,
  IndexCall,
  BinaryOpCode,
} from "./IR";

export type LValue = Identifier | IndexCall;

/**
 * Mutating operator.
 *
 * a += 5
 */
export interface MutatingBinaryOp extends BaseExpr {
  readonly kind: "MutatingBinaryOp";
  readonly op: BinaryOpCode;
  readonly name: string;
  readonly variable: LValue;
  readonly right: Expr;
}

/**
 * Variable declaration.
 */
export interface VarDeclaration extends BaseExpr {
  readonly kind: "VarDeclaration";
  readonly variable: Identifier;
  readonly variableType: Type;
}

/**
 * Assignment statement of the form `variable = expr`. Raw OK
 *
 * Since many languages lack assignment expressions, assignments are
 * statement-level by default.
 */
export interface Assignment extends BaseExpr {
  readonly kind: "Assignment";
  readonly variable: LValue;
  readonly expr: Expr;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment extends BaseExpr {
  readonly kind: "ManyToManyAssignment";
  readonly variables: readonly LValue[];
  readonly exprs: readonly Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment extends BaseExpr {
  readonly kind: "OneToManyAssignment";
  readonly variables: readonly LValue[];
  readonly expr: Expr;
}

export type SomeAssignment =
  | Assignment
  | OneToManyAssignment
  | ManyToManyAssignment;
/**
 * Variable declaration with assignment
 */
export interface VarDeclarationWithAssignment<T = SomeAssignment>
  extends BaseExpr {
  readonly kind: "VarDeclarationWithAssignment";
  readonly assignment: T;
  readonly types?: readonly Type[];
}

export interface VarDeclarationBlock extends BaseExpr {
  readonly kind: "VarDeclarationBlock";
  readonly children: (VarDeclaration | VarDeclarationWithAssignment)[];
}

export function mutatingBinaryOp(
  op: BinaryOpCode,
  variable: LValue,
  right: Expr,
  name: string = ""
): MutatingBinaryOp {
  return {
    kind: "MutatingBinaryOp",
    op,
    variable,
    right,
    name,
  };
}

export function varDeclaration(
  variable: Identifier | string,
  variableType: Type
): VarDeclaration {
  return {
    kind: "VarDeclaration",
    variable: typeof variable === "string" ? id(variable) : variable,
    variableType,
  };
}

export function assignment(
  variable: Identifier | string,
  expr: Expr
): Assignment & { variable: Identifier };
export function assignment(
  variable: IndexCall,
  expr: Expr
): Assignment & { variable: IndexCall };
export function assignment(variable: LValue | string, expr: Expr): Assignment {
  return {
    kind: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function manyToManyAssignment(
  variables: (LValue | string)[],
  exprs: readonly Expr[]
): ManyToManyAssignment {
  return {
    kind: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: readonly (LValue | string)[],
  expr: Expr
): OneToManyAssignment {
  return {
    kind: "OneToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    expr,
  };
}

export function varDeclarationWithAssignment<T extends SomeAssignment>(
  assignment: T,
  types?: readonly Type[]
): VarDeclarationWithAssignment<T> {
  if (
    (assignment.kind === "Assignment" &&
      assignment.variable.kind !== "Identifier") ||
    (assignment.kind !== "Assignment" &&
      assignment.variables.some((y) => y.kind !== "Identifier"))
  ) {
    throw new PolygolfError(
      "VarDeclarationWithAssignment needs assignments to variables.",
      assignment.source
    );
  }
  if (
    assignment.kind === "Assignment"
      ? 1
      : assignment.variables.length != types?.length
  ) {
    throw new PolygolfError(
      "Number of variables and number of types don't match.",
      assignment.source
    );
  }
  return {
    kind: "VarDeclarationWithAssignment",
    assignment,
    types,
  };
}

export function varDeclarationBlock(
  children: (VarDeclaration | VarDeclarationWithAssignment)[]
): VarDeclarationBlock {
  return {
    kind: "VarDeclarationBlock",
    children,
  };
}
