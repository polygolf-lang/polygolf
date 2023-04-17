# Arithmetic plugins

## Bitnot

```polygolf
$x:-oo..oo <- 0;
~ $x;
```

```polygolf arithmetic.removeBitnot
$x:-oo..oo <- 0;
-1 + (-1 * $x);
```

```polygolf
$x:-oo..oo <- 0;
$x + 1;
```

```polygolf arithmetic.addBitnot
$x:-oo..oo <- 0;
-1 * (~ $x);
```

```polygolf
$x:-oo..oo <- 0;
$x - 1;
```

```polygolf arithmetic.addBitnot
$x:-oo..oo <- 0;
~ (-1 * $x);
```

#

```polygolf
$a:-oo..oo <- 0;
$b:0..oo <- 0;
mod $a $b;
mod $b $a;
```

```polygolf arithmetic.modToRem
$a:-oo..oo <- 0;
$b:0..oo <- 0;
rem $a $b;
rem ((rem $b $a) + $a) $a;
```

```polygolf
$a:-oo..oo <- 0;
$b:0..oo <- 0;
div $a $b;
div $b $a;
```

```polygolf arithmetic.divToTruncdiv
$a:-oo..oo <- 0;
$b:0..oo <- 0;
trunc_div $a $b;
$b div $a;
```
