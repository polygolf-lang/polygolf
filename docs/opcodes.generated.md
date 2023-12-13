# OpCodes

| Alias | Full name | Input | Output | Description |
|-------|-----------|-------|--------|-------------|
| + | add | [...Int] | Int | Integer addition. |
| - | sub<br>neg | [Int, Int]<br>[Int] | Int<br>Int | Integer subtraction.<br>Integer negation. |
| * | mul | [...Int] | Int | Integer multiplication. |
| div | div | [Int, Int] | Int | Integer floor division. |
| ^ | pow | [Int, 0..oo] | Int | Integer exponentiation. |
| mod | mod | [Int, Int] | Int | Integer modulo (corresponds to `div`). |
| & | bit_and | [...Int] | Int | Integer bitwise and. |
| \| | bit_or | [...Int] | Int | Integer bitwise or. |
| ~ | bit_xor<br>bit_not | [...Int]<br>[Int] | Int<br>Int | Integer bitwise xor.<br>Integer bitwise not. |
| << | bit_shift_left | [Int, 0..oo] | Int | Integer left bitshift. |
| >> | bit_shift_right | [Int, 0..oo] | Int | Integer arithmetic right bitshift. |
| gcd | gcd | [...Int] | 1..oo | Greatest common divisor of two integers. |
| min | min | [...Int] | Int | Integer minimum. |
| max | max | [...Int] | Int | Integer maximum. |
| abs | abs | [Int] | 0..oo | Integer absolute value. |
| read[line] | read[line] | [] | Text | Reads single line from the stdin. |
| @ | at[argv]<br>at[Array]<br>at[List]<br>at_back[List]<br>at[Table]<br>at[Ascii]<br>at_back[Ascii] | [0..oo]<br>[(Array T1 T2), T2]<br>[(List T1), 0..oo]<br>[(List T1), -oo..-1]<br>[(Table T1 T2), T1]<br>[Ascii, 0..oo]<br>[Ascii, -oo..-1] | Text<br>T1<br>T1<br>T1<br>T2<br>(Ascii 1..1)<br>(Ascii 1..1) | Gets argv at the 0-based `n`th position, where `n` is an integer literal.<br>Gets the item at the 0-based index.<br>Gets the item at the 0-based index.<br>Gets the item at the -1-based backwards index.<br>Gets the item at the key.<br>Gets the character at the 0-based index.<br>Gets the character at the -1-based backwards index. |
| print | print[Text]<br>print[Int] | [Text]<br>[Int] | Void<br>Void | Prints the provided argument.<br>Converts the provided argument to base 10 text and prints it. |
| println | println[Text]<br>println[Int] | [Text]<br>[Int] | Void<br>Void | Prints the provided argument followed by a \n.<br>Converts the provided argument to base 10 text and prints it followed by a \n. |
| putc[byte] | putc[byte] | [0..255] | Void | Creates a single byte text and prints it. |
| putc[codepoint] | putc[codepoint] | [0..1114111] | Void | Creates a single codepoint text and prints it. |
| putc | putc[Ascii] | [0..127] | Void | Creates a single ascii character text and prints it. |
| or | or | [...Bool] | Bool | Non-shortcircuiting logical or. All arguments are to be safely evaluated in any order. |
| and | and | [...Bool] | Bool | Non-shortcircuiting logical and. All arguments are to be safely evaluated in any order. |
| unsafe_or | unsafe_or | [Bool, Bool] | Bool | Shortcircuiting logical or. |
| unsafe_and | unsafe_and | [Bool, Bool] | Bool | Shortcircuiting logical and. |
| not | not | [Bool] | Bool | Logical not. |
| true | true | [] | Bool | True value. |
| false | false | [] | Bool | False value. |
| < | lt | [Int, Int] | Bool | Integer less than. |
| <= | leq | [Int, Int] | Bool | Integer less than or equal. |
| >= | geq | [Int, Int] | Bool | Integer greater than or equal. |
| > | gt | [Int, Int] | Bool | Integer greater than. |
| == | eq[Int]<br>eq[Text] | [Int, Int]<br>[Text, Text] | Bool<br>Bool | Integer equality.<br>Text equality. |
| != | neq[Int]<br>neq[Text] | [Int, Int]<br>[Text, Text] | Bool<br>Bool | Integer inequality.<br>Text inequality. |
| at[byte] | at[byte] | [Text, 0..oo] | (Text 1..1) | Gets the byte (as text) at the 0-based index (counting bytes). |
| at_back[byte] | at_back[byte] | [Text, -oo..-1] | (Text 1..1) | Gets the byte (as text) at the -1-based backwards index (counting bytes). |
| at[codepoint] | at[codepoint] | [Text, 0..oo] | (Text 1..1) | Gets the codepoint (as text) at the 0-based index (counting codepoints). |
| at_back[codepoint] | at_back[codepoint] | [Text, -oo..-1] | (Text 1..1) | Gets the codepoint (as text) at the -1-based backwards index (counting codepoints). |
| set_at | set_at[Array]<br>set_at[List]<br>set_at_back[List]<br>set_at[Table] | [(Array T1 T2), T2, T1]<br>[(List T1), 0..oo, T1]<br>[(List T1), -oo..-1, T1]<br>[(Table T1 T2), T1, T2] | Void<br>Void<br>Void<br>Void | Sets the item at the 0-based index.<br>Sets the item at the 0-based index.<br>Sets the item at the -1-based backwards index.<br>Sets the item at the key. |
| slice[codepoint] | slice[codepoint] | [Text, 0..oo, 0..oo] | Text | Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in codepoints. |
| slice[byte] | slice[byte] | [Text, 0..oo, 0..oo] | Text | Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in bytes. |
| slice | slice[Ascii]<br>slice[List] | [Ascii, 0..oo, 0..oo]<br>[(List T1), 0..oo, 0..oo] | Ascii<br>(List T1) | Returns a text slice that starts at the given 0-based index and has given length.<br>Returns a list slice that starts at the given 0-based index and has given length. |
| ord[byte] | ord[byte] | [(Text 1..1)] | 0..255 | Converts the byte to an integer. |
| ord[codepoint] | ord[codepoint] | [(Text 1..1)] | 0..1114111 | Converts the codepoint to an integer. |
| ord | ord[Ascii] | [(Ascii 1..1)] | 0..127 | Converts the character to an integer. |
| char[byte] | char[byte] | [0..255] | (Text 1..1) | Returns a byte (as text) corresponding to the integer. |
| char[codepoint] | char[codepoint] | [0..1114111] | (Text 1..1) | Returns a codepoint (as text) corresponding to the integer. |
| char | char[Ascii] | [0..127] | (Ascii 1..1) | Returns a character corresponding to the integer. |
| sorted | sorted[Int]<br>sorted[Ascii] | [(List Int)]<br>[(List Ascii)] | (List Int)<br>(List Ascii) | Returns a sorted copy of the input.<br>Returns a lexicographically sorted copy of the input. |
| reversed[byte] | reversed[byte] | [Text] | Text | Returns a text in which the bytes are in reversed order. |
| reversed[codepoint] | reversed[codepoint] | [Text] | Text | Returns a text in which the codepoints are in reversed order. |
| reversed | reversed[Ascii]<br>reversed[List] | [Ascii]<br>[(List T1)] | Ascii<br>(List T1) | Returns a text in which the characters are in reversed order.<br>Returns a list in which the items are in reversed order. |
| find[codepoint] | find[codepoint] | [Text, (Text 1..oo)] | -1..oo | Returns a 0-based index of the first codepoint at which the search text starts, provided it is included. |
| find[byte] | find[byte] | [Text, (Text 1..oo)] | -1..oo | Returns a 0-based index of the first byte at which the search text starts, provided it is included. |
| find | find[Ascii]<br>find[List] | [Ascii, Ascii]<br>[(List T1), T1] | -1..oo<br>-1..2147483647 | Returns a 0-based index of the first character at which the search text starts, provided it is included.<br>Returns a 0-based index of the first occurence of the searched item, provided it is included. |
| contains | contains[Array]<br>contains[List]<br>contains[Table]<br>contains[Set]<br>contains[Text] | [(Array T1 T2), T1]<br>[(List T1), T1]<br>[(Table T1 T2), T1]<br>[(Set T1), T1]<br>[Text, Text] | Bool<br>Bool<br>Bool<br>Bool<br>Bool | Asserts whether an item is included in the array.<br>Asserts whether an item is included in the list.<br>Asserts whether an item is included in the keys of the table.<br>Asserts whether an item is included in the set.<br>Asserts whether the 2nd argument is a substring of the 1st one. |
| # | size[List]<br>size[Set]<br>size[Table]<br>size[Ascii] | [(List T1)]<br>[(Set T1)]<br>[(Table T1 T2)]<br>[Ascii] | 0..2147483647<br>0..2147483647<br>0..2147483647<br>0..oo | Returns the length of the list.<br>Returns the cardinality of the set.<br>Returns the number of keys in the table.<br>Returns the length of the text. |
| size[codepoint] | size[codepoint] | [Text] | 0..oo | Returns the length of the text in codepoints. |
| size[byte] | size[byte] | [Text] | 0..2147483648 | Returns the length of the text in bytes. |
| include | include | [(Set T1), T1] | Void | Modifies the set by including the given item. |
| push | push | [(List T1), T1] | Void | Modifies the list by pushing the given item at the end. |
| .. | append<br>concat[List]<br>concat[Text] | [(List T1), T1]<br>[...(List T1)]<br>[...Text] | (List T1)<br>(List T1)<br>Text | Returns a new list with the given item appended at the end.<br>Returns a new list formed by concatenation of the inputs.<br>Returns a new text formed by concatenation of the inputs. |
| repeat | repeat | [Text, 0..oo] | Text | Repeats the text a given amount of times. |
| split | split | [Text, Text] | (List Text) | Splits the text by the delimiter. |
| split_whitespace | split_whitespace | [Text] | (List Text) | Splits the text by any whitespace. |
| join | join | [(List Text), Text] | Text | Joins the items using the delimiter. |
| right_align | right_align | [Text, 0..oo] | Text | Right-aligns the text using spaces to a minimum length. |
| replace | replace | [Text, (Text 1..oo), Text] | Text | Replaces all occurences of a given text with another text. |
| int_to_bin_aligned | int_to_bin_aligned | [0..oo, 0..oo] | Ascii | Converts the integer to a 2-base text and alignes to a minimum length. |
| int_to_hex_aligned | int_to_hex_aligned | [0..oo, 0..oo] | Ascii | Converts the integer to a 16-base text and alignes to a minimum length. |
| int_to_dec | int_to_dec | [Int] | (Ascii 1..oo) | Converts the integer to a 10-base text. |
| int_to_bin | int_to_bin | [0..oo] | (Ascii 1..oo) | Converts the integer to a 2-base text. |
| int_to_hex | int_to_hex | [0..oo] | (Ascii 1..oo) | Converts the integer to a 16-base text. |
| int_to_bool | int_to_bool | [0..1] | Bool | Converts 0 to false and 1 to true. |
| dec_to_int | dec_to_int | [Ascii] | Int | Parses a integer from a 10-base text. |
| bool_to_int | bool_to_int | [Bool] | 0..1 | Converts false to 0 and true to 1. |
