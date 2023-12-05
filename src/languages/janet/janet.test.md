# Janet

## Printing

```polygolf
$a <- 1;
$b <- "x";
println $a;
print $a;
println $b;
print $b;
```

```janet nogolf
(var a 1)(var b"x")(pp a)(prin a)(print b)(prin b)
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
ord_at "ijk" 1;
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
int_to_hex 7;
dec_to_int "5";
split "xyz" "y";
reversed[byte] $b;
reversed[List] $d;
repeat $b 3;
```

```janet nogolf
(var a 0)(var b"xy")(var c(= 0 0))(var d @["q""r""s"])(and c c)(or c c)(not c)(bnot a)(* -1 a)(math/abs a)(+ 2 a)(+ -2 a)(* 2 a)(div a 2)(math/pow a 2)(% a 2)(band 2 a)(bor 2 a)(bxor 2 a)(max 2 a)(min 2 a)(blshift a 2)(brshift a 2)(< a 2)(<= a 2)(= a 2)(not= a 2)(>= a 2)(> a 2)(slice"abc"1 2)("g"0)("ijk"1)(length"opq")(string/format"%c"99)(slice"abcdefg"2 5)(="a""b")(not="a""b")(d 1)(length d)(string/join d"_")(sorted d)(string b"xyz")(string 5)(string/format"%X"7)(eval-string"5")(string/split"y""xyz")(reverse b)(reverse d)(string/repeat b 3)
```

## Looping

```polygolf
for $i 0 31 {
  println ((1 + $i) + ($i * $i));
};
```

```janet nogolf
(for i 0 31(pp(+ 1 i(* i i))))
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println $i;
};
```

```janet nogolf
(var a -4)(for i a(+ 6 a)(pp i))
```

```polygolf
for 5 {
  print "x";
};
```

```janet nogolf
(for _ 0 5(prin"x"))
```

```polygolf
while (> 1 0) {
    println 5;
    $x <- 1;
};
```

```janet nogolf
(while(> 1 0)(pp 5)(var x 1))
```

## Argv

```polygolf
println (at[argv] 5);
```

```janet nogolf
(print((dyn :args)6))
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```janet nogolf
(each x(slice(dyn :args)1)(print x))
```
