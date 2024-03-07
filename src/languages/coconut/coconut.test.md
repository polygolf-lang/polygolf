# Coconut

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```coconut
for x in os.sys.argv[1:]:print(x)
```

```polygolf
print (at[argv] 0);
```

```coconut
print(os.sys.argv[1])
```

## Unicode ops

```polygolf
$x <- 0;
$y <- 0;
($x <= $y);
```

```coconut nogolf chars
x=0
y=0
x≤y
```
