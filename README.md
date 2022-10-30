# PolyGolf

Ambitious polyglot autogolfer for https://code.golf

Design goals

- a language (IR) that compiles to many languages (C, Lua, Java, etc.)
- targeted languages are limited to those available on https://code.golf
  1. C-like mutable imperative (easy): Bash, BASIC, C, C#, C++, COBOL, Crystal, D, Dart, Fortran, Go, Java, JavaScript, Julia, Lua, Nim, Pascal, Perl, PHP, PowerShell, Python, Raku, Ruby, Rust, Swift, V, Zig
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

Requires npm and node 17.0+ installed.

To get started, clone the repository, then run

```
npm install
npm run build
npm install . --location=global
```

This will set up the `polygolf` command to point to the CLI script.

The usage is currently simple. Just pick an input PolyGolf file and target language:

```
polygolf -i src/programs/fibonacci.polygolf -l lua
```

Use `-o` to specify an output file:

```
polygolf -i src/programs/fibonacci.polygolf -l lua -o fibonacci.lua
```

To uninstall, use `npm uninstall polygolf --location=global`

## Development

To get started, clone the repository, then run `npm install` to install dependencies

After making a change, run `npm run build` before running the cli as `node dist/cli.js`.

The npm alias `npm run cli` is equivalent to `npm run build; node dist/cli.js`

Some concepts (visitor, Path, etc.) are similar to those used by the JavaScript transpiler Babel, so the [Babel plugin handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) is worth skimming.

## Competitiveness

PolyGolf is designed to be decent at golfing, so there's concern about making it public with applications to the competitive site https://code.golf. However, I will keep this repository and all PolyGolf features public with a few naive reference solutions. To avoid spoilers, solutions should not be shared unless they are naive/obvious solution to simple holes.

## Syntax

Program is a sequence of expressions.
Expression is either

- integer literal `58`,
- text literal `"text literal\n another line"`,
- variable `$very_important_var`,
- block of expressions `[print "block contents";]`,
- a choice of variants `{ variant1 / variant2 / variant3 }` or
- s-expression

S-expression takes one of the following forms:
`opcode`
or
`(opcode arg1 arg2 arg3 ...)`
or
`(arg1 opsymbol arg2)`
If the expression is top level or a direct child of a block, it is to be semicolon terminated instead:
`opcode arg1 arg2 arg3 ...;`
or
`arg1 opsymbol arg2`

Only symbols and division ops can be used in place of `opsymbol`.

Each expression can optionally be annotated with a type expression like this: `"text":Text`.

Type expression is either

- Integer range `-10..10`, `-oo..oo`, `0..oo`,
- Simple type `Text`, `Bool`, `Void` or
- S-expression using type expressions `(List (Set 0..100))`

Each variable must be first used in an assignment. Variable type is determined by the type annotation on the first assignment or the type of the value being assigned, if the annotation is missing.

### Statements & control flow

Loop over half-open integer range (exclusive upper bound) with optional step:  
`for $i $low $high [print $i;];`

`for $i $low $high $step [print $i;];`

While loop:  
`while $condition [$i <- ($i + 1);];`  
If with optional else-branch:  
`if $condition [print "Yes";] [print "No";];`  
Assignment:  
`assign $x 5;` or `$x <- 5;`

### Literals

Integer literals are unbounded and written in base 10. String literals are JSON string literals.  
List literals are written as n-ary s-expressions:  
`(list 1 2 3 4 5)`  
Array and set literals are similar:  
`(array 1 2 3)`, `(set 1 2 3)`  
Table literals are n-ary s-expressions taking a variable number of key-value pairs:  
`(table ("x" => 0) ("y" => 1) ("z" => 2))`

### Operations

All other expressions are Polygolf operators. Most of them return values, but some are used for I/O and some are used for setting values in collections.  
[Complete list of builtins](https://github.com/jared-hughes/polygolf/blob/main/src/IR/opcodes.ts).  
All of the Polygolf operators can be called using their name. In addition, several common ops are given symbolic aliases:

| Op name       | alias |
| ------------- | ----- |
| add           | +     |
| sub/neg       | -     |
| mul           | \*    |
| exp           | ^     |
| bitand        | &     |
| bitor         | \|    |
| bitxor/bitnot | ~     |
| eq            | ==    |
| neq           | !=    |
| leq           | <=    |
| lt            | <     |
| geq           | >=    |
| gt            | >     |
| assign        | <-    |
| cardinality   | #     |
| str_concat    | ..    |
| key_value     | =>    |

Notice how `-` and `~` both correspond to two ops - this is resolved by the used arity.
These symbolic aliases can also be used in an infix matter: `(+ 2 3)` is the same as (`2 + 3)`.
Additionaly, the following ops can be used as if they were n-ary: `add`,`mul`,`bitand`,`bitor`,`bitxor`,`str_concat`.  
For example, `(+ 1 2 3 4)` is the same as `(((1 + 2) + 3) + 4)`.

## Example

Example Fibonacci using variants

```clojure
$a:0..1346269 <- 0;
$b:0..1346269 <- 1;
for $i 0 31 [
    println $a;
    {   % temp variable
        $t:0..1346269 <- ($a + $b);
        $a <- $b;
        $b <- $t;
    /   % arithmetic trick
        $b <- ($b + $a);
        $a <- ($b - $a);
    }
];
```

This could compile to the following in C

```c
a;b=1;i=1;main(){for(;i++<31;b+=a;a=b-a)printf("%d\n",a);}
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

## Unrefined IR

The goal is to have a small but expressive core subset of language features. Approximately a lowest common denominator of most of the languages targeted.

The IR is a tree. Assignments are by value, not reference (no aliasing)

Types:

- `boolean`
- `integer` (unbounded; domain annotations may help language-specific narrowing to 32-bit ints etc)
- `string`
- `List<?>` (0 indexed)
- `Table<?,?>`

Constant literals for each type.

Control Flow:

- procedures (no functions for now for simplicity)
- if-else
- while

Builtin constants

- argv
- true
- false

Builtin functions:

- arithmetic: add, subtract, multiply, (integer) divide, exponent, mod (mathematical)
- integer comparison: less, greater, etc.
- indexing (table, string)
- conversions: (int <--> string, etc.)
- string ops: string concatenation, string split, print, length
- sort

[Complete list of builtins](https://github.com/jared-hughes/polygolf/blob/main/src/IR/opcodes.ts).

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

Finalize syntax. Solve most code.golf solutions in Polygolf to see what ops we are missing and implement those. Add MVPs for as many imperative languages as possible. Think about how to approach transforms for other paradigms. Cry.
