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

## Short-circuiting

```polygolf
if true (println "x");
```

```polygolf ops.ifToUnsafeAnd
unsafe_and true (println "x"):Bool;
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
