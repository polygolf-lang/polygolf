# Loops

## For range to others

```polygolf
for $i 0 10 {
  print_int $x;
};
```

```polygolf loops.forRangeToForRangeInclusive
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
  print_int (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach
@ForEach $iPOLYGOLFforRangeToForEach $collection (
  print_int $iPOLYGOLFforRangeToForEach
);
```

## For each pair

```polygolf
for $i 0 (# $collection) {
  print_int $i;
  print_int (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach
for $i 0 (# $collection) {
  print_int $i;
  print_int (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEachPair
@ForEachPair $i $iPOLYGOLFforRangeToForEachPair $collection {
  print_int $i;
  print_int $iPOLYGOLFforRangeToForEachPair;
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
for $iPOLYGOLFshifted 1 81 {
  println_int $iPOLYGOLFshifted;
  println_int $iPOLYGOLFshifted;
  println_int (3 * (-1 + $iPOLYGOLFshifted));
  println_int (1 + $iPOLYGOLFshifted);
  println_int (-2 + $iPOLYGOLFshifted);
  println_int (-3 + $iPOLYGOLFshifted);
  println_int (2 + (-1 * $iPOLYGOLFshifted));
  println_int (-1 * $iPOLYGOLFshifted);
};
```
