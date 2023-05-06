# Loops

## For range to others

```polygolf
for $i 0 10 {
  print_int $x;
};
```

```polygolf loops.forRangeToForRangeInclusive()
@ForRangeInclusive $i 0 9 1 (
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
@ForCLike ($i <- 0) ($i < 10) ($i <- (1 + $i)) (
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
@ForEach $i_POLYGOLFforRangeToForEach $collection (
  print $i_POLYGOLFforRangeToForEach
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
@ForEach $i_POLYGOLFforRangeToForEach $collection (
  print $i_POLYGOLFforRangeToForEach
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
@ForEach $i_POLYGOLFforRangeToForEach "9876543210" (
  print $i_POLYGOLFforRangeToForEach
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
@ForEach $i_POLYGOLFforRangeToForEach (list 5 4 3 2 1) (
  print_int $i_POLYGOLFforRangeToForEach
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
@ForEachPair $i $i_POLYGOLFforRangeToForEachPair $collection {
  print_int $i;
  print_int $i_POLYGOLFforRangeToForEachPair;
};
```

## For each argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```polygolf loops.forArgvToForEach
@ForEach $x argv (
  println $x
);
```

```polygolf loops.forArgvToForRange()
for $x+index 0 100 {
  $x <- (argv_get $x+index);
  println $x;
};
```

```polygolf loops.forArgvToForRange(false)
for $x+index 0 argc {
  $x <- (argv_get $x+index);
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
for $i_POLYGOLFshifted 1 81 {
  println_int $i_POLYGOLFshifted;
  println_int $i_POLYGOLFshifted;
  println_int (3 * (-1 + $i_POLYGOLFshifted));
  println_int (1 + $i_POLYGOLFshifted);
  println_int (-2 + $i_POLYGOLFshifted);
  println_int (-3 + $i_POLYGOLFshifted);
  println_int (2 + (-1 * $i_POLYGOLFshifted));
  println_int (-1 * $i_POLYGOLFshifted);
};
```

## One step for range

```polygolf
for $i 0 10 2 {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for $iPOLYGOLFOneStep 0 5 {
  $i <- (2 * $iPOLYGOLFOneStep);
  println $i;
};
```

```polygolf
for $i -22 22 5 {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for $iPOLYGOLFOneStep 0 9 {
  $i <- (-22 + (5 * $iPOLYGOLFOneStep));
  println $i;
};
```
