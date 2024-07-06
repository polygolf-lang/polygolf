# Features

## assignment

_Golfscript_

```gs
1:x;
```

_Lua_

```lua
x=1
```

_Nim_

```nim
var x=1
```

_Python_

```py
x=1
```

_Coconut_

```coco
x=1
```

_Swift_

```swift
var x=1
```

_Javascript_

```js
x=1
```

_Janet_

```janet
(var x 1)
```

_Clojure_

```clj
(def x 1)
```


## builtin

_Golfscript_

```gs
A
```

_Lua_

```lua
io.write(B)
```

_Nim_

```nim
write(stdout,C)
```

_Python_

```py
print(D,end="")
```

_Coconut_

```coco
print(E,end="")
```

_Swift_

```swift
print(F,terminator:"")
```

_Javascript_

```js
write(G)
```

_Janet_

```janet
(prin H)
```

_Clojure_

```clj
(pr I)
```


## discard

_Golfscript_

```gs
1
```

_Lua_

```lua
1
```

_Nim_

```nim
1
```

_Python_

```py
1
```

_Coconut_

```coco
1
```

_Swift_

```swift
1
```

_Javascript_

```js
1
```

_Janet_

```janet
1
```

_Clojure_

```clj
1
```


## list clone

_Nim_

```nim
var
 x= @[1]
 y=toSeq(x)
```

_Python_

```py
x=[1]
y=[*x]
```

_Coconut_

```coco
x=[1]
y=[*x]
```

_Swift_

```swift
var x=[1],y=x
```

_Javascript_

```js
x=[1]
y=[...x]
```

_Janet_

```janet
(var x @[1])(var y @[;x])
```


## list of list clone

_Python_

```py
import copy
x=[[1]]
y=copy.deepcopy(x)
```

_Coconut_

```coco
import copy
x=[[1]]
y=copy.deepcopy(x)
```

_Swift_

```swift
var x=[[1]],y=x
```

_Javascript_

```js
x=[[1]]
y=structuredClone(x)
```

_Janet_

```janet
(var x @[@[1]])(var y(thaw x))
```


## bigint

_Golfscript_

```gs
10000000000000000000000000000000000000000
```

_Python_

```py
print(0x1d6329f1c35ca4bfabb9f5610000000000,end="")
```

_Coconut_

```coco
print(0x1d6329f1c35ca4bfabb9f5610000000000,end="")
```

_Javascript_

```js
write(0x1d6329f1c35ca4bfabb9f5610000000000n)
```


## if

_Golfscript_

```gs
1{0}{0}if
```

_Lua_

```lua
if true then io.write(0)else io.write(0)end
```

_Nim_

```nim
if true:write(stdout,0)else:write(stdout,0)
```

_Python_

```py
if 1:print(0,end="")
else:print(0,end="")
```

_Coconut_

```coco
if 1:print(0,end="")
else:print(0,end="")
```

_Swift_

```swift
if true{print(0,terminator:"")}else{print(0,terminator:"")}
```

_Javascript_

```js
if(true)write(0)else write(0)
```

_Janet_

```janet
(if true(prin 0)(prin 0))
```

_Clojure_

```clj
(if true(pr 0)(pr 0))
```


## for

_Golfscript_

```gs
10,4>{;0}%
```

_Lua_

```lua
for x=4,9 do io.write(0)end
```

_Nim_

```nim
for x in 4..<10:write(stdout,0)
```

_Python_

```py
for x in range(4,10):print(0,end="")
```

_Coconut_

```coco
for x in range(4,10):print(0,end="")
```

_Swift_

```swift
for x in 4..<10{print(0,terminator:"")}
```

_Javascript_

```js
for(x=4;x<10;++x)write(0)
```

_Janet_

```janet
(for x 4 10(prin 0))
```

_Clojure_

```clj
(doseq[x(range 4 10)](pr 0))
```


## for with step

_Golfscript_

```gs
10,4>3%{;0}%
```

_Lua_

```lua
for x=4,9,3 do io.write(0)end
```

_Nim_

```nim
for x in countup(4,10,3):write(stdout,0)
```

_Python_

```py
for x in range(4,10,3):print(0,end="")
```

_Coconut_

```coco
for x in range(4,10,3):print(0,end="")
```

_Swift_

```swift
for x in stride(from:4,to:10,by:3){print(0,terminator:"")}
```

_Javascript_

```js
for(x=4;x<10;x+=3)write(0)
```

_Janet_

```janet
(loop[x :range[4 10 3]](prin 0))
```

_Clojure_

```clj
(doseq[x(range 4 10 3)](pr 0))
```


## while

_Golfscript_

```gs
{1}{0}while
```

_Lua_

```lua
while true do io.write(0)end
```

_Nim_

```nim
while true:write(stdout,0)
```

_Python_

```py
while 1:print(0,end="")
```

_Coconut_

```coco
while 1:print(0,end="")
```

_Swift_

```swift
while true{print(0,terminator:"")}
```

_Javascript_

```js
while(true)write(0)
```

_Janet_

```janet
(while true(prin 0))
```

_Clojure_

```clj
(while true(pr 0))
```


## for_argv

_Golfscript_

```gs
:a;a{;0}%
```

_Lua_

```lua
for x=0,99 do X=arg[1+x]
io.write(0)end
```

_Nim_

```nim
import os
for x in commandLineParams():write(stdout,0)
```

_Python_

```py
import sys
for x in sys.argv[1:]:print(0,end="")
```

_Coconut_

```coco
for x in os.sys.argv[1:]:print(0,end="")
```

_Swift_

```swift
for x in CommandLine.arguments[1...]{print(0,terminator:"")}
```

_Javascript_

```js
for(x of arguments)write(0)
```

_Janet_

```janet
(each x(slice(dyn :args)1)(prin 0))
```

_Clojure_

```clj
(doseq[x *command-line-args*](pr 0))
```


## conditional

_Golfscript_

```gs
1 1 1 if
```

_Lua_

```lua
true and 1 or 1
```

_Nim_

```nim
if true:1 else:1
```

_Python_

```py
1if 1else 1
```

_Coconut_

```coco
1if 1else 1
```

_Swift_

```swift
true ?1:1
```

_Javascript_

```js
true?1:1
```

_Janet_

```janet
(if true 1 1)
```

_Clojure_

```clj
(if true 1 1)
```


## unsafe_conditional

_Golfscript_

```gs
1 1 1 if
```

_Lua_

```lua
true and 1 or 1
```

_Nim_

```nim
if true:1 else:1
```

_Python_

```py
1if 1else 1
```

_Coconut_

```coco
1if 1else 1
```

_Swift_

```swift
true ?1:1
```

_Javascript_

```js
true?1:1
```

_Janet_

```janet
(if true 1 1)
```

_Clojure_

```clj
(if true 1 1)
```


## any_int

_Golfscript_

```gs
20
```

_Lua_

```lua
20
```

_Nim_

```nim
20
```

_Python_

```py
20
```

_Coconut_

```coco
20
```

_Swift_

```swift
20
```

_Javascript_

```js
20
```

_Janet_

```janet
20
```

_Clojure_

```clj
20
```


## list

_Golfscript_

```gs
[1]
```

_Lua_

```lua
{1}
```

_Nim_

```nim
@[1]
```

_Python_

```py
[1]
```

_Coconut_

```coco
[1]
```

_Swift_

```swift
[1]
```

_Javascript_

```js
[1]
```

_Janet_

```janet
@[1]
```

_Clojure_

```clj
[1]
```


## array

_Golfscript_

```gs
[1]
```

_Lua_

```lua
{1}
```

_Nim_

```nim
[1]
```

_Python_

```py
[1]
```

_Coconut_

```coco
[1]
```

_Swift_

```swift
[1]
```

_Javascript_

```js
[1]
```

_Janet_

```janet
@[1]
```

_Clojure_

```clj
[1]
```


## set

_Nim_

```nim
[1].toSet
```

_Python_

```py
{1}
```

_Coconut_

```coco
{1}
```

_Swift_

```swift
Set([1])
```


## table

