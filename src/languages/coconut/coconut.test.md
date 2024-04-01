# Coconut

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```coconut nogolf
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

## Implicit calls

```polygolf
max $$a $$b $$c;
```

```coco skipTypecheck
max a b c
```

```polygolf
42 * $$x:Int;
```

```coco
42x
```

```polygolf
print (42 * $$x:Int);
```

```coco
print(42x)
```

## Pipes

```polygolf
ord "x";
```

```coco chars
"x"↦ord
```

## Infix calls

```polygolf
function_call $$f $$x "x";
```

```coco skipTypecheck
x`f`"x"
```
