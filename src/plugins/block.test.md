# Block plugins

## Var declarations

```polygolf
$a <- 0;
$b <- 1;
```

```polygolf block.addVarDeclarations
var_declaration_with_assignment ($a <- 0);
var_declaration_with_assignment ($b <- 1);
```

## Temporary variables

```polygolf
$a <- 0;
$b <- 1;
print "break";
$t <- $a;
$a <- $b;
$b <- $t;
```

```polygolf block.tempVarToMultipleAssignment
$a <- 0;
$b <- 1;
print "break";
many_to_many_assignment { $a; $b; } { $b; $a; };
```

## Variable inlining

```polygolf
$x <- (at[argv] 0):Ascii;
print_int (- (text_to_int $x));
```

```polygolf block.inlineVariables
print_int (- (text_to_int (at[argv] 0):Ascii));
```

```polygolf
$x <- read[line];
println $x;
println $x;
```

```polygolf block.inlineVariables
$x <- read[line];
println $x;
println $x;
```
