# Nim

```polygolf
print (text_split "abc" "b");
```

```nim
include re
"abc".split("b").echo
```

```polygolf
println ((1 + 1) * 2);
```

```nim nogolf
echo (1+1)*2
```

```polygolf
println (int_to_text 1);
```

```nim nogolf
echo $1
```

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

```nim
var a=0
for i in..9:
 for j in..9:
  if i<j:
   if i<j:
    a=j;if i<j:a=j
    a=j;if i<j:a=j;a=j
 a=i
```

## Variables & Assignments

```polygolf
$a:0..10 <- 0;
$b:0..10 <- 0;
$a <- 1;
$b <- 1;
```

```nim nogolf
var a,b=0
a=1
b=1
```

```polygolf
if true {
    if true {
        $a <- 0;
        $b <- 1;
        $c <- 2;
    };
};
```

```nim nogolf
if true:
 if true:
  var(a,b,c)=(0,1,2)
```

```polygolf
if true {
    if true {
        $a:0..10 <- 0;
        $b:0..10 <- 1;
        $c <- ($a + $b);
    };
};
```

```nim nogolf
if true:
 if true:
  var(a,b)=(0,1);var c=a+b
```

```polygolf
$a:0..10 <- 1;
$b:0..10 <- 2;
$c:0..20 <- ($a + $b);
```

```nim nogolf
var
 a=1
 b=2
 c=a+b
```
