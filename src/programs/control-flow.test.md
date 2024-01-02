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

_Janet_

```janet nogolf
(cond true(print"a")true(print"b"))
```

_Javascript_

```js nogolf
if(true)print`a`else if(true)print`b`
```

_Nim_

```nim nogolf
if true:echo("a")elif true:echo("b")
```

_Python_

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

_Janet_

```janet nogolf
(cond true(print"a")true(print"b")(print"c"))
```

_Javascript_

```js nogolf
if(true)print`a`else if(true)print`b`else print`c`
```

_Nim_

```nim nogolf
if true:echo("a")elif true:echo("b")else:echo("c")
```

_Python_

```py nogolf
if 1:print("a")
elif 1:print("b")
else:print("c")
```
