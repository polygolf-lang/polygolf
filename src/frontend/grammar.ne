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
import { sexpr } from "./parse";
%}

@lexer lexer

main -> block_inner {% d => program(d[0]) %}

block_inner -> statement:* {% d => block(d[0]) %}

statement ->
  sexpr_stmt {% id %}
  | variants {% id %}

variants -> "{" (block_inner "|"):+ block_inner "}" {%
    ([, vars, var2, ]) => variants([...vars.map((d: any) => d[0]), var2])
  %}

expr ->
  integer {% id %}
  | string {% id %}
  | variable {% id %}
  | sexpr {% id %}
  | annotation {% id %}
  | block {% id %}

block -> "[" block_inner "]" {% d => d[1] %}

integer -> %integer {% d => int(BigInt(d[0])) %}

variable -> %variable {% d => identifier(d[0].value.slice(1), false) %}

builtin -> %builtin {% d => identifier(d[0].value, true) %}

string -> %string {% d => stringLiteral(JSON.parse(d[0])) %}

sexpr -> "(" (builtin | variable) expr:+  ")" {% d => sexpr(d[1][0], d[2]) %}

sexpr_stmt -> (builtin | variable) expr:+  ";" {% d => sexpr(d[0][0], d[1]) %}

# TODO: don't just ignore annotations
annotation -> expr ":" integer ".." integer {% ([expr, , min, , max]) => expr %}
