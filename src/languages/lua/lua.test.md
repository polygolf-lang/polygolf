# Lua tests

## Assignment

```polygolf
$b <- 1;
```

```lua
b=1
```

## Prints

```polygolf
print "x";
println "y";
```

```lua nogolf
io.write("x")
print("y")
```

## Ops emit

```polygolf
$a:-100..100 <- 0;
$b:Text <- "xy";
$c <- true;
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
$a >= 2;
$a > 2;
array_get (array "xy" "abc") 1;
text_get_byte "abc" 1;
text_byte_to_int "a";
text_get_byte_to_int "abc" 1;
int_to_text_byte 99;
concat $b "xyz";
text_byte_length "abc";
int_to_text 5;
text_to_int "5";
text_replace $b "a" "A";
text_replace $b "(" "*";
text_replace $b $b:(Text 1..oo) $b;
join (list "xy" "abc") "/";
join (list "12" "345") "";
conditional ($a == 2) $a 3;
conditional ($a == 2) $c false;
```

```lua nogolf
a=0
b="xy"
c=true
~a
-a
2+a
a-2
2*a
a//2
a^2
a%2
2&a
2|a
2~a
a<<2
a>>2
a<2
a<=2
a==2
a>=2
a>2
({"xy","abc"})[2]
("abc"):sub(2,2)
("a"):byte(1)
("abc"):byte(2)
string.char(99)
b.."xyz"
("abc"):len()
""..5
1*"5"
b:gsub("a","A")
b:gsub("%(","*")
b:gsub(b:gsub("(%W)","%%%1"),b:gsub("%%","%%%%"))
table.concat({"xy","abc"},"/")
table.concat({"12","345"})
a==2 and a or 3
(a==2 and{c}or{false})[1]
```

## Parentheses

```polygolf
$t <- "abc";
text_byte_length $t;
```

```lua nogolf
t="abc"
t:len()
```

```polygolf
$a <- (array "abc" "xyz");
text_byte_length (array_get $a 1);
```

```lua nogolf
a={"abc","xyz"}
a[2]:len()
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```lua nogolf
for x=0,99 do X=arg[1+x]
print(X)end
```

## Implicit conversions

```polygolf
2 * (text_to_int "3");
```

```lua
2*"3"
```

```polygolf
2 + (text_to_int "3");
```

```lua
2+"3"
```

```polygolf
"x" .. (int_to_text 3);
```

```lua
"x"..3
```

```polygolf
(int_to_text 3) .. "x";
```

```lua
3.."x"
```

## Int literals

```polygolf
-58;
-4312895125801;
-7593017301530357895;
1000000;
6999999999999999999;
```

```lua
-58
-4312895125801
-0x695fd101971cb087
1e6
7e18-1
```

## Text literals

```polygolf
"\n";
"\u000565";
"\u0005xx";
"š";
"💎";
```

```lua nogolf 32..127
"\n"
"\00565"
"\5xx"
"\u{161}"
"\u{1f48e}"
```
