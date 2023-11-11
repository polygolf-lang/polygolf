import { type TokenTree } from "@/common/Language";
import { EmitError, emitIntLiteral } from "../../common/emit";
import { type IR } from "../../IR";
import { type CompilationContext } from "@/common/compile";
import { SPACE_ANTIGOBBLE } from "./detokenizer";

// TODO-tex: somehow deal with quoting text, e.g. '#' cannot be written as-is.
// TODO-tex: <=, >=,!= are unsupported. Plugin to convert to >,<,=
// TODO-tex: would counter/helper defs go in imports.ts?

export default function emitProgram(
  program: IR.Node,
  context: CompilationContext,
): TokenTree {
  return new TexEmitter(program, context).emitProgram();
}

const macroParamRegex = /^#[1-9]$/;

interface EmitContext {
  /**
   * `scanningFor` is currently not used. I introduced it because I forgot you're
   * allowed to nest `\if`s. https://tex.stackexchange.com/a/315757/288147.
   * It will be useful as a check for nesting scanning macros.
   */
  readonly scanningFor: readonly string[];
  readonly macroDepth: number;
}

class TexEmitter {
  constructor(
    public program: IR.Node,
    public ctx: CompilationContext,
  ) {}

  emitProgram() {
    return this.emit(this.program);
  }

  private emitContext: EmitContext = {
    scanningFor: [],
    macroDepth: 0,
  };

  private readonly emitContextStack: EmitContext[] = [];

  private pushScanningFor(s: string) {
    this.pushContext({
      scanningFor: [...this.emitContext.scanningFor, s],
    });
  }

  private pushContext(c: Partial<EmitContext>) {
    this.emitContextStack.push(this.emitContext);
    this.emitContext = { ...this.emitContext, ...c };
  }

  private popContext() {
    const c = this.emitContextStack.pop();
    if (c === undefined) throw new Error("Popped more contexts than pushed");
    return this.emitContext;
  }

  private emit(e: IR.Node, withContext?: EmitContext): TokenTree {
    if (withContext === undefined) return this._emit(e);
    const currContext = this.emitContext;
    this.emitContext = withContext;
    const ret = this._emit(e);
    this.emitContext = currContext;
    return ret;
  }

  private emitInsideCurlies(n: IR.Node): TokenTree {
    this.pushContext({ scanningFor: [] });
    const ret = ["{", this.emit(n), "}"];
    this.popContext();
    return ret;
  }

  private _emit(e: IR.Node): TokenTree {
    const emit = (n: IR.Node) => this._emit(n);
    switch (e.kind) {
      case "Block":
        return e.children.map(emit);
      case "CapturingBlock":
        return this.emitInsideCurlies(e);
      case "FunctionDefinition":
        return this.emitDef(e);
      case "ScanningMacroCall":
        return [emit(e.func), e.args.map(emit)];
      case "FunctionCall":
        return [emit(e.func), e.args.map((a) => this.emitInsideCurlies(a))];
      case "Identifier":
        return e.name;
      case "Integer":
        return [emitIntLiteral(e), SPACE_ANTIGOBBLE];
      case "VarDeclaration":
        return ["\\newcount", e.variable.name];
      case "Text":
        // TODO: deal with escapes.
        return e.value;
      default:
        throw new EmitError(e);
    }
  }

  private emitDef(e: IR.FunctionDefinition): TokenTree {
    const ids = e.args.map((id) => {
      if (!macroParamRegex.test(id.name))
        throw new EmitError(id, "Invalid macro parameter.");
      const depth = this.emitContext.macroDepth;
      if (depth >= 3) throw new Error("Macro definitions nested too far");
      return "#".repeat(2 ** depth) + id.name[1];
    });
    const slashDef = e.isGlobal
      ? e.isExpanded
        ? "\\xdef"
        : "\\gdef"
      : e.isExpanded
      ? "\\edef"
      : "\\def";
    const body = this.emitInsideCurlies(e.body);
    return [slashDef, e.name.name, ids, body];
  }
}
