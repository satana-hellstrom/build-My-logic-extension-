# BuildMyLogic

BuildMyLogic is a VS Code extension that helps users learn programming without leaving the editor. It presents coding challenges, local/demo test feedback, hints, and teacher-style logic analysis in a custom sidebar. Rather than only identifying syntax mistakes, the local analyzer explains what selected Python code does and where its logic may differ from the learner's intention.

The long-term vision is a programming teacher living inside VS Code: learners open a project, solve challenges, inspect feedback, run tests, and track progress while they write code.

## Current Status

The project is currently a local UI/prototype. It has:

- A BuildMyLogic Activity Bar icon and a custom Webview sidebar.
- Challenge, Tests, Feedback, and Progress tabs.
- Bundled local Python challenges and local hints.
- Clearly labelled local/demo test results.
- Local selected-Python code analysis and Output channel reports.
- Local status messages, a progress bar, and a placeholder weekly chart.

It does not have GitHub integration, a BuildMyLogic website connection, authentication, remote submission, cloud progress, remote test execution, remote challenge synchronization, or remote feedback generation.

## Product Vision

1. A learner opens a coding project.
2. BuildMyLogic displays a challenge in VS Code.
3. The learner writes code in the editor.
4. The learner selects relevant code.
5. BuildMyLogic provides teacher-style feedback.
6. The learner asks for hints when needed.
7. The learner runs tests and sees results.
8. BuildMyLogic tracks progress.
9. GitHub and website synchronization may be added later.

## UI Design

The narrow-sidebar dashboard has a BuildMyLogic header and Local mode badge, Challenge/Tests/Feedback/Progress tabs, a challenge card, task card, tip card, progress bar, test result rows, teacher-feedback card, and weekly activity chart. It uses VS Code theme variables rather than a fixed background, supporting both light and dark themes.

Challenge shows workspace/base-program details, the current local challenge, requirements, progress, and actions. Tests shows four demo checks. Feedback accepts local analyzer feedback and hints. Progress shows local metrics and a placeholder seven-day chart. Submit is only a future-feature notice; it does not submit anything.

## Architecture

The BuildMyLogic sidebar is a Webview View, not a Tree View. The Activity Bar container ID is buildMyLogic and the view ID is buildMyLogic.sidebar. package.json declares this view with type: webview. The extension registers one provider with vscode.window.registerWebviewViewProvider().

src/extension.ts creates the dashboard HTML, CSS, and JavaScript. The four tabs are HTML buttons inside that Webview and use addEventListener. The Webview communicates with the extension host using acquireVsCodeApi(), postMessage(), and Webview messages. There is deliberately no TreeDataProvider, TreeItem, or registerTreeDataProvider call.

The extension host uses LocalQuestionProvider and QuestionSession to select bundled questions. LocalFeedbackProvider invokes conservative Python rules. report.ts formats findings for the Output channel and Feedback tab. The CSP permits nonce-authorized local JavaScript and styles only; the sidebar uses no external scripts, API keys, or network requests.

## Source Structure

- package.json: extension metadata, Activity Bar container, Webview declaration, command, scripts, and VS Code engine.
- tsconfig.json: strict TypeScript setup.
- esbuild.js: bundles src/extension.ts into dist/extension.js.
- src/extension.ts: activation, command handler, Webview provider, UI messages, demo-test messages, and base Python-file detection.
- src/report.ts: teacher-style analysis report formatting.
- src/analysis/: typed local Python logic rules and findings.
- src/providers/: local question/feedback providers and their contracts.
- src/questions/: local question catalogue, data model, and navigation session.
- src/test/: extension/rule test source.
- media/: Activity Bar icon.
- dist/: generated extension bundle and source map.
- .vscode/: Extension Development Host launch/build tasks and workspace settings.

## Webview Messages

- newQuestion: Challenge sends this to advance to the next bundled local question.
- analyze: Feedback sends this to analyze selected Python locally and return a formatted report.
- hint: Feedback sends this to return a local requirement-based hint.
- runTests: Challenge and Tests send this to mark four local/demo checks as passed. It does not execute Python.
- submit: Challenge sends this only to display that GitHub and website submission will come later.

## Current Features

### Challenge System

Several local Python exercises are bundled, including Build a CLI Calculator. New Question cycles through them; no remote challenge loading exists.

