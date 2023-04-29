# Conditions

```polygolf
conditional true 3 4;
```

```polygolf conditions.safeConditionalOpToCollectionGet("array")
array_get (array 4 3) (bool_to_int true);
```

```polygolf
conditional true 3 4;
```

```polygolf conditions.conditionalOpToAndOr
unsafe_or (unsafe_and true 3) 4;
```
