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
$L <- (list "a" "b");
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
array_get (array "xy" $b) 1;
$L @ -1;
$L @ -2;
text_get_byte $b 1;
$b:Ascii @ -2;
text_get_byte_slice "abcdefg" 2 3;
text_byte_to_int "a";
text_get_byte_to_int $b 1;
int_to_text_byte 99;
concat $b "xyz";
text_byte_length $b;
int_to_text 5;
text_to_int "5";
int_to_hex 10;
text_replace $b "a" "A";
text_replace $b "(" "*";
text_replace $b $b:(Text 1..oo) $b;
join (list "xy" $b) "/";
join (list "12" "345") "";
conditional ($a == 2) $a 3;
conditional ($a == 2) $c false;
conditional ($a == 2) "x" "";
```

```lua nogolf
a=0
b="xy"
c=true
L={"a","b"}
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
({"xy",b})[2]
L[#L]
L[#L-1]
b:sub(2,2)
b:sub(-2,-2)
("abcdefg"):sub(3,5)
("a"):byte(1)
b:byte(2)
string.char(99)
b.."xyz"
b:len()
""..5
1*"5"
string.format("%x",10)
b:gsub("a","A")
b:gsub("%(","*")
b:gsub(b:gsub("(%W)","%%%1"),b:gsub("%%","%%%%"))
table.concat({"xy",b},"/")
table.concat({"12","345"})
a==2 and a or 3
(a==2 and{c}or{false})[1]
a==2 and"x"or""
```

## Parentheses

```polygolf
$t <- "abc";
$i <- 0;
# $t;
ord_at[byte] "abc" $i;
```

```lua nogolf
t="abc"
i=0
t:len()
("abc"):byte(1+i)
```

```polygolf
$a <- (array "abc" "xyz");
text_byte_length (array_get $a 1);
```

```lua nogolf
a={"abc","xyz"}
a[2]:len()
```

```polygolf
(list 1 2 3) @ 1;
```

```lua
({1,2,3})[2]
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
"x" + (int_to_text 3);
```

```lua
"x"..3
```

```polygolf
(int_to_text 3) + "x";
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