_Lua_

```lua
{1=1}
```

_Nim_

```nim
import tables
{1:1}.toTable
```

_Python_

```py
{1:1}
```

_Coconut_

```coco
{1:1}
```

_Swift_

```swift
[1:1]
```

_Javascript_

```js
{[1]:1}
```

_Janet_

```janet
@{1 1}
```

_Clojure_

```clj
{1 1}
```
# OpCodes

## is_even

_Golfscript_

```gs
0 1=:x;
```

_Lua_

```lua
x=0==1
```

_Nim_

```nim
var x=0==1
```

_Python_

```py
x=0==1
```

_Coconut_

```coco
x=0==1
```

_Swift_

```swift
var x=0==1
```

_Javascript_

```js
x=0==1
```

_Janet_

```janet
(var x(= 0 1))
```

_Clojure_

```clj
(def x(= 0 1))
```


## is_odd

_Golfscript_

```gs
1 1=:x;
```

_Lua_

```lua
x=1==1
```

_Nim_

```nim
var x=1==1
```

_Python_

```py
x=1==1
```

_Coconut_

```coco
x=1==1
```

_Swift_

```swift
var x=1==1
```

_Javascript_

```js
x=1==1
```

_Janet_

```janet
(var x(= 1 1))
```

_Clojure_

```clj
(def x(= 1 1))
```


## succ

_Golfscript_

```gs
1 B+
```

_Lua_

```lua
io.write(1+C)
```

_Nim_

```nim
write(stdout,1+D)
```

_Python_

```py
print(1+E,end="")
```

_Coconut_

```coco
print(1+F,end="")
```

_Swift_

```swift
print(1+G,terminator:"")
```

_Javascript_

```js
write(1+H)
```

_Janet_

```janet
(prin(+ 1 I))
```

_Clojure_

```clj
(pr(+ 1 J))
```


## pred

_Golfscript_

```gs
K 1-
```

_Lua_

```lua
io.write(L-1)
```

_Nim_

```nim
write(stdout,M-1)
```

_Python_

```py
print(N-1,end="")
```

_Coconut_

```coco
print(O-1,end="")
```

_Swift_

```swift
print(P-1,terminator:"")
```

_Javascript_

```js
write(Q-1)
```

_Janet_

```janet
(prin(- R 1))
```

_Clojure_

```clj
(pr(- S 1))
```


## add

_Golfscript_

```gs
T U+
```

_Lua_

```lua
io.write(V+W)
```

_Nim_

```nim
write(stdout,X+Y)
```

_Python_

```py
print(Z+A,end="")
```

_Coconut_

```coco
print(B+C,end="")
```

_Swift_

```swift
print(D+E,terminator:"")
```

_Javascript_

```js
write(F+G)
```

_Janet_

```janet
(prin(+ H I))
```

_Clojure_

```clj
(pr(+ J K))
```


## sub

_Golfscript_

```gs
L M-
```

_Lua_

```lua
io.write(N-O)
```

_Nim_

```nim
write(stdout,P-Q)
```

_Python_

```py
print(R-S,end="")
```

_Coconut_

```coco
print(T-U,end="")
```

_Swift_

```swift
print(V-W,terminator:"")
```

_Javascript_

```js
write(X-Y)
```

_Janet_

```janet
(prin(- Z A))
```

_Clojure_

```clj
(pr(- B C))
```


## mul

_Golfscript_

```gs
D E*
```

_Lua_

```lua
io.write(F*G)
```

_Nim_

```nim
write(stdout,H*I)
```

_Python_

```py
print(J*K,end="")
```

_Coconut_

```coco
print(L*M,end="")
```

_Swift_

```swift
print(N*O,terminator:"")
```

_Javascript_

```js
write(P*Q)
```

_Janet_

```janet
(prin(* R S))
```

_Clojure_

```clj
(pr(* T U))
```


## div

_Golfscript_

```gs
V W/
```

_Lua_

```lua
io.write(X//Y)
```

_Nim_

```nim
write(stdout,Z/%A)
```

_Python_

```py
print(B//C,end="")
```

_Coconut_

```coco
print(D//E,end="")
```

_Swift_

```swift
print(F/G,terminator:"")
```

_Javascript_

```js
write(Math.floor(H/I))
```

_Janet_

```janet
(prin(div J K))
```

_Clojure_

```clj
(pr(quot L M))
```


## pow

_Golfscript_

```gs
N O?
```

_Python_

```py
print(T**U,end="")
```

_Coconut_

```coco
print(V**W,end="")
```

_Javascript_

```js
write(Z**A)
```


## mod

_Golfscript_

```gs
F G%
```

_Lua_

```lua
io.write(H%I)
```

_Nim_

```nim
write(stdout,J%%K)
```

_Python_

```py
print(L%M,end="")
```

_Coconut_

```coco
print(N%O,end="")
```

_Swift_

```swift
print(P%Q,terminator:"")
```

_Javascript_

```js
write(R%S)
```

_Janet_

```janet
(prin(% T U))
```

_Clojure_

```clj
(pr(mod V W))
```


## bit_and

_Golfscript_

```gs
1 1&
```

_Lua_

```lua
io.write(1&1)
```

_Nim_

```nim
write(stdout,1 and 1)
```

_Python_

```py
print(1&1,end="")
```

_Coconut_

```coco
print(1&1,end="")
```

_Swift_

```swift
print(1&1,terminator:"")
```

_Javascript_

```js
write(1&1)
```

_Janet_

```janet
(prin(band 1 1))
```

_Clojure_

```clj
(pr(bit-and 1 1))
```


## bit_or

_Golfscript_

```gs
1 1|
```

_Lua_

```lua
io.write(1|1)
```

_Nim_

```nim
write(stdout,1 or 1)
```

_Python_

```py
print(1|1,end="")
```

_Coconut_

```coco
print(1|1,end="")
```

_Swift_

```swift
print(1|1,terminator:"")
```

_Javascript_

```js
write(1|1)
```

_Janet_

```janet
(prin(bor 1 1))
```

_Clojure_

```clj
(pr(bit-or 1 1))
```


## bit_xor

_Golfscript_

```gs
1 1^
```

_Lua_

```lua
io.write(1~1)
```

_Nim_

```nim
write(stdout,1 xor 1)
```

_Python_

```py
print(1^1,end="")
```

_Coconut_

```coco
print(1^1,end="")
```

_Swift_

```swift
print(1^1,terminator:"")
```

_Javascript_

```js
write(1^1)
```

_Janet_

```janet
(prin(bxor 1 1))
```

_Clojure_

```clj
(pr(bit-xor 1 1))
```


## bit_shift_left

_Golfscript_

```gs
Z 2 A?*
```

_Python_

```py
print(F<<G,end="")
```

_Coconut_

```coco
print(H<<I,end="")
```

_Javascript_

```js
write(L<<M)
```


## bit_shift_right

_Golfscript_

```gs
R 2 S?/
```

_Lua_

```lua
io.write(T>>U)
```

_Nim_

```nim
write(stdout,V shr W)
```

_Python_

```py
print(X>>Y,end="")
```

_Coconut_

```coco
print(Z>>A,end="")
```

_Swift_

```swift
print(B>>C,terminator:"")
```

_Javascript_

```js
write(D>>E)
```

_Janet_

```janet
(prin(brshift F G))
```

_Clojure_

```clj
(pr(bit-shift-right H I))
```


## gcd

_Golfscript_

```gs
1 1{.}{.@@%}while;
```

_Nim_

```nim
import math
write(stdout,gcd(1,1))
```

_Python_

```py
import math
print(math.gcd(1,1),end="")
```

_Coconut_

```coco
import math
print(math.gcd(1,1),end="")
```

_Janet_

```janet
(prin(math/gcd 1 1))
```


## min

_Golfscript_

```gs
[B C]$0=
```

_Lua_

```lua
io.write(math.min(D,E))
```

_Nim_

```nim
write(stdout,min(F,G))
```

_Python_

```py
print(min(H,I),end="")
```

_Coconut_

```coco
print(min(J,K),end="")
```

