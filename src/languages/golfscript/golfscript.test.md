# GolfScript

## Printing

```polygolf
println_int 1;
print_int 2;
println "a";
print "b";
```

```golfscript nogolf
1 n 2"a
""b"
```

```polygolf
$x:Int <- 1;
print_int $x;
print_int $x;
```

```golfscript nogolf
1:x;x x
```

## Ops emit

```polygolf
$a:-100..100 <- 0;
$b:Text <- "xy";
$c <- (0==0);
$d <- (list "q" "r" "s");

% Boolean
and $c $c;
or $c $c;
not $c;

% Unary Arithmetic
~ $a;
- $a;
abs $a;

% Binary Arithmetic
$a + 2;
$a - 2;
$a * 2;
$a div 2;
$a ^ 2;
$a mod 2;
$a & 2;
$a | 2;
$a ~ 2;
max $a 2;
min $a 2;

% Comparison
$a << 2;
$a >> 2;
$a < 2;
$a <= 2;
$a == 2;
$a != 2;
$a >= 2;
$a > 2;

% Text Encoding
text_get_byte "abc" 1;
text_get_codepoint "def" 1;
text_byte_to_int "g";
codepoint_to_int "h";
text_get_byte_to_int "ijk" 1;
text_get_codepoint_to_int "lmn" 1;
text_byte_length "opq";
text_codepoint_length "rst";
int_to_text_byte 99;
int_to_codepoint 99;

% Other
list_get $d 1;
list_push $d "t";
list_length $d;
join $d "_";
sorted $d;
concat $b "xyz";
int_to_text 5;
text_to_int "5";
text_split "xyz" "y";
text_byte_reversed $b;
repeat $b 3;

```

```golfscript nogolf
0:a;"xy":b;0 0=:c;["q""r""s"]:d;c c and c c or c!a~-1 a*a abs 2 a+a 2- 2 a*a 2/a 2?a 2%2 a&2 a|2 a^[2 a]$1=[2 a]$0=4 a*a 4/a 2<a 3<a 2=a 2=!a 1>a 2>["abc"1=]""+["def"1=]""+"g")"h")"ijk"1="lmn"1="opq","rst",[99]""+[99]""+d 1=d"t"+d,d"_"*d$b"xyz"+5`"5"~"xyz""y"/b-1%b 3*
```

## Looping

```polygolf
for $i 0 31 {
  println_int ((1 + $i) + ($i * $i));
};
```

```golfscript bytes
31,{:i;1 i+i i*+n}%
```

```polygolf
for $i 5 80 5 {
  println_int $i;
};
```

```golfscript nogolf
80,5>5%{:i;i n}%
```

```polygolf
for $i -5 31 {
  println_int $i;
};
```

```golfscript nogolf
36,{5-:i;i n}%
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println_int $i;
};
```

```golfscript nogolf
-4:a;6,{a+:i;i n}%
```

```polygolf
for 5 {
  print "x";
};
```

```golfscript nogolf
5,{;"x"}%
```

## Argv

```polygolf
println (argv_get 5);
```

```golfscript nogolf
:a;a 5=n
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```golfscript nogolf
:a;a{:x;x n}%
```
