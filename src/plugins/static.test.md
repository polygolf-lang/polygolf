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

```polygolf
list_get (list "a" "b" "c") 2;
list_find (list "a" "b" "c") 2;
```

```polygolf static.listOpsToTextOps("at[codepoint]","find[codepoint]")
text_get_codepoint "abc" 2;
text_codepoint_find "abc" 2;
```