_Swift_

```swift
print(min(L,M),terminator:"")
```

_Javascript_

```js
write(Math.min(N,O))
```

_Janet_

```janet
(prin(min P Q))
```

_Clojure_

```clj
(pr(min R S))
```


## max

_Golfscript_

```gs
[T U]$1=
```

_Lua_

```lua
io.write(math.max(V,W))
```

_Nim_

```nim
write(stdout,max(X,Y))
```

_Python_

```py
print(max(Z,A),end="")
```

_Coconut_

```coco
print(max(B,C),end="")
```

_Swift_

```swift
print(max(D,E),terminator:"")
```

_Javascript_

```js
write(Math.max(F,G))
```

_Janet_

```janet
(prin(max H I))
```

_Clojure_

```clj
(pr(max J K))
```


## neg

_Golfscript_

```gs
-1 L*
```

_Lua_

```lua
io.write(-M)
```

_Nim_

```nim
write(stdout,-N)
```

_Python_

```py
print(-O,end="")
```

_Coconut_

```coco
print(-P,end="")
```

_Swift_

```swift
print(-Q,terminator:"")
```

_Javascript_

```js
write(-R)
```

_Janet_

```janet
(prin(- S))
```

_Clojure_

```clj
(pr(- T))
```


## abs

_Golfscript_

```gs
1 abs
```

_Lua_

```lua
io.write(math.abs(1))
```

_Nim_

```nim
write(stdout,abs(1))
```

_Python_

```py
print(abs(1),end="")
```

_Coconut_

```coco
print(abs(1),end="")
```

_Swift_

```swift
print(abs(1),terminator:"")
```

_Javascript_

```js
write(abs(1))
```

_Janet_

```janet
(prin(math/abs 1))
```

_Clojure_

```clj
(pr(abs 1))
```


## bit_not

_Golfscript_

```gs
1~
```

_Lua_

```lua
io.write(~1)
```

_Nim_

```nim
write(stdout,not 1)
```

_Python_

```py
print(~1,end="")
```

_Coconut_

```coco
print(~1,end="")
```

_Swift_

```swift
print(~1,terminator:"")
```

_Javascript_

```js
write(~1)
```

_Janet_

```janet
(prin(bnot 1))
```

_Clojure_

```clj
(pr(bit-not 1))
```


## bit_count

_Golfscript_

```gs
1 2base 0+{+}*
```

_Nim_

```nim
include math
write(stdout,popcount(1))
```

_Python_

```py
print(1.bit_count(),end="")
```

_Coconut_

```coco
print(1.bit_count(),end="")
```

_Swift_

```swift
print(String(1,radix:2).filter({$0>"0"}).count,terminator:"")
```

_Javascript_

```js
write(1.toString(2).replace(/0/g,``).length)
```

_Clojure_

```clj
(pr(Long/bitCount 1))
```


## read[line]

_Lua_

```lua
io.write(io.read())
```

_Nim_

```nim
write(stdout,readLine(stdin))
```

_Python_

```py
print(end=input())
```

_Coconut_

```coco
print(end=input())
```

_Swift_

```swift
print(readLine(),terminator:"")
```


## at[argv]

_Golfscript_

```gs
:a;a 1=
```

_Lua_

```lua
io.write(arg[2])
```

_Nim_

```nim
import os
write(stdout,paramStr(2))
```

_Python_

```py
import sys
print(end=sys.argv[2])
```

_Coconut_

```coco
print(end=os.sys.argv[2])
```

_Swift_

```swift
print(CommandLine.arguments[2],terminator:"")
```

_Javascript_

```js
write(arguments[1])
```

_Janet_

```janet
(prin((dyn :args)2))
```

_Clojure_

```clj
(print(nth *command-line-args* 1))
```


## print[Text]

_Golfscript_

```gs
"x":x;
```

_Lua_

```lua
x=io.write("x")
```

_Nim_

```nim
var x=write(stdout,"x")
```

_Python_

```py
x=print(end="x")
```

_Coconut_

```coco
x=print(end="x")
```

_Swift_

```swift
var x=print("x",terminator:"")
```

_Javascript_

```js
x=write`x`
```

_Janet_

```janet
(var x(prin"x"))
```

_Clojure_

```clj
(def x(print"x"))
```


## print[Int]

_Golfscript_

```gs
1:x;
```

_Lua_

```lua
x=io.write(1)
```

_Nim_

```nim
var x=write(stdout,1)
```

_Python_

```py
x=print(1,end="")
```

_Coconut_

```coco
x=print(1,end="")
```

_Swift_

```swift
var x=print(1,terminator:"")
```

_Javascript_

```js
x=write(1)
```

_Janet_

```janet
(var x(prin 1))
```

_Clojure_

```clj
(def x(pr 1))
```


## println[Text]

_Golfscript_

```gs
"x
":x;
```

_Lua_

```lua
x=print("x")
```

_Nim_

```nim
var x=echo("x")
```

_Python_

```py
x=print("x")
```

_Coconut_

```coco
x=print("x")
```

_Swift_

```swift
var x=print("x")
```

_Javascript_

```js
x=print`x`
```

_Janet_

```janet
(var x(print"x"))
```

_Clojure_

```clj
(def x(println"x"))
```


## println[Int]

_Golfscript_

```gs
1"
"+:x;
```

_Lua_

```lua
x=print(1)
```

_Nim_

```nim
var x=echo(1)
```

_Python_

```py
x=print(1)
```

_Coconut_

```coco
x=print(1)
```

_Swift_

```swift
var x=print(1)
```

_Javascript_

```js
x=print(1)
```

_Janet_

```janet
(var x(pp 1))
```

_Clojure_

```clj
(def x(prn 1))
```


## putc[byte]

_Golfscript_

```gs
[1]""+:x;
```

_Lua_

```lua
x=io.write(string.char(1))
```

_Nim_

```nim
var x=write(stdout,chr(1))
```

_Python_

```py
x=print(end=chr(1))
```

_Coconut_

```coco
x=print(end=chr(1))
```

_Swift_

```swift
var x=print(String(UnicodeScalar(1)!),terminator:"")
```

_Javascript_

```js
x=write(String.fromCharCode(1))
```

_Janet_

```janet
(var x(prin(string/format"%c"1)))
```


## putc[codepoint]

_Nim_

```nim
import unicode
var x=write(stdout,$Rune(1))
```

_Python_

```py
x=print(end=chr(1))
```

_Coconut_

```coco
x=print(end=chr(1))
```

_Swift_

```swift
var x=print(String(UnicodeScalar(1)!),terminator:"")
```

_Clojure_

```clj
(def x(print(str(char 1))))
```


## putc[Ascii]

_Golfscript_

```gs
[1]""+:x;
```

_Lua_

```lua
x=io.write(string.char(1))
```

_Nim_

```nim
var x=write(stdout,chr(1))
```

_Python_

```py
x=print(end=chr(1))
```

_Coconut_

```coco
x=print(end=chr(1))
```

_Swift_

```swift
var x=print(String(UnicodeScalar(1)!),terminator:"")
```

_Javascript_

```js
x=write(String.fromCharCode(1))
```

_Janet_

```janet
(var x(prin(string/format"%c"1)))
```

_Clojure_

```clj
(def x(print(str(char 1))))
```


## or

_Golfscript_

```gs
1 1 or:x;
```

_Lua_

```lua
x=true or true
```

_Nim_

```nim
var x=true or true
```

_Python_

```py
x=1or 1
```

_Coconut_

```coco
x=1or 1
```

_Swift_

```swift
var x=true||true
```

_Javascript_

```js
x=true||true
```

_Janet_

```janet
(var x(or true true))
```

_Clojure_

```clj
(def x(or true true))
```


## and

_Golfscript_

```gs
1 1 and:x;
```

_Lua_

```lua
x=true and true
```

_Nim_

```nim
var x=true and true
```

_Python_

```py
x=1and 1
```

_Coconut_

```coco
x=1and 1
```

_Swift_

```swift
var x=true&&true
```

_Javascript_

```js
x=true&&true
```

_Janet_

