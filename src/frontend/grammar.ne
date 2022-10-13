@preprocessor typescript
main -> (statement "\n" {% d => d[0] %}):+ {% d=> d[0] %}
statement -> ("foo" | "bar") {% d => d[0][0] %}
