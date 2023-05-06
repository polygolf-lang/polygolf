# Identifiers

## Renaming

```polygolf
$multiplier <- 10;
$base <- "Hello world!";
$bigOne <- (repeat $base $multiplier);
```

```polygolf idents.renameIdents()
$m <- 10;
$b <- "Hello world!";
$B <- (repeat $b $m);
```

## Aliasing

```polygolf
println "text";
println "text";
println_int 12345;
println_int 12345;
println_int 12345;
println "text";
```

<!-- alias plugin cannot be tested directly yet, so we test it on Python -->

```py
p=print
t="text"
a=12345
p(t)
p(t)
p(a)
p(a)
p(a)
p(t)
```
