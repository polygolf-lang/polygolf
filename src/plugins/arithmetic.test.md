# Arithmetic

## Division ops

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

## Equality to inequality

```polygolf
$a:-oo..oo <- 0;
($a mod 4) == 0;
($a mod 4) != 0;
($a mod 4) == 3;
($a mod 4) != 3;
```

```polygolf arithmetic.equalityToInequality
$a:-oo..oo <- 0;
($a mod 4) < 1;
($a mod 4) > 0;
($a mod 4) > 2;
($a mod 4) < 3;
```

## De Morgan's laws

```polygolf
$a:Int <- 0;
$b:Int <- 0;
not (or ($a == 5) ($b != 5));
```

```polygolf arithmetic.applyDeMorgans
$a:-oo..oo <- 0;
$b:-oo..oo <- 0;
and ($a != 5) ($b == 5);
```

```polygolf
$a:Int <- 0;
$b:Int <- 0;
~ ($a | $b);
```

```polygolf arithmetic.applyDeMorgans
$a:-oo..oo <- 0;
$b:-oo..oo <- 0;
(~ $a) & (~ $b);
```
