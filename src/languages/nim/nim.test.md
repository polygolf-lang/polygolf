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
    a=j
    if i<j:a=j
    a=j
    if i<j:a=j;a=j
 a=i
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```nim
import os
for x in commandLineParams():x.echo
```
