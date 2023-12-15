import { PolygolfError } from "../common/errors";
import {
  type BaseNode,
  id,
  type Identifier,
  type Type,
  type IndexCall,
  isIdent,
  type Node,
} from "./IR";

export type LValue = Identifier | IndexCall;

/**
 * Variable declaration.
 */
export interface VarDeclaration extends BaseNode {
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
export interface Assignment<T extends LValue = LValue> extends BaseNode {
  readonly kind: "Assignment";
  readonly variable: T;
  readonly expr: Node;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment extends BaseNode {
  readonly kind: "ManyToManyAssignment";
  readonly variables: readonly LValue[];
  readonly exprs: readonly Node[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment extends BaseNode {
  readonly kind: "OneToManyAssignment";
  readonly variables: readonly LValue[];
  readonly expr: Node;
}

export type SomeAssignment =
  | Assignment
  | OneToManyAssignment
  | ManyToManyAssignment;
/**
 * Variable declaration with assignment
 */
export interface VarDeclarationWithAssignment<T = SomeAssignment>
  extends BaseNode {
  readonly kind: "VarDeclarationWithAssignment";
  readonly assignment: T;
}

export interface VarDeclarationBlock extends BaseNode {
  readonly kind: "VarDeclarationBlock";
  readonly children: (VarDeclaration | VarDeclarationWithAssignment)[];
}

export function varDeclaration(
  variable: Identifier | string,
  variableType: Type,
): VarDeclaration {
  return {
    kind: "VarDeclaration",
    variable: typeof variable === "string" ? id(variable) : variable,
    variableType,
  };
}

export function assignment(
  variable: Identifier | string,
  expr: Node,
): Assignment<Identifier>;
export function assignment(
  variable: IndexCall,
  expr: Node,
): Assignment<IndexCall>;
export function assignment(variable: LValue | string, expr: Node): Assignment {
  return {
    kind: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function isAssignment(x: Node): x is Assignment {
  return x.kind === "Assignment";
}
export function isAssignmentToIdent<Name extends string>(
  ...names: (Name | Identifier<boolean, Name>)[]
): (x: Node) => x is Assignment<Identifier<boolean, Name>> {
  return ((x: Node) => isAssignment(x) && isIdent(...names)(x.variable)) as any;
}

export function manyToManyAssignment(
  variables: (LValue | string)[],
  exprs: readonly Node[],
): ManyToManyAssignment {
  return {
    kind: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: readonly (LValue | string)[],
  expr: Node,
): OneToManyAssignment {
  return {
    kind: "OneToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    expr,
  };
}

export function varDeclarationWithAssignment<T extends SomeAssignment>(
  assignment: T,
): VarDeclarationWithAssignment<T> {
  if (
    (isAssignment(assignment) && !isIdent()(assignment.variable)) ||
    (!isAssignment(assignment) &&
      assignment.variables.some((y) => !isIdent()(y)))
  ) {
    throw new PolygolfError(
      "VarDeclarationWithAssignment needs assignments to variables.",
      assignment.source,
    );
  }
  return {
    kind: "VarDeclarationWithAssignment",
    assignment,
  };
}

export function varDeclarationBlock(
  children: (VarDeclaration | VarDeclarationWithAssignment)[],
): VarDeclarationBlock {
  return {
    kind: "VarDeclarationBlock",
    children,
  };
}
