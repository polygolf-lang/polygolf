import { PolygolfError } from "../common/errors";
import {
  BaseExpr,
  Expr,
  id,
  Identifier,
  ValueType,
  IndexCall,
  LValue,
} from "./IR";

/**
 * Assignment statement of the form `variable = expr`. Raw OK
 *
 * Since many languages lack assignment expressions, assignments are
 * statement-level by default.
 */
export interface Assignment extends BaseExpr {
  kind: "Assignment";
  variable: LValue;
  expr: Expr;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment extends BaseExpr {
  kind: "ManyToManyAssignment";
  variables: LValue[];
  exprs: Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment extends BaseExpr {
  kind: "OneToManyAssignment";
  variables: LValue[];
  expr: Expr;
}

/**
 * Variable declaration with assignment
 */
export interface VarDeclarationWithAssignment extends BaseExpr {
  kind: "VarDeclarationWithAssignment";
  assignments: Assignment | ManyToManyAssignment;
  valueTypes?: ValueType[];
  requiresBlock: boolean;
}

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
  exprs: Expr[]
): ManyToManyAssignment {
  return {
    kind: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: (Identifier | string | IndexCall)[],
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
  valueTypes?: ValueType[]
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