```janet
(var x(and true true))
```

_Clojure_

```clj
(def x(and true true))
```


## unsafe_or

_Golfscript_

```gs
1 1 or:x;
```

_Lua_

```lua
x=true or true
```

_Nim_

```nim
var x=true or true
```

_Python_

```py
x=1or 1
```

_Coconut_

```coco
x=1or 1
```

_Swift_

```swift
var x=true||true
```

_Javascript_

```js
x=true||true
```

_Janet_

```janet
(var x(or true true))
```

_Clojure_

```clj
(def x(or true true))
```


## unsafe_and

_Golfscript_

```gs
1 1 and:x;
```

_Lua_

```lua
x=true and true
```

_Nim_

```nim
var x=true and true
```

_Python_

```py
x=1and 1
```

_Coconut_

```coco
x=1and 1
```

_Swift_

```swift
var x=true&&true
```

_Javascript_

```js
x=true&&true
```

_Janet_

```janet
(var x(and true true))
```

_Clojure_

```clj
(def x(and true true))
```


## not

_Golfscript_

```gs
1!:x;
```

_Lua_

```lua
x=not true
```

_Nim_

```nim
var x=not true
```

_Python_

```py
x=not 1
```

_Coconut_

```coco
x=not 1
```

_Swift_

```swift
var x=!true
```

_Javascript_

```js
x=!true
```

_Janet_

```janet
(var x(not true))
```

_Clojure_

```clj
(def x(not true))
```


## true

_Golfscript_

```gs
1:x;
```

_Lua_

```lua
x=true
```

_Nim_

```nim
var x=true
```

_Python_

```py
x=1
```

_Coconut_

```coco
x=1
```

_Swift_

```swift
var x=true
```

_Javascript_

```js
x=true
```

_Janet_

```janet
(var x true)
```

_Clojure_

```clj
(def x true)
```


## false

_Golfscript_

```gs
0:x;
```

_Lua_

```lua
x=false
```

_Nim_

```nim
var x=false
```

_Python_

```py
x=0
```

_Coconut_

```coco
x=0
```

_Swift_

```swift
var x=false
```

_Javascript_

```js
x=false
```

_Janet_

```janet
(var x false)
```

_Clojure_

```clj
(def x false)
```


## lt

_Golfscript_

```gs
1 1<:x;
```

_Lua_

```lua
x=1<1
```

_Nim_

```nim
var x=1<1
```

_Python_

```py
x=1<1
```

_Coconut_

```coco
x=1<1
```

_Swift_

```swift
var x=1<1
```

_Javascript_

```js
x=1<1
```

_Janet_

```janet
(var x(< 1 1))
```

_Clojure_

```clj
(def x(< 1 1))
```


## leq

_Golfscript_

```gs
0 1<:x;
```

_Lua_

```lua
x=1<=1
```

_Nim_

```nim
var x=1<=1
```

_Python_

```py
x=1<=1
```

_Coconut_

```coco
x=1<=1
```

_Swift_

```swift
var x=1<=1
```

_Javascript_

```js
x=1<=1
```

_Janet_

```janet
(var x(<= 1 1))
```

_Clojure_

```clj
(def x(<= 1 1))
```


## geq

_Golfscript_

```gs
2 1>:x;
```

_Lua_

```lua
x=1>=1
```

_Nim_

```nim
var x=1>=1
```

_Python_

```py
x=1>=1
```

_Coconut_

```coco
x=1>=1
```

_Swift_

```swift
var x=1>=1
```

_Javascript_

```js
x=1>=1
```

_Janet_

```janet
(var x(>= 1 1))
```

_Clojure_

```clj
(def x(>= 1 1))
```


## gt

_Golfscript_

```gs
1 1>:x;
```

_Lua_

```lua
x=1>1
```

_Nim_

```nim
var x=1>1
```

_Python_

```py
x=1>1
```

_Coconut_

```coco
x=1>1
```

_Swift_

```swift
var x=1>1
```

_Javascript_

```js
x=1>1
```

_Janet_

```janet
(var x(> 1 1))
```

_Clojure_

```clj
(def x(> 1 1))
```


## eq[Int]

_Golfscript_

```gs
1 1=:x;
```

_Lua_

```lua
x=1==1
```

_Nim_

```nim
var x=1==1
```

_Python_

```py
x=1==1
```

_Coconut_

```coco
x=1==1
```

_Swift_

```swift
var x=1==1
```

_Javascript_

```js
x=1==1
```

_Janet_

```janet
(var x(= 1 1))
```

_Clojure_

```clj
(def x(= 1 1))
```


## eq[Text]

_Golfscript_

```gs
"x""x"=:x;
```

_Lua_

```lua
x="x"=="x"
```

_Nim_

```nim
var x="x"=="x"
```

_Python_

```py
x="x"=="x"
```

_Coconut_

```coco
x="x"=="x"
```

_Swift_

```swift
var x="x"=="x"
```

_Javascript_

```js
x="x"=="x"
```

_Janet_

```janet
(var x(="x""x"))
```

_Clojure_

```clj
(def x(="x""x"))
```


## neq[Int]

_Golfscript_

```gs
1 1=!:x;
```

_Lua_

```lua
x=1~=1
```

_Nim_

```nim
var x=1!=1
```

_Python_

```py
x=1!=1
```

_Coconut_

```coco
x=1!=1
```

_Swift_

```swift
var x=1 != 1
```

_Javascript_

```js
x=1!=1
```

_Janet_

```janet
(var x(not= 1 1))
```

_Clojure_

```clj
(def x(not= 1 1))
```


## neq[Text]

_Golfscript_

```gs
"x""x"=!:x;
```

_Lua_

```lua
x="x"~="x"
```

_Nim_

```nim
var x="x"!="x"
```

_Python_

```py
x="x"!="x"
```

_Coconut_

```coco
x="x"!="x"
```

_Swift_

```swift
var x="x" != "x"
```

_Javascript_

```js
x="x"!="x"
```

_Janet_

```janet
(var x(not="x""x"))
```

_Clojure_

```clj
(def x(not="x""x"))
```


## at[Array]

_Golfscript_

```gs
[1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1]1=
```

_Lua_

```lua
io.write(({1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1})[2])
```

_Nim_

```nim
write(stdout,[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1][1])
```

_Python_

```py
print([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1][1],end="")
```

_Coconut_

```coco
print([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1][1],end="")
```

_Swift_

```swift
print([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1][1],terminator:"")
```

_Javascript_

```js
write([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1][1])
```

_Janet_

```janet
(prin(@[1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1]1))
```

_Clojure_

```clj
(pr(nth[1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1]1))
```


## at[List]

_Golfscript_

```gs
[1]1=
```

_Lua_

```lua
io.write(({1})[2])
```

_Nim_

```nim
write(stdout,@[1][1])
```

_Python_

```py
print([1][1],end="")
```

_Coconut_

```coco
print([1][1],end="")
```

_Swift_

```swift
print([1][1],terminator:"")
```

_Javascript_

```js
write([1][1])
```

_Janet_

```janet
(prin(@[1]1))
```

_Clojure_

```clj
(pr(nth[1]1))
```


## at_back[List]

_Golfscript_

```gs
[1]-1=
```

_Lua_

```lua
io.write(({1})[#{1}])
```

_Nim_

```nim
write(stdout,@[1][^1])
```

_Python_

```py
print([1][-1],end="")
```

_Coconut_

```coco
print([1][-1],end="")
```

_Swift_

```swift
print([1][[1].count-1],terminator:"")
```

_Janet_

```janet
(prin(last @[1]))
```

_Clojure_

```clj
(pr(last[1]))
```


## at[Table]

_Golfscript_

```gs
I 1=
```

_Lua_

```lua
io.write(({1=1})[1])
```

_Nim_

```nim
import tables
write(stdout,{1:1}.toTable[1])
```

_Python_

```py
print({1:1}[1],end="")
```

_Coconut_

```coco
print({1:1}[1],end="")
```

_Swift_

```swift
print([1:1][1]!,terminator:"")
```

_Javascript_

