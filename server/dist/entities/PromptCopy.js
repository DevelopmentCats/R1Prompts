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
exports.PromptCopy = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Prompt_1 = require("./Prompt");
const database_1 = require("../config/database");
let PromptCopy = class PromptCopy {
    id;
    promptId;
    userId;
    prompt;
    user;
    createdAt;
    updatedAt;
    async updatePromptTotals() {
        const prompt = await database_1.AppDataSource.manager.findOne(Prompt_1.Prompt, {
            where: { id: this.promptId },
            relations: ['promptCopies', 'anonymousCopies']
        });
        if (prompt) {
            await prompt.updateTotals();
            await database_1.AppDataSource.manager.save(prompt);
        }
    }
};
exports.PromptCopy = PromptCopy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PromptCopy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PromptCopy.prototype, "promptId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PromptCopy.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Prompt_1.Prompt, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'promptId' }),
    __metadata("design:type", Prompt_1.Prompt)
], PromptCopy.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], PromptCopy.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PromptCopy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PromptCopy.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.AfterInsert)(),
    (0, typeorm_1.AfterRemove)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PromptCopy.prototype, "updatePromptTotals", null);
exports.PromptCopy = PromptCopy = __decorate([
    (0, typeorm_1.Entity)('prompt_copies'),
    (0, typeorm_1.Unique)(['promptId', 'userId']) // Ensure a user can only copy a prompt once
], PromptCopy);
