{
  // ---------------------------
  // Lexical grammar.

  lex: {
    rules: [
      [`\\s+`,        `/* skip whitespace */`],
      [`[+-]?\\d+(\\.\\d+)?`, `return 'NUMBER'`],
      [`\\+`,         `return '+'`],
      [`-`,           `return '-'`],
      [`\\*`,         `return '*'`],
      [`/`,           `return '/'`],
      [`\\^`,         `return '^'`],
      [`\\(`,         `return '('`],
      [`\\)`,         `return ')'`],
      [`,`,           `return ','`],
      [`:`,           `return ':'`],
      [`;`,           `return ';'`],
      [`<=`,          `return 'CMP_LE'`],
      [`>=`,          `return 'CMP_GE'`],
      [`<>`,          `return 'CMP_NE'`],
      [`<`,           `return '<'`],
      [`>`,           `return '>'`],
      [`=`,           `return '='`],
      [`#`,           `return 'CMP_HASH'`],
      [`(NOT|아니다)`,         `return 'NOT'`],
      [`(AND|이고)`,         `return 'AND'`],
      [`(OR|또는)`,          `return 'OR'`],
      [`(REM|주석)`,         `return 'REM'`],
      [`DATA`,        `return 'DATA'`],
      [`DEF`,         `return 'DEF'`],
      [`(DIM|배열)`,         `return 'DIM'`],
      [`(END|끝)`,         `return 'END'`],
      [`(FOR|반복)`,         `return 'FOR'`],
      [`(TO|부터)`,          `return 'TO'`],
      [`(STEP|증가분|단계)`,        `return 'STEP'`],
      [`(GOSUB|서브)`,       `return 'GOSUB'`],
      [`(GOTO|이동)`,        `return 'GOTO'`],
      [`(INPUT|입력)`,       `return 'INPUT'`],
      [`(IF|만약)`,          `return 'IF'`],
      [`(THEN|참이면)`,        `return 'THEN'`],
      [`(LET|할당)`,         `return 'LET'`],
      [`(NEXT|다음)`,        `return 'NEXT'`],
      [`NEW`,         `return 'NEW'`],
      [`ON`,          `return 'ON'`],
      [`(PRINT|출력)`,       `return 'PRINT'`],
      [`READ`,        `return 'READ'`],
      [`RESTORE`,     `return 'RESTORE'`],
      [`(RETURN|반환)`,      `return 'RETURN'`],
      [`STOP`,        `return 'STOP'`],
      [`FUNCTION_NAME`, `return 'FUNCTION_NAME'`],
      [`[a-zA-Z가-힣][a-zA-Z가-힣0-9]*`, `return 'VARIABLE_NAME'`],  // Matches variable names
      [`"[^"]*"`, `return 'STRING'`], // Matches strings
      [`MID`,         `return 'MID'`],
    ]
  },

  // ---------------------------
  // Operators precedence.

  operators: [
    [`left`, 'AND'],
    [`left`, 'OR'],
    [`left`, '+'],
    [`left`, '-'],
    [`left`, '&'],
    [`left`, '*'],
    [`left`, '/'],
    [`left`, '^'],
  ],

  // ---------------------------
  // Syntactic grammar.

  bnf: {
    Prog: [
      [`Line`, `$$ = $1`],
      [`Prog \\n Line`, `$$ = $1.concat($3)`]
    ],
    
    Line: [
      [`NUMBER stmts`, `$$ = { number: $1, stmts: $2 }`]
    ],
    
    stmts: [
      [`stmt`, `$$ = [$1]`],
      [`stmt : stmts`, `$$ = [$1].concat($3)`]
    ],

    stmt: [
      [`REM`, `$$ = { type: 'REM', comment: ""}`],
      [`REM STRING`, `$$ = { type: 'REM', comment: $2}`],
      [`DATA exprlist`, `$$ = { type: 'DATA', exprlist: $2 }`],
      [`DEF userfunc = expr`, `$$ = { type: 'DEF', userfunc: $1, expr: $3 }`],
      [`DIM VARIABLE_NAME ( exprlist )`, `$$ = { type: 'DIM', var: $2, dimension: $4 }`],
      [`END`, `$$ = { type: 'END' }`],
      [`FOR var = expr TO expr`, `$$ = { type: 'FOR', var: $2, start: $4, end: $6 }`],
      [`FOR var = expr TO expr STEP expr`, `$$ = { type: 'FOR', var: $2, start: $4, end: $6, step: $8 }`],
      [`GOSUB NUMBER`, `$$ = { type: 'GOSUB', number: $2 }`],
      [`GOTO NUMBER`, `$$ = { type: 'GOTO', number: $2 }`],
      [`INPUT varlist`, `$$ = { type: 'INPUT', varlist: $2 }`],
      [`INPUT STRING ; varlist`, `$$ = { type: 'INPUT', varlist: $4, prompt: $2 }`],
      [`INPUT STRING , varlist`, `$$ = { type: 'INPUT', varlist: $4, prompt: $2 }`],
      [`IF expr GOTO NUMBER`, `$$ = { type: 'IF', expr: $2, action: { type: 'GOTO', number: $4 } }`],
      [`IF expr THEN stmt`, `$$ = { type: 'IF', expr: $2, action: $4 }`],
      [`LET var = expr`, `$$ = { type: 'LET', var: $2, expr: $4 }`],
      [`NEXT varlist`, `$$ = { type: 'NEXT', varlist: $2 }`],
      [`NEW`, `$$ = { type: 'NEW' }`],
      [`ON expr GOTO exprlist`, `$$ = { type: 'ON', expr: $2, action: { type: 'GOTO', targets: $4 } }`],
      [`ON expr GOSUB exprlist`, `$$ = { type: 'ON', expr: $2, action: { type: 'GOSUB', targets: $4 } }`],
      [`PRINT printlist`, `$$ = { type: 'PRINT', printlist: $2 }`],
      [`READ varlist`, `$$ = { type: 'READ', varlist: $2 }`],
      [`RESTORE`, `$$ = { type: 'RESTORE' }`],
      [`RESTORE expr`, `$$ = { type: 'RESTORE', expr: $2 }`],
      [`RETURN`, `$$ = { type: 'RETURN' }`],
      [`STOP`, `$$ = { type: 'STOP' }`],
      [`var = expr`, `$$ = { type: 'ASSIGN', var: $1, expr: $3 }`]
    ],

    expr: [
      [`expr0`, `$$ = $1`]
    ],
    
    expr0: [
      [`expr1`, `$$ = $1`],
      [`expr0 AND expr1`, `$$ = { type: 'AND', left: $1, right: $3 }`],
      [`expr0 OR expr1`, `$$ = { type: 'OR', left: $1, right: $3 }`]
    ],
    
    expr1: [
      [`expr2`, `$$ = $1`],
      [`expr1 = expr2`, `$$ = { type: 'CMP_EQ', left: $1, right: $3 }`],
      [`expr1 < expr2`, `$$ = { type: 'CMP_LT', left: $1, right: $3 }`],
      [`expr1 > expr2`, `$$ = { type: 'CMP_GT', left: $1, right: $3 }`],
      [`expr1 CMP_LE expr2`, `$$ = { type: 'CMP_LE', left: $1, right: $3 }`],
      [`expr1 CMP_GE expr2`, `$$ = { type: 'CMP_GE', left: $1, right: $3 }`],
      [`expr1 CMP_NE expr2`, `$$ = { type: 'CMP_NE', left: $1, right: $3 }`],
      [`expr1 CMP_HASH expr2`, `$$ = { type: 'CMP_HASH', left: $1, right: $3 }`]
    ],

    expr2: [
      [`expr3`, `$$ = $1`],
      [`expr2 + expr3`, `$$ = { type: 'ADD', left: $1, right: $3 }`],
      [`expr2 - expr3`, `$$ = { type: 'SUB', left: $1, right: $3 }`],
      [`expr2 & expr3`, `$$ = { type: 'CONCAT', left: $1, right: $3 }`]
    ],

    expr3: [
      [`expr4`, `$$ = $1`],
      [`expr3 * expr4`, `$$ = { type: 'MUL', left: $1, right: $3 }`],
      [`expr3 / expr4`, `$$ = { type: 'DIV', left: $1, right: $3 }`],
      [`expr3 ^ expr4`, `$$ = { type: 'POW', left: $1, right: $3 }`]
    ],

    expr4: [
      [`func`, `$$ = $1`],
      [`- func`, `$$ = { type: 'NEG', expr: $2 }`],
      [`NOT func`, `$$ = { type: 'NOT', expr: $2 }`]
    ],

    func: [
      [`factor`, `$$ = $1`],
      [`fn0 ( )`, `$$ = { type: 'fn0', args: [] }`],
      [`fn0 ( expr )`, `$$ = { type: 'fn0', args: [$3] }`],
      [`fn1 ( expr )`, `$$ = { type: 'fn1', args: [$3] }`],
      [`fn2 ( expr , expr )`, `$$ = { type: 'fn2', args: [$3, $5] }`],
      [`fnx ( expr , expr , expr )`, `$$ = { type: 'fnx', args: [$3, $5, $7] }`]
    ],

    factor: [
      [`NUMBER`, `$$ = { type: 'NUMBER', value: Number($1) }`],
      [`STRING`, `$$ = { type: 'STRING', value: $1 }`],
      [`var`, `$$ = $1`],
      [`userfunc`, `$$ = $1`],
      [`( expr )`, `$$ = $2`]
    ],

    var: [
      [`VARIABLE_NAME`, `$$ = { type: 'VARIABLE_NAME', name: $1 }`],
      [`VARIABLE_NAME ( exprlist )`, `$$ = { type: 'VARIABLE_NAME', name: $1, args: $3 }`]
    ],

    printlist: [
      [`expr`, `$$ = [$1]`],
      [`printlist ; expr`, `$$ = $1.concat([$3])`],
      [`printlist , expr`, `$$ = $1.concat([$3])`],
    ],

    exprlist: [
      [`expr`, `$$ = [$1]`],
      [`exprlist , expr`, `$$ = $1.concat([$3])`]
    ],

    varlist: [
      [`var`, `$$ = [$1]`],
      [`varlist , var`, `$$ = $1.concat([$3])`]
    ]
  }
}
