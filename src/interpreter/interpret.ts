/**
 * This tree-walking interpreter has two main purposes:
 *   1. Serve as a reference interpretation of how Polygolf language constructs
 *      behave, so all language targets can agree.
 *   2. Validate the assertions of programs, such as checking that numbers
 *      always stay in their declared ranges.
 */
import { PolygolfError } from "../common/errors";
import { IR } from "../IR";
import calcOpResult from "./calcOpResult";
import {
  arrayValue,
  BooleanValue,
  integerValue,
  keyValueValue,
  ListValue,
  listValue,
  setValue,
  tableValue,
  TextValue,
  textValue,
  Value,
  voidValue,
} from "./value";

export function interpretToString(program: IR.Program, args: string[]): string {
  let output = "";
  new Interpreter(program, args, (s) => {
    output += s;
  }).run();
  return output;
}

class SymbolTable {
  readonly parent: SymbolTable | undefined = undefined;
  readonly map = new Map<string, Value>();

  get(name: string): Value | undefined {
    return this.map.get(name) ?? this.parent?.get(name);
  }

  getRequired(name: string) {
    const value = this.get(name);
    if (value === undefined)
      throw new PolygolfError(`Symbol ${name} not found`);
    return value;
  }

  set(name: string, value: Value) {
    // TODO: keep track of the actual declaration location, so global variables
    // get modified in the global symbol table, not local to functions.
    this.map.set(name, value);
  }
}

class Interpreter {
  readonly globals = new SymbolTable();
  // stack: IR.Node[];
  readonly argv: ListValue & { value: TextValue[] };

  constructor(
    readonly program: IR.Program,
    argv: readonly string[],
    readonly write: (s: string) => void
  ) {
    this.argv = listValue(argv.map(textValue));
  }

  run() {
    this.evalNode(this.program.body);
  }

  evalNode(n: IR.Expr): Value {
    // TODO: type checking, just about everywhere
    switch (n.kind) {
      // ====== constructors ======
      case "IntegerLiteral":
        return integerValue(n.value);
      case "ArrayConstructor":
        return arrayValue(
          n.exprs.map((m) => this.evalNode(m)),
          n.exprs.length
        );
      case "ListConstructor":
        return listValue(n.exprs.map((m) => this.evalNode(m)));
      case "SetConstructor":
        return setValue(new Set(n.exprs.map((m) => this.evalNode(m))));
      case "StringLiteral":
        return textValue(n.value);
      case "KeyValue": {
        const key = this.evalNode(n.key);
        const value = this.evalNode(n.value);
        if (key.kind !== "integer" && key.kind !== "text")
          throw new PolygolfError(
            `Expected integer or text in key of table but got ${key.kind}`
          );
        return keyValueValue(key, value);
      }
      case "TableConstructor":
        return tableValue(
          new Map(
            n.kvPairs.map((m) => {
              const v = this.evalNode(m);
              if (v.kind !== "KeyValue")
                throw new PolygolfError(
                  `Expected KeyValue in table constructor but got ${v.kind}`
                );
              return [v.key.value, v.value];
            })
          )
        );
      case "Function":
        throw "todo";
      // ====== operations ======
      case "UnaryOp":
      case "BinaryOp":
      case "PolygolfOp": {
        const args =
          n.kind === "PolygolfOp"
            ? n.args
            : n.kind === "BinaryOp"
            ? [n.left, n.right]
            : [n.arg];
        const argValues = args.map((m) => this.evalNode(m));
        if (n.op === "println" || n.op === "print") {
          const a = argValues[0];
          if (a.kind !== "integer" && a.kind !== "text")
            throw new PolygolfError(
              `${n.op} can only print integer or text.`,
              n.source
            );
          this.write(a.kind === "integer" ? a.value.toString() : a.value);
          if (n.op === "println") this.write("\n");
          return voidValue;
        }
        return calcOpResult(n, n.op, argValues, this.argv);
      }
      // ====== modification ======
      case "Assignment": {
        if (n.variable.kind === "Identifier") {
          const val = this.evalNode(n.expr);
          this.globals.set(n.variable.name, val);
          return val;
        } else {
          // const lhs = this.evalNode(n.variable.collection);
          // const index = this.evalNode(n.variable.index)
          // const rhs = this.evalNode(n.expr);
          throw "todo";
        }
      }
      case "ManyToManyAssignment":
        throw "todo";
      // ===== iteration and branching =====
      case "Block":
        n.children.forEach((m) => this.evalNode(m));
        return voidValue;
      case "ConditionalOp":
        if (this.evalBoolean(n.condition).value)
          return this.evalNode(n.consequent);
        else return this.evalNode(n.alternate);
      case "IfStatement":
        // effectively duplicate of ConditionalOp
        if (this.evalBoolean(n.condition).value)
          return this.evalNode(n.consequent);
        else if (n.alternate !== undefined) return this.evalNode(n.alternate);
        else return voidValue;
      case "ForCLike":
        this.evalNode(n.init);
        while (this.evalBoolean(n.condition).value) {
          this.evalNode(n.body);
          this.evalNode(n.append);
        }
        return voidValue;
      case "ForEach": {
        const obj = this.evalNode(n.collection);
        throw "todo";
      }
      case "ForEachKey":
      case "ForEachPair":
        throw "todo";
      case "ForRange": {
        const low = this.evalNode(n.low);
        const high = this.evalNode(n.high);
        const step = this.evalNode(n.increment);
        if (
          low.kind !== "integer" ||
          high.kind !== "integer" ||
          step.kind !== "integer"
        )
          throw new PolygolfError(
            `ForRange bound must be an integer`,
            n.source
          );
        const upper = n.inclusive ? high.value : high.value - 1n;
        for (let i = low.value; i <= upper; i += step.value) {
          this.globals.set(n.variable.name, integerValue(i));
          this.evalNode(n.body);
        }
        return voidValue;
      }
      case "FunctionCall":
        throw "todo";
      case "Identifier":
        // TODO: scoping and stuff
        return this.globals.getRequired(n.name);
      case "MutatingBinaryOp":
      case "OneToManyAssignment":
        throw "todo";
      case "WhileLoop":
        while (this.evalBoolean(n.condition).value) {
          this.evalNode(n.body);
        }
        return voidValue;
      // ===== unsupported =====
      case "RangeIndexCall":
      case "IndexCall":
      case "ImportStatement":
      case "MethodCall":
      case "VarDeclaration":
      case "VarDeclarationWithAssignment":
      case "Variants":
        throw new PolygolfError(
          `Unexpected target-only node ${n.kind} while evaluating`,
          n.source
        );
    }
  }

  evalBoolean(n: IR.Expr): BooleanValue {
    const value = this.evalNode(n);
    if (value.kind !== "boolean")
      throw new PolygolfError(
        `Expected boolean but got ${value.kind}`,
        n.source
      );
    return value;
  }
}
