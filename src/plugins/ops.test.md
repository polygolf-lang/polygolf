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
@MutatingBinaryOp add + $n 3;
@MutatingBinaryOp add + $n (3 + $a);
$x:Text <- "hello";
@MutatingBinaryOp concat + $x " world";
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

## Short-circuiting

```polygolf
if true (println "x");
```

```polygolf ops.ifToUnsafeAnd
unsafe_and true (println "x");
```

<!-- It currently isn't possible to test `ops.ifRelationChainToLongerRelationChain` directly, so we use Python to test it.-->

```polygolf
$c:Int <- 1;
if ($c == 1) (println "x");
```

```python
c=1
c==1==print("x")
```
