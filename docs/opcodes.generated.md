# OpCodes
Hover opcode name to see a description.

| Alias | Full name | Input | Output |
|-------|-----------|-------|--------|
| is_even | [is_even](## "Evenness predicate.") | [Int] | Bool |
| is_odd | [is_odd](## "Oddness predicate.") | [Int] | Bool |
| succ | [succ](## "Integer successor.") | [Int] | Int |
| pred | [pred](## "Integer predecessor.") | [Int] | Int |
| + | [add](## "Integer addition.") | [Int, Int, ...Int] | Int |
| - | [sub](## "Integer subtraction.")<br>[neg](## "Integer negation.") | [Int, Int]<br>[Int] | Int<br>Int |
| * | [mul](## "Integer multiplication.") | [Int, Int, ...Int] | Int |
| div | [div](## "Integer floor division.") | [Int, Int] | Int |
| ^ | [pow](## "Integer exponentiation.") | [Int, 0..oo] | Int |
| mod | [mod](## "Integer modulo (corresponds to `div`).") | [Int, Int] | Int |
| & | [bit_and](## "Integer bitwise and.") | [Int, Int, ...Int] | Int |
| \| | [bit_or](## "Integer bitwise or.") | [Int, Int, ...Int] | Int |
| ~ | [bit_xor](## "Integer bitwise xor.")<br>[bit_not](## "Integer bitwise not.") | [Int, Int, ...Int]<br>[Int] | Int<br>Int |
| << | [bit_shift_left](## "Integer left bitshift.") | [Int, 0..oo] | Int |
| >> | [bit_shift_right](## "Integer arithmetic right bitshift.") | [Int, 0..oo] | Int |
| gcd | [gcd](## "Greatest common divisor of two integers.") | [Int, Int, ...Int] | 1..oo |
| min | [min](## "Integer minimum.") | [Int, Int, ...Int] | Int |
| max | [max](## "Integer maximum.") | [Int, Int, ...Int] | Int |
| abs | [abs](## "Integer absolute value.") | [Int] | 0..oo |
| read[line] | [read[line]](## "Reads single line from the stdin.") | [] | Text |
| @ | [at[argv]](## "Gets argv at the 0-based `n`th position, where `n` is an integer literal.")<br>[at[Array]](## "Gets the item at the 0-based index.")<br>[at[List]](## "Gets the item at the 0-based index.")<br>[at_back[List]](## "Gets the item at the -1-based backwards index.")<br>[at[Table]](## "Gets the item at the key.")<br>[at[Ascii]](## "Gets the character at the 0-based index.")<br>[at_back[Ascii]](## "Gets the character at the -1-based backwards index.")<br>[with_at[Array]](## "Returns an array with item at the given 0-based index replaced.")<br>[with_at[List]](## "Returns a list with item at the given 0-based index replaced.")<br>[with_at_back[List]](## "Returns a list with item at the given -1-based backwards index replaced.")<br>[with_at[Table]](## "Returns an array with item at the given key replaced.") | [0..oo]<br>[(Array T1 T2), T2]<br>[(List T1), 0..oo]<br>[(List T1), -oo..-1]<br>[(Table T1 T2), T1]<br>[Ascii, 0..oo]<br>[Ascii, -oo..-1]<br>[(Array T1 T2), T2, T1]<br>[(List T1), 0..oo, T1]<br>[(List T1), -oo..-1, T1]<br>[(Table T1 T2), T1, T2] | Text<br>T1<br>T1<br>T1<br>T2<br>(Ascii 1..1)<br>(Ascii 1..1)<br>(Array T1 T2)<br>(List T1)<br>(List T1)<br>(Table T1 T2) |
| print | [print[Text]](## "Prints the provided argument.")<br>[print[Int]](## "Converts the provided argument to base 10 text and prints it.") | [Text]<br>[Int] | Void<br>Void |
| println | [println[Text]](## "Prints the provided argument followed by a \\n.")<br>[println[Int]](## "Converts the provided argument to base 10 text and prints it followed by a \\n.") | [Text]<br>[Int] | Void<br>Void |
| putc[byte] | [putc[byte]](## "Creates a single byte text and prints it.") | [0..255] | Void |
| putc[codepoint] | [putc[codepoint]](## "Creates a single codepoint text and prints it.") | [0..1114111] | Void |
| putc | [putc[Ascii]](## "Creates a single ascii character text and prints it.") | [0..127] | Void |
| or | [or](## "Non-shortcircuiting logical or. All arguments are to be safely evaluated in any order.") | [Bool, Bool, ...Bool] | Bool |
| and | [and](## "Non-shortcircuiting logical and. All arguments are to be safely evaluated in any order.") | [Bool, Bool, ...Bool] | Bool |
| unsafe_or | [unsafe_or](## "Shortcircuiting logical or.") | [Bool, Bool] | Bool |
| unsafe_and | [unsafe_and](## "Shortcircuiting logical and.") | [Bool, Bool] | Bool |
| not | [not](## "Logical not.") | [Bool] | Bool |
| true | [true](## "True value.") | [] | Bool |
| false | [false](## "False value.") | [] | Bool |
| < | [lt](## "Integer less than.") | [Int, Int] | Bool |
| <= | [leq](## "Integer less than or equal.") | [Int, Int] | Bool |
| >= | [geq](## "Integer greater than or equal.") | [Int, Int] | Bool |
| > | [gt](## "Integer greater than.") | [Int, Int] | Bool |
| == | [eq[Int]](## "Integer equality.")<br>[eq[Text]](## "Text equality.") | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| != | [neq[Int]](## "Integer inequality.")<br>[neq[Text]](## "Text inequality.") | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| at[byte] | [at[byte]](## "Gets the byte (as text) at the 0-based index (counting bytes).") | [Text, 0..oo] | (Text 1..1) |
| at_back[byte] | [at_back[byte]](## "Gets the byte (as text) at the -1-based backwards index (counting bytes).") | [Text, -oo..-1] | (Text 1..1) |
| at[codepoint] | [at[codepoint]](## "Gets the codepoint (as text) at the 0-based index (counting codepoints).") | [Text, 0..oo] | (Text 1..1) |
| at_back[codepoint] | [at_back[codepoint]](## "Gets the codepoint (as text) at the -1-based backwards index (counting codepoints).") | [Text, -oo..-1] | (Text 1..1) |
| slice[codepoint] | [slice[codepoint]](## "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in codepoints.") | [Text, 0..oo, 0..oo] | Text |
| slice_back[codepoint] | [slice_back[codepoint]](## "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in codepoints.") | [Text, -oo..-1, 0..oo] | Text |
| slice[byte] | [slice[byte]](## "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in bytes.") | [Text, 0..oo, 0..oo] | Text |
| slice_back[byte] | [slice_back[byte]](## "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in bytes.") | [Text, -oo..-1, 0..oo] | Text |
| slice | [slice[Ascii]](## "Returns a text slice that starts at the given 0-based index and has given length.")<br>[slice_back[Ascii]](## "Returns a text slice that starts at the given -1-based backwards index and has given length.")<br>[slice[List]](## "Returns a list slice that starts at the given 0-based index and has given length.")<br>[slice_back[List]](## "Returns a list slice that starts at the given -1-based backwards index and has given length.") | [Ascii, 0..oo, 0..oo]<br>[Ascii, -oo..-1, 0..oo]<br>[(List T1), 0..oo, 0..oo]<br>[(List T1), -oo..-1, 0..oo] | Ascii<br>Ascii<br>(List T1)<br>(List T1) |
| ord[byte] | [ord[byte]](## "Converts the byte to an integer.") | [(Text 1..1)] | 0..255 |
| ord[codepoint] | [ord[codepoint]](## "Converts the codepoint to an integer.") | [(Text 1..1)] | 0..1114111 |
| ord | [ord[Ascii]](## "Converts the character to an integer.") | [(Ascii 1..1)] | 0..127 |
| char[byte] | [char[byte]](## "Returns a byte (as text) corresponding to the integer.") | [0..255] | (Text 1..1) |
| char[codepoint] | [char[codepoint]](## "Returns a codepoint (as text) corresponding to the integer.") | [0..1114111] | (Text 1..1) |
| char | [char[Ascii]](## "Returns a character corresponding to the integer.") | [0..127] | (Ascii 1..1) |
| sorted | [sorted[Int]](## "Returns a sorted copy of the input.")<br>[sorted[Ascii]](## "Returns a lexicographically sorted copy of the input.") | [(List Int)]<br>[(List Ascii)] | (List Int)<br>(List Ascii) |
| reversed[byte] | [reversed[byte]](## "Returns a text in which the bytes are in reversed order.") | [Text] | Text |
| reversed[codepoint] | [reversed[codepoint]](## "Returns a text in which the codepoints are in reversed order.") | [Text] | Text |
| reversed | [reversed[Ascii]](## "Returns a text in which the characters are in reversed order.")<br>[reversed[List]](## "Returns a list in which the items are in reversed order.") | [Ascii]<br>[(List T1)] | Ascii<br>(List T1) |
| find[codepoint] | [find[codepoint]](## "Returns a 0-based index of the first codepoint at which the search text starts, provided it is included.") | [Text, (Text 1..oo)] | -1..oo |
| find[byte] | [find[byte]](## "Returns a 0-based index of the first byte at which the search text starts, provided it is included.") | [Text, (Text 1..oo)] | -1..oo |
| find | [find[Ascii]](## "Returns a 0-based index of the first character at which the search text starts, provided it is included.")<br>[find[List]](## "Returns a 0-based index of the first occurence of the searched item, provided it is included.") | [Ascii, Ascii]<br>[(List T1), T1] | -1..oo<br>-1..2147483647 |
| contains | [contains[Array]](## "Asserts whether an item is included in the array.")<br>[contains[List]](## "Asserts whether an item is included in the list.")<br>[contains[Table]](## "Asserts whether an item is included in the keys of the table.")<br>[contains[Set]](## "Asserts whether an item is included in the set.")<br>[contains[Text]](## "Asserts whether the 2nd argument is a substring of the 1st one.") | [(Array T1 T2), T1]<br>[(List T1), T1]<br>[(Table T1 T2), T1]<br>[(Set T1), T1]<br>[Text, Text] | Bool<br>Bool<br>Bool<br>Bool<br>Bool |
| # | [size[List]](## "Returns the length of the list.")<br>[size[Set]](## "Returns the cardinality of the set.")<br>[size[Table]](## "Returns the number of keys in the table.")<br>[size[Ascii]](## "Returns the length of the text.") | [(List T1)]<br>[(Set T1)]<br>[(Table T1 T2)]<br>[Ascii] | 0..2147483647<br>0..2147483647<br>0..2147483647<br>0..oo |
| size[codepoint] | [size[codepoint]](## "Returns the length of the text in codepoints.") | [Text] | 0..oo |
| size[byte] | [size[byte]](## "Returns the length of the text in bytes.") | [Text] | 0..2147483648 |
| include | [include](## "Modifies the set by including the given item.") | [(Set T1), T1] | Void |
| .. | [append](## "Returns a new list with the given item appended at the end.")<br>[concat[List]](## "Returns a new list formed by concatenation of the inputs.")<br>[concat[Text]](## "Returns a new text formed by concatenation of the inputs.") | [(List T1), T1]<br>[(List T1), (List T1), ...(List T1)]<br>[Text, Text, ...Text] | (List T1)<br>(List T1)<br>Text |
| repeat | [repeat](## "Repeats the text a given amount of times.") | [Text, 0..oo] | Text |
| split | [split](## "Splits the text by the delimiter.") | [Text, Text] | (List Text) |
| split_whitespace | [split_whitespace](## "Splits the text by any whitespace.") | [Text] | (List Text) |
| join | [join](## "Joins the items using the delimiter.") | [(List Text), Text] | Text |
| right_align | [right_align](## "Right-aligns the text using spaces to a minimum length.") | [Text, 0..oo] | Text |
| replace | [replace](## "Replaces all occurences of a given text with another text.") | [Text, (Text 1..oo), Text] | Text |
| starts_with | [starts_with](## "Checks whether the second argument is a prefix of the first.") | [Text, Text] | Bool |
| ends_with | [ends_with](## "Checks whether the second argument is a suffix of the first.") | [Text, Text] | Bool |
| int_to_bin_aligned | [int_to_bin_aligned](## "Converts the integer to a 2-base text and alignes to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_hex_aligned | [int_to_hex_aligned](## "Converts the integer to a 16-base lowercase text and alignes to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_Hex_aligned | [int_to_Hex_aligned](## "Converts the integer to a 16-base uppercase text and alignes to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_dec | [int_to_dec](## "Converts the integer to a 10-base text.") | [Int] | (Ascii 1..oo) |
| int_to_bin | [int_to_bin](## "Converts the integer to a 2-base text.") | [0..oo] | (Ascii 1..oo) |
| int_to_hex | [int_to_hex](## "Converts the integer to a 16-base lowercase text.") | [0..oo] | (Ascii 1..oo) |
| int_to_Hex | [int_to_Hex](## "Converts the integer to a 16-base uppercase text.") | [0..oo] | (Ascii 1..oo) |
| int_to_bool | [int_to_bool](## "Converts 0 to false and 1 to true.") | [0..1] | Bool |
| dec_to_int | [dec_to_int](## "Parses a integer from a 10-base text.") | [Ascii] | Int |
| bool_to_int | [bool_to_int](## "Converts false to 0 and true to 1.") | [Bool] | 0..1 |
