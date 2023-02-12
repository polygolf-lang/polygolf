# Python

```polygolf
println 1;
print 2;
print "3";
print 4;
```

```python bytes
p=print
print(1)
print(2,end="")
print(end="3")
print(4)
```

```polygolf
$a <- (text_get_char "abcdefg" 4);
$a <- (text_get_slice "abcdefg" 1 3);
$b <- (text_reversed "abcdefg");
```

```python bytes
a="abcdefg"[4]
b="abcdefg"[1:3+1]
c="abcdefg"[::-1]
```

```polygolf
$a <- (text_split "a_bc_d_" "_");
$b <- (text_split_whitespace " a\nbc  d");
```

```python bytes
a="a_bc_d_".split("_")
b=" a\nbc  d".split()
```