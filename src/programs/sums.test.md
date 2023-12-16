# Summation of mixed-signed terms

```polygolf
$a <- 0;
$b <- 0;
$c <- 0;
$d <- 0;
- $a;
- $a $b;
+ $a $b (-$c) (-$d);
- (+ $a $b $c $d);
+ $a (-$b) (-$c) (-$d);
```

```janet nogolf
(var a 0)(var b 0)(var c 0)(var d 0)(- a)(- a b)(-(+ a b)c d)(-(+ a b c d))(- a b c d)
```

```py nogolf
a=b=c=d=0
-a
a-b
a+b-c-d
-(a+b+c+d)
a-b-c-d
```
