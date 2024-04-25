# OpCodes
Hover opcode name to see a description or click to see all outputs.

| Alias | Full name | Input | Output |
|-------|-----------|-------|--------|
| is_even | [is_even](opcodes-outputs.generated.md#is_even "Evenness predicate.") | [Int] | Bool |
| is_odd | [is_odd](opcodes-outputs.generated.md#is_odd "Oddness predicate.") | [Int] | Bool |
| succ | [succ](opcodes-outputs.generated.md#succ "Integer successor.") | [Int] | Int |
| pred | [pred](opcodes-outputs.generated.md#pred "Integer predecessor.") | [Int] | Int |
| + | [add](opcodes-outputs.generated.md#add "Integer addition.")<br>[append](opcodes-outputs.generated.md#append "Returns a new list with the given item appended at the end.")<br>[concat[List]](opcodes-outputs.generated.md#concatList "Returns a new list formed by concatenation of the inputs.")<br>[concat[Text]](opcodes-outputs.generated.md#concatText "Returns a new text formed by concatenation of the inputs.") | [Int, Int, ...Int]<br>[(List T1), T1]<br>[(List T1), (List T1), ...(List T1)]<br>[Text, Text, ...Text] | Int<br>(List T1)<br>(List T1)<br>Text |
| - | [sub](opcodes-outputs.generated.md#sub "Integer subtraction.")<br>[neg](opcodes-outputs.generated.md#neg "Integer negation.") | [Int, Int, ...Int]<br>[Int] | Int<br>Int |
| * | [mul](opcodes-outputs.generated.md#mul "Integer multiplication.") | [Int, Int, ...Int] | Int |
| div | [div](opcodes-outputs.generated.md#div "Integer floor division.") | [Int, Int] | Int |
| ^ | [pow](opcodes-outputs.generated.md#pow "Integer exponentiation.") | [Int, 0..oo] | Int |
| mod | [mod](opcodes-outputs.generated.md#mod "Integer modulo (corresponds to `div`).") | [Int, Int] | Int |
| & | [bit_and](opcodes-outputs.generated.md#bit_and "Integer bitwise and.") | [Int, Int, ...Int] | Int |
| \| | [bit_or](opcodes-outputs.generated.md#bit_or "Integer bitwise or.") | [Int, Int, ...Int] | Int |
| ~ | [bit_xor](opcodes-outputs.generated.md#bit_xor "Integer bitwise xor.")<br>[bit_not](opcodes-outputs.generated.md#bit_not "Integer bitwise not.") | [Int, Int, ...Int]<br>[Int] | Int<br>Int |
| << | [bit_shift_left](opcodes-outputs.generated.md#bit_shift_left "Integer left bitshift.") | [Int, 0..oo] | Int |
| >> | [bit_shift_right](opcodes-outputs.generated.md#bit_shift_right "Integer arithmetic right bitshift.") | [Int, 0..oo] | Int |
| gcd | [gcd](opcodes-outputs.generated.md#gcd "Greatest common divisor of two integers.") | [Int, Int, ...Int] | 1..oo |
| min | [min](opcodes-outputs.generated.md#min "Integer minimum.") | [Int, Int, ...Int] | Int |
| max | [max](opcodes-outputs.generated.md#max "Integer maximum.") | [Int, Int, ...Int] | Int |
| abs | [abs](opcodes-outputs.generated.md#abs "Integer absolute value.") | [Int] | 0..oo |
| bit_count | [bit_count](opcodes-outputs.generated.md#bit_count "Number of set bits in the integer.") | [0..oo] | 0..2 |
| read[line] | [read[line]](opcodes-outputs.generated.md#readline "Reads single line from the stdin.") | [] | Text |
| @ | [at[argv]](opcodes-outputs.generated.md#atargv "Gets argv at the 0-based `n`th position, where `n` is an integer literal.")<br>[at[Array]](opcodes-outputs.generated.md#atArray "Gets the item at the 0-based index.")<br>[at[List]](opcodes-outputs.generated.md#atList "Gets the item at the 0-based index.")<br>[at_back[List]](opcodes-outputs.generated.md#at_backList "Gets the item at the -1-based backwards index.")<br>[at[Table]](opcodes-outputs.generated.md#atTable "Gets the item at the key.")<br>[at[Ascii]](opcodes-outputs.generated.md#atAscii "Gets the character at the 0-based index.")<br>[at_back[Ascii]](opcodes-outputs.generated.md#at_backAscii "Gets the character at the -1-based backwards index.")<br>[with_at[Array]](opcodes-outputs.generated.md#with_atArray "Returns an array with item at the given 0-based index replaced.")<br>[with_at[List]](opcodes-outputs.generated.md#with_atList "Returns a list with item at the given 0-based index replaced.")<br>[with_at_back[List]](opcodes-outputs.generated.md#with_at_backList "Returns a list with item at the given -1-based backwards index replaced.")<br>[with_at[Table]](opcodes-outputs.generated.md#with_atTable "Returns an array with item at the given key replaced.") | [0..oo]<br>[(Array T1 T2), T2]<br>[(List T1), 0..oo]<br>[(List T1), -oo..-1]<br>[(Table T1 T2), T1]<br>[Ascii, 0..oo]<br>[Ascii, -oo..-1]<br>[(Array T1 T2), T2, T1]<br>[(List T1), 0..oo, T1]<br>[(List T1), -oo..-1, T1]<br>[(Table T1 T2), T1, T2] | Text<br>T1<br>T1<br>T1<br>T2<br>(Ascii 1..1)<br>(Ascii 1..1)<br>(Array T1 T2)<br>(List T1)<br>(List T1)<br>(Table T1 T2) |
| print | [print[Text]](opcodes-outputs.generated.md#printText "Prints the provided argument.")<br>[print[Int]](opcodes-outputs.generated.md#printInt "Converts the provided argument to base 10 text and prints it.") | [Text]<br>[Int] | Void<br>Void |
| println | [println[Text]](opcodes-outputs.generated.md#printlnText "Prints the provided argument followed by a \\n.")<br>[println[Int]](opcodes-outputs.generated.md#printlnInt "Converts the provided argument to base 10 text and prints it followed by a \\n.") | [Text]<br>[Int] | Void<br>Void |
| putc[byte] | [putc[byte]](opcodes-outputs.generated.md#putcbyte "Creates a single byte text and prints it.") | [0..255] | Void |
| putc[codepoint] | [putc[codepoint]](opcodes-outputs.generated.md#putccodepoint "Creates a single codepoint text and prints it.") | [0..1114111] | Void |
| putc | [putc[Ascii]](opcodes-outputs.generated.md#putcAscii "Creates a single ascii character text and prints it.") | [0..127] | Void |
| or | [or](opcodes-outputs.generated.md#or "Non-shortcircuiting logical or. All arguments are to be safely evaluated in any order.") | [Bool, Bool, ...Bool] | Bool |
| and | [and](opcodes-outputs.generated.md#and "Non-shortcircuiting logical and. All arguments are to be safely evaluated in any order.") | [Bool, Bool, ...Bool] | Bool |
| unsafe_or | [unsafe_or](opcodes-outputs.generated.md#unsafe_or "Shortcircuiting logical or.") | [Bool, Bool] | Bool |
| unsafe_and | [unsafe_and](opcodes-outputs.generated.md#unsafe_and "Shortcircuiting logical and.") | [Bool, Bool] | Bool |
| not | [not](opcodes-outputs.generated.md#not "Logical not.") | [Bool] | Bool |
| true | [true](opcodes-outputs.generated.md#true "True value.") | [] | Bool |
| false | [false](opcodes-outputs.generated.md#false "False value.") | [] | Bool |
| < | [lt](opcodes-outputs.generated.md#lt "Integer less than.") | [Int, Int] | Bool |
| <= | [leq](opcodes-outputs.generated.md#leq "Integer less than or equal.") | [Int, Int] | Bool |
| >= | [geq](opcodes-outputs.generated.md#geq "Integer greater than or equal.") | [Int, Int] | Bool |
| > | [gt](opcodes-outputs.generated.md#gt "Integer greater than.") | [Int, Int] | Bool |
| == | [eq[Int]](opcodes-outputs.generated.md#eqInt "Integer equality.")<br>[eq[Text]](opcodes-outputs.generated.md#eqText "Text equality.") | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| != | [neq[Int]](opcodes-outputs.generated.md#neqInt "Integer inequality.")<br>[neq[Text]](opcodes-outputs.generated.md#neqText "Text inequality.") | [Int, Int]<br>[Text, Text] | Bool<br>Bool |
| at[byte] | [at[byte]](opcodes-outputs.generated.md#atbyte "Gets the byte (as text) at the 0-based index (counting bytes).") | [Text, 0..oo] | (Text 1..1) |
| at_back[byte] | [at_back[byte]](opcodes-outputs.generated.md#at_backbyte "Gets the byte (as text) at the -1-based backwards index (counting bytes).") | [Text, -oo..-1] | (Text 1..1) |
| at[codepoint] | [at[codepoint]](opcodes-outputs.generated.md#atcodepoint "Gets the codepoint (as text) at the 0-based index (counting codepoints).") | [Text, 0..oo] | (Text 1..1) |
| at_back[codepoint] | [at_back[codepoint]](opcodes-outputs.generated.md#at_backcodepoint "Gets the codepoint (as text) at the -1-based backwards index (counting codepoints).") | [Text, -oo..-1] | (Text 1..1) |
| slice[codepoint] | [slice[codepoint]](opcodes-outputs.generated.md#slicecodepoint "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in codepoints.") | [Text, 0..oo, 0..oo] | Text |
| slice_back[codepoint] | [slice_back[codepoint]](opcodes-outputs.generated.md#slice_backcodepoint "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in codepoints.") | [Text, -oo..-1, 0..oo] | Text |
| slice[byte] | [slice[byte]](opcodes-outputs.generated.md#slicebyte "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in bytes.") | [Text, 0..oo, 0..oo] | Text |
| slice_back[byte] | [slice_back[byte]](opcodes-outputs.generated.md#slice_backbyte "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in bytes.") | [Text, -oo..-1, 0..oo] | Text |
| slice | [slice[Ascii]](opcodes-outputs.generated.md#sliceAscii "Returns a text slice that starts at the given 0-based index and has given length.")<br>[slice_back[Ascii]](opcodes-outputs.generated.md#slice_backAscii "Returns a text slice that starts at the given -1-based backwards index and has given length.")<br>[slice[List]](opcodes-outputs.generated.md#sliceList "Returns a list slice that starts at the given 0-based index and has given length.")<br>[slice_back[List]](opcodes-outputs.generated.md#slice_backList "Returns a list slice that starts at the given -1-based backwards index and has given length.") | [Ascii, 0..oo, 0..oo]<br>[Ascii, -oo..-1, 0..oo]<br>[(List T1), 0..oo, 0..oo]<br>[(List T1), -oo..-1, 0..oo] | Ascii<br>Ascii<br>(List T1)<br>(List T1) |
| ord[byte] | [ord[byte]](opcodes-outputs.generated.md#ordbyte "Converts the byte to an integer.") | [(Text 1..1)] | 0..255 |
| ord[codepoint] | [ord[codepoint]](opcodes-outputs.generated.md#ordcodepoint "Converts the codepoint to an integer.") | [(Text 1..1)] | 0..1114111 |
| ord | [ord[Ascii]](opcodes-outputs.generated.md#ordAscii "Converts the character to an integer.") | [(Ascii 1..1)] | 0..127 |
| char[byte] | [char[byte]](opcodes-outputs.generated.md#charbyte "Returns a byte (as text) corresponding to the integer.") | [0..255] | (Text 1..1) |
| char[codepoint] | [char[codepoint]](opcodes-outputs.generated.md#charcodepoint "Returns a codepoint (as text) corresponding to the integer.") | [0..1114111] | (Text 1..1) |
| char | [char[Ascii]](opcodes-outputs.generated.md#charAscii "Returns a character corresponding to the integer.") | [0..127] | (Ascii 1..1) |
| text_to_list[byte] | [text_to_list[byte]](opcodes-outputs.generated.md#text_to_listbyte "Converts given text to a list of single byte texts. Use for[byte] to iterate over bytes in a text.") | [Text] | (List (Text 1..1)) |
| text_to_list[codepoint] | [text_to_list[codepoint]](opcodes-outputs.generated.md#text_to_listcodepoint "Converts given text to a list of single codepoint texts. Use for[codepoint] to iterate over codepoints in a text.") | [Text] | (List (Text 1..1)) |
| text_to_list | [text_to_list[Ascii]](opcodes-outputs.generated.md#text_to_listAscii "Converts given text to a list of single character texts. Use for[Ascii] to iterate over characters in a text.") | [Ascii] | (List (Ascii 1..1)) |
| sorted | [sorted[Int]](opcodes-outputs.generated.md#sortedInt "Returns a sorted copy of the input.")<br>[sorted[Ascii]](opcodes-outputs.generated.md#sortedAscii "Returns a lexicographically sorted copy of the input.") | [(List Int)]<br>[(List Ascii)] | (List Int)<br>(List Ascii) |
| reversed[byte] | [reversed[byte]](opcodes-outputs.generated.md#reversedbyte "Returns a text in which the bytes are in reversed order.") | [Text] | Text |
| reversed[codepoint] | [reversed[codepoint]](opcodes-outputs.generated.md#reversedcodepoint "Returns a text in which the codepoints are in reversed order.") | [Text] | Text |
| reversed | [reversed[Ascii]](opcodes-outputs.generated.md#reversedAscii "Returns a text in which the characters are in reversed order.")<br>[reversed[List]](opcodes-outputs.generated.md#reversedList "Returns a list in which the items are in reversed order.") | [Ascii]<br>[(List T1)] | Ascii<br>(List T1) |
| find[codepoint] | [find[codepoint]](opcodes-outputs.generated.md#findcodepoint "Returns a 0-based index of the first codepoint at which the search text starts, provided it is included.") | [Text, (Text 1..oo)] | -1..oo |
| find[byte] | [find[byte]](opcodes-outputs.generated.md#findbyte "Returns a 0-based index of the first byte at which the search text starts, provided it is included.") | [Text, (Text 1..oo)] | -1..oo |
| find | [find[Ascii]](opcodes-outputs.generated.md#findAscii "Returns a 0-based index of the first character at which the search text starts, provided it is included.")<br>[find[List]](opcodes-outputs.generated.md#findList "Returns a 0-based index of the first occurence of the searched item, provided it is included.") | [Ascii, Ascii]<br>[(List T1), T1] | -1..oo<br>-1..2147483647 |
| contains | [contains[Array]](opcodes-outputs.generated.md#containsArray "Asserts whether an item is included in the array.")<br>[contains[List]](opcodes-outputs.generated.md#containsList "Asserts whether an item is included in the list.")<br>[contains[Table]](opcodes-outputs.generated.md#containsTable "Asserts whether an item is included in the keys of the table.")<br>[contains[Set]](opcodes-outputs.generated.md#containsSet "Asserts whether an item is included in the set.")<br>[contains[Text]](opcodes-outputs.generated.md#containsText "Asserts whether the 2nd argument is a substring of the 1st one.") | [(Array T1 T2), T1]<br>[(List T1), T1]<br>[(Table T1 T2), T1]<br>[(Set T1), T1]<br>[Text, Text] | Bool<br>Bool<br>Bool<br>Bool<br>Bool |
| # | [size[List]](opcodes-outputs.generated.md#sizeList "Returns the length of the list.")<br>[size[Set]](opcodes-outputs.generated.md#sizeSet "Returns the cardinality of the set.")<br>[size[Table]](opcodes-outputs.generated.md#sizeTable "Returns the number of keys in the table.")<br>[size[Ascii]](opcodes-outputs.generated.md#sizeAscii "Returns the length of the text.") | [(List T1)]<br>[(Set T1)]<br>[(Table T1 T2)]<br>[Ascii] | 0..2147483647<br>0..2147483647<br>0..2147483647<br>0..oo |
| size[codepoint] | [size[codepoint]](opcodes-outputs.generated.md#sizecodepoint "Returns the length of the text in codepoints.") | [Text] | 0..oo |
| size[byte] | [size[byte]](opcodes-outputs.generated.md#sizebyte "Returns the length of the text in bytes.") | [Text] | 0..2147483648 |
| include | [include](opcodes-outputs.generated.md#include "Modifies the set by including the given item.") | [(Set T1), T1] | Void |
| repeat | [repeat](opcodes-outputs.generated.md#repeat "Repeats the text a given amount of times.") | [Text, 0..oo] | Text |
| split | [split](opcodes-outputs.generated.md#split "Splits the text by the delimiter.") | [Text, Text] | (List Text) |
| split_whitespace | [split_whitespace](opcodes-outputs.generated.md#split_whitespace "Splits the text by any whitespace.") | [Text] | (List Text) |
| join | [join](opcodes-outputs.generated.md#join "Joins the items using the delimiter.") | [(List Text), Text = "";] | Text |
| right_align | [right_align](opcodes-outputs.generated.md#right_align "Right-aligns the text using spaces to a minimum length.") | [Text, 0..oo] | Text |
| replace | [replace](opcodes-outputs.generated.md#replace "Replaces all occurences of a given text with another text.") | [Text, (Text 1..oo), Text = "";] | Text |
| starts_with | [starts_with](opcodes-outputs.generated.md#starts_with "Checks whether the second argument is a prefix of the first.") | [Text, Text] | Bool |
| ends_with | [ends_with](opcodes-outputs.generated.md#ends_with "Checks whether the second argument is a suffix of the first.") | [Text, Text] | Bool |
| int_to_bin_aligned | [int_to_bin_aligned](opcodes-outputs.generated.md#int_to_bin_aligned "Converts the integer to a 2-base text and alignes to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_hex_aligned | [int_to_hex_aligned](opcodes-outputs.generated.md#int_to_hex_aligned "Converts the integer to a 16-base lowercase text and aligns to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_Hex_aligned | [int_to_Hex_aligned](opcodes-outputs.generated.md#int_to_Hex_aligned "Converts the integer to a 16-base uppercase text and aligns to a minimum length.") | [0..oo, 0..oo] | Ascii |
| int_to_dec | [int_to_dec](opcodes-outputs.generated.md#int_to_dec "Converts the integer to a 10-base text.") | [Int] | (Ascii 1..oo) |
| int_to_bin | [int_to_bin](opcodes-outputs.generated.md#int_to_bin "Converts the integer to a 2-base text.") | [0..oo] | (Ascii 1..oo) |
| int_to_hex | [int_to_hex](opcodes-outputs.generated.md#int_to_hex "Converts the integer to a 16-base lowercase text.") | [0..oo] | (Ascii 1..oo) |
| int_to_Hex | [int_to_Hex](opcodes-outputs.generated.md#int_to_Hex "Converts the integer to a 16-base uppercase text.") | [0..oo] | (Ascii 1..oo) |
| int_to_bool | [int_to_bool](opcodes-outputs.generated.md#int_to_bool "Converts 0 to false and 1 to true.") | [0..1] | Bool |
| dec_to_int | [dec_to_int](opcodes-outputs.generated.md#dec_to_int "Parses a integer from a 10-base text.") | [Ascii] | Int |
| bool_to_int | [bool_to_int](opcodes-outputs.generated.md#bool_to_int "Converts false to 0 and true to 1.") | [Bool] | 0..1 |
| .. | [range_incl](opcodes-outputs.generated.md#range_incl "List of integers between given inclusive bounds, with given step.") | [Int = 0;, Int, 1..oo = 1;] | (List Int) |
| ..< | [range_excl](opcodes-outputs.generated.md#range_excl "List of integers between given inclusive lower, exclusive upper bound,  with given step.") | [Int = 0;, Int, 1..oo = 1;] | (List Int) |
