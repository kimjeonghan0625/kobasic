import kobParser from "../parser/kob-parser"

export class PyCodeGen {
  //  indent는 파이썬 코드에서 들여쓰기를 몇 칸 할 것인지 결정한다
  constructor() {
    this.indent = 4;
    this.forStack = []; // [forLineNum, forStmtCode]
    this.linesInFor = [];
    this.midList = [];
    this.isInputUsed = false;
    this.isGotoUsed = false;
    this.isGosubUsed = false;
  }

  /**
   * @param {string} kobCode
   * compile 메서드는 kobasic 코드를 인풋으로 받아, 파이썬 코드로 컴파일하고 반환하는 기능을 한다.
   */
  compile(kobCode) {
    const lines = kobCode
      .trim()
      .split("\n")
      .filter((e) => e);
    const ast = lines.map((l) => kobParser.parse(l));
    this.lineNums = [];
    ast.forEach((l) => this.lineNums.push(Number(l.number)));
    const pyCode = this.genPyCode(ast);
    return pyCode;
  }

  // 생성 로직
  genPyCode(ast) {
    let indent = " ".repeat(this.indent);

    ast.forEach((l) => this.genStmt(l));
    const mid = this.midList.join("\n\n");

    const filteredLineNums = this.lineNums.filter(
      (lnum) => !this.linesInFor.includes(lnum)
    );

    let top = `def main():\n${indent}try:\n`;
    filteredLineNums.forEach((lnum) => {
      top += `${indent.repeat(2)}stmt${lnum}()\n`;
    });
    top += `${indent}except End:\n${indent.repeat(2)}return\n${
      this.isGosubUsed
        ? `${indent}except GosubReturn:\n${indent.repeat(
            2
          )}print("'반환'은 '서브루틴'과 함께 사용되어야 합니다.")\n${indent.repeat(
            2
          )}return\n`
        : ""
    }\n${
      this.isGotoUsed || this.isGosubUsed ? "lines = {}\n" : ""
    }vars = {}\n\n`;

    let tail = `\n
# 내장 함수 및 예외 Inner Function and Exception
${
  this.isInputUsed
    ? `
def is_integer(s):
    try:
        int(s)
        return True
    except ValueError:
        return False

def is_float(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

def convert_type(s):
    if is_integer(s):
        return int(s)
    elif is_float(s):
        return float(s)
    else:
        return s
`
    : ""
}${
      this.isGotoUsed || this.isGosubUsed
        ? `
linenums = [${this.lineNums.join(", ")}]
for l in linenums:
    lines[l] = eval(f"stmt{l}")

def goto(from_line, to_line):
    if from_line > to_line:
        linenums_goto_use = linenums[
            linenums.index(to_line) : linenums.index(from_line) + 1
        ]
        for linenum in linenums_goto_use:
            lines[linenum]()
    else:
        linenums_goto_use = linenums[linenums.index(to_line) :]
        for linenum in linenums_goto_use:
            lines[linenum]()
        raise End()
`
        : ""
    }${
      this.isGosubUsed
        ? `
def gosub(from_line, to_line):
    try:
        goto(from_line, to_line)
    except:
        return

class GosubReturn(Exception):
    pass
`
        : ""
    }
class End(Exception):
    pass


# 프로그램 실행

main()
`;
    return top + mid + tail;
  }

  genStmt(l) {
    this.currentLine = Number(l.number);
    if (this.forStack.length > 0) {
      this.midList[
        this.forStack[this.forStack.length - 1]
      ] += `\n        stmt${this.currentLine}()`;
      this.linesInFor.push(this.currentLine);
    }
    let header = `def stmt${this.currentLine}():\n`;
    let body = l.stmts.map((exp) => this.gen(exp)).join("\n");
    let indented_body = body
      .split("\n")
      .filter((e) => e)
      .map((l) => `    ${l}`)
      .join("\n");
    this.midList.push(header + indented_body);
  }

  gen(exp) {
    if (this[exp.type] == null) {
      throw `Unexpected expression: "${exp.type}."`;
    }
    return this[exp.type](exp);
  }

  // 원자 타입 (NUMBER, STRING)
  NUMBER(exp) {
    return `${exp.value}`;
  }

  STRING(exp) {
    return `${exp.value}`;
  }

  // 변수명
  VARIABLE_NAME(exp) {
    if (!exp["args"]) {
      return `vars["${exp.name}"]`;
    } else {
      return `vars["${exp.name}"]${exp.args
        .map((a) => `[${this.gen(a)}]`)
        .join("")}`;
    }
  }

  // 배열 선언 DIM
  DIM(exp) {
    let left = `vars["${exp.var}"] = `;
    let right = `[0] * ${this.gen(exp.dimension.pop())}`;
    let popped = "";
    while ((popped = exp.dimension.pop())) {
      right = `[${right}] * ${this.gen(popped)}`;
    }
    return left + right + "\n";
  }

  // 할당 문법 (LET, ASSIGN)
  LET(exp) {
    return `${this.gen(exp.var)} = ${this.gen(exp.expr)}\n`;
  }

  ASSIGN(exp) {
    return `${this.gen(exp.var)} = ${this.gen(exp.expr)}\n`;
  }

  // 주석 문법 REM
  REM(exp) {
    let rem = "";
    rem += `# ${exp.comment}\n`;
    rem += `pass\n`;
    return rem;
  }

  // 종료 문법
  END(exp) {
    return `raise End()\n`;
  }

  // 연산자 Operator
  // unary (NEG, NOT)
  NEG(exp) {
    return `-${this.gen(exp.expr)}`;
  }

  NOT(exp) {
    return `not ${this.gen(exp.expr)}`;
  }

  // binary (ADD, SUB, CONCAT, MUL, DIV, POW, AND, OR, CMP_EQ, CMP_LT, CMP_GT, CMP_LE, CMP_GE, CMP_NE, CMP_HASH)
  ADD(exp) {
    return this._makeBinary(exp, "+");
  }
  SUB(exp) {
    return this._makeBinary(exp, "-");
  }
  CONCAT(exp) {
    return this._makeBinary(exp, "&");
  }
  MUL(exp) {
    return this._makeBinary(exp, "*");
  }
  DIV(exp) {
    return this._makeBinary(exp, "/");
  }
  POW(exp) {
    return this._makeBinary(exp, "^");
  }
  AND(exp) {
    return this._makeBinary(exp, "and");
  }
  OR(exp) {
    return this._makeBinary(exp, "or");
  }
  CMP_EQ(exp) {
    return this._makeBinary(exp, "==");
  }
  CMP_LT(exp) {
    return this._makeBinary(exp, "<");
  }
  CMP_GT(exp) {
    return this._makeBinary(exp, ">");
  }
  CMP_LE(exp) {
    return this._makeBinary(exp, "<=");
  }
  CMP_GE(exp) {
    return this._makeBinary(exp, ">=");
  }
  CMP_NE(exp) {
    return this._makeBinary(exp, "!=");
  }

  // 출력 PRINT
  PRINT(exp) {
    return `${exp.printlist
      .map((e) => `print(${this.gen(e)}, end="")`)
      .join("\n")}\nprint()\n`;
  }

  // 입력 INPUT
  INPUT(exp) {
    this.isInputUsed = true;
    return `${exp.varlist
      .map((e) => {
        return `${this.gen(e)} = convert_type(input(${
          exp.prompt ? exp.prompt : ""
        }))`;
      })
      .join("\n")}\n`;
  }

  // 이동 GOTO
  GOTO(exp) {
    this.isGotoUsed = true;
    return `goto(${this.currentLine}, ${Number(exp.number)})\n`;
  }

  // 서브 GOSUB & 반환 RETURN
  GOSUB(exp) {
    this.isGosubUsed = true;
    return `gosub(${this.currentLine}, ${Number(exp.number)})\n`;
  }

  RETURN(exp) {
    return `raise GosubReturn()\n`;
  }

  // 만약 IF 참이면 THEN
  IF(exp) {
    return `if ${this.gen(exp.expr)}:
${this.gen(exp.action)
  .split("\n")
  .map((e) => {
    return this._ind(this.indent) + e.trim();
  })
  .join("\n")}`;
  }

  // 반복문: 반복 FOR 까지 TO 증가분[단계?] STEP
  FOR(exp) {
    const g = this.gen.bind(this);
    let code = `for ${g(exp.var)} in range(${g(exp.start)}, ${
      Number(g(exp.end)) + 1
    }${exp.step ? `, ${g(exp.step)}` : ""}):`;
    this.forStack.push(this.midList.length); // this.midList.length는 midList에서 for문을 담고 있는 문장함수의 인덱스가 됨.
    return code;
  }

  // 다음 NEXT
  NEXT(exp) {
    try {
      let i = exp.varlist.length;
      while (i > 0) {
        this.forStack.pop();
        i--;
      }
    } catch (e) {
      console.log(e);
    }
    return `pass`;
  }

  // 헬퍼 함수
  _makeBinary(exp, op) {
    return `(${this.gen(exp.left)} ${op} ${this.gen(exp.right)})`;
  }

  _ind(ind) {
    return " ".repeat(ind);
  }

  _header(exp) {
    return `\ndef stmt${exp.lineNum}():\n`;
  }
}