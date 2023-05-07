# Block plugins

## Var declarations

```polygolf
$a <- 0;
$b <- 1;
```

```polygolf block.addVarDeclarations
VarDeclarationWithAssignment ($a <- 0);
VarDeclarationWithAssignment ($b <- 1);
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
ManyToManyAssignment { $a $b } { $b $a };
```
