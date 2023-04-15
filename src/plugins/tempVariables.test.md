# Temporary variables

```polygolf
$a <- 0;
$b <- 1;
print "break";
$t <- $a;
$a <- $b;
$b <- $t;
```

```polygolf tempVariables.tempVarToMultipleAssignment
$a <- 0;
$b <- 1;
print "break";
@ManyToManyAssignment {
  $a
  $b
} {
  $b
  $a
};
```
