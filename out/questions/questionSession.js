"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionSession = void 0;
/** Keeps question navigation independent of VS Code and any future AI transport. */
class QuestionSession {
    provider;
    questions = [];
    currentIndex = -1;
    constructor(provider) {
        this.provider = provider;
    }
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
            return { ok: true, value: undefined };
        }
        this.currentIndex = (this.currentIndex + 1) % this.questions.length;
        return { ok: true, value: this.currentQuestion() };
    }
    currentQuestion() { return this.questions[this.currentIndex]; }
}
exports.QuestionSession = QuestionSession;
//# sourceMappingURL=questionSession.js.map