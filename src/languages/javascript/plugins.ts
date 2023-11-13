import {
  type Node,
  builtin,
  forEachKey,
  indexCall,
  isIntLiteral,
  text,
} from "../../IR";

export function propertyCallToIndexCall(node: Node) {
  if (node.kind === "PropertyCall") {
    return indexCall(node.object, text(node.ident.name));
  }
}

export function forRangeToForEachKey(node: Node) {
  if (
    node.kind === "ForRange" &&
    node.variable !== undefined &&
    isIntLiteral(0n)(node.start) &&
    isIntLiteral()(node.end) &&
    2 <= node.end.value &&
    node.end.value <= 37
  ) {
    const end = Number(node.end.value);
    return forEachKey(
      node.variable,
      builtin(
        [
          "'??'",
          "'???'",
          "''+!0",
          "''+!1",
          "''+1e5",
          "''+1e6",
          "''+1e7",
          "''+1e8",
          "''+1e9",
          "''+1e10",
          "''+1e11",
          "''+1e12",
          "''+1e13",
          "''+{}",
          "{}+1",
          "{}+11",
          "{}+.1",
          "{}+!0",
          "{}+!1",
          "{}+1e5",
          "{}+1e6",
          "{}+1e7",
          "{}+1e8",
          "{}+1e9",
          "{}+1e10",
          "{}+1e11",
          "{}+1e12",
          "{}+1e13",
          "{}+{}",
          "{}+1e15",
          "''+Map",
          " 1+Map",
          "-1+Map",
          ".1+Map",
          "!0+Map",
          "!1+Map",
          "{}+Map",
        ][end - 2],
      ),
      node.body,
    );
  }
}
