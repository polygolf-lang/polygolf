# Nim

```polygolf
print (3+1);
```

```nim nogolf
stdout.write 3+1
```

```nim bytes
4.echo
```

```polygolf
print (text_split "abc" "b");
```

```nim
include re
"abc".split("b").echo
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
 