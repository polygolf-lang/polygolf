# Tests of hexagony plugins

```polygolf
$a <- -12145;
$b <- 93;
```

```polygolf plugins.limitSetOp(999)
$a <- 121;
function_call "4" $a;
function_call "5" $a;
function_call "~" $a;
$b <- 8;
function_call ")" $b;
function_call "3" $b;
```
