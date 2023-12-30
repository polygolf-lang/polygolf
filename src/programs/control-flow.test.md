# Control flow

## Chained if

```polygolf
if true {
    println "a";
} {
    if true {
        println "b";
    };
};
```

```janet nogolf
(cond true(print"a")true(print"b"))
```

```js nogolf
if(true)print`a`else if(true)print`b`
```

```nim nogolf
if true:echo("a")elif true:echo("b")
```

```py nogolf
if 1:print("a")
elif 1:print("b")
```

```polygolf
if true {
    println "a";
} {
    if true {
        println "b";
    } {
        println "c";
    };
};
```

```janet nogolf
(cond true(print"a")true(print"b")(print"c"))
```

```js nogolf
if(true)print`a`else if(true)print`b`else print`c`
```

```nim nogolf
if true:echo("a")elif true:echo("b")else:echo("c")
```

```py nogolf
if 1:print("a")
elif 1:print("b")
else:print("c")
```
