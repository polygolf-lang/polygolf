# GolfScript

```polygolf
println (3+1);
```

```golfscript bytes
4 puts
```

```polygolf
print 1;
print 2;
```

```golfscript bytes
1 print 2 puts
```

```polygolf
for $i 0 31 {
  println ((1 + $i) + ($i * $i));
};
```

```golfscript bytes
31,{:i;i i i*+1+puts}%
```

```polygolf
for $i 5 80 5 {
  println $i;
};
```

```golfscript bytes
80,5>5%{:i;i puts}%
```

```polygolf
for $i -5 31 {
  println $i;
};
```

```golfscript bytes
36,{5-:i;i puts}%
```

```polygolf
$a:-10..10 <- -4;
for $i $a ($a+6) {
  println $i;
};
```

```golfscript bytes
-4:a;6,{a+:i;i puts}%
```

```polygolf
println (argv_get 5);
```

```golfscript bytes
:a;5 a=puts
```

```polygolf
for_argv $x 100 {
  println $x;
};
```

```golfscript bytes
:a;a{:x;x puts}%
```
