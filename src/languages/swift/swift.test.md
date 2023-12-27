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
$b <- "xy";
$c <- (0==0);
$d <- (list "xy" "abc" "123");

% Boolean
and $c $c;
or $c $c;
not $c;

% Unary Arithmetic
~ $a;
- $a;
abs $a;

% Binary Arithmetic
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
max $a 2;
min $a 2;

% Comparison
$a < 2;
$a <= 2;
$a == 2;
$a != 2;
$a >= 2;
$a > 2;

% Mutating
$a <- ($a + 2):-100..100;
$a <- ($a - 2):-100..100;
$a <- ($a * -2):-100..100;
$a <- ($a div 2):-100..100;
$a <- ($a mod 2):-100..100;
$a <- ($a & 2):-100..100;
$a <- ($a | 2):-100..100;
$a <- ($a ~ 2):-100..100;

% Text encoding
at[byte] $b 1;
at[codepoint] $b 1;
ord_at[byte] $b 1;
ord_at[codepoint] $b 1;
size[byte] $b;
size[codepoint] $b;
ord[byte] "a";
ord[codepoint] "\u00ff";
char[byte] 99;
char[codepoint] 999;
slice[codepoint] $b 2 3;

% Other
at[List] $d 1;
concat[Text] $b "xyz";
concat[List] $d $d;
reversed[codepoint] $b;
reversed[List] $d;
sorted[Ascii] $d;
sorted[Int] (list 4 3 1 2);
size[Set] (set 1 2);
size[Table] (table ("X" => "Y") );
size[List] $d;
contains[Text] $b "b";
contains[List] $d "123";
contains[Set] (set 1 2) 2;
contains[Table] (table ("X" => "Y") ) "X";
find[List] $d "xy";
find[codepoint] "abcdef" "de";
find[byte] "abcdef" "de";
int_to_dec 5;
dec_to_int "5";
text_split "xyz" "y";
join $d "/";
join $d "";
repeat $b 3;
text_replace "a+b+c" "+" "*";
at[Table] (table ("X" => "Y") ) "X";
int_to_hex_aligned 50 7;
int_to_hex 50;
int_to_bin_aligned 50 7;
int_to_bin 50;
right_align "text" 20;
```

```swift nogolf
import Foundation
var a=0,b="xy",c=0==0,d=["xy","abc","123"]
c&&c
c||c
!c
~a
-a
abs(a)
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
max(2,a)
min(2,a)
a<2
a<=2
a==2
a != 2
a>=2
a>2
a+=2
a-=2
a *= -2
a/=2
a%=2
a&=2
a|=2
a^=2
String(UnicodeScalar(Int(Array(b.utf8)[1]))!)
String(Array(b)[1])
Int(Array(b.utf8)[1])
Array(b.unicodeScalars)[1].value
b.utf8.count
b.count
Int(Array("a".utf8)[0])
Array("ÿ".unicodeScalars)[0].value
String(UnicodeScalar(99)!)
String(UnicodeScalar(999)!)
b.prefix(5).suffix(3)
d[1]
b+"xyz"
d+d
String(b.reversed())
Array(d.reversed())
d.sorted()
[4,3,1,2].sorted()
Set([1,2]).count
["X":"Y"].count
d.count
b.contains("b")
d.contains("123")
Set([1,2]).contains(2)
["X":"Y"].keys.contains("X")
d.index(of:"xy")
"abcdef".contains("de") ?"abcdef".split(separator:"de",omittingEmptySubsequences:false)[0].count:-1
"abcdef".contains("de") ?"abcdef".split(separator:"de",omittingEmptySubsequences:false)[0].utf8.count:-1
String(5)
Int("5")!
"xyz".split(separator:"y",omittingEmptySubsequences:false)
d.joined(separator:"/")
d.joined()
String(repeating:b,count:3)
"a+b+c".replacingOccurrences(of:"+",with:"*")
["X":"Y"]["X"]!
String(format:"%0"+String(7)+"X",50)
String(50,radix:16,uppercase:true)
(String(repeating:"0",count:7)+String(50,radix:2)).suffix(7)
String(50,radix:2)
(String(repeating:" ",count:20)+"text").suffix(20)
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
at[argv] 0;
```

```swift nogolf
CommandLine.arguments[1]
```

## Text literals

```polygolf
"\n";
"\u000565";
"š";
"💎";
```

```swift nogolf 32..127
"\n"
"\u{5}65"
"\u{161}"
"\u{1f48e}"
```

## Conditional

```polygolf
$a:Int <- 1;
$b:Int <- 1;
$c:Int <- 1;
println_int (conditional (conditional ($a > 0) ($b > 0) ($c > 0)) 8 7);
```

```swift nogolf
var a=1,b=1,c=1
print((a>0 ?b>0:c>0) ?8:7)
```
