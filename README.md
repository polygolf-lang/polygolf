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

### Literals

Integer literals are unbounded and written in base 10. String literals are JSON string literals.  
List literals are written as n-ary s-expressions:  
`(list 1 2 3 4 5)`  
Array and set literals are similar:  
`(array 1 2 3)`, `(set 1 2 3)`  
Table literals are n-ary s-expressions taking a variable number of key-value pairs:  
`(table ("x" => 0) ("y" => 1) ("z" => 2))`

## Semantics

All nodes in the Polygolf tree are expressions and each expression has a specific type. Some expressions don't return a value - these have the unit type.

### Types

Polygolf is strongly typed, featuring the following types:

- `Void` - the unit type - this is the return type of statements.
- `Bool` - boolean.
- `Int` or `-oo..oo` - integer of unlimited size`, with its subtypes:
  - `LowerBound..UpperBound` - Where the bounds are inclusive integer literals or "-oo" or "oo".
- `Text` - unicode string of unlimited length, with its subtypes:
  - `(Text SomeIntegerType)`, where `SomeIntegerType` is a subtype of `Int` and signifies the type of the text codepoint length, for example `(Text 1..1)` is a text with exactly one codepoint.
  - `Ascii` - string consisting of ascii characters only.
  - `(Ascii SomeIntegerType)`, where `SomeIntegerType` is a subtype of `Int` and signifies the type of the text length, for example `(Ascii 1..1)` is a text with exactly one ascii character.
- `(List MemberType)` - dynamic length, zero indexed sequence of items of type `MemberType`.
- `(Array MemberType lengthLiteral)` - fixed length, zero indexed sequence of items of type `MemberType`. This currently has limited support.
- `(Table InType OutType)` - partial table / dictionary / map from values of type `InType` to values of type `OutType`.
- `(Set MemberType)` - set of items of type `MemberType` - note that this currently has zero support on the backend.
- `(Func InType_1 ... InType_n OutType)` - a function type - currently no support on the backend.

Polygolf has type inference so for example if variable `$a` is `Int`, then Polygolf knows that `(10 + ($a mod 10))` is `10..19`.

### Variables

Each variable must be first used in an assignment. Variable type is determined by the type annotation on the first assignment or the type of the value being assigned, if the annotation is missing.

### Special expressions

- `{}` - Block - combines multiple expressions into a single one. An important feature of blocks is that they can contain multiple variants / alternatives. These variants are expanded (even recursively) so that several different programs solving the hole are generated and the shortest (compilable) one is chosen. This is very useful when variant A is longer (or cannot Polygolf is unable to compile it) than variant B for some subset of languages, but it is shorter for another subset of languages.
- `assign`, `<-` - assigns a value to a variable.
- `key_value`, `=>` - this can only be used as a part of a table literal.
- `func` - anonymous function literal - last argument is the body, all others are its arguments.
- `if` - if statement - expects a boolean condition and 1-2 bodies - a consequent and an optional alternate.
- `for` - a loop over an integer range - expects a loop variable, inclusive lower bound, exclusive upper bound, optional step and a body.
- `while` - a while loop. Expects a boolean condition and a body.
- `for_argv` - a loop over input arguments. Expects a loop variable and a static integer literal representing the upper bound on the number of arguments.
- `conditional` - a ternary conditional expression. Expects a boolean condition, a consequent and an alternate.
- `unsafe_conditional` - same as `conditional` but both branches can be safely evaluated regardless of the condition.
- `list`, `array`, `set`, `table` - construct the respective collection with the given items.
- `argv_get` - gets a single input arg. Its argument must be a static integer literal - this cannot be used in a loop.

### Polygolf operators

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
| bit_shift_left  | <<    |
| bit_shift_right | >>    |
| bit_xor/bit_not | ~     |
| eq              | ==    |
| neq             | !=    |
| leq             | <=    |
| lt              | <     |
| geq             | >=    |
| gt              | >     |
| assign          | <-    |
| list_length     | #     |
| concat          | ..    |
| key_value       | =>    |

Notice how `-` and `~` both correspond to two ops - this is resolved by the used arity.
These symbolic aliases can also be used in an infix matter: `(+ 2 3)` is the same as (`2 + 3)`.
Additionaly, the following ops can be used as if they were n-ary: `add`,`mul`,`bit_and`,`bit_or`,`bit_xor`,`concat`.  
For example, `(+ 1 2 3 4)` is the same as `(((1 + 2) + 3) + 4)`.

## Example

For more examples, search this repo for `*.test.md` files like [this one](src/programs/code.golf-default.test.md).

Example Fibonacci using variants

```clojure
$a:0..832040 <- 0;
$b:0..1346269 <- 1;
for $i 0 31 {
    println_int $a;
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

## Golfing plugins

Overview of Polygolf's language unspecific golfing knowledge, demonstrated on Python:

### Integer arithmetic

- [x] `x<=5` ⟶ `x<6`
- [x] `x%10==0` ⟶ `x%10<1`
- [x] `(x+1)*(y+1)` ⟶ `~x*~y`
- [x] `x//32` ⟶ `x>>5`
- [x] `x**2` ⟶ `x*x`
- [x] `x*x*x` ⟶ `x**3`

### Boolean arithmetic

- [x] `not(a==5 or b!=10)` ⟶ `a!=5 and b==10`
- [x] `~(a|b)` ⟶ `~a&~b`

### Variables

- [x] `x=1,y=1` ⟶ `x=y=1`
- [x] `x=t;x=y;y=t` ⟶ `x,y=y,x`
- [x] `x=x*3` ⟶ `x*=3`
- [x] `x=z;y=x*5` ⟶ `y=z*5`

### Loops

- [x] `for i in range(len(d)):print(d[i])` ⟶ `for i in d:print(i)`
- [x] `for i in range(0,10,2):print(i)` ⟶ `for i in range(5):print(2*i)`
- [x] `for i in range(10,20):print(i+1)` ⟶ `for i in range(11,21):print(i)`

### Identifiers

- [x] `variable=0` ⟶ `v=0`
- [x] `print(x);print(y);print(z)` ⟶ `p=print;p(x);p(y);p(z)`

### Printing

- [x] `print(end="x\n")` ⟷ `print("x")`

### Literals

- [x] `["ab","cd","e","X","?!"]` ⟶ `"ab cd e X ?!".split()`
- [ ] `{"a":"A","b":"B","c":"C"}[x]` ⟶ `["A","B","C"][["a","b","c"].find(x)]`
- [ ] `["A","B","C"][x]` ⟶ `"abc"[x]`
- [ ] `["A","B","C"].find(x)` ⟶ `"abc".find(x)`

### Chaining & shortcircuiting

- [ ] `a<b and b<c` ⟶ `a<b<c`
- [ ] `if a==b:print(a)` ⟶ `a==b==print(a)`

## Tips for writing solutions in Polygolf

- Don't golf the Polygolf source - let Polygolf do the golfing (especially the simple stuff) for you. This includes:
  - Use whitespace to format the source.
  - Use comments if appropriate.
  - Use descriptive variable names - Polygolf will shorten them for you.
  - Store intermediate results of complex expressions in auxilary variables - Polygolf will inline them for you.
- Help Polygolf understand the problem. This includes:
  - Explicitly annotate types of values. The type inference algorithm isn't perfect or in some cases can't even possible narrow the type down as much as you can. This is especially relevant for
    - Values coming from argv - perhaps you know they will be ascii or that they will be representing an integer in a certain range.
  - Complex arithmetic expressions.
  - Prefer higher level opcodes if they exist. While Polygolf aims to generally be able to convert between lower level implementation and a higher level one, the conversion from low level to high level is harder and might not always work out for you.
- Use variants. Polygolf is WIP and the set of golfing rules it knowns is limited. If there are two different equivalent implementations that both are sometimes shorter, include them both using the variant syntax. If you believe the case is general enough and that Polygolf should be able to generate one based on the other, [open an issue](https://github.com/jared-hughes/polygolf/issues/new/choose).
