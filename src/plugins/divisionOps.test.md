# Division ops

```polygolf
$a:-oo..oo <- 0;
$b:0..oo <- 0;
mod $a $b;
mod $b $a;
```

```polygolf divisionOps.modToRem
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

```polygolf divisionOps.divToTruncdiv
$a:-oo..oo <- 0;
$b:0..oo <- 0;
trunc_div $a $b;
$b div $a;
```
