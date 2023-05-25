# Python

## Printing

```polygolf
println_int 1;
print_int 2;
print "3";
print_int 4;
```

```python nogolf
print(1)
print(2,end="")
print(end="3")
print(4,end="")
```

## Indexing

```polygolf
$a <- (text_get_codepoint "abcdefg" 4);
$b <- (text_get_codepoint_slice "abcdefg" 1 3);
$c <- (text_codepoint_reversed "abcdefg");
```

```python nogolf
a="abcdefg"[4]
b="abcdefg"[1:4]
c="abcdefg"[::-1]
```

## Text splitting

```polygolf
$a <- (text_split "a_bc_d_" "_");
$b <- (text_split_whitespace " a\nbc  d");
```

```python nogolf
a="a_bc_d_".split("_")
b=" a\nbc  d".split()
```

## Indenting

```polygolf
$a:0..10 <- 0;
$b:0..10 <- 0;
for $i 0 10 {
    for $j 0 10 {
        if ($i < $j) {
            if ($i < $j) {
                $a <- $j;
                if ($i < $j) {
                    $a <- $j;
                };
                $a <- $j;
                if ($i < $j) {
                    $a <- $j;
                    $a <- $b;
                };
            };
        };
    };
    $a <- $i;
};
```

```python nogolf
a=b=0
for i in range(10):
 for j in range(10):
  if i<j:
   if i<j:
    a=j
    if i<j:a=j
    a=j
    if i<j:a=j;a=b
 a=i
```

## Indenting if-else statements

```polygolf
if(1==1) {
    if (2==1) {
        println "a";
    } {
        println "b";
    };
} {
    println "x";
    if (3==1) {
        if (4==1) {
            if (5==1) {
                println "c";
            };
        } {
            println "d";
        };
    } {
        println "e";
    };
};
```

```python nogolf
if 1==1:
 if 2==1:print("a")
 else:print("b")
else:
 print("x")
 if 3==1:
  if 4==1:
   if 5==1:print("c")
  else:print("d")
 else:print("e")
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```python
import sys
for x in sys.argv[1:]:print(x)
```

```polygolf
print (argv_get 0);
```

```python
import sys
print(sys.argv[1])
```

## Mutating ops

```polygolf
$a:Int <- 1;
$a <- ($a + 2);
$a <- ($a - 2);
$a <- ($a - ($a * $a));
```

```python
a=1
a+=2
a-=2
a-=a*a
```

## Thruthiness

```polygolf
$a:0..oo <- 1;
if ($a != 0) {
    println_int $a;
};
```

```python
a=1
if a:print(a)
```

## Chained if

```polygolf
if true {
    println "a";
} {
    if true {
        println "b";
    };
};
```

```py
if 1:print("a")
elif 1:print("b")
```

## Multireplace

```polygolf
text_replace (text_replace (text_replace "text" "x" "s") "t" "ttt") "e" " ";
```

```py
"text".translate({120:"s",116:"ttt",101:32})
```
