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

## Power

```polygolf
$a:-oo..oo <- 0;
(1 + $a) ^ 2;
```

```polygolf arithmetic.powToMul(2)
$a:-oo..oo <- 0;
(1 + $a) * (1 + $a);
```

```polygolf
$a:-oo..oo <- 0;
* 2 (1 + $a) $a (1 + $a);
```

```polygolf arithmetic.mulToPow
$a:-oo..oo <- 0;
* 2 ((1 + $a) ^ 2) $a;
```

## Bitshifts

```polygolf
$a:-oo..oo <- 0;
* -3 $a 64;
```

```polygolf arithmetic.mulOrDivToBitShift()
$a:-oo..oo <- 0;
(-3 * $a) << 6;
```

```polygolf
$a:-oo..oo <- 0;
$b:0..oo <- 0;
* -3 $a (2 ^ $b);
```

```polygolf arithmetic.mulOrDivToBitShift()
$a:-oo..oo <- 0;
$b:0..oo <- 0;
(-3 * $a) << $b;
```

```polygolf
$a:-oo..oo <- 0;
$a div 64;
```

```polygolf arithmetic.mulOrDivToBitShift()
$a:-oo..oo <- 0;
$a >> 6;

```

```polygolf
$a:-oo..oo <- 0;
$b:0..oo <- 0;
$a div (2 ^ $b);
```

```polygolf arithmetic.mulOrDivToBitShift()
$a:-oo..oo <- 0;
$b:0..oo <- 0;
$a >> $b;
```

```polygolf
$a:-oo..oo <- 0;
$a << 6;
```

```polygolf arithmetic.bitShiftToMulOrDiv()
$a:-oo..oo <- 0;
$a * 64;
```

```polygolf
$a:-oo..oo <- 0;
$a >> 6;
```

```polygolf arithmetic.bitShiftToMulOrDiv()
$a:-oo..oo <- 0;
$a div 64;
```
