# Architecture

To get started, clone the repository, then run `npm install` to install dependencies

After making a change, run `npm run build` before running the cli as `node dist/cli.js`.

To run tests, run `npm run test`.

The npm alias `npm run cli` is equivalent to `npm run build; node dist/cli.js`

Some concepts (visitor, Path, etc.) are similar to those used by the JavaScript transpiler Babel, so the [Babel plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) is worth skimming.

Polygolf is a source-to-source transpiler: It takes in Polygolf code and spits out code in another language (the target). The data flow can be summarized as:

1. Polygolf frontend code (type: `string`)

   Written by a human

2. Intermediate representation (IR) for the frontend code (type: `Program`)

   Parsed directly from Polygolf frontend code. The relevant code driving this is in `src/frontend`.

3. Intermediate representation (IR) for the target code (type: `Program`)

   The transformation of the frontend IR to this is the core to supporting languages and the primary source of automatic golfing, so it is discussed more below. This is specified in language-specific configurations such as `src/languages/lua/index.ts`.

4. Tree of tokens in the target language (type: `TokenTree`)

   Creating this from the target IR essentially consists of a big `switch` block for each node type in the IR. A main source of mistakes here is incorrect parenthesization rules.

5. Code in the target language (type: `string`)

   This mostly consists of just joining up the tokens to one big string, though it also supports indent/dedent tokens (for Python). There are two levels of abstraction / customization here. The first is just controlling when whitespace should be inserted to separate the tokens and the second is an arbitrary transform of the token tree.

## Idiom recognition (backend)

Where the magic happens for golfing. Plugins are shared across languages for idiom recognition.

Plugins are implemented in the `src/plugins` folder.

**Implemented idioms:**

- mutating binary ops - Python, etc.: `a=a+2` → `a+=2`
- use remainder instead of modulo where the two ops overlap - Nim, etc.
- replace table lookup by lookup by bruteforced hashes of keys - Nim, etc.
- variable shortening - convert all variables to a single letter
- replace temp variable with simultaneous assignment - Lua, Python, etc.
- convert Polygolf's exclusive upper bound for range loops to inclusive - Lua, etc.
- convert for loop to a while loop
- convert for range loop to a C like for loop
- convert for range + list index to a foreach loop - Python, etc.
- convert `for_argv` loop to the correct form in each language
- shift the bounds of a for range loop to avoid having to 1-adjust the loop variable
- pack printing of number sequences
- replace `println` with `print` with explicit `\n`
- replace the last printing command by the shortest of the two
- replace a list of strings constructor by a split on a string - Nim, Python, etc.
- statically evaluate parts of the program and replace with the literal result

**Planned plugins & idioms:**

