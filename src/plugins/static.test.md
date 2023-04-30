# Static expressions

```polygolf
list "a" "b" "c";
```

```polygolf static.golfStringListLiteral()
text_split_whitespace "a b c";
```

```polygolf static.golfStringListLiteral(false)
text_split "a b c" " ";
```

```polygolf
list "a" "b" "c d";
```

```polygolf static.golfStringListLiteral()
text_split "a!b!c d" "!";
```
