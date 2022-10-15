@preprocessor typescript

@{% import lexer from "./lexer"; %}

@lexer lexer

main -> block_inner {% id %}

block_inner -> statement:* {% d => ({type: "block", children: d}) %}

statement ->
  sexpr_inner {% id %}
  | variants {% id %}
  # the following cases can probably be combined into sexpr_inner
  # by allowing expr -> block.
  | "forRange" variable expr expr expr block {%
    ([, variable, low, high, increment, block]) => ({
      type: "forRange", variable, low, high, increment, block
    })
  %}
  | "if" expr block {% d => ({type: "if", condition: d[1], consequent: d[2]}) %}
  # TODO: while, if-else, for-keys, etc. Can be unified into sexpr_inner

variants -> "{" block_inner "*" block_inner "}" {%
    ([, var1, , var2, ]) => ({
      type: "variants",
      variants: [var1, var2]
    })
  %}

block -> "[" block_inner "]" {% d => d[1] %}

expr ->
  integer {% id %}
  | string
  | variable {% id %}
  | sexpr {% id %}
  | annotation {% id %}

integer -> %integer {% d => ({type: "integer", value: parseInt(d[0])}) %}

variable -> %variable {% d => ({type: "variable", name: d[0].value}) %}

string -> %string {% d => ({type: "string", value: JSON.parse(d[0])}) %}

sexpr -> "(" sexpr_inner ")" {% d => d[1] %}

# sexpr_inner includes:
#  - div $i 10
#  - assign $i (mul $i 2)
#  - println $i
sexpr_inner -> %name expr:+ {% d => ({type: "sexpr", callee: d[0].value, args: d[1]}) %}

annotation -> expr ":" integer ".." integer {% ([expr, , min, , max]) => [expr, min, max] %}
