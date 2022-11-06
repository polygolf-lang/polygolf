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
  type: "Assignment";
  variable: LValue;
  expr: Expr;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment extends BaseExpr {
  type: "ManyToManyAssignment";
  variables: LValue[];
  exprs: Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment extends BaseExpr {
  type: "OneToManyAssignment";
  variables: LValue[];
  expr: Expr;
}

/**
 * Variable declaration with assignment
 */
export interface VarDeclarationWithAssignment extends BaseExpr {
  type: "VarDeclarationWithAssignment";
  assignments: Assignment | ManyToManyAssignment;
  valueTypes?: ValueType[];
  requiresBlock: boolean;
}

export function assignment(
  variable: Identifier | string | IndexCall,
  expr: Expr
): Assignment {
  return {
    type: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function manyToManyAssignment(
  variables: (Identifier | string | IndexCall)[],
  exprs: Expr[]
): ManyToManyAssignment {
  return {
    type: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: (Identifier | string | IndexCall)[],
  expr: Expr
): OneToManyAssignment {
  return {
    type: "OneToManyAssignment",
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
    (assignments.type === "Assignment"
      ? [assignments.variable]
      : assignments.variables
    ).some((x) => x.type !== "Identifier")
  ) {
    throw new PolygolfError(
      "VarDeclarationWithAssignment needs assignments to variables.",
      assignments.source
    );
  }
  return {
    type: "VarDeclarationWithAssignment",
    assignments,
    requiresBlock,
    valueTypes,
  };
}
