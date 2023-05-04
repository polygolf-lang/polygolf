# Tables

## Hashing

```polygolf
print (table_get
    (table
        ("▄ ▄▄▄" => "A")
        ("▄▄▄ ▄ ▄ ▄" => "B")
        ("▄▄▄ ▄ ▄▄▄ ▄" => "C")
    )
    (argv_get 0)
);
```

```polygolf tables.testTableHashing(999)
print (list_get (list "B" "C" "A") (((@FunctionCall (@BuiltinIdent "hash") (argv_get 0)):0..4294967295 mod 11) mod 3));
```

```polygolf tables.testTableHashing(9)
print (list_get (list "A" "B" " " "C") (((@FunctionCall (@BuiltinIdent "hash") (argv_get 0)):0..4294967295 mod 9) mod 4));
```

## List lookup

```polygolf
table_get
    (table
        ("▄ ▄▄▄" => "A")
        ("▄▄▄ ▄ ▄ ▄" => "B")
        ("▄▄▄ ▄ ▄▄▄ ▄" => "C")
    )
    (argv_get 0)
;
```

```polygolf tables.tableToListLookup
list_get (list "A" "B" "C") (list_find (list "▄ ▄▄▄" "▄▄▄ ▄ ▄ ▄" "▄▄▄ ▄ ▄▄▄ ▄") (argv_get 0));
```
