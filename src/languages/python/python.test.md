# Python

## Printing

```polygolf
println 1;
print 2;
print "3";
print 4;
```

```python bytes
p=print
p(1)
p(2,end="")
p(end="3")
p(4)
```

## Indexing

```polygolf
$a <- (text_get_char "abcdefg" 4);
$b <- (text_get_slice "abcdefg" 1 3);
$c <- (text_reversed "abcdefg");
```

```python bytes
a="abcdefg"[4]
b="abcdefg"[1:3+1]
c="abcdefg"[::-1]
```

## Text splitting

```polygolf
$a <- (text_split "a_bc_d_" "_");
$b <- (text_split_whitespace " a\nbc  d");
```

```python bytes
a="a_bc_d_".split("_")
b=" a\nbc  d".split()
```

## Indenting

```polygolf
$a:0..10 <- 0;
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
                    $a <- $j;
                };
            };
        };
    };
    $a <- $i;
};
```

```python bytes
a=0
for i in range(10):
 for j in range(10):
  if i<j:
   if i<j:
    a=j
    if i<j:a=j
    a=j
    if i<j:a=j;a=j
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

## Associativity

```polygolf
$x <- 0:0..oo;
$a <- (($x + $x) + $x);
$b <- ($x + ($x + $x));
$a <- (($a + $x) + $x);
$a <- ($a + 1);
```

```python bytes
x=0
a=x+x+x
b=x+x+x
a+=x+x
a+=1
```

```polygolf
$x <- (list 0:0..oo);
list_set $x 0 ((list_get $x 0) + 1);
```

```python bytes
x=[0]
x[0]+=1
```
