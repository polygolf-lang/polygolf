# Tests of hexagony plugins

```polygolf
$a <- -12145;
$b <- 93;
```

```polygolf plugins.limitSetOp(999)
$a <- 121;
prefix "4" $a;
prefix "5" $a;
prefix "~" $a;
$b <- 8;
prefix ")" $b;
prefix "3" $b;
```

```polygolf
$a <- 1;
$b <- 2;
$c <- 3;
$d <- 4;
$x <- (($a + $b) * ($c + $d));
```

```polygolf plugins.decomposeExpressions
$a <- 1;
$b <- 2;
$c <- 3;
$d <- 4;
$xL <- ($a + $b);
$xR <- ($c + $d);
$x <- ($xL * $xR);
```

```polygolf
$a <- 10;
$b <- 10;
if ($a == $b){
    putc 77;
};
```

```polygolf plugins.extractConditions
$a <- 10;
$b <- 10;
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
putc[byte] $printVar;
$printVar <- 101;
putc[byte] $printVar;
$printVar <- 108;
putc[byte] $printVar;
putc[byte] $printVar;
$printVar <- 111;
putc[byte] $printVar;
$printVar <- -58;
print_int $printVar;
$printVar <- 266;
putc[byte] $printVar;
$printVar <- 100;
print_int $printVar;
```

```polygolf
$a <- 10;
$b <- 10;
$c <- ($a ^ $b);
```

```polygolf plugins.powerToForRange
$a <- 10;
$b <- 10;
$c <- 1;
for (id "c+powerIndex") 0 $b (
    $c <- ($c * $a)
);
```

```polygolf
$a <- 10;
$b <- 10;
min $a $b;
max $a $b;
abs $a;
```

```polygolf plugins.mapOpsToConditionals
$a <- 10;
$b <- 10;
conditional ($a > $b) $b $a;
conditional ($a > $b) $a $b;
conditional ($a > 0) $a (-$a);
```
