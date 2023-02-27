# Swift

## Multiline string literals require newlines between delimiters and string content

```polygolf
println "abc\ndef\nghi\njkl\nmno\npqr\nstu\nvwx\nyz!";
```

```swift nogolf
print("""
abc
def
ghi
jkl
mno
pqr
stu
vwx
yz!
""")
```

## Indexing a dictionary requires `!` to unwrap an Optional, unlike indexing a string or array

```polygolf
$a <- (text_get_byte "abc" 1);
$b <- (table_get (table ("X" => "Y") ) "X");
```

```swift nogolf
var a=Int(Array("abc".utf8)[1]),b=["X":"Y"]["X"]!
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
for e in(a+1)*(a+1)..<99{a=1}
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
println (argv_get 0);
```

```swift nogolf
print(CommandLine.arguments[1])
```
