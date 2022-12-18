@preprocessor typescript

@{%
import lexer from "./lexer";
import {
  program,
  blockOrSingle,
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
  annotate,
  refSource } from "./parse";
%}

@lexer lexer

main -> (sexpr_stmt | variants):+ {% d => refSource(program(blockOrSingle(d[0].map(id))), d[0][0]) %}

variant ->
  (sexpr_stmt | variants):* {% d => refSource(blockOrSingle(d[0].map(id)), d[0].length > 0 ? d[0][0] : undefined) %}
  | expr {% d => refSource(d[0], d[0]) %}
          
variants -> "{" (variant "/"):* variant "}" {%
    ([start, vars, var2, ]) => refSource(variants([...vars.map(id), var2]), start)
  %}

expr_inner ->
  integer {% id %}
  | string {% id %}
  | variable {% id %}
  | nullary {% id %}
  | sexpr {% id %}

integer -> %integer {% d => refSource(int(BigInt(d[0])), d[0]) %}

variable -> %variable {% d => refSource(identifier(d[0].value.slice(1), false), d[0]) %}

builtin -> (%builtin | "argv_get") {% d => refSource(identifier(d[0][0].value, true), d[0][0]) %}
opalias -> (%opalias | "..") {% d => refSource(identifier(d[0][0].value, true), d[0][0]) %}
nullary -> %nullary {% d => refSource(sexpr(identifier(d[0].value, true), []), d[0]) %}

string -> %string {% d => refSource(stringLiteral(JSON.parse(d[0])), d[0]) %}

sexpr ->
  "(" callee expr:* ")" {% d => refSource(sexpr(d[1], d[2]), d[0]) %}
  | "(" expr opalias expr ")" {% d => refSource(sexpr(d[2], [d[1], d[3]]), d[0]) %}

sexpr_stmt ->
  callee expr:+ ";" {% d => refSource(sexpr(d[0], d[1]), d[0]) %}
  | expr opalias expr ";" {% d => refSource(sexpr(d[1], [d[0], d[2]]), d[0]) %}

callee -> builtin {% id %} | opalias {% id %} | variable {% id %}

type_expr -> 
  type_range {% id %}
  | type_simple {% id %}
  | type_sexpr {% id %}

ninf -> %ninf {% d => d[0].value %}
pinf -> %pinf {% d => d[0].value %}
type_range -> (ninf | integer) ".." (pinf | integer) {% d => integerType(d[0][0], d[2][0]) %}

type_simple -> %type {% d => typeSexpr(d[0], []) %}

type_sexpr -> "(" %type (type_expr | integer):+ ")" {% d => typeSexpr(d[1], d[2].map((x:any) => x[0])) %}

expr -> expr_inner (":" type_expr):? {% d => annotate(d[0], d[1]) %}
  | variants {% id %}
