import { Expr, Identifier } from "./IR";

/**
 * Assignment statement of the form `variable = expr`. Raw OK
 *
 * Since many languages lack assignment expressions, assignments are
 * statement-level by default.
 */
export interface Assignment {
  type: "Assignment";
  variable: Identifier;
  expr: Expr;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment {
  type: "ManyToManyAssignment";
  variables: Identifier[];
  exprs: Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment {
  type: "OneToManyAssignment";
  variables: Identifier[];
  expr: Expr;
}
