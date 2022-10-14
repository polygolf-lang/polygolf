@preprocessor typescript

@{% import lexer from "./lexer"; %}

@lexer lexer

main -> multiplication {% id %} | trig {% id %}

multiplication -> %number "*" %number {% ([first, _star, second]) => first * second %}

trig -> "sin" multiplication {% ([, x]) => Math.sin(x) %}
