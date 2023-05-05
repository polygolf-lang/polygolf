# Swift

## Assignment

```polygolf
$a <- 1;
```

```swift nogolf
var a=1
```

```polygolf
$a:0..5 <- 1;
$b:0..5 <- 2;
$c <- ($a + $b);
```

```swift nogolf
var a=1,b=2,c=a+b
```

## Printing

```polygolf
println "a";
print "b";
println_int 1;
print_int 2;
```

```swift nogolf
print("a")
print("b",terminator:"")
print(1)
print(2,terminator:"")
```

## Strings

```polygolf
$a <- "\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009\u000A\u000B\u000C\u000D\u000E\u000F\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F";
$b <- "abc\ndef\nghi\njkl\nmno\npqr\nstu\nvwx";
```

```swift nogolf
var a="\u{1}\u{2}\u{3}\u{4}\u{5}\u{6}\u{7}\u{8}\u{9}\n\u{b}\u{c}\u{d}\u{e}\u{f}\u{10}\u{11}\u{12}\u{13}\u{14}\u{15}\u{16}\u{17}\u{18}\u{19}\u{1a}\u{1b}\u{1c}\u{1d}\u{1e}\u{1f}",b="""
abc
def
ghi
jkl
mno
pqr
stu
vwx
"""
```

## Ops emit

```polygolf
$a:-100..100 <- 0;
$b:Text <- "xy";
$c <- (0==0);
~ $a;
- $a;
$a + 2;
$a - 2;
$a * 2;
$a div 2;
$a ^ 2;
$a mod 2;
$a & 2;
$a | 2;
$a ~ 2;
$a << 2;
$a >> 2;
$a < 2;
$a <= 2;
$a == 2;
$a != 2;
$a >= 2;
$a > 2;
$a <- ($a + 2):-100..100;
$a <- ($a - 2):-100..100;
$a <- ($a * 2):-100..100;
$a <- ($a div 2):-100..100;
$a <- ($a mod 2):-100..100;
$a <- ($a & 2):-100..100;
$a <- ($a | 2):-100..100;
$a <- ($a ~ 2):-100..100;
max $a 2;
min $a 2;
abs $a;
list_get (list "xy" "abc") 1;
text_get_byte "abc" 1;
text_get_codepoint "abc" 1;
concat $b "xyz";
text_byte_length "abc";
text_codepoint_length "abc";
int_to_codepoint 5;
int_to_text 5;
text_to_int "5";
text_split "xyz" "y";
repeat $b 3;
table_get (table ("X" => "Y") ) "X";
and $c $c;
or $c $c;
not $c;
```

```swift nogolf
import Foundation
var a=0,b="xy",c=0==0
~a
-a
2+a
a-2
2*a
a/2
Int(pow(Double(a),Double(2)))
a%2
2&a
2|a
2^a
a<<2
a>>2
a<2
a<=2
a==2
a != 2
a>=2
a>2
a+=2
a += -2
a*=2
a/=2
a%=2
a&=2
a|=2
a^=2
max(2,a)
min(2,a)
abs(a)
["xy","abc"][1]
Int(Array("abc".utf8)[1])
String(Array("abc")[1])
b+"xyz"
"abc".utf8.count
"abc".count
String(UnicodeScalar(5)!)
String(5)
Int("5")!
"xyz".split(separator:"y")
String(repeating:b,count:3)
["X":"Y"]["X"]!
c&&c
c||c
!c
```

## Whitespace behavior

```polygolf
$b <- -1;
$a:-100..100 <- 8:-99..99;
$c <- (bit_not 4);
$a <- ($a * 2):-99..99;
$a <- ($a * -5):-99..99;
if ($a != 0) {$a <- 1;};
if ($a != -12) {$a <- 1;};
if (-3 != $a) {$a <- 1;};
for $d -4 4 {$a <- $d;};
for $e (($a + 1)*($a + 1)) 99 {$a <- 1;};
```

```swift nogolf
var b = -1,a=8,c = ~4
a*=2
a *= -5
if a != 0{a=1}
if a != -12{a=1}
if -3 != a{a=1}
for d in -4..<4{a=d}
for e in(1+a)*(1+a)..<99{a=1}
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```swift nogolf
for x in CommandLine.arguments[1...]{print(x)}
```

```polygolf
argv_get 0;
```

```swift nogolf
CommandLine.arguments[1]
```
