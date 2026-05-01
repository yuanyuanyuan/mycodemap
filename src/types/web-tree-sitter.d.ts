declare module 'web-tree-sitter' {
  export interface Point {
    row: number;
    column: number;
  }

  export interface Range {
    startIndex: number;
    endIndex: number;
    startPosition: Point;
    endPosition: Point;
  }

  export interface SyntaxNode {
    type: string;
    text: string;
    startPosition: Point;
    endPosition: Point;
    startIndex: number;
    endIndex: number;
    parent: SyntaxNode | null;
    children: SyntaxNode[];
    namedChildren: SyntaxNode[];
    childCount: number;
    namedChildCount: number;

    child(index: number): SyntaxNode | null;
    namedChild(index: number): SyntaxNode | null;
    childrenForFieldName(fieldName: string): SyntaxNode[];
    walk(): TreeCursor;
  }

  export interface TreeCursor {
    nodeType: string;
    nodeText: string;
    startPosition: Point;
    endPosition: Point;
    currentNode: SyntaxNode;

    gotoParent(): boolean;
    gotoFirstChild(): boolean;
    gotoNextSibling(): boolean;
  }

  export interface Tree {
    rootNode: SyntaxNode;
    walk(): TreeCursor;
  }

  export class Language {
    static load(url: string | Uint8Array): Promise<Language>;
  }

  export interface ParserStatic {
    init(): Promise<void>;
    Language: typeof Language;
  }

  export class Parser {
    static init(): Promise<void>;
    static Language: typeof Language;

    parse(input: string, oldTree?: Tree): Tree;
    setLanguage(language: Language): void;
    getLanguage(): Language | null;
  }

  export default Parser;
}
