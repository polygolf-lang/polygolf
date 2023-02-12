# Swift

## Test eval static expr

```polygolf
print (3+1);
```

```swift bytes
print(4)
```

## Multiline string literals require newlines between delimiters and string content

```polygolf
print "abc\ndef\nghi\njkl\nmno\npqr\nstu\nvwx\nyz!";
```

```swift bytes
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

```swift bytes
a=Int(Array("abc".utf8)[1])
b=["X":"Y"]["X"]!
```
