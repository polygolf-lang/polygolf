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

```polygolf ops.addMutatingBinaryOp(["add","+"],["concat","+"])
$n:-oo..oo <- 0;
$a:-oo..oo <- 0;
mutating_binary_op "+" $n 3;
mutating_binary_op "+" $n (3 + $a);
$x:Text <- "hello";
mutating_binary_op "+" $x " world";
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