```js
write({[1]:1}[1])
```

_Janet_

```janet
(prin(@{1 1}1))
```

_Clojure_

```clj
(pr({1 1}1))
```


## at[Ascii]

_Golfscript_

```gs
["x"1=]""+
```

_Lua_

```lua
io.write(("x"):sub(2,2))
```

_Nim_

```nim
write(stdout,"x"[1])
```

_Python_

```py
print(end="x"[1])
```

_Coconut_

```coco
print(end="x"[1])
```

_Swift_

```swift
print(String(Array("x")[1]),terminator:"")
```

_Javascript_

```js
write("x"[1])
```

_Janet_

```janet
(prin(slice"x"1 2))
```

_Clojure_

```clj
(print(str(nth"x"1)))
```


## at_back[Ascii]

_Golfscript_

```gs
["x"-1=]""+
```

_Lua_

```lua
io.write(("x"):sub(-1,-1))
```

_Nim_

```nim
write(stdout,"x"[^1])
```

_Python_

```py
print(end="x"[-1])
```

_Coconut_

```coco
print(end="x"[-1])
```

_Swift_

```swift
print(String(Array("x")[0]),terminator:"")
```


## at[byte]

_Golfscript_

```gs
["x"1=]""+
```

_Lua_

```lua
io.write(("x"):sub(2,2))
```

_Nim_

```nim
write(stdout,"x"[1])
```

_Python_

```py
print(end=chr(bytes("x","u8")[1]))
```

_Coconut_

```coco
print(end=chr(bytes("x","u8")[1]))
```

_Swift_

```swift
print(String(UnicodeScalar(Int(Array("x".utf8)[1]))!),terminator:"")
```

_Janet_

```janet
(prin(slice"x"1 2))
```


## at_back[byte]

_Golfscript_

```gs
["x"-1=]""+
```

_Lua_

```lua
io.write(("x"):sub(-1,-1))
```

_Nim_

```nim
write(stdout,"x"[^1])
```

_Python_

```py
print(end=chr(bytes("x","u8")[-1]))
```

_Coconut_

```coco
print(end=chr(bytes("x","u8")[-1]))
```

_Swift_

```swift
print(String(UnicodeScalar(Int(Array("x".utf8)[0]))!),terminator:"")
```


## at[codepoint]

_Nim_

```nim
import unicode
write(stdout,$toRunes("x")[1])
```

_Python_

```py
print(end="x"[1])
```

_Coconut_

```coco
print(end="x"[1])
```

_Swift_

```swift
print(String(Array("x")[1]),terminator:"")
```

_Clojure_

```clj
(print(str(nth"x"1)))
```


## at_back[codepoint]

_Nim_

```nim
import unicode
write(stdout,$toRunes("x")[^1])
```

_Python_

```py
print(end="x"[-1])
```

_Coconut_

```coco
print(end="x"[-1])
```

_Swift_

```swift
print(String(Array("x")[0]),terminator:"")
```


## with_at[Array]<-

_Golfscript_

```gs
cover#0.1.@<[1]+@@)>+:cover#0;
```

_Lua_

```lua
cover#1[2]=1
```

_Nim_

```nim
cover#2[1]=1
```

_Python_

```py
cover#3[1]=1
```

_Coconut_

```coco
cover#4[1]=1
```

_Swift_

```swift
cover#5[1]=1
```

_Javascript_

```js
cover#6[1]=1
```

_Janet_

```janet
(put cover#7 1 1)
```


## with_at[List]<-

_Golfscript_

```gs
cover#9.1.@<[1]+@@)>+:cover#9;
```

_Lua_

```lua
cover#10[2]=1
```

_Nim_

```nim
cover#11[1]=1
```

_Python_

```py
cover#12[1]=1
```

_Coconut_

```coco
cover#13[1]=1
```

_Swift_

```swift
cover#14[1]=1
```

_Javascript_

```js
cover#15[1]=1
```

_Janet_

```janet
(put cover#16 1 1)
```


## with_at_back[List]<-

_Golfscript_

```gs
cover#18..,.-1+\%.@<[1]+@@)>+:cover#18;
```

_Lua_

```lua
cover#19[#cover#19]=1
```

_Nim_

```nim
cover#20[^1]=1
```

_Python_

```py
cover#21[-1]=1
```

_Coconut_

```coco
cover#22[-1]=1
```

_Swift_

```swift
cover#23[cover#23.count-1]=1
```

_Janet_

```janet
(put cover#25(-(length cover#25)1)1)
```


## with_at[Table]<-

_Golfscript_

```gs
cover#27.1.@<[1]+@@)>+:cover#27;
```

_Lua_

```lua
cover#28[1]=1
```

_Nim_

```nim
cover#29[1]=1
```

_Python_

```py
cover#30[1]=1
```

_Coconut_

```coco
cover#31[1]=1
```

_Swift_

```swift
cover#32[1]=1
```

_Javascript_

```js
cover#33[1]=1
```

_Janet_

```janet
(put cover#34 1 1)
```


## slice[codepoint]

_Python_

```py
print(end="x"[1:2])
```

_Coconut_

```coco
print(end="x"[1:2])
```

_Swift_

```swift
print("x".prefix(2).suffix(1),terminator:"")
```

_Clojure_

```clj
(print(subs"x"1 2))
```


## slice_back[codepoint]

_Python_

```py
print(end="x"[-1:])
```

_Coconut_

```coco
print(end="x"[-1:])
```

_Swift_

```swift
print("x".prefix(1),terminator:"")
```


## slice[byte]

_Golfscript_

```gs
"x"2<1>
```

_Lua_

```lua
io.write(("x"):sub(2,2))
```

_Nim_

```nim
write(stdout,"x"[1..<2])
```

_Python_

```py
print(end=bytes("x","u8")[1:2].decode("u8"))
```

_Coconut_

```coco
print(end=bytes("x","u8")[1:2].decode("u8"))
```

_Janet_

```janet
(prin(slice"x"1 2))
```


## slice_back[byte]

_Nim_

```nim
write(stdout,"x"[^1..< ^0])
```

_Python_

```py
print(end=bytes("x","u8")[-1:].decode("u8"))
```

_Coconut_

```coco
print(end=bytes("x","u8")[-1:].decode("u8"))
```


## slice[Ascii]

_Golfscript_

```gs
"x"2<1>
```

_Lua_

```lua
io.write(("x"):sub(2,2))
```

_Nim_

```nim
write(stdout,"x"[1..<2])
```

_Python_

```py
print(end="x"[1:2])
```

_Coconut_

```coco
print(end="x"[1:2])
```

_Swift_

```swift
print("x".prefix(2).suffix(1),terminator:"")
```

_Javascript_

```js
write("x".slice(1,2))
```

_Janet_

```janet
(prin(slice"x"1 2))
```

_Clojure_

```clj
(print(subs"x"1 2))
```


## slice_back[Ascii]

_Nim_

```nim
write(stdout,"x"[^1..< ^0])
```

_Python_

```py
print(end="x"[-1:])
```

_Coconut_

```coco
print(end="x"[-1:])
```

_Swift_

```swift
print("x".prefix(1),terminator:"")
```


## slice[List]

_Golfscript_

```gs
[1]2<1>:x;
```

_Nim_

```nim
var x= @[1][1..<2]
```

_Python_

```py
x=[1][1:2]
```

_Coconut_

```coco
x=[1][1:2]
```

_Swift_

```swift
var x=[1][1..<2]
```

_Javascript_

```js
x=[1].slice(1,2)
```

_Janet_

```janet
(var x(slice @[1]1 2))
```

_Clojure_

```clj
(def x(subvec(vec[1])1 2))
```


## slice_back[List]

_Nim_

```nim
var x= @[1][^1..< ^0]
```

_Python_

```py
x=[1][-1:]
```

_Coconut_

```coco
x=[1][-1:]
```

_Swift_

```swift
var x=[1][[1].count-1..<[1].count]
```


## ord[byte]

_Golfscript_

```gs
"x")
```

_Lua_

```lua
io.write(("x"):byte(1))
```

_Nim_

