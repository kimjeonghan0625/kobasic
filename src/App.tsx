import { useRef, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
// @ts-expect-error typeerror can occur
import { PyCodeGen } from "@/transpiler/codegen/py-code-gen.js";

interface Pyodide {
  runPythonAsync: (code: string) => Promise<string>;
  // Pyodide가 제공하는 다른 메서드나 속성들도 여기에 추가할 수 있습니다.
}

function App() {
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const basicCodeRef = useRef<HTMLTextAreaElement>(null);
  const [pythonCode, setPythonCode] =
    useState("파이썬 코드가 여기에 출력됩니다.");
  const [executionResult, setExecutionResult] = useState(
    "코드 실행 결과가 여기에 출력됩니다."
  );

  const customPrompt = (message?: string) => {
    const out = (window as any).output as string;
    const userInput = window.prompt(message ? out + message : out + ""); // 메시지를 설정합니다.
    (window as any).output += message
      ? message + userInput + "\n"
      : "" + userInput + "\n";
    return userInput;
  };

  useEffect(() => {
    async function loadPyodide() {
      try {
        const pyodideInstance = await (window as any).loadPyodide();
        pyodideInstance.globals.set("input", (message?: string) => {
          return customPrompt(message);
        }); // Pyodide 로드
        setPyodide(pyodideInstance);
        (window as any).output = "";
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      }
    }

    loadPyodide(); // 컴포넌트가 마운트될 때 Pyodide를 로드합니다.
  }, []); // 빈 배열을 전달하여 컴포넌트가 처음 렌더링될 때만 실행

  useEffect(() => {
    if (pyodide) {
      // TypeScript에서 window 객체의 확장을 단언
      (window as any).send_output = (text: string) => {
        (window as any).output += text;
        // setExecutionResult((prev) => {
        //   if (prev === "코드 실행 결과가 여기에 출력됩니다.") {
        //     return (window as any).output;
        //   }
        //   return prev + (window as any).output;
        // });
      };
    }
  }, [pyodide]);

  function replaceSmartQuotes(text: string | undefined) {
    return text
      ?.replace(/[“”]/g, '"') // “ 와 ”를 "로 변환
      .replace(/[‘’]/g, "'"); // ‘ 와 ’를 '로 변환
  }

  async function runPythonCode(pyCode: string) {
    if (pyodide) {
      const script = `
import io
import sys
import js

class CustomStdout(io.StringIO):
    def write(self, message):
        if message:
            js.send_output(message)

sys.stdout = CustomStdout()

${pyCode}
      `;

      try {
        await pyodide.runPythonAsync(script);
        setExecutionResult((window as any).output);
        (window as any).output = "";
      } catch (e) {
        setExecutionResult(`파이썬 코드를 실행하는 과정에서 에러가 발생했습니다.\n\n에러 로그는 다음과 같습니다:\n${e}`);
      }
    } else {
      return "파이썬 실행환경이 아직 준비되지 않았습니다.";
    }
  }

  const handleTransformButtonClick = async () => {
    try {
      const pyCodeGen = new PyCodeGen();
      const basicCode = replaceSmartQuotes(basicCodeRef.current?.value);
      const pyCode = pyCodeGen.compile(basicCode);

      setPythonCode(pyCode);
      await runPythonCode(pyCode);
    } catch (e) {
      setPythonCode(
        `파이썬으로 코드를 변환하는 과정에서 에러가 발생했습니다. KoBasic 문법에 이상이 없는지 확인하세요.\n\n에러 로그는 다음과 같습니다:\n${e}`
      );
    }
  };

  return (
    <>
      <Card className="max-w-[768px] mx-auto mt-11 mb-14 shadow-lg max-lg:border-none max-lg:shadow-none">
        <CardHeader>
          <CardTitle>KoBasic to Python</CardTitle>
          <CardDescription>
            KoBasic 코드를 간단하게 Python으로 바꾸고, 실행해보세요!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>KoBasic 코드 입력</Label>
              <Textarea
                ref={basicCodeRef}
                rows={8}
                placeholder="KoBasic 코드를 적어주세요"
              />
            </div>
            <Button onClick={handleTransformButtonClick}>변환하기</Button>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
              <Label>Python 코드</Label>
              <Textarea rows={8} value={pythonCode} readOnly />
            </div>
            <div className="flex flex-col gap-2">
              <Label>코드 실행 결과</Label>
              <Textarea rows={8} value={executionResult} readOnly />
            </div>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}

export default App;
