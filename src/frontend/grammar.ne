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
  refSource,
  userIdentifier } from "./parse";
%}

@lexer lexer

main -> variant {% ([variant]) => program(variant) %}

variant_child -> expr ";" {% id %}
  | stmt {% id %}
variant_last_child -> expr ";":? {% id %}
  | stmt {% id %}

variant ->
  variant_child:* variant_last_child  {% ([exprs, expr]) => refSource(blockOrSingle([...exprs, expr]), [...exprs, expr][0]) %}
          
variants -> "{" (variant "/"):* variant "}" {%
    ([start, vars, var2, ]) => refSource(variants([...vars.map(id), var2]), start)
  %}

expr -> expr_inner (":" type_expr):? {% ([expr, type]) => annotate(expr, type) %}
  | variants {% id %}

expr_inner ->
  integer {% id %}
  | string {% id %}
  | variable {% id %}
  | nullary {% id %}
  | sexpr {% id %}

sexpr ->
  "(" callee expr:* ")" {% ([start, callee, exprs, ]) => refSource(sexpr(callee, exprs), start) %}
  | "(" expr opalias expr ")" {% ([start, expr1, op, expr2]) => refSource(sexpr(op, [expr1, expr2]), start) %}

stmt ->
  callee expr:+ ";" {% ([callee, exprs, ]) => refSource(sexpr(callee, exprs), callee) %}
  | expr opalias expr ";" {% ([expr1, op, expr2, ]) => refSource(sexpr(op, [expr1, expr2]), expr1) %}

callee -> builtin {% id %}
  | opalias {% id %}
  | variable {% id %}

integer -> %integer {% d => refSource(int(BigInt(d[0])), d[0]) %}
variable -> %variable {% d => refSource(userIdentifier(d[0]), d[0]) %}
builtin -> (%builtin | "argv_get") {% d => refSource(identifier(d[0][0].value, true), d[0][0]) %}
opalias -> (%opalias | "..") {% d => refSource(identifier(d[0][0].value, true), d[0][0]) %}
nullary -> %nullary {% d => refSource(sexpr(identifier(d[0].value, true), []), d[0]) %}
string -> %string {% d => refSource(stringLiteral(JSON.parse(d[0])), d[0]) %}

type_expr -> type_range {% id %}
  | type_simple {% id %}
  | type_sexpr {% id %}

ninf -> %ninf {% d => d[0].value %}
pinf -> %pinf {% d => d[0].value %}
type_range -> (ninf | integer) ".." (pinf | integer) {% ([low, op, high]) => integerType(low[0], high[0]) %}

type_simple -> %type {% d => typeSexpr(d[0], []) %}

type_sexpr -> "(" %type (type_expr | integer):+ ")" {% ([start, op, args]) => typeSexpr(op, args.map(id)) %}
