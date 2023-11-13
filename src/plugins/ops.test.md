# Ops

## Binary ops

```polygolf
$n:-oo..oo <- 0;
$a:-oo..oo <- 0;
$n <- ($n + 3);
$n <- (+ $a $n 3);
$x:Text <- "hello";
$x <- ($x .. " world");
$x <- ("prepend" .. $x);
```

```polygolf ops.addMutatingInfix({add:"+","concat[Text]":"+"})
$n:-oo..oo <- 0;
$a:-oo..oo <- 0;
mutating_infix "+" $n 3;
mutating_infix "+" $n (3 + $a);
$x:Text <- "hello";
mutating_infix "+" $x " world";
$x <- ("prepend" .. $x);
```

```polygolf
$a <- 3;
2 == $a;
2 != $a;
2 < $a;
2 > $a;
2 <= $a;
2 >= $a;
```

```polygolf ops.flipBinaryOps
$a <- 3;
$a == 2;
$a != 2;
$a > 2;
$a < 2;
$a >= 2;
$a <= 2;
```
