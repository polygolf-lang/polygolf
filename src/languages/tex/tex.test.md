# TeX

## Ops emit

```polygolf
$n:0..1 <- 1;
$m:-50..50 <- $n;

println_int $m;

$m <- $n;
$m <- (- $n);

$m <- ($n * 3);
$m <- ($n div 4);
$m <- ($n + 5);
$m <- ($n - 6);
$m <- ($m - $n):-50..50;
```

```tex nogolf
\newcount\n\newcount\m\newcount\t\newcount\T\newcount~\newcount\a\newcount\b\n1 \m\n\the\m\endgraf\m\n\t-1 \multiply\t\n\m\t\T3 \multiply\T\n\m\T~\n\divide~4 \m~\a5 \advance\a\n\m\a\b\n\advance\b-6 \m\b\advance\m-\n
```

## Op mod

```polygolf
$n <- 0;
$m <- 1;
$n <- ($n mod $m);
```

```tex nogolf
\newcount\h\newcount\n\newcount\m\def\H#1#2{\h#1\divide\h#2\multiply\h#2\advance#1-\h}\n0 \m1 \H{\n}{\m}
```

## If statement emit

```polygolf
$n:0..1 <- 1;
$m:-50..50 <- $n;
if ($n < $m) { $m <- 12; };
if ($n < $m) { $m <- 13; } { $m <- 14; };
if ($n > $m) { $m <- 15; };
if ($n > $m) { $m <- 16; } { $m <- 17; };
if ($n == $m) { $m <- 18; };
if ($n == $m) { $m <- 19; } { $m <- 20; };
% if ($n <= $m) { $m <- 21; }; % TODO-tex
% if ($n <= $m) { $m <- 22; } { $m <- 23; }; % TODO-tex
% if ($n >= $m) { $m <- 24; }; % TODO-tex
% if ($n >= $m) { $m <- 25; } { $m <- 26; }; % TODO-tex
% TODO-tex: ANDing conditions should be nested loops.
```

```tex nogolf
\newcount\n\newcount\m\n1 \m\n\ifnum\n<\m\m12 \fi\ifnum\n<\m\m13 \else\m14 \fi\ifnum\n>\m\m15 \fi\ifnum\n>\m\m16 \else\m17 \fi\ifnum\n=\m\m18 \fi\ifnum\n=\m\m19 \else\m20 \fi
```

## Looping

```polygolf
for $i 0 31 {
  println_int ((1 + $i) + ($i * $i));
};
```

```tex nogolf
\newcount\i\newcount\t\newcount\T\i0 \def~{\ifnum\i<31 \t1 \advance\t\i\T\i\multiply\T\i\advance\t\T\the\t\endgraf\advance\i1 ~\fi}~
```

## Mod inside if statement

```polygolf
$i <- 10;
$sum:0..9999 <- 0;
for $d 1 $i {
  if (($i mod $d) < 1) {
    $sum <- ($sum + $d):0..9999;
  };
};
println_int $sum;
```

```tex nogolf
\newcount\h\newcount\i\newcount\s\newcount\d\newcount\t\def\H#1#2{\h#1\divide\h#2\multiply\h#2\advance#1-\h}\i10 \s0 \d1 \def\T{\ifnum\d<\i\t\i\H{\t}{\d}\ifnum\t<1 \advance\s\d\fi\advance\d1 \T\fi}\T\the\s\endgraf
```
