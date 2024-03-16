import { isOp, isText, text } from "@/IR";
import { type Language, type Plugin, search, required } from "./Language";
import compile from "./compile";
import { compilationOptionsFromKeywords } from "@/markdown-tests";
import { NotImplementedError, UserError } from "./errors";

const textLang: Language = {
  name: "text",
  extension: "txt",
  emitter: {
    emit(program, context) {
      return (program.kind === "Block" ? program.children : [program])
        .map((x) => {
          if (isOp()(x) && x.args.length > 0 && isText()(x.args[0]!)) {
            if (x.args[0].value.endsWith("X")) {
              context.addWarning(
                new UserError("global warning", undefined),
                true,
              );
              context.addWarning(
                new UserError(
                  "local warning that should not be visible",
                  undefined,
                ),
                false,
              );
            }
            context.addWarning(
              new UserError("local warning that should be visible", undefined),
              false,
            );
            return [x.args[0].value];
          } else throw new NotImplementedError(x);
        })
        .join("");
    },
  },
  phases: [
    search({
      name: "trimEnd",
      visit(node) {
        return isText()(node) ? text(node.value.trimEnd()) : undefined;
      },
    }),
    required(nopPlugin("noop")),
    search({
      name: "appendX",
      visit(node) {
        return isText()(node) ? text(node.value + "X") : undefined;
      },
    }),
  ],
};

function compile1(
  source: string,
  language: Language,
  ...compilationKeywords: string[]
) {
  return compile(
    source,
    compilationOptionsFromKeywords(compilationKeywords),
    language,
  )[0];
}

const testProgram = `{print ":) "; / print "🙂 ";}`;

describe("Pick shortest variant", () => {
  test("by bytes", () => {
    expect(compile1(testProgram, textLang).result).toEqual(":)");
  });
  test("by chars", () => {
    expect(compile1(testProgram, textLang, "chars").result).toEqual("🙂");
  });
});

describe("Warnings", () => {
  const warnings = compile1(testProgram, textLang).warnings.map(
    (x) => x.message,
  );
  test("global warning and local warning on the shortest path show up", () => {
    expect(warnings).toEqual(
      expect.arrayContaining([
        "global warning",
        "local warning that should be visible",
      ]),
    );
  });
  test("local warning on longer path don't show up", () => {
    expect(warnings).not.toEqual(
      expect.arrayContaining(["local warning that should not be visible"]),
    );
  });
});

function nopPlugin(name: string): Plugin {
  return {
    name,
    visit(node) {
      return { ...node };
    },
  };
}

const randomLang: Language = {
  name: "random",
  extension: "random",
  emitter: {
    emit() {
      return "x".repeat(Math.floor(Math.random() * 100));
    },
  },
  phases: [
    required(nopPlugin("a"), nopPlugin("b"), nopPlugin("c"), nopPlugin("d")),
    search(nopPlugin("e"), nopPlugin("f")),
    required(nopPlugin("g"), nopPlugin("h"), nopPlugin("i"), nopPlugin("j")),
    search(nopPlugin("k"), nopPlugin("l")),
    required(nopPlugin("m"), nopPlugin("n"), nopPlugin("o"), nopPlugin("p")),
  ],
};

describe("Plugin application sequence", () => {
  const requiredPluginNames = randomLang.phases
    .filter((x) => x.mode === "required")
    .flatMap((x) => x.plugins.map((y) => y.name));
  for (let i = 1; i <= 4; i++) {
    describe(`Random run ${i}`, () => {
      const history = compile1(testProgram, randomLang).history.map(
        (x) => x[1],
      );
      test("Sequence of phases is respected", () => {
        expect(history).toEqual([...history].sort());
      });
      test("All required plugins are applied", () => {
        expect(history).toEqual(expect.arrayContaining(requiredPluginNames));
      });
    });
  }
});
