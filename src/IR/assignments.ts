import { PolygolfError } from "../common/errors";
import { BaseExpr, Expr, id, Identifier, Type, IndexCall, LValue } from "./IR";

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

/**
 * Variable declaration with assignment
 */
export interface VarDeclarationWithAssignment extends BaseExpr {
  readonly kind: "VarDeclarationWithAssignment";
  readonly assignments: Assignment | ManyToManyAssignment;
  readonly valueTypes?: readonly Type[];
  readonly requiresBlock: boolean;
}

export function assignment(
  variable: Identifier | string,
  expr: Expr
): Assignment & { variable: Identifier };
export function assignment(
  variable: IndexCall,
  expr: Expr
): Assignment & { variable: IndexCall };
export function assignment(
  variable: Identifier | string | IndexCall,
  expr: Expr
): Assignment {
  return {
    kind: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function manyToManyAssignment(
  variables: (Identifier | string | IndexCall)[],
  exprs: readonly Expr[]
): ManyToManyAssignment {
  return {
    kind: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: readonly (Identifier | string | IndexCall)[],
  expr: Expr
): OneToManyAssignment {
  return {
    kind: "OneToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    expr,
  };
}

export function varDeclarationWithAssignment(
  assignments: Assignment | ManyToManyAssignment,
  requiresBlock: boolean = true,
  valueTypes?: readonly Type[]
): VarDeclarationWithAssignment {
  if (
    (assignments.kind === "Assignment"
      ? [assignments.variable]
      : assignments.variables
    ).some((x) => x.kind !== "Identifier")
  ) {
    throw new PolygolfError(
      "VarDeclarationWithAssignment needs assignments to variables.",
      assignments.source
    );
  }
  return {
    kind: "VarDeclarationWithAssignment",
    assignments,
    requiresBlock,
    valueTypes,
  };
}
