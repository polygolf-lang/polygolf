import {
  binaryOp,
  block,
  forRange,
  id,
  int,
  program,
  print,
  stringLiteral,
  varDeclaration,
  assignment,
  listType,
  listConstructor,
  listGet,
} from "../IR";

export default program(
  block([
    varDeclaration("O", listType("string")),
    assignment(
      "O",
      listConstructor([
        stringLiteral("First"),
        stringLiteral("Second"),
        stringLiteral("Third"),
        stringLiteral("Fourth"),
        stringLiteral("Fifth"),
        stringLiteral("Sixth"),
        stringLiteral("Seventh"),
        stringLiteral("Eighth"),
        stringLiteral("Ninth"),
        stringLiteral("Tenth"),
        stringLiteral("Eleventh"),
        stringLiteral("Twelfth"),
      ])
    ),

    varDeclaration("T", listType("string")),
    assignment(
      "T",
      listConstructor([
        stringLiteral("Twelve Drummers Drumming,"),
        stringLiteral("Eleven Pipers Piping,"),
        stringLiteral("Ten Lords-a-Leaping,"),
        stringLiteral("Nine Ladies Dancing,"),
        stringLiteral("Eight Maids-a-Milking,"),
        stringLiteral("Seven Swans-a-Swimming,"),
        stringLiteral("Six Geese-a-Laying,"),
        stringLiteral("Five Gold Rings,"),
        stringLiteral("Four Calling Birds,"),
        stringLiteral("Three French Hens,"),
        stringLiteral("Two Turtle Doves, and"),
        stringLiteral("A Partridge in a Pear Tree.\n"),
      ])
    ),
    forRange(
      "i",
      int(0n),
      int(12n),
      int(1n),
      block([
        print(
          binaryOp(
            "str_concat",
            binaryOp(
              "str_concat",
              stringLiteral("On the "),
              listGet(id("O"), id("i"))
            ),
            stringLiteral(" day of Christmas\nMy true love sent to me")
          )
        ),
        forRange(
          "j",
          binaryOp("sub", int(11n), id("i")),
          int(12n),
          int(1n),
          block([print(listGet(id("T"), id("j")))])
        ),
      ])
    ),
  ])
);
