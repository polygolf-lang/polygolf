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
print (at[argv] 0);
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
$a <- 1;
```

```python no:hardcode
a=1
if a:print(a)
a=1
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

## Prefer chained assingment over aliasing

```polygolf
$a <- "Hello";
$b <- "Hello";
```

```py
a=b="Hello"
```

## String encoding Ops

```polygolf
text_get_byte "abc" 1;
text_get_codepoint "def" 1;
text_byte_to_int "g";
codepoint_to_int "h";
text_get_byte_to_int "ijk" 1;
text_get_codepoint_to_int "lmn" 1;
text_byte_length "opq";
text_codepoint_length "rst";
int_to_text_byte 99;
int_to_codepoint 999;
```

```py nogolf
"abc"[1]
"def"[1]
ord("g")
ord("h")
ord("ijk"[1])
ord("lmn"[1])
len("opq")
len("rst")
chr(99)
chr(999)
```

## Aliasing partially applied methods

```polygolf
$a <- (join (list "1" "2") "" );
$b <- (join (list "3" "4") "" );
$c <- (join (list "5" "6") "" );
```

```py
j="".join
a=j(["1","2"])
b=j(["3","4"])
c=j(["5","6"])
```

## Indexless loop

```polygolf
for 10 (println "Hi");
```

```py nogolf
for _ in"X"*10:print("Hi")
```

## Text literals

```polygolf
"\n";
"\u000565";
"š";
"💎";
```

```py nogolf 32..127
"\n"
"\x0565"
"\u0161"
"\U0001f48e"
```

## Int literals

```polygolf
-58;
-4312895125801;
-7593017301530357895;
-10342397777323901548821733901575930173012222222;
69999999999999999999999;
```

```py
-58
-4312895125801
-0x695fd101971cb087
-int('7m93qx4grzs1ls98c9nh5rs313rz0u',36)
7*10**22-1
```
