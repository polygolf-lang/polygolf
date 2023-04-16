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
  $i <- (1 + $i);
};
```

```polygolf loops.forRangeToForCLike
@ForCLike ($i <- 0) ($i < 10) ($i <- (1 + $i)) (
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
@ForEach $iPOLYGOLFforRangeToForEach $collection (
  print $iPOLYGOLFforRangeToForEach
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
@ForEachPair $i $iPOLYGOLFforRangeToForEachPair $collection {
  print $i;
  print $iPOLYGOLFforRangeToForEachPair;
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
  println (3 * (-1 + $iPOLYGOLFshifted));
  println (1 + $iPOLYGOLFshifted);
  println (-2 + $iPOLYGOLFshifted);
  println (-3 + $iPOLYGOLFshifted);
  println (2 + (-1 * $iPOLYGOLFshifted));
  println (-1 * $iPOLYGOLFshifted);
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
