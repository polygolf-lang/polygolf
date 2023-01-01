# Loops

## For range to others

```polygolf
for $i 0 10 {
  print $x;
};
```

```polygolf loops.forRangeToForRangeInclusive
@ForRangeInclusive $i 0 (10 - 1) 1 {
  print $x;
};
```

```polygolf loops.forRangeToWhile
$i <- 0;
while ($i < 10) {
  print $x;
  $i <- ($i + 1);
};
```

```polygolf loops.forRangeToForCLike
@ForCLike ($i <- 0) ($i < 10) ($i <- ($i + 1)) {
  print $x;
};
```

## For each

```polygolf
for $i 0 (# $collection) {
  print (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach
@ForEach $i_forRangeToForEach $collection {
  print $i_forRangeToForEach;
};
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
