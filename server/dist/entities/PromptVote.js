"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptVote = void 0;
const typeorm_1 = require("typeorm");
const Prompt_1 = require("./Prompt");
const User_1 = require("./User");
const database_1 = require("../config/database");
let PromptVote = class PromptVote {
    id;
    promptId;
    userId;
    createdAt;
    updatedAt;
    prompt;
    user;
    async updatePromptTotals() {
        const prompt = await database_1.AppDataSource.manager.findOne(Prompt_1.Prompt, {
            where: { id: this.promptId }
        });
        if (prompt) {
            await prompt.updateTotals();
            await database_1.AppDataSource.manager.save(prompt);
        }
    }
};
exports.PromptVote = PromptVote;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], PromptVote.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PromptVote.prototype, "promptId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PromptVote.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PromptVote.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PromptVote.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Prompt_1.Prompt, prompt => prompt.votes),
    (0, typeorm_1.JoinColumn)({ name: "promptId" }),
    __metadata("design:type", Prompt_1.Prompt)
], PromptVote.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User_1.User)
], PromptVote.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.AfterInsert)(),
    (0, typeorm_1.AfterUpdate)(),
    (0, typeorm_1.AfterRemove)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PromptVote.prototype, "updatePromptTotals", null);
exports.PromptVote = PromptVote = __decorate([
    (0, typeorm_1.Entity)("prompt_votes")
], PromptVote);
