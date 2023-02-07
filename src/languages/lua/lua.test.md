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

## Ops

```polygolf
~ 1;
- 1;
1 + 2;
1 - 2;
1 * 2;
1 div 2;
1 ^ 2;
1 mod 2;
1 & 2;
1 | 2;
1 ~ 2;
1 < 2;
1 <= 2;
1 == 2;
1 >= 2;
1 > 2;
array_get (array "xy" "abc") 1;
text_get_byte "abc" 1;
text_concat "abc" "xyz";
text_length "abc";
int_to_text 5;
text_to_int "5";
```

```lua nogolf
~1
-1
1+2
1-2
1*2
1//2
1^2
1%2
1&2
1|2
1~2
1<2
1<=2
1==2
1>=2
1>2
({"xy","abc"})[1+1]
("abc"):byte(1+1)
"abc".."xyz"
("abc"):len()
tostring(5)
~~"5"
```

## Parentheses

```polygolf
$t <- "abc";
text_length $t;
```

```lua nogolf
t="abc"
t:len()
```

```polygolf
$a <- (array "abc" "xyz");
text_length (array_get $a 1);
```

```lua nogolf
a={"abc","xyz"}
a[1+1]:len()
```
