# GolfScript

## Printing

```polygolf
println[Int] 1;
print[Int] 2;
println "a";
print "b";
```

```golfscript nogolf
1"
"+2"a
""b"
```

```polygolf
$x:Int <- 1;
print[Int] $x;
print[Int] $x;
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
at[byte] "abc" 1;
ord "g";
ord_at[byte] "ijk" 1;
size[byte] "opq";
char[byte] 99;
slice[byte] "abcdefg" 2 3;
"a" == "b";
"a" != "b";

% Other
at[List] $d 1;
size[List] $d;
join $d "_";
sorted $d;
concat[Text] $b "xyz";
int_to_dec 5;
int_to_bin 6;
int_to_hex 7;
int_to_bin_aligned 8 7;
int_to_hex_aligned 9 7;
dec_to_int "5";
split "xyz" "y";
split_whitespace "a\nb c";
reversed[byte] $b;
reversed[List] $d;
repeat $b 3;

```

```golfscript nogolf
0:A;"xy":b;0 0=:c;["q""r""s"]:d;c c and c c or c!A~-1 A*A abs 2 A+A 2- 2 A*A 2/A 2?A 2%2 A&2 A|2 A^[2 A]$1=[2 A]$0=4 A*A 4/A 2<A 3<A 2=A 2=!A 1>A 2>["abc"1=]""+"g")"ijk"1="opq",[99]""+"abcdefg"5<2>"a""b"="a""b"=!d 1=d,d"_"*d$b"xyz"+5`6 2 base""*7 16 base{.9>7*+48+}%""+8 7 2base""+\1$,-.0>*"0"*\+9 7 16base{.9>7*+48+}%""+\1$,-.0>*"0"*\+"5"~"xyz""y"/"a
b c"{...9<\13>+*\32if}%" "/b-1%d-1%b 3*
```

## Looping

```polygolf
for $i 0 31 {
  println ((1 + $i) + ($i * $i));
};
```

```golfscript bytes
31,{:i;1 i+i i*+n}%
```

```polygolf
for $i 5 80 5 {
  println[Int] $i;
};
```

```golfscript nogolf
80,5>5%{:i;i"
"+}%
```

```polygolf
for $i -5 31 {
  println $i;
};
```

```golfscript nogolf
36,{5-:i;i"
"+}%
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println $i;
};
```

```golfscript nogolf
-4:A;6,{A+:i;i"
"+}%
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
println (at[argv] 5);
```

```golfscript nogolf
:a;a 5="
"+
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```golfscript nogolf
:a;a{:x;x"
"+}%
```
