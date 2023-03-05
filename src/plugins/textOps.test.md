# Text ops equivalent for ascii

```polygolf
text_byte_length "abcdefgh";
text_get_byte_slice "abcdefgh" 1 3;
text_byte_length "ěščřžýáíé";
byte_to_text 48;
byte_to_text 150;
```

```polygolf textOps.useEquivalentTextOp(true,true)
text_codepoint_length "abcdefgh";
text_get_codepoint_slice "abcdefgh" 1 3;
text_byte_length "ěščřžýáíé";
int_to_codepoint 48;
byte_to_text 150;
```

```polygolf
text_codepoint_length "abcdefgh";
text_get_codepoint_slice "abcdefgh" 1 3;
text_codepoint_length "ěščřžýáíé";
int_to_codepoint 48;
int_to_codepoint 150;
```

```polygolf textOps.useEquivalentTextOp(true,true)
text_byte_length "abcdefgh";
text_get_byte_slice "abcdefgh" 1 3;
text_codepoint_length "ěščřžýáíé";
byte_to_text 48;
int_to_codepoint 150;
```
