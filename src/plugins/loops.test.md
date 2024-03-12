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
for (id "i#0") $collection (
  print (id "i#0")
);
```

```polygolf
for $i 5 {
  print_int (list_get (list 5 4 3 2 1) $i);
};
```

```polygolf loops.forRangeToForEach
for (id "i#0") (list 5 4 3 2 1) (
  print_int (id "i#0")
);
```

```polygolf
for $i 3 {
  println (at[byte] "abc" $i);
};
```

```polygolf loops.forRangeToForEach
for[byte] (id "i#0") "abc" (
  println (id "i#0")
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
for (id "x#0") (# $collection) {
  $x <- (at[List] $collection (id "x#0"));
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
for (id "x#0") (# $text) {
  $x <- (at[Ascii] $text (id "x#0"));
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
for (id "x#0") 100 {
  $x <- (at[argv] (id "x#0"));
  println $x;
};
```

```polygolf loops.forArgvToForRange(false)
for (id "x#0") argc {
  $x <- (at[argv] (id "x#0"));
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
for (id "i#0") (1 ..< 81) {
  println_int (id "i#0");
  println_int (id "i#0");
  println_int (3 * ((id "i#0") - 1));
  println_int (add (id "i#0") 1);
  println_int ((id "i#0") - 2);
  println_int ((id "i#0") - 3);
  println_int (2 - (id "i#0"));
  println_int (- (id "i#0"));
};
```

## One step for range

```polygolf
for $i (0 ..< 10 2) {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for (id "i#0") 5 {
  $i <- (2 * (id "i#0"));
  println $i;
};
```

```polygolf
for $i (-22 ..< 22 5) {
  println $i;
};
```

```polygolf loops.forRangeToForRangeOneStep
for (id "i#0") 9 {
  $i <- (-22 + (5 * (id "i#0")));
  println $i;
};
```
