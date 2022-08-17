# PolyGolf

Ambitious polyglot autogolfer for https://code.golf

Design goals

- a language (IR) that compiles to many languages (C, Lua, Java, etc.)
- targeted languages are limited to those available on https://code.golf
  1. C-like mutable imperative: BASIC, C, C#, C++, COBOL, Crystal, D, Fortran, Go, Java, JavaScript, Julia, Lua, Nim, Pascal, Perl, PHP, PowerShell, Python, Raku, Ruby, Rust, Swift, V, Zig (less?)
  2. mostly functional: Elixir, F#, Haskell, Lisp
  3. other imperative: Assembly, Bash (more?)
  4. other: ><>, brainfuck, GolfScript, Hexagony, J, K, Prolog, sed, SQL, VimL
- can compile PolyGolf to any language without language-specific annotations
- alternative options and domain annotations may help recognition of language-specific idioms
- goal for each language target (vague): at most twice as long on average for all holes, aka score at least 500× number of holes

Processing pipeline

1. Parse frontend to unrefined IR
2. Detect all idioms required for the language, and replace in the IR

- if an idiom may or may not save bytes depending on some details, mark it as one of several alternatives

3. Emit to the desired language

## Competitiveness

PolyGolf is designed to be decent at golfing, so there's concern about making it public with applications to the competitive site https://code.golf. However, I will keep this repository and all PolyGolf features public with a few naive reference solutions. To avoid spoilers, solutions should not be shared unless they are naive/obvious solution to simple holes.

## Frontend

TODO. For now just create the unrefined IR directly. Worry about syntax later.

## Unrefined IR

The goal is to have a small but expressive core subset of language features. Approximately a lowest common denominator of most the languges targeted.

The IR is three-address code plus mutable globals and control flow

Example Fibonacci:

```py
0   integer_literal 0
1   a = 0               # a = 0
2   integer_literal 1
3   b = 2               # b = 1
4   i = 2               # i = 1
5   integer_literal 31
6   less i 5            # i < 31
7   while_start 12
8   print a             # print(a)
9   add a b
10  b = a
11  a = 9
12  while_end 7
```

Is this too flat? Should the `while` be some nested structure instead of `jmp`-style flat assembly?

Types:

- `boolean`
- `integer` (unbounded; domain annotations may help language-specific narrowing to 32-bit ints etc)
- `string`
- `Map<?,?>`
- `Array<?>` (can be implemented as `Map<integer,?>`) (0 indexed)

Constant literals for each type.

Control Flow:

- procedures (no functions for now for simplicity)
- if-else
- while

Opcodes:

- arithmetic: add, subtract, multiply, (integer) divide, exponent
- integer comparision: less, greater, etc.
- indexing: `array_get`, `map_get`, `string_get_byte`
- conversions: `int_to_string`, `string_to_int`
- string ops: string concatenation, print
- `map_keys`
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
- ...much more. We'll see what's useful when starting
