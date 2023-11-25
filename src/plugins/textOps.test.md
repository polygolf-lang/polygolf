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
