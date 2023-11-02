# Type plugins

## Bigint flooding

```polygolf
$x: Int <- 5;
$y: 0..100 <- 2;
((3 + $x) * $y);
```

```polygolf types.floodBigints("int53",{"Assignment":"bigint","add":"bigint","mul":"bigint","pow":"bigint"})
$x:Int:"bigint" <- 5:"bigint";
$y: 0..100 <- 2;
((3:"bigint" + $x:"bigint") * $y:"bigint");
```
