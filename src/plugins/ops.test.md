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
@MutatingBinaryOp + $n 3;
@MutatingBinaryOp + $n (3 + $a);
$x:Text <- "hello";
@MutatingBinaryOp + $x " world";
$x <- ("prepend" .. $x);
```

```polygolf
2 == 3;
2 != 3;
2 < 3;
2 > 3;
2 <= 3;
2 >= 3;
```

```polygolf ops.flipBinaryOps
3 == 2;
3 != 2;
3 > 2;
3 < 2;
3 >= 2;
3 <= 2;
```
