# Nim

## Ops emit

```polygolf
$t:(Ascii 3) <- "";
$n:0..1 <- 0;
$m <- $n;
$b <- (1<2);

text_get_byte $t 2;
text_get_byte_slice $t 2 6;
text_byte_to_int "a";
text_get_byte_to_int "abc" 1;
text_split $t "|";
text_split_whitespace $t;
text_byte_length $t;
repeat $t 3;
max $n 1;
min $n 1;
abs $n;
text_to_int $t;
print $t;
println $t;
bool_to_int $b;
int_to_text_byte 48;
$t .. "x";
text_replace "a+b+c" "+" "*";
text_replace "a*b*c" "*" "";
text_multireplace "XYZXYZ" "Y" "b" "X" "a";
join (list "xy" "abc") "/";
join (list "12" "345") "";

~ $n;
not $b;

- $n;
int_to_text $n;
$n ^ 3;
$n * $m;
-3 trunc_div $n;
-3 rem $n;
unsigned_trunc_div 3 $n;
unsigned_rem 3 $n;
$n << 3;
$n >> 3;
$n + 3;
$n - 3;
$n & 3;
$n | 3;
$n ~ 3;

$n < 3;
$n <= 3;
$n == 3;
$n != 3;
$n >= 3;
$n > 3;

and $b $b;
or $b $b;

list_find (list "") "";
```

```nim nogolf
import strutils,math
var
 t=""
 n=0
 m=n
 b=1<2
t[2]
t[2..<6]
ord("a"[0])
ord("abc"[1])
split(t,"|")
split(t)
len(t)
repeat(t,3)
max(1,n)
min(1,n)
abs(n)
parseInt(t)
write(stdout,t)
echo(t)
int(b)
chr(48)
t&"x"
replace("a+b+c","+","*")
replace("a*b*c","*")
multireplace("XYZXYZ",{"Y":"b","X":"a"})
join(@["xy","abc"],"/")
join(@["12","345"])
not n
not b
-n
$n
n^3
n*m
-3 div n
-3 mod n
3/%n
3%%n
n shl 3
n shr 3
3+n
n-3
3 and n
3 or n
3 xor n
n<3
n<=3
n==3
n!=3
n>=3
n>3
b and b
b or b
find(@[""],"")
```

## Misc

```polygolf
println ((int_to_text 1) .. "x");
```

```nim
echo $1&"x"
```

```polygolf
$a:0..10 <- 0;
for $i 0 10 {
    for $j 0 10 {
        if ($i < $j) {
            if ($i < $j) {
                $a <- $j;
                if ($i < $j) {
                    $a <- $j;
                };
                $a <- $j;
                if ($i < $j) {
                    $a <- $j;
                    $a <- $j;
                };
            };
        };
    };
    $a <- $i;
};
```

```nim
var a=0
for i in..9:
 for j in..9:
  if i<j:
   if i<j:
    a=j;if i<j:a=j
    a=j;if i<j:a=j;a=j
 a=i
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```nim
import os
for x in..99:echo paramStr 1+x
```

```polygolf
$b <- 0;
for $i $b 16 {
    println_int $i;
};
```

```nim nogolf
var b=0
for i in b..<16:echo(i)
```

## Variables & Assignments

```polygolf
$a:0..10 <- 0;
$b:0..10 <- 0;
$a <- 1;
$b <- 1;
```

```nim nogolf
var a,b=0
a=1
b=1
```

```polygolf
if true {
    if true {
        $a <- 0;
        $b <- 1;
        $c <- 2;
    };
};
```

```nim nogolf
if true:
 if true:
  var(a,b,c)=(0,1,2)
```

```polygolf
if true {
    if true {
        $a:0..10 <- 0;
        $b:0..10 <- 1;
        $c <- ($a + $b);
    };
};
```

```nim nogolf
if true:
 if true:
  var(a,b)=(0,1);var c=a+b
```

```polygolf
$a:0..10 <- 1;
$b:0..10 <- 2;
$c:0..20 <- ($a + $b);
```

```nim nogolf
var
 a=1
 b=2
 c=a+b
```

## Indexing precedence

```polygolf
list_get (text_split "a b" " ") 1;
```

```nim nogolf
include re
split("a b"," ")[1]
```

```nim
include re
"a b".split" "[1]
```

## Raw string literals

```polygolf
print "Hello world!";
```

```nim
echo"Hello world!"
```

```polygolf
print "Hello\nworld!";
```

```nim
echo "Hello\nworld!"
```

```polygolf
print "Hello\\n\\n\\nworld!";
```

```nim
echo"Hello\n\n\nworld!"
```

```polygolf
print "Hello \"world\"!";
```

```nim
echo"Hello ""world""!"
```

## Indexless loop

```polygolf
for 10 (println "Hi");
```

```nim
for()in..9:echo"Hi"
```

## Text literals

```polygolf
"\n";
"\u000565";
"\u0005xx";
"š";
"💎";
```

```nim nogolf 32..127
"\n"
"\x0565"
"\5xx"
"\u0161"
"\u{1f48e}"
```

## Conditional ops

```polygolf
(conditional (builtin "c"):Bool 3 4) div 2;
```

```nim nogolf
(if c:3 else:4)/%2
```

```nim
[4,3][int c]/%2
```

```polygolf
$c:Bool <- true;
2 + (conditional $c 3 4);
```

TODO split left & right prec after #254

```nim nogolf skip
var c=true
2+if c:3 else:4
```

## Ufcs

```polygolf
function_call (infix "." (builtin "x") (builtin "f")) (builtin "y");
infix " " (builtin "f") (builtin "x");
index_call (infix " " (infix "." "x" (builtin "f")) " ") 1;
```

```nim skipTypecheck
x.f y
f x
"x".f" "[1]
```
