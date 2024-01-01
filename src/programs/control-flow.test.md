# Control flow

## Loop over a list

```polygolf
$list <- (list "aaa" "bb" "c");
for $x $list {
    println $x;
};
```

```gs nogolf
["aaa""bb""c"]:l;l{:x;x"
"+}%
```

```janet nogolf
(var l @["aaa""bb""c"])(each x l(print x))
```

```js nogolf
l=["aaa","bb","c"]
for(x of l)print(x)
```

```lua nogolf
l={"aaa","bb","c"}
for i=1,#l do
print(l[i])end
```

```nim nogolf
var l= @["aaa","bb","c"]
for x in l:echo(x)
```

```py nogolf
l=["aaa","bb","c"]
for x in l:print(x)
```

```swift nogolf
var l=["aaa","bb","c"]
for x in l{print(x)}
```

## Loop over characters of a text

```polygolf
$text <- "asdfgh";
for[Ascii] $x $text {
    println $x;
};
```

```gs nogolf
TODO
```

```janet nogolf
TODO
```

```js nogolf
t="asdfgh";
for(x of t)print(x)
```

```lua nogolf
TODO
```

```nim nogolf
var t="asdfgh"
for x in t:echo(x)
```

```py nogolf
t="asdfgh"
for x in t:echo(x)
```

```swift nogolf
TODO
```

## Loop over a 1-step range

```polygolf
$n <- 20;
for $x (0..<$n 1) {
    println $x;
};
```

```gs nogolf
20:N;N,{:x;x"
"+}%
```

```janet nogolf
(var n 20)(for x 0 n(pp x))
```

```js nogolf
n=20
for(x=0;x<n;++x)print(x)
```

```lua nogolf
n=20
for x=0,n-1 do print(x)end
```

```nim nogolf
var n=20
for x in 0..<n:echo(x)
```

```nim
for x in..19:echo x
```

```py nogolf
n=20
for x in range(n):print(x)
```

```swift nogolf
var n=20
for x in 0..<n{print(x)}
```

## Loop over a range with step

```polygolf
$a <- -20;
$n <- 20;
$k <- 3;
for $x ($a..<$n $k) {
    println $x;
};
```

```gs nogolf
-20:A;20:N;3:k;N A-,k%{:x;x"
"+}%
```

```janet nogolf
(var a -20)(var n 20)(var k 3)(loop[x :range[a n k]](pp x))
```

```js nogolf
a=-20
n=20
k=3
for(x=a;x<n;x+=k)print(x)
```

```lua nogolf
a=-20
n=20
k=3
for x=a,n-1,k do print(x)end
```

```nim nogolf
var
 a= -20
 n=20
 k=3
for x in countup(a,n,k):echo(x)
```

```py nogolf
a=-20
n=20
k=3
for x in range(a,n,k):print(x)
```

```swift nogolf
var a = -20,n=20,k=3
for x in stride(from:a,to:n,by:k){print(x)}
```