[Plugin issues](https://github.com/polygolf-lang/polygolf/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement+label%3Aplugin)

## Intermediate Representation (IR) Transformations

A language specifies transformations as a series of phases. Each phase is defined by an array of plugins and a mode in which they are applied:

- "required" All of the plugins must be applied in the specified order (to get an valid target language source).
- "simplegolf" The plugins don't need to be applied to get a valid output, but they should be applied to get a shorter output. These are simple golfing plugins that are guaranteed to never make the output longer.
- "search" These plugins might make the output shorter or longer, depending on the context. It is up to the search algorithm to determine which of these and in what order to apply.

A typical language would use a single "preprocess" required phase, a single "search" phase and then a couple of "required" & "simplegolf" phases. However, the first search phase usually operates on a program that is close to the Polygolf frontend and it might be useful to include a second search phase that operates on nodes that are close to the target language, just before it is emitted.

For example, the Lua target uses a plugin that converts for-range loops with exclusive upper bounds to for-range loops with inclusive upper bounds. Python does not use this plugin; Lua's `for i=0,5 do` construct includes `i=5`, but Python's `for i in range(5):` does not.

You may notice that the IR Transformation has the same type input as output. This implies that the simplest target language would simply not transform the IR: this is the Polygolf target, which really just takes Polygolf code in and outputs approximately the same. Useful for debugging.

The type match-up also implies there are no type-system checks to ensure that your target language's invariants are maintained: a later plugin might add a for-range loop with exclusive bound to a Lua script, for example. The takeaway here is just be careful what the plugins are doing: documentation helps.

## Soundness and Number types

The transpiler is expected to be sound*ish* (i.e., it doesn't break programs most of the time), so each plugin is expected to be sound as well. This is hard to ensure in general, but the strict type system helps.

A part of the type system that helps with soundness is the interval number types. For example, a value with type `1..100` (integer from 1 to 100, inclusive) can be safely used for the same output in both modulo and remainder (C-style "mod"), as well as stored in small data types such as `u8` or C's `byte`.

## Immutability

All nodes in the IR are consistently immutable. For example, after construction of a node, `JSON.stringify(node)` should always give the same string. This is enforced in the type system (as well as it could) by marking all the properties as `readonly`. Do not circumvent this.

Consistent immutability allows for two main performance improvements. First, it removes the need for cloning the entire program tree when one node changes. When a node gets replaced with a new node, only its parent (and ancestors, up to the program node) need to be replaced to get a new valid program state; the rest of the nodes in the old tree can be re-used in the new tree.

Second, any function on a node can be cached using the reference to the node (`WeakMap`s are good for this because they allow for garbage collection of their keys, the nodes). This implies that the values of a function on a node should not depend on the ancestors of the node; in particular, the type of an expression should not depend on parent nodes. This is impossible due to global variables having a type, so we relax the constraint to only requiring that the type of a node should be the same for all program trees it could be in. If you change the type of a variable, swap out at minimum all the nodes the variable is used in.

## Variants

The key to golfing is considering alternatives which may or may not be shorter. Authors can specify variant options in the frontend by using variants. For example, `{ (5 div x) / (8 - (3 * x)) }` provides two variants for an expression that takes 1 and 2 to 5 and 2 respectively. A language in which floor division is short may end up picking the first variant, while other languages could pick the second variant. Variants are expanded `src/common/expandVariants` by trying all combinations of variants, which is acceptable for now because authors only introduce a few variants.

The main time spent optimizing the output for each language does not use variant nodes in the sense of the frontend. Instead, plugins suggest new programs by providing a new node for an old node to be replaced with. The documentation for this is in the `Plugin` interface at `src/common/Language.ts`.

## Adding a language target

To add a new language target, create a new folder in `src/languages`. The Polygolf target is good to start from: begin by preparing the emitter for your language, then continue adding plugins.

## Tests

Most Polygolf tests suits are defined using `*.test.md` files. These are used to test individual languages or individual plugins. The structure of these files is as follows:

- Headings are used to group the tests
- Code blocks are used to define the actual tests.
- All other markdown syntax is ignored.

Each codeblock is required to have the language annotation and optionally other test parameters/options/commands (all space-separated).
If the language is `polygolf` (with no other options) it denotes an input, otherwise an output.
Multiple output blocks can relate to a single input block.

Supported options are

- `skip` = this code block is ignored
- `nogolf` = sets the `compilationOptions.level` to "nogolf", so only "required" phases are applied
- `simple` = sets the `compilationOptions.level` to "simple", so only "required" & "simple" phases are applied
- `full` = sets the `compilationOptions.level` to "full", this is the default
- `chars` = sets the `compilationOptions.objective` to "chars"
- `bytes` = sets the `compilationOptions.objective` to "bytes", this is the default
- `allVariants` = sets the `compilationOptions.allVariants` to true, default is false
- `skipTypecheck` = sets the `compilationOptions.skipTypecheck` to true, this is the default for plugin tests
- `typecheck` = sets the `compilationOptions.skipTypecheck` to false, this is the default for language tests
- `restrictFrontend` = sets the `compilationOptions.restrictFrontend` to true, default is false
- `{path}.{plugin}` = the given plugin is applied (as a required plugin)

To test other aspects of Polygolf, use jest in `*.test.ts` files.
