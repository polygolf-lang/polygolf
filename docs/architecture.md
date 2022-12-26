# Architecture

Polygolf is a source-to-source transpiler: It takes in Polygolf code and spits out code in another language (the target). The data flow can be summarized as:

1. Polygolf frontend code (type: `string`)

   Written by a human

2. Intermediate representation (IR) for the frontend code (type: `Program`)

   Parsed directly from Polygolf frontend code. The relevant code driving this is in `src/frontend`.

3. Intermediate representation (IR) for the target code (type: `Program`)

   The transformation of the frontend IR to this is the core to supporting languages and the primary source of automatic golfing, so it is discussed more below. This is specified in language-specific configurations such as `src/languages/lua/index.ts`.

4. Tokens in the target language (type: `string[]`)

   Creating this from the target IR essentially consists of a big `switch` block for each node type in the IR. A main source of mistakes here is incorrect parenthesization rules.

5. Code in the target language (type: `string`)

   This mostly consists of just joining up the tokens to one big string, though it also supports indent/dedent tokens (for Python). Customizing the detokenizer lets a language configure when whitespace is needed between tokens.

## Intermediate Representation (IR) Transformations

A language specifies transformations as a series of plugins currently executed in order. For example, the Lua target uses a plugin that converts for-range loops with exclusive upper bounds to for-range loops with inclusive upper bounds. Python does not use this plugin; Lua's `for i=0,5 do` construct includes `i=5`, but Python's `for i in range(5):` does not.

You may notice that the IR Transformation has the same type input as output. This implies that the simplest target language would simply not transform the IR: this is the Polygolf target, which really just takes Polygolf code in and outputs approximately the same. Useful for debugging.

The type match-up also implies there are no type-system checks to ensure that your target language's invariants are maintained: a later plugin might add a for-range loop with exclusive bound to a Lua script, for example. The takeaway here is just be careful what the plugins are doing: documentation helps.

## Soundness and Number types

The transpiler is expected to be sound*ish* (i.e., it doesn't break programs most of the time), so each plugin is expected to be sound as well. This is hard to ensure in general, but the strict type system helps.

A part of the type system that helps with soundness is the interval number types. For example, a value with type `1..100` (integer from 1 to 100, inclusive) can be safely used for the same output in both modulo and remainder (C-style "mod"), as well as stored in small data types such as `u8` or C's `byte`.

## Variants

A unique part of the Polygolf IR is variants. For example, one plugin introduces a variant that flips commutative binary operators such as addition. For example, it changes `(a + b)` to `{ (a + b) / (b + a) }`, read as "either `(a + b)` or `(b + a)`". This allows for the transpiler to pursue different golfing options. For example, `x=a+L[1]y=x^x` in Lua is one byte shorter than `x=L[1]+a y=x^x`.

Polygolf writers can also introduce variants directly in the language syntax.

Variant expansion is currently done in `src/common/expandVariants` by trying all combinations of variants; a smarter approach is under discussion.

## Adding a language target

To add a new language target, create a new folder in `src/languages`. The Polygolf target is good to start from: begin by preparing the emitter for your language, then continue adding plugins.