```nim
write(stdout,ord("x"[0]))
```

_Python_

```py
print(ord("x"),end="")
```

_Coconut_

```coco
print(ord("x"),end="")
```

_Swift_

```swift
print(Int(Array("x".utf8)[0]),terminator:"")
```

_Janet_

```janet
(prin("x"0))
```


## ord[codepoint]

_Nim_

```nim
import unicode
write(stdout,ord($toRunes("x")[0]))
```

_Python_

```py
print(ord("x"),end="")
```

_Coconut_

```coco
print(ord("x"),end="")
```

_Swift_

```swift
print(Array("x".unicodeScalars)[0].value,terminator:"")
```

_Clojure_

```clj
(pr(int(nth"x"0)))
```


## ord[Ascii]

_Golfscript_

```gs
"x")
```

_Lua_

```lua
io.write(("x"):byte(1))
```

_Nim_

```nim
write(stdout,ord("x"[0]))
```

_Python_

```py
print(ord("x"),end="")
```

_Coconut_

```coco
print(ord("x"),end="")
```

_Swift_

```swift
print(Array("x".unicodeScalars)[0].value,terminator:"")
```

_Javascript_

```js
write("x".charCodeAt(0))
```

_Janet_

```janet
(prin("x"0))
```

_Clojure_

```clj
(pr(int(nth"x"0)))
```


## char[byte]

_Golfscript_

```gs
[1]""+
```

_Lua_

```lua
io.write(string.char(1))
```

_Nim_

```nim
write(stdout,chr(1))
```

_Python_

```py
print(end=chr(1))
```

_Coconut_

```coco
print(end=chr(1))
```

_Swift_

```swift
print(String(UnicodeScalar(1)!),terminator:"")
```

_Javascript_

```js
write(String.fromCharCode(1))
```

_Janet_

```janet
(prin(string/format"%c"1))
```


## char[codepoint]

_Nim_

```nim
import unicode
write(stdout,$Rune(1))
```

_Python_

```py
print(end=chr(1))
```

_Coconut_

```coco
print(end=chr(1))
```

_Swift_

```swift
print(String(UnicodeScalar(1)!),terminator:"")
```

_Clojure_

```clj
(print(str(char 1)))
```


## char[Ascii]

_Golfscript_

```gs
[1]""+
```

_Lua_

```lua
io.write(string.char(1))
```

_Nim_

```nim
write(stdout,chr(1))
```

_Python_

```py
print(end=chr(1))
```

_Coconut_

```coco
print(end=chr(1))
```

_Swift_

```swift
print(String(UnicodeScalar(1)!),terminator:"")
```

_Javascript_

```js
write(String.fromCharCode(1))
```

_Janet_

```janet
(prin(string/format"%c"1))
```

_Clojure_

```clj
(print(str(char 1)))
```


## text_to_list[codepoint]

_Python_

```py
x=[*"x"]
```

_Coconut_

```coco
x=[*"x"]
```


## text_to_list[Ascii]

_Python_

```py
x=[*"x"]
```

_Coconut_

```coco
x=[*"x"]
```


## sorted[Int]

_Golfscript_

```gs
[1]$:x;
```

_Nim_

```nim
include tables
var x=sorted(@[1])
```

_Python_

```py
x=sorted([1])
```

_Coconut_

```coco
x=sorted([1])
```

_Swift_

```swift
var x=[1].sorted()
```

_Janet_

```janet
(var x(sorted @[1]))
```

_Clojure_

```clj
(def x(sort[1]))
```


## sorted[Ascii]

_Golfscript_

```gs
["x"]$:x;
```

_Nim_

```nim
include tables
var x=sorted(@["x"])
```

_Python_

```py
x=sorted(["x"])
```

_Coconut_

```coco
x=sorted(["x"])
```

_Swift_

```swift
var x=["x"].sorted()
```

_Javascript_

```js
x=["x"].sort()
```

_Janet_

```janet
(var x(sorted @["x"]))
```

_Clojure_

```clj
(def x(sort["x"]))
```


## reversed[byte]

_Golfscript_

```gs
"x"-1%
```

_Lua_

```lua
io.write(string.reverse("x"))
```

_Nim_

```nim
import strutils,algorithm
write(stdout,join(reversed("x")))
```

_Python_

```py
print(end=bytes("x","u8")[::-1].decode("u8"))
```

_Coconut_

```coco
print(end=bytes("x","u8")[::-1].decode("u8"))
```

_Janet_

```janet
(prin(reverse"x"))
```


## reversed[codepoint]

_Nim_

```nim
import strutils,algorithm,unicode
write(stdout,join(reversed(toRunes("x"))))
```

_Python_

```py
print(end="x"[::-1])
```

_Coconut_

```coco
print(end="x"[::-1])
```

_Swift_

```swift
print(String("x".reversed()),terminator:"")
```

_Javascript_

```js
write([..."x"].reverse().join``)
```

_Clojure_

```clj
(print(clojure.string/reverse"x"))
```


## reversed[Ascii]

_Golfscript_

```gs
"x"-1%
```

_Lua_

```lua
io.write(string.reverse("x"))
```

_Nim_

```nim
import strutils,algorithm
write(stdout,join(reversed("x")))
```

_Python_

```py
print(end="x"[::-1])
```

_Coconut_

```coco
print(end="x"[::-1])
```

_Swift_

```swift
print(String("x".reversed()),terminator:"")
```

_Javascript_

```js
write([..."x"].reverse().join``)
```

_Janet_

```janet
(prin(reverse"x"))
```

_Clojure_

```clj
(print(clojure.string/reverse"x"))
```


## reversed[List]

_Golfscript_

```gs
[1]-1%:x;
```

_Nim_

```nim
include tables
var x=reversed(@[1])
```

_Python_

```py
x=[1][::-1]
```

_Coconut_

```coco
x=[1][::-1]
```

_Swift_

```swift
var x=Array([1].reversed())
```

_Javascript_

```js
x=[1].reverse()
```

_Janet_

```janet
(var x(reverse @[1]))
```

_Clojure_

```clj
(def x(reverse[1]))
```


## find[codepoint]

_Python_

```py
print("x".find("x"),end="")
```

_Coconut_

```coco
print("x".find("x"),end="")
```

_Swift_

```swift
print("x".contains("x") ?"x".split(separator:"x",omittingEmptySubsequences:false)[0].count:-1,terminator:"")
```

_Clojure_

```clj
(pr(clojure.string/index-of"x""x"))
```


## find[byte]

_Golfscript_

```gs
"x""x"?
```

_Nim_

```nim
include re
write(stdout,find("x","x"))
```

_Python_

```py
print(bytes("x","u8").find(bytes("x","u8")),end="")
```

_Coconut_

```coco
print(bytes("x","u8").find(bytes("x","u8")),end="")
```

_Swift_

```swift
print("x".contains("x") ?"x".split(separator:"x",omittingEmptySubsequences:false)[0].utf8.count:-1,terminator:"")
```

_Janet_

```janet
(prin(string/find"x""x"))
```


## find[Ascii]

_Golfscript_

```gs
"x""x"?
```

_Nim_

```nim
include re
write(stdout,find("x","x"))
```

_Python_

```py
print("x".find("x"),end="")
```

_Coconut_

```coco
print("x".find("x"),end="")
```

_Swift_

```swift
print("x".contains("x") ?"x".split(separator:"x",omittingEmptySubsequences:false)[0].count:-1,terminator:"")
```

_Javascript_

```js
write("x".indexOf`x`)
```

_Janet_

```janet
(prin(string/find"x""x"))
```

_Clojure_

```clj
(pr(clojure.string/index-of"x""x"))
```


## find[List]

_Golfscript_

```gs
[1]1?
```

_Nim_

```nim
write(stdout,find(@[1],1))
```

_Python_

```py
print([1].index(1),end="")
```

_Coconut_

```coco
print([1].index(1),end="")
```

_Swift_

```swift
print([1].index(of:1),terminator:"")
```

_Javascript_

```js
write([1].indexOf(1))
```


## contains[Array]

