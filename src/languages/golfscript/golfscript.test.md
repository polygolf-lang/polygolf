# GolfScript

## Printing

```polygolf
println_int 1;
print_int 2;
println "a";
print "b";
```

```golfscript nogolf
1 puts 2 print"a"puts"b"print
```

## Ops emit

```polygolf
$a:-100..100 <- 0;
$b:Text <- "xy";
$c <- (0==0);
$d <- (list "q" "r" "s");
~ $a;
- $a;
$a + 2;
$a - 2;
$a * 2;
$a div 2;
$a ^ 2;
$a mod 2;
$a & 2;
$a | 2;
$a ~ 2;
$a << 2;
$a >> 2;
$a < 2;
$a <= 2;
$a == 2;
$a != 2;
$a >= 2;
$a > 2;
max $a 2;
min $a 2;
abs $a;
list_get $d 1;
list_push $d "t";
list_length $d;
join $d;
join_using $d "_";
sorted $d;
text_get_byte "abc" 1;
concat $b "xyz";
text_byte_length "abc";
% int_to_text 5; %% To be uncommented once backticks can be used in MD tests
text_to_int "5";
byte_to_text 5;
text_split "xyz" "y";
text_byte_reversed $b;
repeat $b 3;
and $c $c;
or $c $c;
not $c;
```

```golfscript nogolf
0:a;"xy":b;0 0=:c;["q""r""s"]:d;a~a-1*2 a+a 2- 2 a*a 2/a 2?a 2%2 a&2 a|2 a^a 2 2\?*a 2 2\?/a 2<a 2)<a 2=a 2=!a 2(>a 2>2 a[]++$1=2 a[]++$0=a abs d 1=d"t"+d,d''*d"_"*d$"abc"1=[]+''+b"xyz"+"abc","5"~5[]+''+"xyz""y"/b-1%b 3*c c and c c or c!
```

## Looping

```polygolf
for $i 0 31 {
  println_int ((1 + $i) + ($i * $i));
};
```

```golfscript bytes
31,{:i;1 i+i i*+puts}%
```

```polygolf
for $i 5 80 5 {
  println_int $i;
};
```

```golfscript nogolf
80,5>5%{:i;i puts}%
```

```polygolf
for $i -5 31 {
  println_int $i;
};
```

```golfscript nogolf
36,{5-:i;i puts}%
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println_int $i;
};
```

```golfscript nogolf
-4:a;6,{a+:i;i puts}%
```

## Argv

```polygolf
println (argv_get 5);
```

```golfscript nogolf
:a;5 a=puts
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```golfscript nogolf
:a;a{:x;x puts}%
```
