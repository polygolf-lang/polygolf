# Javascript

## Ops emit

```polygolf
$t:(Ascii 3) <- "";
$n:0..1 <- 0;
$m <- $n;
$b <- true;
$L:(List 0..100) <- (list 3 2);

$m + $n;
$m - $n;
$m * $n;
$m div $n;
$m:Int div $n:Int;
$m mod $n;
$m ^ $n;
$m & $n;
$m | $n;
$m ~ $n;
min $m $n;
max $m $n;
$m < $n;
$m <= $n;
$m == $n;
$m != $n;
$m > $n;
$m >= $n;

or $b $b;
and $b $b;

(list_length $L):0..100;
list_contains $L 3;
list_get $L 0;
list_push $L 58;
list_find $L 3;

concat $t"bc";
repeat "x" 10;
text_contains $t "sub";
text_replace $t " " "-";
text_split $t " ";
join (list $t "www") ",";
join (list $t "www") " ";

abs $m;
~ $m;
- $m;
not $b;
int_to_text $m;
int_to_bin $m;
int_to_hex $m;
text_to_int $t;

```

```js nogolf
t=""
n=0
m=n
b=true
L=[3,2]
m+n
m-n
m*n
Math.floor(m/n)
m/n
m%n
m**n
m&n
m|n
m^n
Math.min(m,n)
Math.max(m,n)
m<n
m<=n
m==n
m!=n
m>n
m>=n
b||b
b&&b
L.length
L.includes(3)
L[0]
L.push(58)
L.indexOf(3)
t+"bc"
"x".repeat(10)
t.includes`sub`
t.replaceAll(" ","-")
t.split` `;[t,"www"].join();[t,"www"].join` `
abs(m)
~m;-m
!b
""+m
m.toString(2)
m.toString(16)
~~t
```

```polygolf
$x <- (@0);
$y <- (@1);
$z <- (@2);
text_replace $x " " "-";
text_replace $x " " $y;
text_replace $x $y:(Text 1..oo) $z;
$x <- (@3);
$y <- (@4);
$z <- (@5);
```

```js
a=arguments
x=a[0]
y=a[1]
z=a[2]
x.split` `.join`-`
x.replace(/ /g,y)
x.replaceAll(y,z)
x=a[3]
y=a[4]
z=a[5]
```

```polygolf
$x:0..9 <- 0;
$x <- ($x + 1):0..9;
```

```js simple
x=0;++x
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```js
for(x of arguments)print(x)
```

## Text literals

```polygolf
"\n";
"\u000565";
"\u0005xx";
"š";
"💎";
```

```js nogolf 32..127
"\n"
"\x0565"
"\x05xx"
"\u0161"
"\u{1f48e}"
```

```polygolf
"\n";
```

```js nogolf
`
`
```

## Aliasing properties

```polygolf
text_contains "A" "subA";
text_contains "B" "subB";
text_contains "C" "subC";
```

```js
i="includes"
"A"[i]`subA`
"B"[i]`subB`
"C"[i]`subC`
```

## Control flow

```polygolf
$b <- true;
if $b {
  print "true";
} {
  if $b {
    print "still true";
  } {
    print "impossible";
    print "!";
    if $b {
      print "?";
      print "!";
    };
  };
};
```

```js nogolf
b=true
if(b)write`true`else if(b)write`still true`else{write`impossible`
write`!`
if(b)write`?`,write`!`}
```

## Bigints

```polygolf
1e100;
```

```js
10n**100n
```

```polygolf
$x: Int <- 5;
$y: 0..100 <- 2;
println_int ((3 + $x) * $y);
$t <- (4 + $y);
$z <- ($x - 1);
```

```js nogolf
x=5n
y=2
print((3n+x)*BigInt(y))
t=4+y
z=x-1n
```

```polygolf
for $a 1 100 {
 println ((pow 2 $a) ~ 3);
 println ((pow 2 $a) | 3);
 println ((pow 2 $a) & 3);
 println ((pow 2 $a) mod 3);
};
```

```js nogolf
for(a=1;a<100;++a)print(3n^2n**BigInt(a)),print(3n|2n**BigInt(a)),print(3n&2n**BigInt(a)),print(2n**BigInt(a)%3n)
```

## Fixed length for loop

```polygolf
for $i 25 {
  println_int $i;
};
```

```js
for(i in{}+1e9)print(i)
```

```polygolf
for $a 0 16 {
    println (+ $a 20);
};
```

```js
for(a in{}+1)print(20+~~a)
```

## Conditional associativity

```polygolf
print_int (conditional (conditional (1 > 0) (1 < 0) (1 > 0)) 1 2);
```

```js nogolf
write((1>0?1<0:1>0)?1:2)
```
