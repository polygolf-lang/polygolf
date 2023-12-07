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
slice[byte] "abcdefg" 0 3;
"a" == "b";
"a" != "b";

% Other
at[Table] (table (1 => 2)) 1;
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
right_align "he" 7;
int_to_hex_aligned 31 7;
```

```janet nogolf
(var a 0)(var b"xy")(var c(= 0 0))(var d @["q""r""s"])(and c c)(or c c)(not c)(bnot a)(* -1 a)(math/abs a)(+ 2 a)(+ -2 a)(* 2 a)(div a 2)(math/pow a 2)(% a 2)(band 2 a)(bor 2 a)(bxor 2 a)(max 2 a)(min 2 a)(blshift a 2)(brshift a 2)(< a 2)(<= a 2)(= a 2)(not= a 2)(>= a 2)(> a 2)(slice"abc"1 2)("g"0)("ijk"1)(length"opq")(string/format"%c"99)(slice"abcdefg"2 5)(take 3"abcdefg")(="a""b")(not="a""b")(@{1 2}1)(d 1)(length d)(string/join d"_")(sorted d)(string b"xyz")(string 5)(string/format"%X"7)(eval-string"5")(string/split"y""xyz")(reverse b)(reverse d)(string/repeat b 3)(string/format(string"%"(string 7)"s")"he")(string/format(string"%0"(string 7)"X")31)
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

## Block in if statement

```polygolf
if (> 1 0) {
    $x <- 1;
    print $x;
} {
    $y <- 2;
    println $y;
};
```

```janet nogolf
(if(> 1 0)(do(var x 1)(prin x))(do(var y 2)(pp y)))
```

## Mutating ops

```polygolf
$a:-10..10 <- 3;
$a <- (mod $a 4):-10..10;
$a <- (* $a 5):-10..10;
$a <- (+ $a 3):-10..10;
$a <- (- $a 3):-10..10;
$a <- (+ $a 1):-10..10;
$a <- (- $a 1):-10..10;
```

```janet nogolf
(var a 3)(%= a 4)(*= a 5)(+= a 3)(-= a 3)(++ a)(-- a)
```

## implicitlyConvertConcatArg

```polygolf
(.. "he" (int_to_dec 11) "o");
```

```janet implicitlyConvertConcatArg
(string"he"11"o")
```
