# Clojure

## Printing

```polygolf
$a <- 1;
$b <- "x";
println $a;
print $a;
println $b;
print $b;
```

```clj nogolf
(def a 1)(def b"x")(prn a)(pr a)(println b)(print b)
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

% Parity

is_even $a;
is_odd $a;

% Text Encoding
at[codepoint] "abc" 1;
ord[codepoint] "g";
ord_at[codepoint] "ijk" 1;
char[codepoint] 99;
slice[codepoint] "abcdefg" 2 3;
slice[codepoint] "abcdefg" 0 3;
"a" == "b";
"a" != "b";

% Other
at[Table] (table (1 => 2)) 1;
at[List] $d 1;
at_back[List] $d -2;
at_back[List] $d -1;
size[List] $d;
join $d "_";
sorted $d;
concat[Text] $b "xyz";
int_to_dec 5;
int_to_hex 7;
dec_to_int "5";
split "xyz" "y";
reversed[codepoint] $b;
reversed[List] $d;
repeat $b 3;
right_align "he" 7;
int_to_hex_aligned 31 7;
replace "abcbd" "b" "e";
```

```clj nogolf
(def a 0)(def b"xy")(def c(= 0 0))(def d["q""r""s"])(and c c)(or c c)(not c)(bit-not a)(- a)(abs a)(+ 2 a)(- a 2)(* 2 a)(quot a 2)(int(Math/pow a 2))(rem a 2)(bit-and 2 a)(bit-or 2 a)(bit-xor 2 a)(max 2 a)(min 2 a)(bit-shift-left a 2)(bit-shift-right a 2)(< a 2)(<= a 2)(= a 2)(not= a 2)(>= a 2)(> a 2)(even? a)(odd? a)(str(nth"abc"1))(int(nth"g"0))(int(nth"ijk"1))(str(char 99))(subs"abcdefg"2 5)(subs"abcdefg"0 3)(="a""b")(not="a""b")({1 2}1)(nth d 1)(nth d(-(count d)2))(last d)(count d)(clojure.string/join"_"d)(sort d)(str b"xyz")(str 5)(format"%x"7)(read-string"5")(.split"xyz""y")(clojure.string/reverse b)(reverse d)(apply str(repeat 3 b))(format"%7s""he")(format"%07x"31)(clojure.string/replace"abcbd""b""e")
```

## Looping

```polygolf
for $i 0 31 {
  println ((1 + $i) + ($i * $i));
};
```

```clj nogolf
(dotimes[i 31](prn(+ 1 i(* i i))))
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println $i;
};
```

```clj nogolf
(def a -4)(doseq[i(range a(+ 6 a))](prn i))
```

```polygolf
for 5 {
  print "x";
};
```

```clj nogolf
(dotimes[_ 5](print"x"))
```

```polygolf
while (> 1 0) {
    println 5;
    $x <- 1;
};
```

```clj nogolf
(while(> 1 0)(prn 5)(def x 1))
```

## Argv

```polygolf
println (at[argv] 5);
```

```clj nogolf
(println(nth *command-line-args* 5))
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```clj nogolf
(doseq[x *command-line-args*](println x))
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

```clj nogolf
(if(> 1 0)(do(def x 1)(pr x))(do(def y 2)(prn y)))
```

## implicitlyConvertConcatArg

```polygolf
(.. "he" (int_to_dec 11) "o");
```

```clj implicitlyConvertConcatArg
(str"he"11"o")
```
