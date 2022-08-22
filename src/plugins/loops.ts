import {
  forRangeInclusive,
  Path,
  binaryOp,
  int,
  varDeclaration,
  assignment,
  whileLoop,
  forCLike,
  block,
} from "../IR";

export var forRangeToForRangeInclusive = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      path.replaceWith(
        forRangeInclusive(
          node.variable,
          node.low,
          binaryOp("sub", node.high, int(1n)),
          node.increment,
          node.body
        )
      );
    }
  },
};

export var forRangeToWhile = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      node.body.children.push(
        assignment(
          node.variable,
          binaryOp("add", node.variable, node.increment ?? int(1n))
        )
      );
      path.replaceWithMultiple([
        varDeclaration(node.variable, "number"),
        assignment(node.variable, node.low),
        whileLoop(binaryOp("lt", node.variable, node.high), node.body),
      ]);
    }
  },
};

export var forRangeToForCLike = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      path.replaceWith(
        forCLike(
          block([
            varDeclaration(node.variable, "number"),
            assignment(node.variable, node.low),
          ]),
          block([binaryOp("add", node.variable, node.increment ?? int(1n))]),
          binaryOp("lt", node.variable, node.high),
          node.body
        )
      );
    }
  },
};
