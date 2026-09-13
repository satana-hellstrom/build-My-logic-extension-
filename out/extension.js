"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const report_1 = require("./report");
const localProviders_1 = require("./providers/localProviders");
const questionSession_1 = require("./questions/questionSession");
const commandId = 'logic-analyser.analyzeMyCode';
const viewId = 'buildMyLogic.sidebar';
const looksLikePython = (code) => /(^|\n)\s*(?:if|elif|def|for|while|class|import)\b/.test(code) || /:\s*(?:#.*)?(?:\n|$)/.test(code);
class BuildMyLogicViewProvider {
    analyseCode;
    view;
    questions = new questionSession_1.QuestionSession(new localProviders_1.LocalQuestionProvider());
    feedback = new localProviders_1.LocalFeedbackProvider();
    constructor(analyseCode) {
        this.analyseCode = analyseCode;
    }
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
                    case 'newQuestion':
                        this.updateQuestion(await this.questions.next());
                        break;
                    case 'analyze': {
                        const result = await this.analyseCode();
                        this.post({ type: 'feedback', text: result.feedback ?? result.message, level: result.ok ? 'feedback' : 'error' });
                        break;
                    }
                    case 'hint':
                        await this.showHint();
                        break;
                    case 'runTests':
                        this.post({ type: 'tests', passed: 4, total: 4 });
                        this.postStatus('Local demo tests passed. Real Python test execution will be connected later.', 'info');
                        break;
                    case 'submit':
                        this.postStatus('GitHub and website submission will be implemented later.', 'info');
                        break;
                }
            }
            catch (error) {
                console.error('BuildMyLogic webview action failed.', error);
                this.postStatus('An action failed. Open the Extension Host console for details.', 'error');
            }
        });
        void this.initialise();
    }
    async initialise() {
        try {
            this.post({ type: 'baseProgram', program: await findBaseProgram() });
            this.updateQuestion(await this.questions.load());
        }
        catch (error) {
            console.error('BuildMyLogic could not initialise the sidebar.', error);
            this.postStatus('Local data could not be loaded. Open the Extension Host console for details.', 'error');
        }
    }
    async showHint() {
        const question = this.questions.currentQuestion();
        if (!question) {
            this.postStatus('No question loaded yet.', 'error');
            return;
        }
        const result = await this.feedback.generateHint(question);
        if (result.ok) {
            this.post({ type: 'feedback', text: 'Hint: ' + result.value.text, level: 'hint' });
        }
        else {
            this.postStatus(result.error.message, 'error');
        }
    }
    updateQuestion(result) {
        if (!result.ok) {
            this.postStatus(result.error.message, 'error');
            return;
        }
        this.post({ type: 'question', question: result.value });
    }
    postStatus(text, level) { this.post({ type: 'status', text, level }); }
    post(message) { void this.view?.webview.postMessage(message); }
    render(webview) {
        const nonce = crypto.randomBytes(16).toString('base64');
        const csp = 'default-src ' + "'none'" + '; style-src ' + webview.cspSource + ' ' + "'unsafe-inline'" + '; script-src ' + "'nonce-" + nonce + "'" + ';';
        return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="' + csp + '"><style>' +
            'body{background:var(--vscode-sideBar-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);margin:0;padding:12px}*{box-sizing:border-box}h1{font-size:20px;margin:0}h2{font-size:15px;margin:0 0 8px}h3{font-size:13px;margin:12px 0 6px}p{line-height:1.45;margin:6px 0}.subtitle,.muted{color:var(--vscode-descriptionForeground)}.header-row{align-items:center;display:flex;justify-content:space-between}.local{background:var(--vscode-badge-background);border-radius:10px;color:var(--vscode-badge-foreground);font-size:11px;padding:3px 7px}.tabs{border-bottom:1px solid var(--vscode-panel-border);display:flex;margin:16px -12px 12px;padding:0 8px}.tab{background:transparent;border:0;border-bottom:2px solid transparent;color:var(--vscode-descriptionForeground);cursor:pointer;flex:1;padding:8px 3px}.tab.active{border-bottom-color:#a855f7;color:var(--vscode-foreground);font-weight:600}.panel[hidden]{display:none}.card{background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:7px;margin:10px 0;padding:11px}.empty{border-style:dashed}.badge{background:var(--vscode-badge-background);border-radius:9px;color:var(--vscode-badge-foreground);display:inline-block;font-size:11px;margin:3px 4px 0 0;padding:3px 7px}.difficulty{background:var(--vscode-testing-iconPassed);color:var(--vscode-editor-background)}.label{color:var(--vscode-descriptionForeground);display:block;font-size:11px;margin-top:8px;text-transform:uppercase}.value{overflow-wrap:anywhere}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}.progress-track{background:var(--vscode-progressBar-background);border-radius:6px;height:8px;overflow:hidden}.progress-fill{background:#a855f7;border-radius:6px;height:100%;transition:width .2s;width:0}.tip{border-color:#a855f7}.actions button,.button{background:var(--vscode-button-background);border:0;border-radius:3px;color:var(--vscode-button-foreground);cursor:pointer;margin-top:7px;padding:8px;text-align:left;width:100%}.actions button:hover,.button:hover{background:var(--vscode-button-hoverBackground)}.secondary{background:var(--vscode-button-secondaryBackground)!important;color:var(--vscode-button-secondaryForeground)!important}.test-row{align-items:center;border-top:1px solid var(--vscode-panel-border);display:flex;gap:7px;padding:9px 0}.test-row:first-of-type{border-top:0}.test-state{margin-left:auto}.passed{color:var(--vscode-testing-iconPassed)}.metrics{display:grid;gap:7px;grid-template-columns:repeat(3,1fr)}.metric{background:var(--vscode-textBlockQuote-background);border-radius:4px;padding:8px}.metric strong{display:block;font-size:16px}.chart{align-items:end;display:flex;gap:5px;height:110px}.bar-wrap{align-items:center;display:flex;flex:1;flex-direction:column;height:100%;justify-content:end}.bar{background:#a855f7;border-radius:4px 4px 0 0;max-width:24px;width:100%}.bar-label{color:var(--vscode-descriptionForeground);font-size:10px;margin-top:4px}.feedback{min-height:70px;white-space:pre-wrap}.error{color:var(--vscode-errorForeground)}.hint{border-color:var(--vscode-editorInfo-foreground)}#status{min-height:18px}.fatal{background:var(--vscode-inputValidation-errorBackground);border-color:var(--vscode-inputValidation-errorBorder)}</style></head><body>' +
            '<header><div class="header-row"><h1>BuildMyLogic</h1><span class="local">Local mode</span></div><p class="subtitle">Learn programming by solving problems.</p></header>' +
            '<nav class="tabs" aria-label="BuildMyLogic sections"><button class="tab active" data-tab="challenge">Challenge</button><button class="tab" data-tab="tests">Tests</button><button class="tab" data-tab="feedback">Feedback</button><button class="tab" data-tab="progress">Progress</button></nav>' +
            '<main><section class="panel" data-panel="challenge"><div class="card"><h2>Base program</h2><span class="label">Workspace</span><div id="workspace" class="value muted">No workspace open</div><span class="label">Python file</span><div id="pythonFile" class="value muted">Create or open a Python file to begin.</div></div><div id="challengeCard" class="card empty"><h2>Challenge</h2><p class="muted">No question loaded.</p></div><div class="card"><h2>🎯 Task</h2><p>Build a simple command-line calculator.</p><ul><li>Addition (+)</li><li>Subtraction (-)</li><li>Multiplication (*)</li><li>Division (/)</li></ul><p class="muted">💡 Don’t follow a tutorial. Build it yourself!</p></div><div class="card"><h2>Progress</h2><p id="progressText">0 / 4 tests passed</p><div class="progress-track"><div id="progressFill" class="progress-fill"></div></div></div><div class="card tip"><h2>💡 Tip</h2><p>Focus on logic, problem solving and clean code. Try to handle edge cases too.</p></div><div class="actions"><button id="runTests">Run Tests Locally</button><button id="submit" class="secondary">Submit to BuildMyLogic</button><button id="newQuestion" class="secondary">New Question</button></div></section>' +
            '<section class="panel" data-panel="tests" hidden><div class="card"><h2>Test Results</h2><p id="testSummary" class="muted">0 / 4 tests passed — local demo only.</p><div id="testRows"></div><p class="muted">Demo results only. Real Python test execution will be connected later.</p><button id="runTestsAgain" class="button">Run Tests Locally</button></div></section>' +
            '<section class="panel" data-panel="feedback" hidden><div id="feedbackCard" class="card empty"><h2>🧑‍🏫 Teacher Feedback</h2><div id="feedback" class="feedback muted">Select Python code in the editor and choose “Analyze My Code” to receive feedback.</div><button id="analyze" class="button">Analyze My Code</button><button id="hint" class="button secondary">Show Hint</button></div></section>' +
            '<section class="panel" data-panel="progress" hidden><div class="card"><h2>Learning progress</h2><div class="metrics"><div class="metric"><strong id="metricTests">0</strong><span>Tests passed</span></div><div class="metric"><strong id="metricChallenge">1</strong><span>Current challenge</span></div><div class="metric"><strong>0</strong><span>Completed challenges</span></div></div></div><div class="card"><h2>Weekly activity</h2><div class="chart"><div class="bar-wrap"><div class="bar" style="height:25%"></div><span class="bar-label">Mon</span></div><div class="bar-wrap"><div class="bar" style="height:45%"></div><span class="bar-label">Tue</span></div><div class="bar-wrap"><div class="bar" style="height:20%"></div><span class="bar-label">Wed</span></div><div class="bar-wrap"><div class="bar" style="height:70%"></div><span class="bar-label">Thu</span></div><div class="bar-wrap"><div class="bar" style="height:35%"></div><span class="bar-label">Fri</span></div><div class="bar-wrap"><div class="bar" style="height:55%"></div><span class="bar-label">Sat</span></div><div class="bar-wrap"><div class="bar" style="height:15%"></div><span class="bar-label">Sun</span></div></div><p class="muted">This chart uses local placeholder data for now. Real progress tracking will be connected later.</p></div></section></main><p id="status" class="muted" aria-live="polite"></p>' +
            '<script nonce="' + nonce + '">(()=>{try{const vscode=acquireVsCodeApi(),byId=id=>document.getElementById(id),state={passed:0,total:4,tests:["Addition works","Subtraction works","Multiplication works","Division handles zero"]},escapeHtml=value=>String(value).replace(/[&<>"' + "'" + ']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","' + "'" + '":"&#39;","\\"":"&quot;"}[char]));function switchTab(name){document.querySelectorAll(".tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.tab===name));document.querySelectorAll(".panel").forEach(panel=>panel.hidden=panel.dataset.panel!==name)}function updateProgress(){const label=state.passed+" / "+state.total+" tests passed";byId("progressText").textContent=label;byId("testSummary").textContent=label+" — local demo only.";byId("progressFill").style.width=(state.passed/state.total*100)+"%";byId("metricTests").textContent=state.passed;byId("testRows").innerHTML=state.tests.map((test,index)=>"<div class=\\"test-row\\"><span class=\\"passed\\">"+(index<state.passed?"✓":"○")+"</span><span>"+escapeHtml(test)+"</span><span class=\\"test-state "+(index<state.passed?"passed":"muted")+"\\">"+(index<state.passed?"Passed":"Pending")+"</span></div>").join("")}function showFeedback(text,level){const card=byId("feedbackCard"),target=byId("feedback");card.className="card";target.textContent=text;target.className="feedback "+(level==="error"?"error":level==="hint"?"hint":"");switchTab("feedback")}function showStatus(text,level){const target=byId("status");target.textContent=text;target.className=level==="error"?"error":"muted"}function showQuestion(item){const target=byId("challengeCard");if(!item){target.className="card empty";target.innerHTML="<h2>Challenge</h2><p class=\\"muted\\">No question loaded.</p>";return}const tags=item.tags.map(tag=>"<span class=\\"badge\\">"+escapeHtml(tag)+"</span>").join("");target.className="card";target.innerHTML="<span class=\\"badge difficulty\\">"+escapeHtml(item.difficulty)+"</span><h2>"+escapeHtml(item.title)+"</h2><p>"+escapeHtml(item.description)+"</p><div>"+tags+"</div>";byId("metricChallenge").textContent="1"}document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>switchTab(tab.dataset.tab)));[["runTests","runTests"],["runTestsAgain","runTests"],["newQuestion","newQuestion"],["analyze","analyze"],["hint","hint"],["submit","submit"]].forEach(([id,command])=>byId(id).addEventListener("click",()=>vscode.postMessage({command})));window.addEventListener("message",event=>{const message=event.data||{};if(message.type==="question"){showQuestion(message.question)}else if(message.type==="baseProgram"){byId("workspace").textContent=message.program.workspace;byId("workspace").className="value";byId("pythonFile").textContent=message.program.pythonFile||"Create or open a Python file to begin.";byId("pythonFile").className=message.program.pythonFile?"value":"value muted"}else if(message.type==="tests"){state.passed=message.passed;state.total=message.total;updateProgress();switchTab("tests")}else if(message.type==="feedback"){showFeedback(message.text,message.level)}else if(message.type==="status"){showStatus(message.text,message.level)}});window.addEventListener("error",event=>{byId("feedbackCard").className="card fatal";byId("feedback").textContent="The BuildMyLogic interface encountered an error. Open Developer Tools for details.";console.error(event.error||event.message)});updateProgress()}catch(error){const target=document.getElementById("status");target.textContent="The BuildMyLogic interface could not start. Open Developer Tools for details.";target.className="error";console.error(error)}})();</script></body></html>';
    }
}
function isViewMessage(value) { return typeof value === 'object' && value !== null && 'command' in value && ['newQuestion', 'analyze', 'hint', 'runTests', 'submit'].includes(String(value.command)); }
async function findBaseProgram() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        return { workspace: 'No workspace open' };
    }
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.languageId === 'python') {
        return { workspace: folder.name, pythonFile: editor.document.uri.fsPath };
    }
    const files = await vscode.workspace.findFiles('**/*.py', '**/{node_modules,.git,venv,.venv}/**', 1);
    return { workspace: folder.name, pythonFile: files[0] ? path.relative(folder.uri.fsPath, files[0].fsPath) : undefined };
}
function activate(context) {
    const output = vscode.window.createOutputChannel('Logic Analyser');
    const feedback = new localProviders_1.LocalFeedbackProvider();
    const analyze = async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.selection.isEmpty) {
                const message = 'Select Python code first, then choose Analyze My Code.';
                void vscode.window.showWarningMessage('BuildMyLogic: ' + message);
                return { ok: false, message };
            }
            const selected = editor.document.getText(editor.selection);
            if (editor.document.languageId !== 'python' && !looksLikePython(selected)) {
                const message = 'The local analyser currently supports selected Python code.';
                void vscode.window.showWarningMessage('BuildMyLogic: ' + message);
                return { ok: false, message };
            }
            const result = await feedback.analyzeCode(selected);
            if (!result.ok) {
                void vscode.window.showErrorMessage(result.error.message);
                return { ok: false, message: result.error.message };
            }
            result.value.analysis.findings.forEach(finding => { finding.line += editor.selection.start.line; });
            const report = (0, report_1.formatTeacherReport)(result.value.analysis);
            output.clear();
            output.appendLine(report);
            output.show(true);
            return { ok: true, message: result.value.summary, feedback: report };
        }
        catch (error) {
            console.error('BuildMyLogic analysis failed.', error);
            return { ok: false, message: 'BuildMyLogic could not analyse this selection. Please try again.' };
        }
    };
    const command = vscode.commands.registerCommand(commandId, analyze);
    context.subscriptions.push(command, output, vscode.window.registerWebviewViewProvider(viewId, new BuildMyLogicViewProvider(analyze)));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map