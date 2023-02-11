---
name: Wrong output
about: Compiling polygolf produces wrong result
title: Wrong output
labels: bug
assignees: ""
---

**Language**
Python

**Polygolf source**

```
print "Hello world!";
```

**Current output**

```
print "Hello world!"
```

**Expected output**

```
print("Hello world!")
```

**Comment**
Python 3 requires parens for printing.
