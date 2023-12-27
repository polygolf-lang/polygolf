# Text ops plugins

## Replace

```polygolf
text_replace (text_replace "ABCD" "A" "a") "BC" "b";
text_replace (text_replace "ABCD" "A" "a") "a" "b";
text_replace (text_replace "ABCD" "A" "a") "A" "b";
```

```polygolf textOps.useMultireplace(false)
text_multireplace "ABCD" "A" "a" "BC" "b";
text_replace (text_replace "ABCD" "A" "a") "a" "b";
text_replace (text_replace "ABCD" "A" "a") "A" "b";
```

```polygolf
text_replace (text_replace "ABCD" "A" "a") "BC" "b";
```

```polygolf textOps.useMultireplace(true)
text_replace (text_replace "ABCD" "A" "a") "BC" "b";
```

## Starts/ends with

```polygolf
$a <- (@0);
$b <- (@1);
starts_with $a $b;
```

```polygolf textOps.startsWithEndsWithToSliceEquality("byte")
$a <- (@0);
$b <- (@1);
(slice[byte] $a 0 (size[byte] $b)) == $b;
```

```polygolf
$a <- (@0);
$b <- (@1);
ends_with $a $b;
```

```polygolf textOps.startsWithEndsWithToSliceEquality("codepoint")
$a <- (@0);
$b <- (@1);
(slice_back[codepoint] $a (- (size[codepoint] $b)) (size[codepoint] $b)) == $b;
```
