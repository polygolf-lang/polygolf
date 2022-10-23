@preprocessor typescript

@{%
import lexer from "./lexer";
import {
  program,
  block,
  ifStatement,
  forRange,
  variants,
  int,
  stringLiteral,
  id as identifier
} from "../IR";
import {
  sexpr,
  typeSexpr,
  integerType,
  annotate } from "./parse";
%}

@lexer lexer

main -> block_inner {% d => program(d[0]) %}

block_inner -> statement:* {% d => block(d[0]) %}

statement ->
  sexpr_stmt {% id %}
  | variants {% id %}

variants -> "{" (block_inner "/"):+ block_inner "}" {%
    ([, vars, var2, ]) => variants([...vars.map((d: any) => d[0]), var2])
  %}

expr_inner ->
  integer {% id %}
  | string {% id %}
  | variable {% id %}
  | sexpr {% id %}
  | block {% id %}

block -> "[" block_inner "]" {% d => d[1] %}

integer -> %integer {% d => int(BigInt(d[0])) %}

variable -> %variable {% d => identifier(d[0].value.slice(1), false) %}

builtin -> %builtin {% d => identifier(d[0].value, true) %}
opalias -> (%opalias | "..") {% d => identifier(d[0][0].value, true) %}

string -> %string {% d => stringLiteral(JSON.parse(d[0])) %}

sexpr ->
  "(" callee expr:* ")" {% d => sexpr(d[1], d[2]) %}
  | "(" expr opalias expr ")" {% d => sexpr(d[2], [d[1], d[3]]) %}

sexpr_stmt ->
  callee expr:+ ";" {% d => sexpr(d[0], d[1]) %}
  | expr opalias expr  ";"{% d => sexpr(d[1], [d[0], d[2]]) %}

callee -> builtin {% id %} | opalias {% id %} | variable {% id %}

type_expr -> 
  type_range {% id %}
  | type_simple {% id %}
  | type_sexpr {% id %}

ninf -> %ninf {% d => d[0].value %}
pinf -> %pinf {% d => d[0].value %}
type_range -> (ninf | integer) ".." (pinf | integer) {% d => integerType(d[0][0], d[2][0]) %}

type_simple -> %type {% d => typeSexpr(d[0].value, []) %}

type_sexpr -> "(" %type (type_expr | integer):+ ")" {% d => typeSexpr(d[1].value, d[2].map((x:any) => x[0])) %}

expr -> expr_inner (":" type_expr):? {% d => annotate(d[0], d[1]) %}
