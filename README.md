# PolyGolf

Ambitious polyglot autogolfer for https://code.golf

Design goals

- a language (IR) that compiles to many languages (C, Lua, Java, etc.)
- targeted languages are limited to those available on https://code.golf
  1. C-like mutable imperative (easy): Bash, BASIC, C, C#, C++, COBOL, Crystal, D, Fortran, Go, Java, JavaScript, Julia, Lua, Nim, Pascal, Perl, PHP, PowerShell, Python, Raku, Ruby, Rust, Swift, V, Zig
  2. mostly functional: Elixir, F#, Haskell, Lisp
  3. other: Assembly, ><>, brainfuck, GolfScript, Hexagony, J, K, Prolog, sed, SQL, VimL
- can compile PolyGolf to any language without language-specific annotations
- alternative options and domain annotations may help recognition of language-specific idioms
- goal for each language target (vague): at most twice as long on average for all holes, aka score at least 500× number of holes

Processing pipeline

1. Parse frontend to unrefined IR
2. Detect all idioms required for the language, and replace in the IR

- if an idiom may or may not save bytes depending on some details, mark it as one of several alternatives. For example, a procedure or function used twice may or may not be shorter when inlined. Try both alternatives and compare
- this might lead to exponential complexity, so there should be flags to avoid excessive branching. Similarly to -O3 in gcc spending more time compiling for faster output, our -O3 would spend more time compiling for shorter output

3. Emit to the desired language

## Usage

Requires npm and node installed.

To get started, clone the repository, then to install, run

```
npm install
npm run build
npm install . --location=global
```

This will set up the `polygolf` command to point to the CLI script.

To uninstall, use `npm uninstall polygolf --location=global`

## Development

To get started, clone the repository, then run `npm install` to install dependencies

After making a change, run `npm run build` before running the cli as `node dist/cli.js`.

The npm alias `npm run cli` is equivalent to `npm run build; node dist/cli.js`

Some concepts (visitor, Path, etc.) are similar to those used by the JavaScript transpiler Babel, so the [Babel plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) is worth skimming.

## Example

Example naive Fibonacci (in a hypothetical lisp + imperative syntax):

```py
(declare a integer)
(declare b integer)
(declare i integer)
a = 0
b = 1
i = 1
while (< i 31) {
  (println a)
  t = (add a b)
  b = a
  a = t
  i = (add i 1)
}
```

This could compile to the following in C

```c
a;b=1;t;i=1;main(){for(;i++<31;t=a+b,b=a,a=t)printf("%d\n",a);}
```

Note the following C-specific features, besides the syntax:

- declarations out front
- default values (0) omitted
- statements moved inside the for loop (!)

The same unrefined IR could compile to the following in Lua:

```lua
a=0
b=1
for i=1,30 do print(a)a,b=a+b,a end
```

Note the following Lua-specific features, besides the syntax:

- foreach-range loop instead of a glorified while loop (!)
- temporary variable replaced with simultaneous assignment (!)

## Competitiveness

PolyGolf is designed to be decent at golfing, so there's concern about making it public with applications to the competitive site https://code.golf. However, I will keep this repository and all PolyGolf features public with a few naive reference solutions. To avoid spoilers, solutions should not be shared unless they are naive/obvious solution to simple holes.

## Frontend

TODO. For now just create the unrefined IR directly. Worry about syntax later.

## Unrefined IR

The goal is to have a small but expressive core subset of language features. Approximately a lowest common denominator of most of the languages targeted.

The IR is a tree. Assignments are by value, not reference (no aliasing)

Types:

- `boolean`
- `integer` (unbounded; domain annotations may help language-specific narrowing to 32-bit ints etc)
- `string`
- `List<?>` (0 indexed)
- `Table<?,?>` (not implementing for now)

Constant literals for each type.

Control Flow:

- procedures (no functions for now for simplicity)
- if-else
- while

Opcodes:

- arithmetic: add, subtract, multiply, (integer) divide, exponent, mod (mathematical)
- integer comparison: less, greater, etc.
- indexing: `array_get`, `table_get`, `str_get_byte`
- conversions: `int_to_string`, `str_to_int`
- string ops: string concatenation, string split, print, length
- array/list/table `length`
- `taable_keys`
- `sort`

Unicode support would benefit from `string_get_char`, and related methods. todo later.

String comparison?

## Idiom recognition (backend)

Where the magic happens for golfing. Mixins shared across languages for idiom recognition, for example replacing (the IR for) `i=1;while(i<5)do i=i+1 end` with (the IR for) `for i=1,4 do end` when targeting Lua. The same IR code (loop over range) would represent `for i in range(1,5)` in Python, so the same mixin can target several languages.

Planned idioms:

- automatic 1-indexing correction (necessary for 1-indexed langs)
- constant collapse e.g. 2+1 → 3 to golf automatic 1-indexing correction
- replace while loops with foreach-range loops (Lua, Python, etc)
- replace exponent that has base 2 with bitshift (C, other)
- inline procedures used exactly once (most langs)
- if string concatenation's only purpose is to be printed, then split each appended part into its own print statement (C, other languages with long concat)
- merge several prints into one print (pretty much every language)
- replace while loops with for loops (C, Java, etc)
- replace temp variable with simultaneous assignment (Lua, Python, etc)
- variable shortening (all languages): convert all variables to a single letter, to allow for more-verbose PolyGolf code
- ...much more. We'll see what's useful when starting

## Implementation plan

Backend first. Only numbers, booleans, strings; add lists and tables later.
