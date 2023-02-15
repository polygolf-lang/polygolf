# Nim

```polygolf
print (3+1);
```

```nim nogolf
stdout.write 3+1
```

```nim bytes
4.echo
```

```polygolf
print (text_split "abc" "b");
```

```nim
include re
"abc".split("b").echo
```

## Argv

```polygolf
for_argv $x 100 {
  println $x;
};
```

```nim
import os
for x in commandLineParams():x.echo
```
