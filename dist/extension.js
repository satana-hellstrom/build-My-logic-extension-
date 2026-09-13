"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var crypto = __toESM(require("crypto"));
var path = __toESM(require("path"));
var vscode = __toESM(require("vscode"));

// src/report.ts
function formatTeacherReport(result) {
  const heading = `Logic Analyser report \u2014 ${result.language}`;
  if (result.findings.length === 0) {
    return `${heading}

No supported logic patterns were found. This is not proof that the code has no logic issues; this prototype checks a small set of local rules.`;
  }
  const issues = result.findings.map((item, index) => `${index + 1}. ${item.category} on line ${item.line} (${item.severity})
What your code currently does: ${item.whatItDoes}
Why this may be a reasoning problem: ${item.whyItMayMatter}
Example: ${item.example}
Hint: ${item.hint}
Possible correction: ${item.possibleCorrection}`).join("\n\n");
  return `${heading}

${issues}`;
}

// src/analysis/pythonRules.ts
var comparison = /^\s*(\w+)\s*(==|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/;
var makeFinding = (line, category, severity, whatItDoes, whyItMayMatter, example, hint, possibleCorrection, patterns) => ({ line, category, severity, whatItDoes, whyItMayMatter, example, hint, possibleCorrection, patterns });
function parseComparison(text) {
  const match = text.match(comparison);
  return match ? { variable: match[1], operator: match[2], value: Number(match[3]) } : void 0;
}
function parseCompound(line) {
  const match = line.match(/^\s*(?:if|elif)\s+(.+?)\s+(and|or)\s+(.+?)\s*:\s*(?:#.*)?$/);
  if (!match) {
    return void 0;
  }
  const left = parseComparison(match[1]);
  const right = parseComparison(match[3]);
  return left && right && left.variable === right.variable ? { left, joiner: match[2], right } : void 0;
}
function bounds(c) {
  const values = [c.left, c.right];
  return { lower: values.find((value) => value.operator === ">" || value.operator === ">="), upper: values.find((value) => value.operator === "<" || value.operator === "<=") };
}
function impossibleAnd(c) {
  if (c.left.operator === "==" && c.right.operator === "==" && c.left.value !== c.right.value) {
    return true;
  }
  const { lower, upper } = bounds(c);
  return Boolean(lower && upper && (lower.value > upper.value || lower.value === upper.value && (lower.operator === ">" || upper.operator === "<")));
}
function alwaysTrueOr(c) {
  const { lower, upper } = bounds(c);
  return Boolean(lower && upper && (lower.value < upper.value || lower.value === upper.value && (lower.operator === ">=" || upper.operator === "<=")));
}
function compoundFindings(line, number, findings) {
  const c = parseCompound(line);
  if (!c) {
    return;
  }
  if (c.joiner === "and" && impossibleAnd(c)) {
    findings.push(makeFinding(number, "Possible logic issue", "warning", `Your condition requires ${c.left.variable} to satisfy contradictory comparisons at the same time.`, "This condition cannot be true, so its branch will never run.", "No number can be both greater than 18 and less than 10.", "Can one value meet both requirements?", 'Check whether you meant "or" instead of "and", or whether a boundary is wrong.', ["and-or-confusion"]));
  }
  if (c.joiner === "or" && alwaysTrueOr(c)) {
    findings.push(makeFinding(number, "Possible logic issue", "warning", 'For normal numeric values, at least one side of this "or" condition is true.', `The condition may always be true, so an else branch may never run. Exact behavior still depends on ${c.left.variable}'s type.`, "Every number is either greater than 10 or less than 20.", "What number would make both sides false?", 'Check whether you meant "and" to describe a range.', ["and-or-confusion"]));
  }
}
function simpleFindings(lines, index, findings) {
  const line = lines[index];
  const number = index + 1;
  const booleanMatch = line.match(/^\s*(?:if|elif)\s+(\w+)\s*==\s*(True|False)\s*:/);
  if (booleanMatch) {
    const [, variable, value] = booleanMatch;
    findings.push(makeFinding(number, "Suggestion", "hint", `Your condition explicitly compares ${variable} with ${value}.`, "This is valid Python, but a direct boolean condition is usually easier to read.", `Use "if ${variable}:" for a true check.`, "Is this variable already a boolean?", value === "True" ? `Consider "if ${variable}:".` : `Consider "if not ${variable}:".`, []));
  }
  const literalMatch = line.match(/^\s*if\s+(True|False)\s*:/);
  if (literalMatch) {
    const truth = literalMatch[1] === "True";
    findings.push(makeFinding(number, "Learning opportunity", "information", `This condition is always ${truth ? "true" : "false"}.`, truth ? "A paired else branch can never run." : "The body of this if statement can never run.", '"if False:" always skips its body.', "Is this temporary code, or should it depend on a value?", truth ? "Remove the condition or replace it with a real check." : "Replace it with the intended condition or remove unreachable code.", []));
  }
  const condition = line.match(/^\s*(?:if|elif)\s+(\w+)\s*(>=|>)\s*(\d+)/);
  if (condition && /under|minor|less than|below/.test(lines[index - 1]?.toLowerCase() ?? "")) {
    findings.push(makeFinding(number, "Possible logic issue", "warning", `The comment describes being under ${condition[3]}, while the condition checks ${condition[1]} ${condition[2]} ${condition[3]}.`, "The code and comment appear to describe opposite groups.", "# Check if the user is under 18 followed by if age >= 18: checks adults.", "Does the comparison match the group named in the comment?", 'Review the comment and boundary; an "under" check may need < or <=.', ["reversed-condition"]));
  }
  const reversed = line.match(/^\s*if\s+(\w+)\s*>=\s*18\s*:/);
  const nearby = lines.slice(index + 1, index + 8).join("\n").toLowerCase();
  const body = lines.slice(index + 1, index + 4).join("\n").toLowerCase();
  if (reversed && /print\s*\(\s*["'].*minor/.test(body) && /else\s*:/.test(nearby) && /print\s*\(\s*["'].*adult/.test(nearby)) {
    findings.push(makeFinding(number, "Possible logic issue", "warning", `When ${reversed[1]} is 18 or more, the first branch prints "Minor"; otherwise it prints "Adult".`, "Those labels look reversed for the condition being checked.", 'At age 20, this code prints "Minor".', "Trace one adult age and one younger age through the branches.", "Swap the messages, or reverse the comparison if the labels express your intent.", ["reversed-condition"]));
  }
}
function analysePython(code) {
  const lines = code.split(/\r?\n/);
  const findings = [];
  lines.forEach((line, index) => {
    compoundFindings(line, index + 1, findings);
    simpleFindings(lines, index, findings);
  });
  return { language: "Python", findings };
}

// src/questions/localQuestions.ts
var localPythonQuestions = [
  {
    id: "voting-eligibility",
    title: "Voting Eligibility",
    language: "python",
    difficulty: "Easy",
    description: "Write a program that decides whether a person can vote.",
    tags: ["Conditionals", "Input"],
    requirements: ["Read an age as a number.", 'Print "Eligible" for ages 18 and over.', 'Print "Not eligible" for younger ages.'],
    starterCode: 'age = int(input("Enter your age: "))\n# Write your condition below\n',
    tests: [{ name: "Adult voter", description: "Age 18 is eligible." }, { name: "Younger voter", description: "Age 17 is not eligible." }]
  },
  {
    id: "cli-calculator",
    title: "Build a CLI Calculator",
    language: "python",
    difficulty: "Easy",
    description: "Create a simple command-line calculator using Python.",
    tags: ["Input/Output", "Functions", "Conditionals"],
    requirements: ["Accept two numbers and an operation.", "Support addition, subtraction, multiplication, and division.", "Handle division by zero clearly."],
    starterCode: "def calculate(first, operation, second):\n    # Return the answer\n    pass\n",
    tests: [{ name: "Addition", description: "2 + 3 returns 5." }, { name: "Zero division", description: "Division by zero is handled." }]
  },
  {
    id: "number-guessing",
    title: "Number Guessing Game",
    language: "python",
    difficulty: "Medium",
    description: "Build a loop that lets a player guess a secret number.",
    tags: ["Loops", "Conditionals", "Input"],
    requirements: ["Store a secret number.", "Keep asking until the guess is correct.", "Tell the player whether a wrong guess is too high or too low."],
    starterCode: "secret_number = 7\n# Ask for guesses here\n"
  },
  {
    id: "even-or-odd",
    title: "Even or Odd",
    language: "python",
    difficulty: "Easy",
    description: "Classify a number as even or odd.",
    tags: ["Operators", "Conditionals"],
    requirements: ["Read an integer.", "Use the modulo operator.", 'Print either "Even" or "Odd".'],
    starterCode: 'number = int(input("Enter a number: "))\n'
  },
  {
    id: "grade-calculator",
    title: "Grade Calculator",
    language: "python",
    difficulty: "Medium",
    description: "Convert a score into a letter grade.",
    tags: ["Conditionals", "Ranges"],
    requirements: ["Read a score from 0 to 100.", "Assign grades A through F using sensible ranges.", "Reject scores outside the valid range."],
    starterCode: 'score = int(input("Score: "))\n# Decide the grade\n'
  }
];

// src/providers/localProviders.ts
var failure = (code, message, cause) => ({ ok: false, error: { code, message, cause } });
var LocalQuestionProvider = class {
  constructor(questions = localPythonQuestions) {
    this.questions = questions;
  }
  questions;
  async listQuestions() {
    return this.questions.length ? { ok: true, value: [...this.questions] } : failure("EMPTY_CATALOGUE", "No local learning questions are available.");
  }
  async getQuestion(id) {
    const question = this.questions.find((item) => item.id === id);
    return question ? { ok: true, value: question } : failure("NOT_FOUND", `Question "${id}" was not found.`);
  }
  async generateQuestion(request) {
    if (request.language !== "python") {
      return failure("INVALID_REQUEST", "The local provider currently supports Python only.");
    }
    const filtered = this.questions.filter((question) => (!request.difficulty || question.difficulty === request.difficulty) && (!request.tags?.length || request.tags.every((tag) => question.tags.includes(tag))));
    return filtered[0] ? { ok: true, value: filtered[0] } : failure("NOT_FOUND", "No local question matches that request.");
  }
};
var LocalFeedbackProvider = class {
  async analyzeCode(code) {
    try {
      const analysis = analysePython(code);
      return { ok: true, value: { summary: analysis.findings.length ? "Local Python rules found possible learning opportunities." : "Local Python rules found no issues in this selection.", analysis, source: "local-rules" } };
    } catch (cause) {
      return failure("ANALYSIS_FAILED", "The local Python analyser could not process this code.", cause);
    }
  }
  async generateHint(question) {
    return { ok: true, value: { text: question.requirements[0] ?? "Break the problem into a small first step.", source: "local" } };
  }
};

// src/questions/questionSession.ts
var QuestionSession = class {
  constructor(provider) {
    this.provider = provider;
  }
  provider;
  questions = [];
  currentIndex = -1;
  async load() {
    const response = await this.provider.listQuestions();
    if (!response.ok) {
      return response;
    }
    this.questions = response.value;
    this.currentIndex = this.questions.length ? 0 : -1;
    return { ok: true, value: this.currentQuestion() };
  }
  async next() {
    if (!this.questions.length) {
      return { ok: true, value: void 0 };
    }
    this.currentIndex = (this.currentIndex + 1) % this.questions.length;
    return { ok: true, value: this.currentQuestion() };
  }
  currentQuestion() {
    return this.questions[this.currentIndex];
  }
};

// src/extension.ts
var commandId = "logic-analyser.analyzeMyCode";
var viewId = "buildMyLogic.sidebar";
var looksLikePython = (code) => /(^|\n)\s*(?:if|elif|def|for|while|class|import)\b/.test(code) || /:\s*(?:#.*)?(?:\n|$)/.test(code);
var BuildMyLogicViewProvider = class {
  constructor(analyseCode) {
    this.analyseCode = analyseCode;
  }
  analyseCode;
  view;
  questions = new QuestionSession(new LocalQuestionProvider());
  feedback = new LocalFeedbackProvider();
  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.render(view.webview);
    view.webview.onDidReceiveMessage(async (message) => {
      if (!isViewMessage(message)) {
        return;
      }
      try {
        switch (message.command) {
          case "newQuestion":
            this.updateQuestion(await this.questions.next());
            break;
          case "analyze": {
            const result = await this.analyseCode();
            this.post({ type: "feedback", text: result.feedback ?? result.message, level: result.ok ? "feedback" : "error" });
            break;
          }
          case "hint":
            await this.showHint();
            break;
          case "runTests":
            this.post({ type: "tests", passed: 4, total: 4 });
            this.postStatus("Local demo tests passed. Real Python test execution will be connected later.", "info");
            break;
          case "submit":
            this.postStatus("GitHub and website submission will be implemented later.", "info");
            break;
        }
      } catch (error) {
        console.error("BuildMyLogic webview action failed.", error);
        this.postStatus("An action failed. Open the Extension Host console for details.", "error");
      }
    });
    void this.initialise();
  }
  async initialise() {
    try {
      this.post({ type: "baseProgram", program: await findBaseProgram() });
      this.updateQuestion(await this.questions.load());
    } catch (error) {
      console.error("BuildMyLogic could not initialise the sidebar.", error);
      this.postStatus("Local data could not be loaded. Open the Extension Host console for details.", "error");
    }
  }
  async showHint() {
    const question = this.questions.currentQuestion();
    if (!question) {
      this.postStatus("No question loaded yet.", "error");
      return;
    }
    const result = await this.feedback.generateHint(question);
    if (result.ok) {
      this.post({ type: "feedback", text: "Hint: " + result.value.text, level: "hint" });
    } else {
      this.postStatus(result.error.message, "error");
    }
  }
  updateQuestion(result) {
    if (!result.ok) {
      this.postStatus(result.error.message, "error");
      return;
    }
    this.post({ type: "question", question: result.value });
  }
  postStatus(text, level) {
    this.post({ type: "status", text, level });
  }
  post(message) {
    void this.view?.webview.postMessage(message);
  }
  render(webview) {
    const nonce = crypto.randomBytes(16).toString("base64");
    const csp = "default-src 'none'; style-src " + webview.cspSource + " 'unsafe-inline'; script-src 'nonce-" + nonce + "';";
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="' + csp + '"><style>body{background:var(--vscode-sideBar-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);margin:0;padding:12px}*{box-sizing:border-box}h1{font-size:20px;margin:0}h2{font-size:15px;margin:0 0 8px}h3{font-size:13px;margin:12px 0 6px}p{line-height:1.45;margin:6px 0}.subtitle,.muted{color:var(--vscode-descriptionForeground)}.header-row{align-items:center;display:flex;justify-content:space-between}.local{background:var(--vscode-badge-background);border-radius:10px;color:var(--vscode-badge-foreground);font-size:11px;padding:3px 7px}.tabs{border-bottom:1px solid var(--vscode-panel-border);display:flex;margin:16px -12px 12px;padding:0 8px}.tab{background:transparent;border:0;border-bottom:2px solid transparent;color:var(--vscode-descriptionForeground);cursor:pointer;flex:1;padding:8px 3px}.tab.active{border-bottom-color:#a855f7;color:var(--vscode-foreground);font-weight:600}.panel[hidden]{display:none}.card{background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:7px;margin:10px 0;padding:11px}.empty{border-style:dashed}.badge{background:var(--vscode-badge-background);border-radius:9px;color:var(--vscode-badge-foreground);display:inline-block;font-size:11px;margin:3px 4px 0 0;padding:3px 7px}.difficulty{background:var(--vscode-testing-iconPassed);color:var(--vscode-editor-background)}.label{color:var(--vscode-descriptionForeground);display:block;font-size:11px;margin-top:8px;text-transform:uppercase}.value{overflow-wrap:anywhere}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}.progress-track{background:var(--vscode-progressBar-background);border-radius:6px;height:8px;overflow:hidden}.progress-fill{background:#a855f7;border-radius:6px;height:100%;transition:width .2s;width:0}.tip{border-color:#a855f7}.actions button,.button{background:var(--vscode-button-background);border:0;border-radius:3px;color:var(--vscode-button-foreground);cursor:pointer;margin-top:7px;padding:8px;text-align:left;width:100%}.actions button:hover,.button:hover{background:var(--vscode-button-hoverBackground)}.secondary{background:var(--vscode-button-secondaryBackground)!important;color:var(--vscode-button-secondaryForeground)!important}.test-row{align-items:center;border-top:1px solid var(--vscode-panel-border);display:flex;gap:7px;padding:9px 0}.test-row:first-of-type{border-top:0}.test-state{margin-left:auto}.passed{color:var(--vscode-testing-iconPassed)}.metrics{display:grid;gap:7px;grid-template-columns:repeat(3,1fr)}.metric{background:var(--vscode-textBlockQuote-background);border-radius:4px;padding:8px}.metric strong{display:block;font-size:16px}.chart{align-items:end;display:flex;gap:5px;height:110px}.bar-wrap{align-items:center;display:flex;flex:1;flex-direction:column;height:100%;justify-content:end}.bar{background:#a855f7;border-radius:4px 4px 0 0;max-width:24px;width:100%}.bar-label{color:var(--vscode-descriptionForeground);font-size:10px;margin-top:4px}.feedback{min-height:70px;white-space:pre-wrap}.error{color:var(--vscode-errorForeground)}.hint{border-color:var(--vscode-editorInfo-foreground)}#status{min-height:18px}.fatal{background:var(--vscode-inputValidation-errorBackground);border-color:var(--vscode-inputValidation-errorBorder)}</style></head><body><header><div class="header-row"><h1>BuildMyLogic</h1><span class="local">Local mode</span></div><p class="subtitle">Learn programming by solving problems.</p></header><nav class="tabs" aria-label="BuildMyLogic sections"><button class="tab active" data-tab="challenge">Challenge</button><button class="tab" data-tab="tests">Tests</button><button class="tab" data-tab="feedback">Feedback</button><button class="tab" data-tab="progress">Progress</button></nav><main><section class="panel" data-panel="challenge"><div class="card"><h2>Base program</h2><span class="label">Workspace</span><div id="workspace" class="value muted">No workspace open</div><span class="label">Python file</span><div id="pythonFile" class="value muted">Create or open a Python file to begin.</div></div><div id="challengeCard" class="card empty"><h2>Challenge</h2><p class="muted">No question loaded.</p></div><div class="card"><h2>\u{1F3AF} Task</h2><p>Build a simple command-line calculator.</p><ul><li>Addition (+)</li><li>Subtraction (-)</li><li>Multiplication (*)</li><li>Division (/)</li></ul><p class="muted">\u{1F4A1} Don\u2019t follow a tutorial. Build it yourself!</p></div><div class="card"><h2>Progress</h2><p id="progressText">0 / 4 tests passed</p><div class="progress-track"><div id="progressFill" class="progress-fill"></div></div></div><div class="card tip"><h2>\u{1F4A1} Tip</h2><p>Focus on logic, problem solving and clean code. Try to handle edge cases too.</p></div><div class="actions"><button id="runTests">Run Tests Locally</button><button id="submit" class="secondary">Submit to BuildMyLogic</button><button id="newQuestion" class="secondary">New Question</button></div></section><section class="panel" data-panel="tests" hidden><div class="card"><h2>Test Results</h2><p id="testSummary" class="muted">0 / 4 tests passed \u2014 local demo only.</p><div id="testRows"></div><p class="muted">Demo results only. Real Python test execution will be connected later.</p><button id="runTestsAgain" class="button">Run Tests Locally</button></div></section><section class="panel" data-panel="feedback" hidden><div id="feedbackCard" class="card empty"><h2>\u{1F9D1}\u200D\u{1F3EB} Teacher Feedback</h2><div id="feedback" class="feedback muted">Select Python code in the editor and choose \u201CAnalyze My Code\u201D to receive feedback.</div><button id="analyze" class="button">Analyze My Code</button><button id="hint" class="button secondary">Show Hint</button></div></section><section class="panel" data-panel="progress" hidden><div class="card"><h2>Learning progress</h2><div class="metrics"><div class="metric"><strong id="metricTests">0</strong><span>Tests passed</span></div><div class="metric"><strong id="metricChallenge">1</strong><span>Current challenge</span></div><div class="metric"><strong>0</strong><span>Completed challenges</span></div></div></div><div class="card"><h2>Weekly activity</h2><div class="chart"><div class="bar-wrap"><div class="bar" style="height:25%"></div><span class="bar-label">Mon</span></div><div class="bar-wrap"><div class="bar" style="height:45%"></div><span class="bar-label">Tue</span></div><div class="bar-wrap"><div class="bar" style="height:20%"></div><span class="bar-label">Wed</span></div><div class="bar-wrap"><div class="bar" style="height:70%"></div><span class="bar-label">Thu</span></div><div class="bar-wrap"><div class="bar" style="height:35%"></div><span class="bar-label">Fri</span></div><div class="bar-wrap"><div class="bar" style="height:55%"></div><span class="bar-label">Sat</span></div><div class="bar-wrap"><div class="bar" style="height:15%"></div><span class="bar-label">Sun</span></div></div><p class="muted">This chart uses local placeholder data for now. Real progress tracking will be connected later.</p></div></section></main><p id="status" class="muted" aria-live="polite"></p><script nonce="' + nonce + `">(()=>{try{const vscode=acquireVsCodeApi(),byId=id=>document.getElementById(id),state={passed:0,total:4,tests:["Addition works","Subtraction works","Multiplication works","Division handles zero"]},escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\\"":"&quot;"}[char]));function switchTab(name){document.querySelectorAll(".tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.tab===name));document.querySelectorAll(".panel").forEach(panel=>panel.hidden=panel.dataset.panel!==name)}function updateProgress(){const label=state.passed+" / "+state.total+" tests passed";byId("progressText").textContent=label;byId("testSummary").textContent=label+" \u2014 local demo only.";byId("progressFill").style.width=(state.passed/state.total*100)+"%";byId("metricTests").textContent=state.passed;byId("testRows").innerHTML=state.tests.map((test,index)=>"<div class=\\"test-row\\"><span class=\\"passed\\">"+(index<state.passed?"\u2713":"\u25CB")+"</span><span>"+escapeHtml(test)+"</span><span class=\\"test-state "+(index<state.passed?"passed":"muted")+"\\">"+(index<state.passed?"Passed":"Pending")+"</span></div>").join("")}function showFeedback(text,level){const card=byId("feedbackCard"),target=byId("feedback");card.className="card";target.textContent=text;target.className="feedback "+(level==="error"?"error":level==="hint"?"hint":"");switchTab("feedback")}function showStatus(text,level){const target=byId("status");target.textContent=text;target.className=level==="error"?"error":"muted"}function showQuestion(item){const target=byId("challengeCard");if(!item){target.className="card empty";target.innerHTML="<h2>Challenge</h2><p class=\\"muted\\">No question loaded.</p>";return}const tags=item.tags.map(tag=>"<span class=\\"badge\\">"+escapeHtml(tag)+"</span>").join("");target.className="card";target.innerHTML="<span class=\\"badge difficulty\\">"+escapeHtml(item.difficulty)+"</span><h2>"+escapeHtml(item.title)+"</h2><p>"+escapeHtml(item.description)+"</p><div>"+tags+"</div>";byId("metricChallenge").textContent="1"}document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>switchTab(tab.dataset.tab)));[["runTests","runTests"],["runTestsAgain","runTests"],["newQuestion","newQuestion"],["analyze","analyze"],["hint","hint"],["submit","submit"]].forEach(([id,command])=>byId(id).addEventListener("click",()=>vscode.postMessage({command})));window.addEventListener("message",event=>{const message=event.data||{};if(message.type==="question"){showQuestion(message.question)}else if(message.type==="baseProgram"){byId("workspace").textContent=message.program.workspace;byId("workspace").className="value";byId("pythonFile").textContent=message.program.pythonFile||"Create or open a Python file to begin.";byId("pythonFile").className=message.program.pythonFile?"value":"value muted"}else if(message.type==="tests"){state.passed=message.passed;state.total=message.total;updateProgress();switchTab("tests")}else if(message.type==="feedback"){showFeedback(message.text,message.level)}else if(message.type==="status"){showStatus(message.text,message.level)}});window.addEventListener("error",event=>{byId("feedbackCard").className="card fatal";byId("feedback").textContent="The BuildMyLogic interface encountered an error. Open Developer Tools for details.";console.error(event.error||event.message)});updateProgress()}catch(error){const target=document.getElementById("status");target.textContent="The BuildMyLogic interface could not start. Open Developer Tools for details.";target.className="error";console.error(error)}})();</script></body></html>`;
  }
};
function isViewMessage(value) {
  return typeof value === "object" && value !== null && "command" in value && ["newQuestion", "analyze", "hint", "runTests", "submit"].includes(String(value.command));
}
async function findBaseProgram() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return { workspace: "No workspace open" };
  }
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.languageId === "python") {
    return { workspace: folder.name, pythonFile: editor.document.uri.fsPath };
  }
  const files = await vscode.workspace.findFiles("**/*.py", "**/{node_modules,.git,venv,.venv}/**", 1);
  return { workspace: folder.name, pythonFile: files[0] ? path.relative(folder.uri.fsPath, files[0].fsPath) : void 0 };
}
function activate(context) {
  const output = vscode.window.createOutputChannel("Logic Analyser");
  const feedback = new LocalFeedbackProvider();
  const analyze = async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        const message = "Select Python code first, then choose Analyze My Code.";
        void vscode.window.showWarningMessage("BuildMyLogic: " + message);
        return { ok: false, message };
      }
      const selected = editor.document.getText(editor.selection);
      if (editor.document.languageId !== "python" && !looksLikePython(selected)) {
        const message = "The local analyser currently supports selected Python code.";
        void vscode.window.showWarningMessage("BuildMyLogic: " + message);
        return { ok: false, message };
      }
      const result = await feedback.analyzeCode(selected);
      if (!result.ok) {
        void vscode.window.showErrorMessage(result.error.message);
        return { ok: false, message: result.error.message };
      }
      result.value.analysis.findings.forEach((finding) => {
        finding.line += editor.selection.start.line;
      });
      const report = formatTeacherReport(result.value.analysis);
      output.clear();
      output.appendLine(report);
      output.show(true);
      return { ok: true, message: result.value.summary, feedback: report };
    } catch (error) {
      console.error("BuildMyLogic analysis failed.", error);
      return { ok: false, message: "BuildMyLogic could not analyse this selection. Please try again." };
    }
  };
  const command = vscode.commands.registerCommand(commandId, analyze);
  context.subscriptions.push(command, output, vscode.window.registerWebviewViewProvider(viewId, new BuildMyLogicViewProvider(analyze)));
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
