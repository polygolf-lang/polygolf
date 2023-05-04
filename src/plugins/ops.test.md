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

## Relation chains

```polygolf
$a:Int <- 0;
$b:Int <- 0;
and ($a < $b) (2 < $a) ($b < 10);
```

```py
a=b=0
2<a<b<10
```
