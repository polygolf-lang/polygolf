# PolyGolf

Ambitious polyglot autogolfer for https://code.golf

Design goals

- a language (IR) that compiles to many languages (C, Lua, Java, etc.)
- targeted languages are limited to those available on https://code.golf
  1. C-like mutable imperative (easy): Bash, BASIC, C, C#, C++, COBOL, Crystal, D, Dart, Fortran, Go, Java, JavaScript, Julia, Lua, Nim, Pascal, Perl, PHP, PowerShell, Python, Raku, Ruby, Rust, Swift, V, Zig
  2. mostly functional: Elixir, F#, Haskell, Lisp
  3. other: Assembly, ><>, brainfuck, GolfScript, Hexagony, J, K, Prolog, sed, SQL, VimL
- can compile PolyGolf to any language without language-specific annotations
- goal for each language target (vague): at most twice as long on average for all holes, aka score at least 500× number of holes

Read on for usage, or see [docs/architecture.md](docs/architecture.md) for the architecture.

## Usage

Requires npm and node 17.0+ installed.

To get started, clone the repository, then run

```
npm install
npm run build
npm install . --location=global
```

This will set up the `polygolf` command to point to the CLI script.

Polygolf CLI supports the following options:

- `--input`, `-i`: path to the input program
- `--lang`, `-l`: target language name or its extension, or `all` for targeting all supported languages
- `--output`, `-o`: output path, if omitted, output goes to stdout
- `--chars`, `-c`: if set, switches the objective from bytes to chars

To uninstall, use `npm uninstall polygolf --location=global`

## Competitiveness

PolyGolf is designed to be decent at golfing, so there's concern about making it public with applications to the competitive site https://code.golf. However, I will keep this repository and all PolyGolf features public with a few naive reference solutions. To avoid spoilers, solutions should not be shared unless they are naive/obvious solution to simple holes.

## Syntax

Program is a sequence of expressions.
Expression is either

- integer literal `58`,
- text literal `"text literal\n another line"`,
- variable `$very_important_var`,
- a block, potentially with multiple variants `{ variant1 / variant2 / variant3 }` or
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
`arg1 opsymbol arg2;`

Only symbols and division ops can be used in place of `opsymbol`.

Each expression can optionally be annotated with a type expression like this: `"text":Text`.

Type expression is either

- Integer range `-10..10`, `-oo..oo`, `0..oo`,
- Simple type `Text`, `Bool`, `Void` or
- S-expression using type expressions `(List (Set 0..100))`

Each variable must be first used in an assignment. Variable type is determined by the type annotation on the first assignment or the type of the value being assigned, if the annotation is missing.

### Statements & control flow

Loop over half-open integer range (exclusive upper bound) with optional step:  
`for $i $low $high {print $i;};`

`for $i $low $high $step {print $i;};`

While loop:  
`while $condition {$i <- ($i + 1);};`  
If with optional else-branch:  
`if $condition {print "Yes";} {print "No";};`  
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

| Op name         | alias |
| --------------- | ----- |
| add             | +     |
| sub/neg         | -     |
| mul             | \*    |
| pow             | ^     |
| bit_and         | &     |
| bit_or          | \|    |
| bit_xor/bit_not | ~     |
| eq              | ==    |
| neq             | !=    |
| leq             | <=    |
| lt              | <     |
| geq             | >=    |
| gt              | >     |
| assign          | <-    |
| list_length     | #     |
| text_concat     | ..    |
| key_value       | =>    |

Notice how `-` and `~` both correspond to two ops - this is resolved by the used arity.
These symbolic aliases can also be used in an infix matter: `(+ 2 3)` is the same as (`2 + 3)`.
Additionaly, the following ops can be used as if they were n-ary: `add`,`mul`,`bit_and`,`bit_or`,`bit_xor`,`text_concat`.  
For example, `(+ 1 2 3 4)` is the same as `(((1 + 2) + 3) + 4)`.

## Example

For more examples, search this repo for `*.test.md` files.

Example Fibonacci using variants

```clojure
$a:0..832040 <- 0;
$b:0..1346269 <- 1;
for $i 0 31 {
    println $a;
    {   % temp variable
        $t:0..1346269 <- ($a + $b):0..1346269;
        $a <- $b:0..832040;
        $b <- $t;
    /   % arithmetic trick
        $b <- ($b + $a):0..1346269;
        $a <- ($b - $a):0..832040;
    }
};
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
