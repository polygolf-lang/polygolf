# Tests of hexagony plugins

```polygolf
$a <- -12145;
$b <- 93;
```

```polygolf plugins.limitSetOp(999)
$a <- 121;
function_call "4" $a;
function_call "5" $a;
function_call "~" $a;
$b <- 8;
function_call ")" $b;
function_call "3" $b;
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
if ($a == $b){
    putc 77;
};
```

```polygolf plugins.extractConditions
$a <- 10;
$condValue <- (($a - $b) ^ 2);
if ($condValue <= 0){
    putc 77;
};
```

```polygolf
print "hello";
```

```polygolf plugins.printTextLiteralToPutc
$printVar <- 104;
putc $printVar;
$printVar <- 101;
putc $printVar;
$printVar <- 108;
putc $printVar;
putc $printVar;
$printVar <- 111;
putc $printVar;
```
