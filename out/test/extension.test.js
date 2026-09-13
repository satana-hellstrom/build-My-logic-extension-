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
const assert = __importStar(require("assert"));
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = __importStar(require("vscode"));
const pythonRules_1 = require("../analysis/pythonRules");
const localProviders_1 = require("../providers/localProviders");
const questionSession_1 = require("../questions/questionSession");
// import * as myExtension from '../../extension';
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    test('detects an impossible numeric condition', () => {
        const result = (0, pythonRules_1.analysePython)('if age > 18 and age < 10:\n    print("impossible")');
        assert.strictEqual(result.findings.length, 1);
        assert.strictEqual(result.findings[0].category, 'Possible logic issue');
        assert.strictEqual(result.findings[0].line, 1);
    });
    test('suggests a simpler boolean comparison', () => {
        const result = (0, pythonRules_1.analysePython)('if is_logged_in == True:\n    pass');
        assert.strictEqual(result.findings[0].category, 'Suggestion');
    });
    test('loads the first local question', async () => {
        const session = new questionSession_1.QuestionSession(new localProviders_1.LocalQuestionProvider());
        const result = await session.load();
        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value?.id, 'voting-eligibility');
        }
    });
    test('switches local questions', async () => {
        const session = new questionSession_1.QuestionSession(new localProviders_1.LocalQuestionProvider());
        await session.load();
        const result = await session.next();
        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value?.id, 'cli-calculator');
        }
    });
    test('handles an empty local question catalogue', async () => {
        const session = new questionSession_1.QuestionSession(new localProviders_1.LocalQuestionProvider([]));
        const result = await session.load();
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'EMPTY_CATALOGUE');
        }
    });
    test('uses local analyser feedback as the fallback', async () => {
        const provider = new localProviders_1.LocalFeedbackProvider();
        const result = await provider.analyzeCode('if age > 18 and age < 10:\n    pass');
        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value.source, 'local-rules');
            assert.strictEqual(result.value.analysis.findings.length, 1);
        }
    });
});
//# sourceMappingURL=extension.test.js.map