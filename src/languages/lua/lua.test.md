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
concat $b "xyz";
text_byte_length "abc";
int_to_text 5;
text_to_int "5";
conditional ($a == 2) $a 3;
```

```lua nogolf
a=0
b="xy"
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
("abc"):byte(2)
b.."xyz"
("abc"):len()
""..5
1*"5"
a==2 and a or 3
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
