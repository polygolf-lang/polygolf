# Binary ops

```polygolf
$n:-oo..oo <- 0;
$n <- ($n + 3);
$x:Text <- "hello";
$x <- ($x .. " world");
```

```polygolf binaryOps.addMutatingBinaryOp(["add","+"],["concat","+"])
$n:-oo..oo <- 0;
@MutatingBinaryOp add + $n 3;
$x:Text <- "hello";
@MutatingBinaryOp concat + $x " world";
```

```polygolf
2 == 3;
2 != 3;
2 < 3;
2 > 3;
2 <= 3;
2 >= 3;
```

```polygolf binaryOps.flipBinaryOps
3 == 2;
3 != 2;
3 > 2;
3 < 2;
3 >= 2;
3 <= 2;
```
