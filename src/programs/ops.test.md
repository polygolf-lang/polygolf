# Ops

## Summation of mixed-signed terms

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

## Variadic opcodes

```polygolf
$a:0..9 <- 0;
$b:0..9 <- 0;
$c:0..9 <- 0;
$x <- true;
$y <- true;
$z <- true;
min $a $b $c;
* $a $b $c;
or $x $y $z;
```

```janet nogolf
(var a 0)(var b 0)(var c 0)(var x true)(var y true)(var z true)(min a b c)(* a b c)(or x y z)
```

```js nogolf
a=0
b=0
c=0
x=true
y=true
z=true
Math.min(a,b,c)
a*b*c
x||y||z
```

```lua nogolf
a=0
b=0
c=0
x=true
y=true
z=true
math.min(a,b,c)
a*b*c
x or y or z
```

```nim nogolf
var
 a,b,c=0
 x,y,z=true
min(min(a,b),c)
a*b*c
x or y or z
```

```py nogolf
a=b=c=0
x=y=z=1
min(a,b,c)
a*b*c
x or y or z
```

```swift nogolf
var a=0,b=0,c=0,x=true,y=true,z=true
min(a,b,c)
a*b*c
x||y||z
```

```polygolf
$a:0..9 <- 0;
$b:0..9 <- 0;
$c:0..9 <- 0;
gcd $a $b $c;
```

```janet nogolf
(var a 0)(var b 0)(var c 0)(math/gcd(math/gcd a b)c)
```

```nim nogolf
import math
var a,b,c=0
gcd(gcd(a,b),c)
```

```py nogolf
import math
a=b=c=0
math.gcd(a,b,c)
```

## List mutation

```polygolf
$t <- (list 1 2 3);
$t @<- 2 1;
```

```gs nogolf
[1 2 3]:t;t.2.@<[1]+@@)>+:t;
```

```janet nogolf
(var t @[1 2 3])(put t 2 1)
```

```js nogolf
t=[1,2,3]
t[2]=1
```

```lua nogolf
t={1,2,3}
t[3]=1
```

```nim nogolf
var t= @[1,2,3]
t[2]=1
```

```py nogolf
t=[1,2,3]
t[2]=1
```

```swift nogolf
var t=[1,2,3]
t[2]=1
```

## Bit ops

```polygolf
bit_count 67;
```

```js nogolf
67.toString(2).replace(/0/g,``).length
```

```nim nogolf
include math
popcount(67)
```

```py nogolf
67.bit_count()
```

```swift nogolf
String(67,radix:2).filter({$0>"0"}).count
```
