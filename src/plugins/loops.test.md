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

```polygolf loops.forRangeToForEach
@ForEach $i_forRangeToForEach $collection (
  print $i_forRangeToForEach
);
```

## For each pair

```polygolf
for $i 0 (# $collection) {
  print $i;
  print (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach
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
  println (3 * $i);
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
  println (3 * ($iPOLYGOLFshifted + -1));
  println ($iPOLYGOLFshifted + 1);
  println ($iPOLYGOLFshifted + -2);
  println ($iPOLYGOLFshifted + -3);
  println ((-1 * $iPOLYGOLFshifted) + 2);
  println (-1 * $iPOLYGOLFshifted);
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
