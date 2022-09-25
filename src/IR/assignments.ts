import { BaseExpr, Expr, id, Identifier, ValueType } from "./IR";

/**
 * Assignment statement of the form `variable = expr`. Raw OK
 *
 * Since many languages lack assignment expressions, assignments are
 * statement-level by default.
 */
export interface Assignment extends BaseExpr {
  type: "Assignment";
  variable: Identifier;
  expr: Expr;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment extends BaseExpr {
  type: "ManyToManyAssignment";
  variables: Identifier[];
  exprs: Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment extends BaseExpr {
  type: "OneToManyAssignment";
  variables: Identifier[];
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
  variable: Identifier | string,
  expr: Expr
): Assignment {
  return {
    type: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function manyToManyAssignment(
  variables: (Identifier | string)[],
  exprs: Expr[]
): ManyToManyAssignment {
  return {
    type: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: (Identifier | string)[],
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
  return {
    type: "VarDeclarationWithAssignment",
    assignments,
    requiresBlock,
    valueTypes,
  };
}
