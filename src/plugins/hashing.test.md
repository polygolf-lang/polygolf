# Table Hashing

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

```polygolf hashing.testTableHashing(999)
print (list_get (list "B" "C" "A") (((function_call (builtin "hash") (argv_get 0)):0..4294967295 mod 11) mod 3));
```

```polygolf hashing.testTableHashing(9)
print (list_get (list "A" "B" " " "C") (((function_call (builtin "hash") (argv_get 0)):0..4294967295 mod 9) mod 4));
```
