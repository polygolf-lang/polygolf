import { VirtualOpCodes, type Node, type SourcePointer, argsOf } from "../IR";

/**
 * This is an unrecoverable error. This should never be thrown unless there's a bug in Polygolf.
 */
export class InvariantError extends Error {
  constructor(message: string) {
    super(
      "A Polygolf Invariant was broken. This is a bug in Polygolf.\n" + message,
    );
    this.name = "InvariantError";
    Object.setPrototypeOf(this, UserError.prototype);
  }
}

/**
 * This is caused by javascript target emitting a code that cannot be parsed.
 */
export class InterpreterError extends InvariantError {
  constructor(executedJavascript: string) {
    super(
      `Error while executing the following javascript:\n${executedJavascript}`,
    );
    this.name = "InterpreterError";
    Object.setPrototypeOf(this, InterpreterError.prototype);
  }
}

/**
 * This is an error caused by a user of Polygolf. Parse errors, typecheck errors, etc.
 */
export class UserError extends Error {
  source?: SourcePointer;
  constructor(message: string, source: SourcePointer | Node | undefined) {
    super(message);
    this.source =
      source !== undefined && "kind" in source ? source.source : source;
    this.name = "UserError";
    Object.setPrototypeOf(this, UserError.prototype);
  }
}

/**
 * Particular feature is not implemented, but it might be in future.
 */
export class NotImplementedError extends UserError {
  expr: Node;
  constructor(expr: Node, detail?: string) {
    if (detail === undefined && "op" in expr && expr.op !== null) {
      detail = [
        expr.op,
        ...VirtualOpCodes.filter((x) => argsOf[x](expr) !== undefined),
      ].join(", ");
    }
    detail = detail === undefined ? "" : ` (${detail})`;
    const message = `emit error - ${expr.kind}${detail} not supported.\n`;
    super(message, expr.source);
    this.name = "EmitError";
    this.expr = expr;
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
