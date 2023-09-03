# Tests of hexagony plugins

```polygolf
$a <- -12145;
$b <- 93;
```

```polygolf plugins.limitSetOp(999)
$a <- 121;
function_call (builtin "4") $a;
function_call (builtin "5") $a;
function_call (builtin "~") $a;
$b <- 8;
function_call (builtin ")") $b;
function_call (builtin "3") $b;
```

```polygolf
$a <- 1;
$b <- 2;
$c <- 3;
$d <- 4;
$x <- (binary_op "*" (binary_op "+" $a $b) (binary_op "+" $c $d));
```

```polygolf plugins.decomposeExpressions
$a <- 1;
$b <- 2;
$c <- 3;
$d <- 4;
$xL <- (binary_op "+" $a $b);
$xR <- (binary_op "+" $c $d);
$x <- (binary_op "*" $xL $xR);
```

```polygolf
$a <- 10;
if ($a == $b){
    putc 77;
};
```

```polygolf plugins.extractConditions
$a <- 10;
$condValue <- (($a - $b) ^ 2);
if ($condValue <= 0) (
    putc 77
);
```

```polygolf
print "hello-58\n100";
```

```polygolf plugins.printTextLiteral
$printVar <- 104;
putc $printVar;
$printVar <- 101;
putc $printVar;
$printVar <- 108;
putc $printVar;
putc $printVar;
$printVar <- 111;
putc $printVar;
$printVar <- -58;
print_int $printVar;
$printVar <- 266;
putc $printVar;
$printVar <- 100;
print_int $printVar;
```
