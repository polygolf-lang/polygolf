# Loops

## For range to others

```polygolf
for $i (..< 10) {
  print_int $i;
};
```

```polygolf loops.rangeExclusiveToInclusive()
for $i (.. 9):(List 0..9) (
  print_int $i
);
```

```polygolf loops.forRangeToWhile
$i <- 0;
while ($i < 10) {
  print_int $i;
  $i <- (1 + $i);
};
```

```polygolf loops.forRangeToForCLike
for_c_like ($i <- 0) ($i < 10) ($i <- (1 + $i)) (
  print_int $i
);
```

## For range to while, inside a block

```polygolf
for $i 10 {
  print_int $x;
};
for $j (1 ..< 11) {
  print_int $y;
};
```

```polygolf loops.forRangeToWhile
$i <- 0;
while ($i < 10) {
  print_int $x;
  $i <- (1 + $i);
};
$j <- 1;
while ($j < 11) {
  print_int $y;
  $j <- (1 + $j);
};
```

## For range to for each

```polygolf
$collection <- (list "a" "b" "c");
for $i (size[List] $collection) {
  print[Text] (list_get $collection $i);
};
```

```polygolf loops.forRangeToForEach
$collection <- (list "a" "b" "c");
for (id "i+each") $collection (
  print (id "i+each")
);
```

```polygolf
for $i 5 {
  print_int (list_get (list 5 4 3 2 1) $i);
};
```

```polygolf loops.forRangeToForEach
for (id "i+each") (list 5 4 3 2 1) (
  print_int (id "i+each")
);
```

## For each to for range

```polygolf
$collection <- (list "aaa" "bb" "cc");
for $x $collection {
  println $x;
};
```

```polygolf loops.forEachToForRange
$collection <- (list "aaa" "bb" "cc");
for (id "x+index") (# $collection) {
  $x <- (at[List] $collection (id "x+index"));
  println $x;
};
```

```polygolf
$text <- "abrakadabra";
for $x $text {
  println $x;
};
```

```polygolf loops.forEachToForRange
$text <- "abrakadabra";
for (id "x+index") (# $text) {
  $x <- (at[Ascii] $text (id "x+index"));
  println $x;
};
```

## For each argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```polygolf loops.forArgvToForEach
for $x argv (
  println $x
);
```

```polygolf loops.forArgvToForRange()
for (id "x+index") 100 {
  $x <- (at[argv] (id "x+index"));
  println $x;
};
```

```polygolf loops.forArgvToForRange(false)
for (id "x+index") argc {
  $x <- (at[argv] (id "x+index"));
  println $x;
};
```

## Shift range

```polygolf
for $i 80 {
  println_int (add $i 1);
  println_int (add 1 $i);
  println_int (3 * $i);
  println_int (add $i 2);
  println_int ($i - 1);
  println_int ($i - 2);
  println_int (1 - $i);
  println_int (-1 - $i);
};
```

```polygolf loops.shiftRangeOneUp
for (id "i+shift") (1 ..< 81) {
  println_int (id "i+shift");
  println_int (id "i+shift");
  println_int (3 * ((id "i+shift") - 1));
  println_int (add (id "i+shift") 1);
  println_int ((id "i+shift") - 2);
  println_int ((id "i+shift") - 3);
  println_int (2 - (id "i+shift"));
  println_int (- (id "i+shift"));
};
```

## One step for range

```polygolf
for $i (0 ..< 10 2) {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for (id "i+1step") 5 {
  $i <- (2 * (id "i+1step"));
  println $i;
};
```

```polygolf
for $i (-22 ..< 22 5) {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for (id "i+1step") 9 {
  $i <- (-22 + (5 * (id "i+1step")));
  println $i;
};
```
