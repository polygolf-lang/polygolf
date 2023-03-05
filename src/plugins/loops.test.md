# Loops

## For range to others

```polygolf
for $i 0 10 {
  print $x;
};
```

```polygolf loops.forRangeToForRangeInclusive
@ForRangeInclusive $i 0 9 1 (
  print $x
);
```

```polygolf loops.forRangeToWhile
$i <- 0;
while ($i < 10) {
  print $x;
  $i <- ($i + 1);
};
```

```polygolf loops.forRangeToForCLike
@ForCLike ($i <- 0) ($i < 10) ($i <- ($i + 1)) (
  print $x
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
  print (list_get (list 5 4 3 2 1) $i);
};
```

```polygolf loops.forRangeToForEach("list_get")
@ForEach $i_POLYGOLFforRangeToForEach (list 5 4 3 2 1) (
  print $i_POLYGOLFforRangeToForEach
);
```

## For each pair

```polygolf
for $i 0 (# $collection) {
  print $i;
  print (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach("list_get")
for $i 0 (# $collection) {
  print $i;
  print (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEachPair
@ForEachPair $i $i_forRangeToForEachPair $collection {
  print $i;
  print $i_forRangeToForEachPair;
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
  println ($i + 1);
  println (1 + $i);
  println ($i * 3);
  println ($i + 2);
  println ($i - 1);
  println ($i - 2);
  println (1 - $i);
  println (-1 - $i);
};
```

```polygolf loops.shiftRangeOneUp
for $iPOLYGOLFshifted 1 81 {
  println $iPOLYGOLFshifted;
  println $iPOLYGOLFshifted;
  println (($iPOLYGOLFshifted - 1) * 3);
  println ($iPOLYGOLFshifted + 1);
  println ($iPOLYGOLFshifted - 2);
  println ($iPOLYGOLFshifted - 3);
  println (2 - $iPOLYGOLFshifted);
  println (0 - $iPOLYGOLFshifted);
};
```

```polygolf
for $i 0 80 {
  println $i;
  println ($i + 2);
};
```

```polygolf loops.shiftRangeOneUp
for $i 0 80 {
  println $i;
  println ($i + 2);
};
```