_Golfscript_

```gs
1[1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1]1?+:x;
```

_Nim_

```nim
var x=1 in[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
```

_Python_

```py
x=1in[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
```

_Coconut_

```coco
x=1in[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
```

_Swift_

```swift
var x=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1].contains(1)
```

_Javascript_

```js
x=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1].includes(1)
```


## contains[List]

_Golfscript_

```gs
1[1]1?+:x;
```

_Nim_

```nim
var x=1 in@[1]
```

_Python_

```py
x=1in[1]
```

_Coconut_

```coco
x=1in[1]
```

_Swift_

```swift
var x=[1].contains(1)
```

_Javascript_

```js
x=[1].includes(1)
```


## contains[Table]

_Nim_

```nim
import tables
var x=1 in{1:1}.toTable
```

_Python_

```py
x=1in{1:1}
```

_Coconut_

```coco
x=1in{1:1}
```

_Swift_

```swift
var x=[1:1].keys.contains(1)
```

_Javascript_

```js
x=1 in{[1]:1}
```

_Janet_

```janet
(var x(not(nil?(@{1 1}1))))
```

_Clojure_

```clj
(def x(contains?{1 1}1))
```


## contains[Set]

_Python_

```py
x=1in{1}
```

_Coconut_

```coco
x=1in{1}
```

_Swift_

```swift
var x=Set([1]).contains(1)
```


## contains[Text]

_Golfscript_

```gs
1"x""x"?+:x;
```

_Nim_

```nim
var x="x"in "x"
```

_Python_

```py
x="x"in"x"
```

_Coconut_

```coco
x="x"in"x"
```

_Swift_

```swift
var x="x".contains("x")
```

_Javascript_

```js
x="x".includes`x`
```

_Janet_

```janet
(var x(int?(string/find"x""x")))
```

_Clojure_

```clj
(def x(clojure.string/includes?"x""x"))
```


## size[List]

_Golfscript_

```gs
[1],
```

_Lua_

```lua
io.write(#{1})
```

_Nim_

```nim
write(stdout,len(@[1]))
```

_Python_

```py
print(len([1]),end="")
```

_Coconut_

```coco
print(len([1]),end="")
```

_Swift_

```swift
print([1].count,terminator:"")
```

_Javascript_

```js
write([1].length)
```

_Janet_

```janet
(prin(length @[1]))
```

_Clojure_

```clj
(pr(count[1]))
```


## size[Set]

_Python_

```py
print(len({1}),end="")
```

_Coconut_

```coco
print(len({1}),end="")
```

_Swift_

```swift
print(Set([1]).count,terminator:"")
```


## size[Table]

_Lua_

```lua
io.write(#{1=1})
```

_Nim_

```nim
import tables
write(stdout,len({1:1}.toTable))
```

_Python_

```py
print(len({1:1}),end="")
```

_Coconut_

```coco
print(len({1:1}),end="")
```

_Swift_

```swift
print([1:1].count,terminator:"")
```

_Javascript_

```js
write(Object.keys({[1]:1}).length)
```

_Janet_

```janet
(prin(length @{1 1}))
```

_Clojure_

```clj
(pr(count{1 1}))
```


## size[Ascii]

_Golfscript_

```gs
Q,
```

_Lua_

```lua
io.write(R:len())
```

_Nim_

```nim
write(stdout,len(S))
```

_Python_

```py
print(len(T),end="")
```

_Coconut_

```coco
print(len(U),end="")
```

_Janet_

```janet
(prin(length X))
```


## size[codepoint]

_Python_

```py
print(len(C),end="")
```

_Coconut_

```coco
print(len(D),end="")
```


## size[byte]

_Golfscript_

```gs
I,
```

_Lua_

```lua
io.write(J:len())
```

_Nim_

```nim
write(stdout,len(K))
```

_Python_

```py
print(len(bytes(L,"u8")),end="")
```

_Coconut_

```coco
print(len(bytes(M,"u8")),end="")
```

_Swift_

```swift
print(N.utf8.count,terminator:"")
```

_Janet_

```janet
(prin(length P))
```


## include

_Swift_

```swift
var x=Set([1]).insert(1)
```

_Javascript_

```js
x=F.add(1)
```


## append

_Golfscript_

```gs
[1][1]+:x;
```

_Nim_

```nim
var x= @[1]&1
```

_Python_

```py
x=[1]+[1]
```

_Coconut_

```coco
x=[1]+[1]
```

_Swift_

```swift
var x=[1]+[1]
```

_Javascript_

```js
x=[1].concatenate([1])
```

_Janet_

```janet
(var x(array/concat @[]@[1]@[1]))
```

_Clojure_

```clj
(def x(conj(vec[1])1))
```


## append<-

_Golfscript_

```gs
cover#36[1]+:cover#36;
```

_Nim_

```nim
cover#38&=1
```

_Python_

```py
cover#39=cover#39+[1]
```

_Coconut_

```coco
cover#40=cover#40+[1]
```

_Swift_

```swift
var cover#41=cover#41+[1]
```

_Javascript_

```js
cover#42.push(1)
```

_Janet_

```janet
(var cover#43(array/concat @[]cover#43 @[1]))
```

_Clojure_

```clj
(def cover#44(conj(vec cover#44)1))
```


## concat[List]

_Golfscript_

```gs
[1][1]+:x;
```

_Nim_

```nim
var x= @[1]& @[1]
```

_Python_

```py
x=[1]+[1]
```

_Coconut_

```coco
x=[1]+[1]
```

_Swift_

```swift
var x=[1]+[1]
```

_Javascript_

```js
x=[1].concatenate([1])
```

_Janet_

```janet
(var x(array/concat @[]@[1]@[1]))
```

_Clojure_

```clj
(def x(concat[1][1]))
```


## concat[Text]

_Golfscript_

```gs
Y Z+
```

_Lua_

```lua
io.write(A..B)
```

_Nim_

```nim
write(stdout,C&D)
```

_Python_

```py
print(end=E+F)
```

_Coconut_

```coco
print(end=G+H)
```

_Swift_

```swift
print(I+J,terminator:"")
```

_Javascript_

```js
write(K+L)
```

_Janet_

```janet
(prin(string M N))
```

_Clojure_

```clj
(print(str O P))
```


## repeat

_Golfscript_

```gs
"x"1*
```

_Lua_

```lua
io.write(("x"):rep(1))
```

_Nim_

```nim
include re
write(stdout,repeat("x",1))
```

_Python_

```py
print(end="x"*1)
```

_Coconut_

```coco
print(end="x"*1)
```

_Swift_

```swift
print(String(repeating:"x",count:1),terminator:"")
```

_Javascript_

```js
write("x".repeat(1))
```

_Janet_

```janet
(prin(string/repeat"x"1))
```

_Clojure_

```clj
(print(apply str(repeat 1"x")))
```


## split

_Golfscript_

```gs
"x""x"/:x;
```

_Nim_

```nim
include re
var x=split("x","x")
```

_Python_

```py
x="x".split("x")
```

_Coconut_

```coco
x="x".split("x")
```

_Swift_

```swift
var x="x".split(separator:"x",omittingEmptySubsequences:false)
```

_Javascript_

```js
x="x".split`x`
```

_Janet_

```janet
(var x(string/split"x""x"))
```

_Clojure_

```clj
(def x(.split"x""x"))
```


## split_whitespace

_Golfscript_

```gs
"x"{...9<\13>+*\32if}%" "/:x;
```

_Nim_

```nim
include re
var x=split("x")
```

_Python_

```py
x="x".split()
```

_Coconut_

```coco
x="x".split()
```


## join

_Golfscript_

```gs
["x"]"x"*
```

_Lua_

```lua
io.write(table.concat({"x"},"x"))
```

_Nim_

```nim
include re
write(stdout,join(@["x"],"x"))
```

_Python_

```py
print(end="x".join(["x"]))
```

_Coconut_

```coco
print(end="x".join(["x"]))
```

_Swift_

```swift
print(["x"].joined(separator:"x"),terminator:"")
```

_Javascript_

```js
write(["x"].join`x`)
```

