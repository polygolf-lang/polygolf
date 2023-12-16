# Print

```polygolf
print "x";
println "y";
```

```polygolf print.printLnToPrint
print "x";
print "y\n";
```

```polygolf print.golfLastPrint(true)
print "x";
println "y";
```

```polygolf print.golfLastPrint(false)
print "x";
print "y";
```

```polygolf
println "x";
print "y";
```

```polygolf print.golfLastPrint(true)
println "x";
println "y";
```

```polygolf
println 1;
print 2;
```

```polygolf print.golfLastPrintInt(true)
println 1;
println 2;
```

```polygolf
println 1;
println 2;
```

```polygolf print.golfLastPrintInt(false)
println 1;
print 2;
```

```polygolf
for $i 10 {
    print "x";
};
print "y";
```

```polygolf print.mergePrint
(id "unique#0") <- "";
for $i 10 (
    (id "unique#0") <- ((id "unique#0") .. "x")
);
(id "unique#0") <- ((id "unique#0") .. "y");
print (id "unique#0");
```

```polygolf
if true {
    $x <- "";
    for $i 10 {
        $x <- ($x .. "x");
    };
    $x <- ($x .. "--");
    print $x;
};
```

```polygolf print.splitPrint
if true {
    for $i 10 (
        print "x"
    );
    print "--";
};
```
