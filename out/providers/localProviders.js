"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFeedbackProvider = exports.LocalQuestionProvider = void 0;
const pythonRules_1 = require("../analysis/pythonRules");
const localQuestions_1 = require("../questions/localQuestions");
const failure = (code, message, cause) => ({ ok: false, error: { code, message, cause } });
class LocalQuestionProvider {
    questions;
    constructor(questions = localQuestions_1.localPythonQuestions) {
        this.questions = questions;
    }
    async listQuestions() {
        return this.questions.length ? { ok: true, value: [...this.questions] } : failure('EMPTY_CATALOGUE', 'No local learning questions are available.');
    }
    async getQuestion(id) {
        const question = this.questions.find(item => item.id === id);
        return question ? { ok: true, value: question } : failure('NOT_FOUND', `Question "${id}" was not found.`);
    }
    async generateQuestion(request) {
        if (request.language !== 'python') {
            return failure('INVALID_REQUEST', 'The local provider currently supports Python only.');
        }
        const filtered = this.questions.filter(question => (!request.difficulty || question.difficulty === request.difficulty) &&
            (!request.tags?.length || request.tags.every(tag => question.tags.includes(tag))));
        return filtered[0] ? { ok: true, value: filtered[0] } : failure('NOT_FOUND', 'No local question matches that request.');
    }
}
exports.LocalQuestionProvider = LocalQuestionProvider;
/** Local fallback until a server-backed FeedbackProvider is configured. */
class LocalFeedbackProvider {
    async analyzeCode(code) {
        try {
            const analysis = (0, pythonRules_1.analysePython)(code);
            return { ok: true, value: { summary: analysis.findings.length ? 'Local Python rules found possible learning opportunities.' : 'Local Python rules found no issues in this selection.', analysis, source: 'local-rules' } };
        }
        catch (cause) {
            return failure('ANALYSIS_FAILED', 'The local Python analyser could not process this code.', cause);
        }
    }
    async generateHint(question) {
        return { ok: true, value: { text: question.requirements[0] ?? 'Break the problem into a small first step.', source: 'local' } };
    }
}
exports.LocalFeedbackProvider = LocalFeedbackProvider;
//# sourceMappingURL=localProviders.js.map