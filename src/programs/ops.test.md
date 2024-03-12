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

_Clojure_

```clojure nogolf
(def a 0)(def b 0)(def c 0)(def d 0)(- a)(- a b)(-(+ a b)c d)(-(+ a b c d))(- a b c d)
```

_Janet_

```janet nogolf
(var a 0)(var b 0)(var c 0)(var d 0)(- a)(- a b)(-(+ a b)c d)(-(+ a b c d))(- a b c d)
```

_Python_

```py nogolf
a=0
b=0
c=0
d=0
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

_Clojure_

```clojure nogolf
(def a 0)(def b 0)(def c 0)(def x true)(def y true)(def z true)(min a b c)(* a b c)(or x y z)
```

_Janet_

```janet nogolf
(var a 0)(var b 0)(var c 0)(var x true)(var y true)(var z true)(min a b c)(* a b c)(or x y z)
```

_Javascript_

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

_Lua_

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

_Nim_

```nim nogolf
var
 a,b,c=0
 x,y,z=true
min(min(a,b),c)
a*b*c
x or y or z
```

_Python_

```py nogolf
a=0
b=0
c=0
x=1
y=1
z=1
min(a,b,c)
a*b*c
x or y or z
```

_Swift_

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

_Janet_

```janet nogolf
(var a 0)(var b 0)(var c 0)(math/gcd(math/gcd a b)c)
```

_Nim_

```nim nogolf
import math
var a,b,c=0
gcd(gcd(a,b),c)
```

_Python_

```py nogolf
import math
a=0
b=0
c=0
math.gcd(a,b,c)
```

## List mutation

```polygolf
$t <- (list 1 2 3);
$t @<- 2 1;
```

_Clojure_

```clojure nogolf skip
Not implemented
```

_Golfscript_

```gs nogolf
[1 2 3]:t;t.2.@<[1]+@@)>+:t;
```

_Janet_

```janet nogolf
(var t @[1 2 3])(put t 2 1)
```

_Javascript_

```js nogolf
t=[1,2,3]
t[2]=1
```

_Lua_

```lua nogolf
t={1,2,3}
t[3]=1
```

_Nim_

```nim nogolf
var t= @[1,2,3]
t[2]=1
```

_Python_

```py nogolf
t=[1,2,3]
t[2]=1
```

_Swift_

```swift nogolf
var t=[1,2,3]
t[2]=1
```

## Bit ops

```polygolf
bit_count 67;
```

_Clojure_

```clojure nogolf
(Long/bitCount 67)
```

_Javascript_

```js nogolf
67.toString(2).replace(/0/g,``).length
```

_Nim_

```nim nogolf
include math
popcount(67)
```

_Python_

```py nogolf
67.bit_count()
```

_Swift_

```swift nogolf
String(67,radix:2).filter({$0>"0"}).count
```