### Local Code Analysis

Select Python code, then use BuildMyLogic: Analyze My Code or the Feedback tab. Local rules identify a small cautious set of reasoning patterns. Selected code is not sent outside VS Code.

### Hints

Show Hint returns a local hint based on the active question requirements.

### Test UI

Run Tests Locally updates all four test rows and shared progress state. This is demo behavior and explicitly does not claim Python was executed.

### Progress UI

The progress bar and tests-passed metric share one local state value. The weekly chart is local placeholder data, not real user activity.

### Feedback UI

Feedback preserves line breaks, switches to the Feedback tab automatically, and distinguishes hints and errors. The full report remains in the Logic Analyser Output channel.

## Build and Run

From the project folder:

    cd ~/real-vscode-extension/logic-analyser
    npm install
    npm run compile

Open this project in VS Code and press F5 to launch an Extension Development Host. Click the BuildMyLogic icon in its Activity Bar, open or create a Python file, select Python code, and choose Analyze My Code.

After source changes, run npm run compile and use Developer: Restart Extension Host. For stale contribution metadata or an old Activity Bar view, close the Extension Development Host and relaunch it with F5.

Useful checks:

    npm run check-types
    npm run lint
    npm run compile
    npm run compile-tests

## Troubleshooting

- Icon does not appear: compile, restart the Extension Host, and inspect the Activity Bar contribution.
- Sidebar does not open: confirm buildMyLogic.sidebar and launch the Extension Development Host from this folder.
- No data provider registered: this must stay a Webview View. Verify type: webview, the exact view ID, registerWebviewViewProvider(), successful activation, and current compiled output. Restart or relaunch the Extension Development Host. Do not convert the dashboard to a Tree View.
- Old UI appears: run npm run compile, use Developer: Restart Extension Host, or relaunch with F5.
- Extension does not activate: inspect Extension Host logs and ensure package.json main points to dist/extension.js.
- Webview is blank: inspect Developer Tools, recompile, and check the in-panel fallback error. Confirm the nonce CSP was not removed.
- Webview JavaScript fails: Developer Tools contains the error; the status/feedback area shows a fallback error.
- Analyze My Code does not work: select non-empty Python code first.
- Hint does not work: load a local challenge and inspect Extension Host logs for unexpected provider errors.
- Compile warnings or TypeScript errors: run npm run check-types and npm run lint, then fix the reported location.

## Future Work

- [ ] Real Python test execution
- [ ] Better challenge data model
- [ ] Multiple challenges
- [ ] Challenge navigation
- [ ] Persistent local progress
- [ ] Real progress chart
- [ ] More programming languages
- [ ] Better syntax and logic analysis
- [ ] Inline editor diagnostics
- [ ] GitHub authentication
- [ ] GitHub repository connection
- [ ] GitHub branch selection
- [ ] GitHub commit/submission
- [ ] BuildMyLogic website connection
- [ ] Website authentication
- [ ] Remote challenge synchronization
- [ ] Remote test execution
- [ ] Cloud progress tracking
- [ ] User accounts
- [ ] Settings and preferences
- [ ] User-configurable learning difficulty
- [ ] Better teacher feedback
- [ ] Challenge completion system

## Development Rules

- Keep the sidebar as a Webview View; do not convert it into a Tree View.
- Do not add TreeDataProvider for this dashboard.
- Keep GitHub and website integration postponed until explicitly requested.
- Prefer local functionality and never make fake remote connections.
- Do not claim placeholder features are functional.
- Preserve the nonce-based Content Security Policy.
- Support light/dark themes and narrow sidebars.
- Avoid unnecessary dependencies.
- Update this document when architecture or feature status changes.

## Change Log

### 2026-09-13

- Confirmed and fixed the Webview View declaration with type: webview.
- Preserved the Webview architecture and prevented Tree View/Webview confusion.
- Added the BuildMyLogic header, Local mode badge, Challenge tab, Tests tab, Feedback tab, and Progress tab.
- Added progress bar, test result UI, local/demo test behavior, teacher feedback UI, and a local progress chart.
- Preserved local analysis and hints.
- Postponed GitHub, website, authentication, remote submission, cloud progress, and remote tests.
- Expanded the README with architecture, messages, build/run, troubleshooting, future-work, and status documentation.
