# OpCodes

| Alias | Full name | Input | Output |
|-------|-----------|-------|--------|
| + | add | [...Int] | Int |
| - | sub<br>neg | [Int, Int]<br>[Int] | Int<br>Int |
| * | mul | [...Int] | Int |
| div | div | [Int, Int] | Int |
| ^ | pow | [Int, 0..oo] | Int |
| mod | mod | [Int, Int] | Int |
| & | bit_and | [...Int] | Int |
| \| | bit_or | [...Int] | Int |
| ~ | bit_xor<br>bit_not | [...Int]<br>[Int] | Int<br>Int |
| << | bit_shift_left | [Int, 0..oo] | Int |
| >> | bit_shift_right | [Int, 0..oo] | Int |
| gcd | gcd | [...Int] | 1..oo |
| min | min | [...Int] | Int |
| max | max | [...Int] | Int |
| abs | abs | [Int] | 0..oo |
| read[line] | read[line] | [] | Text |
| @ | at[argv]<br>at[Array]<br>at[List]<br>at[Table]<br>at[Ascii] | [0..oo]<br>[(Array T1 T2), T2]<br>[(List T1), 0..oo]<br>[(Table T1 T2), T1]<br>[Ascii, 0..oo] | Text<br>T1<br>T1<br>T2<br>(Ascii 1..1) |
| print | print[Text]<br>print[Int] | [Text]<br>[Int] | Void<br>Void |
| println | println[Text]<br>println[Int] | [Text]<br>[Int] | Void<br>Void |
| putc[byte] | putc[byte] | [0..255] | Void |
| putc[codepoint] | putc[codepoint] | [0..1114111] | Void |
| putc | putc[Ascii] | [0..127] | Void |
| or | or | [...Bool] | Bool |
| and | and | [...Bool] | Bool |
| unsafe_or | unsafe_or | [...Bool] | Bool |
| unsafe_and | unsafe_and | [...Bool] | Bool |
| not | not | [Bool] | Bool |
| true | true | [] | Bool |
| false | false | [] | Bool |
| < | lt | [Int, Int] | Bool |
| <= | leq | [Int, Int] | Bool |
| >= | geq | [Int, Int] | Bool |
| > | gt | [Int, Int] | Bool |
| == | eq[Int]<br>eq[Text] | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| != | neq[Int]<br>neq[Text] | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| at[byte] | at[byte] | [Text, 0..oo] | (Text 1..1) |
| at[codepoint] | at[codepoint] | [Text, 0..oo] | (Text 1..1) |
| set_at | set_at[Array]<br>set_at[List]<br>set_at[Table] | [(Array T1 T2), T2, T1]<br>[(List T1), 0..oo, T1]<br>[(Table T1 T2), T1, T2] | Void<br>Void<br>Void |
| slice[codepoint] | slice[codepoint] | [Text, 0..oo, 0..oo] | Text |
| slice[byte] | slice[byte] | [Text, 0..oo, 0..oo] | Text |
| slice | slice[Ascii]<br>slice[List] | [Ascii, 0..oo, 0..oo]<br>[(List T1), 0..oo, 0..oo] | Ascii<br>(List T1) |
| ord_at[byte] | ord_at[byte] | [Text, 0..oo] | 0..255 |
| ord_at[codepoint] | ord_at[codepoint] | [Text, 0..oo] | 0..1114111 |
| ord_at | ord_at[Ascii] | [Ascii, 0..oo] | 0..127 |
| ord[byte] | ord[byte] | [(Text 1..1)] | 0..255 |
| ord[codepoint] | ord[codepoint] | [(Text 1..1)] | 0..1114111 |
| ord | ord[Ascii] | [(Ascii 1..1)] | 0..127 |
| char[byte] | char[byte] | [0..255] | (Text 1..1) |
| char[codepoint] | char[codepoint] | [0..1114111] | (Text 1..1) |
| char | char[Ascii] | [0..127] | (Ascii 1..1) |
| sorted | sorted[Int]<br>sorted[Ascii] | [(List Int)]<br>[(List Ascii)] | (List Int)<br>(List Ascii) |
| reversed[byte] | reversed[byte] | [Text] | Text |
| reversed[codepoint] | reversed[codepoint] | [Text] | Text |
| reversed | reversed[Ascii]<br>reversed[List] | [Ascii]<br>[(List T1)] | Ascii<br>(List T1) |
| find[codepoint] | find[codepoint] | [Text, (Text 1..oo)] | -1..oo |
| find[byte] | find[byte] | [Text, (Text 1..oo)] | -1..oo |
| find | find[Ascii]<br>find[List] | [Ascii, Ascii]<br>[(List T1), T1] | -1..oo<br>-1..2147483647 |
| contains | contains[Array]<br>contains[List]<br>contains[Table]<br>contains[Set]<br>contains[Text] | [(Array T1 T2), T1]<br>[(List T1), T1]<br>[(Table T1 T2), T1]<br>[(Set T1), T1]<br>[Text, Text] | Bool<br>Bool<br>Bool<br>Bool<br>Bool |
| # | size[List]<br>size[Set]<br>size[Table]<br>size[Ascii] | [(List T1)]<br>[(Set T1)]<br>[(Table T1 T2)]<br>[Ascii] | 0..2147483647<br>0..2147483647<br>0..2147483647<br>0..oo |
| size[codepoint] | size[codepoint] | [Text] | 0..oo |
| size[byte] | size[byte] | [Text] | 0..2147483648 |
| include | include | [(Set T1), T1] | Void |
| push | push | [(List T1), T1] | Void |
| .. | append<br>concat[List]<br>concat[Text] | [(List T1), T1]<br>[...(List T1)]<br>[...Text] | (List T1)<br>(List T1)<br>Text |
| repeat | repeat | [Text, 0..oo] | Text |
| split | split | [Text, Text] | (List Text) |
| split_whitespace | split_whitespace | [Text] | (List Text) |
| join | join | [(List Text), Text] | Text |
| right_align | right_align | [Text, 0..oo] | Text |
| replace | replace | [Text, (Text 1..oo), Text] | Text |
| int_to_bin_aligned | int_to_bin_aligned | [0..oo, 0..oo] | Ascii |
| int_to_hex_aligned | int_to_hex_aligned | [0..oo, 0..oo] | Ascii |
| int_to_dec | int_to_dec | [Int] | (Ascii 1..oo) |
| int_to_bin | int_to_bin | [0..oo] | (Ascii 1..oo) |
| int_to_hex | int_to_hex | [0..oo] | (Ascii 1..oo) |
| int_to_bool | int_to_bool | [0..1] | Bool |
| dec_to_int | dec_to_int | [Ascii] | Int |
| bool_to_int | bool_to_int | [Bool] | 0..1 |
