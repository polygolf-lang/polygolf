import { SourcePointer } from "../IR";

export class PolygolfError extends Error {
  source?: SourcePointer;
  constructor(message: string, source?: SourcePointer) {
    super(message);
    this.source = source;
    this.name = "PolygolfError";
    Object.setPrototypeOf(this, PolygolfError.prototype);
  }
}
