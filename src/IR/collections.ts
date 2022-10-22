import { BaseExpr, Expr } from "./IR";
/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor extends BaseExpr {
  type: "ArrayConstructor";
  exprs: Expr[];
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor extends BaseExpr {
  type: "ListConstructor";
  exprs: Expr[];
}

export function arrayConstructor(exprs: Expr[]): ArrayConstructor {
  return {
    type: "ArrayConstructor",
    exprs,
  };
}

export function listConstructor(exprs: Expr[]): ListConstructor {
  return {
    type: "ListConstructor",
    exprs,
  };
}
