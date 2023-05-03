# Python

## Printing

```polygolf
println_int 1;
print_int 2;
print "3";
print_int 4;
```

```python nogolf
p=print
p(1)
p(2,end="")
p(end="3")
p(4,end="")
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
p=print
if 1==1:
 if 2==1:p("a")
 else:p("b")
else:
 if 3==1:
  if 4==1:
   if 5==1:p("c")
  else:p("d")
 else:p("e")
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
$a:0..oo <- 1;
$a <- ($a + 2);
```

```python
a=1
a+=2
```
