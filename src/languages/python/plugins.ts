import {
  Assignment,
  block,
  functionCall,
  id,
  importStatement,
  manyToManyAssignment,
  methodCall,
  Program,
  Statement,
  varDeclarationWithAssignment,
} from "../../IR";
import { Path } from "../../common/traverse";
import { getType } from "../../common/getType";

