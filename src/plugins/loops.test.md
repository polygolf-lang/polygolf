# Loops

## For range to others

```polygolf
for $i 0 10 {
  print_int $x;
};
```

```polygolf loops.forRangeToForRangeInclusive
for_range_inclusive $i 0 9 1 (
  print_int $x
);
```

```polygolf loops.forRangeToWhile
$i <- 0;
while ($i < 10) {
  print_int $x;
  $i <- (1 + $i);
};
```

```polygolf loops.forRangeToForCLike
for_c_like ($i <- 0) ($i < 10) ($i <- (1 + $i)) (
  print_int $x
);
```

## For each

```polygolf
for $i 0 (# $collection) {
  print (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach("list_get")
for_each (id "i+each") $collection (
  print (id "i+each")
);
```

```polygolf
$collection <- (array "a" "b" "c");
for $i 0 3 {
  print (array_get $collection $i);
};
```

```polygolf loops.forRangeToForEach("array_get")
$collection <- (array "a" "b" "c");
for_each (id "i+each") $collection (
  print (id "i+each")
);
```

```polygolf
$collection <- (array "a" "b" "c" "d");
for $i 0 3 {
  print (array_get $collection $i);
};
```

```polygolf loops.forRangeToForEach("array_get")
$collection <- (array "a" "b" "c" "d");
for $i 0 3 (
  print (array_get $collection $i)
);
```

```polygolf
for $i 0 10 (
  print (text_get_byte "9876543210" $i)
);
```

```polygolf loops.forRangeToForEach("text_get_byte")
for_each (id "i+each") "9876543210" (
  print (id "i+each")
);
```

```polygolf
for $i 0 5 (
  print (text_get_byte "9876543210" $i)
);
```

```polygolf loops.forRangeToForEach("text_get_byte")
for $i 0 5 (
  print (text_get_byte "9876543210" $i)
);
```

```polygolf
for $i 0 5 {
  print_int (list_get (list 5 4 3 2 1) $i);
};
```

```polygolf loops.forRangeToForEach("list_get")
for_each (id "i+each") (list 5 4 3 2 1) (
  print_int (id "i+each")
);
```

## For each pair

```polygolf
for $i 0 (# $collection) {
  print_int $i;
  print_int (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach("list_get")
for $i 0 (# $collection) {
  print_int $i;
  print_int (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEachPair
for_each_pair $i (id "i+each") $collection {
  print_int $i;
  print_int (id "i+each");
};
```

## For each argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```polygolf loops.forArgvToForEach
for_each $x argv (
  println $x
);
```

```polygolf loops.forArgvToForRange()
for (id "x+index") 0 100 {
  $x <- (argv_get (id "x+index"));
  println $x;
};
```

```polygolf loops.forArgvToForRange(false)
for (id "x+index") 0 argc {
  $x <- (argv_get (id "x+index"));
  println $x;
};
```

## Shift range

```polygolf
for $i 0 80 {
  println_int ($i + 1);
  println_int (1 + $i);
  println_int (3 * $i);
  println_int ($i + 2);
  println_int ($i - 1);
  println_int ($i - 2);
  println_int (1 - $i);
  println_int (-1 - $i);
};
```

```polygolf loops.shiftRangeOneUp
for (id "i+shift") 1 81 {
  println_int (id "i+shift");
  println_int (id "i+shift");
  println_int (3 * (-1 + (id "i+shift")));
  println_int (1 + (id "i+shift"));
  println_int (-2 + (id "i+shift"));
  println_int (-3 + (id "i+shift"));
  println_int (2 + (-1 * (id "i+shift")));
  println_int (-1 * (id "i+shift"));
};
```