_Janet_

```janet
(prin(string/join @["x"]"x"))
```

_Clojure_

```clj
(print(clojure.string/join"x"["x"]))
```


## right_align

_Golfscript_

```gs
"x"1 1$,-.0>*" "*\+
```

_Nim_

```nim
include re
write(stdout,align("x",1))
```

_Python_

```py
print(end="%1s"%"x")
```

_Coconut_

```coco
print(end="%1s"%"x")
```

_Swift_

```swift
print((String(repeating:" ",count:1)+"x").suffix(1),terminator:"")
```

_Javascript_

```js
write("x".padStart(1))
```

_Janet_

```janet
(prin(string/format"%1s""x"))
```

_Clojure_

```clj
(print(format"%1s""x"))
```


## replace

_Golfscript_

```gs
"x""x"/"x"*
```

_Lua_

```lua
io.write(("x"):gsub("x","x"))
```

_Nim_

```nim
include re
write(stdout,replace("x","x","x"))
```

_Python_

```py
print(end="x".replace(*"xx"))
```

_Coconut_

```coco
print(end="x".replace(*"xx"))
```

_Swift_

```swift
import Foundation
print("x".replacingOccurrences(of:"x",with:"x"),terminator:"")
```

_Javascript_

```js
write("x".replaceAll("x","x"))
```

_Janet_

```janet
(prin(peg/replace-all"x""x""x"))
```

_Clojure_

```clj
(print(clojure.string/replace"x""x""x"))
```


## starts_with

_Lua_

```lua
x=("x"):sub(1,1)=="x"
```

_Nim_

```nim
include re
var x=startsWith("x","x")
```

_Python_

```py
x="x".startsWith("x")
```

_Coconut_

```coco
x="x".startsWith("x")
```

_Swift_

```swift
var x="x".hasPrefix("x")
```

_Javascript_

```js
x="x".startsWith`x`
```

_Clojure_

```clj
(def x(clojure.string/starts-with?"x""x"))
```


## ends_with

_Nim_

```nim
include re
var x=endsWith("x","x")
```

_Python_

```py
x="x".endsWith("x")
```

_Coconut_

```coco
x="x".endsWith("x")
```

_Swift_

```swift
var x="x".hasSuffix("x")
```

_Javascript_

```js
x="x".endsWith`x`
```

_Clojure_

```clj
(def x(clojure.string/ends-with?"x""x"))
```


## int_to_bin_aligned

_Golfscript_

```gs
1 1 2base""+\1$,-.0>*"0"*\+
```

_Nim_

```nim
include re
write(stdout,align(toBin(1),1,'0'))
```

_Python_

```py
print(end=format(1,"01b"))
```

_Coconut_

```coco
print(end=format(1,"01b"))
```

_Swift_

```swift
print((String(repeating:"0",count:1)+String(1,radix:2)).suffix(1),terminator:"")
```

_Javascript_

```js
write(1.toString(2).padStart(1,0))
```


## int_to_hex_aligned

_Golfscript_

```gs
1 1 16base{.9>39*+48+}%""+\1$,-.0>*"0"*\+
```

_Nim_

```nim
include re
write(stdout,align(toLowerAscii(toHex(1)),1,'0'))
```

_Python_

```py
print(end="%01x"%1)
```

_Coconut_

```coco
print(end="%01x"%1)
```

_Swift_

```swift
import Foundation
print(String(format:"%01x",1),terminator:"")
```

_Javascript_

```js
write(1.toString(16).padStart(1,0))
```

_Janet_

```janet
(prin(string/format"%01x"1))
```

_Clojure_

```clj
(print(format"%01x"1))
```


## int_to_Hex_aligned

_Golfscript_

```gs
1 1 16base{.9>7*+48+}%""+\1$,-.0>*"0"*\+
```

_Nim_

```nim
include re
write(stdout,align(toHex(1),1,'0'))
```

_Python_

```py
print(end="%01X"%1)
```

_Coconut_

```coco
print(end="%01X"%1)
```

_Swift_

```swift
import Foundation
print(String(format:"%01X",1),terminator:"")
```

_Javascript_

```js
write(1.toString(16).toUpperCase().padStart(1,0))
```

_Janet_

```janet
(prin(string/format"%01X"1))
```

_Clojure_

```clj
(print(format"%01X"1))
```


## int_to_dec

_Golfscript_

```gs
1
```

_Lua_

```lua
io.write(1)
```

_Nim_

```nim
write(stdout,1)
```

_Python_

```py
print(1,end="")
```

_Coconut_

```coco
print(1,end="")
```

_Swift_

```swift
print(1,terminator:"")
```

_Javascript_

```js
write(1)
```

_Janet_

```janet
(prin 1)
```

_Clojure_

```clj
(pr 1)
```


## int_to_bin

_Golfscript_

```gs
1 2 base""*
```

_Nim_

```nim
include re
write(stdout,toBin(1))
```

_Python_

```py
print(end=format(1,"b"))
```

_Coconut_

```coco
print(end=format(1,"b"))
```

_Swift_

```swift
print(String(1,radix:2),terminator:"")
```

_Javascript_

```js
write(1.toString(2))
```


## int_to_hex

_Golfscript_

```gs
1 16 base{.9>39*+48+}%""+
```

_Lua_

```lua
io.write(string.format("%x",1))
```

_Nim_

```nim
include re
write(stdout,toLowerAscii(toHex(1)))
```

_Python_

```py
print(end="%x"%1)
```

_Coconut_

```coco
print(end="%x"%1)
```

_Swift_

```swift
print(String(1,radix:16,uppercase:false),terminator:"")
```

_Javascript_

```js
write(1.toString(16))
```

_Janet_

```janet
(prin(string/format"%x"1))
```

_Clojure_

```clj
(print(format"%x"1))
```


## int_to_Hex

_Golfscript_

```gs
1 16 base{.9>7*+48+}%""+
```

_Nim_

```nim
include re
write(stdout,toHex(1))
```

_Python_

```py
print(end="%X"%1)
```

_Coconut_

```coco
print(end="%X"%1)
```

_Swift_

```swift
print(String(1,radix:16,uppercase:true),terminator:"")
```

_Javascript_

```js
write(1.toString(16).toUpperCase())
```

_Janet_

```janet
(prin(string/format"%X"1))
```

_Clojure_

```clj
(print(format"%X"1))
```


## int_to_bool

_Golfscript_

```gs
1:x;
```

_Nim_

```nim
var x=1==0
```

_Python_

```py
x=1
```

_Coconut_

```coco
x=1
```

_Swift_

```swift
var x=1 != 0
```

_Javascript_

```js
x=1
```

_Janet_

```janet
(var x(not= 1 0))
```

_Clojure_

```clj
(def x(not= 1 0))
```


## dec_to_int

_Golfscript_

```gs
"x"
```

_Lua_

```lua
io.write("x")
```

_Nim_

```nim
write(stdout,"x")
```

_Python_

```py
print(end="x")
```

_Coconut_

```coco
print(end="x")
```

_Swift_

```swift
print("x",terminator:"")
```

_Javascript_

```js
write`x`
```

_Janet_

```janet
(prin"x")
```

_Clojure_

```clj
(print"x")
```


## bool_to_int

_Golfscript_

```gs
1
```

_Nim_

```nim
write(stdout,int(true))
```

_Python_

```py
print(1*1,end="")
```

_Coconut_

```coco
print(1*1,end="")
```

_Swift_

```swift
print(true ?1:0,terminator:"")
```

_Javascript_

```js
write(true)
```

_Janet_

```janet
(prin(if true 1 0))
```

_Clojure_

```clj
(pr(if true 1 0))
```


## range_incl

_Nim_

```nim
include prelude
var x=toSeq(1..1)
```

_Swift_

```swift
var x=1...1
```


## range_excl

_Nim_

```nim
include prelude
var x=toSeq(1..<10)
```

_Python_

```py
x=[*range(1,10)]
```

_Coconut_

```coco
x=[*range(1,10)]
```

_Swift_

```swift
var x=1..<10
```
