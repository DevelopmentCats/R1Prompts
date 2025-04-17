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
exports.AnonymousPromptCopy = void 0;
const typeorm_1 = require("typeorm");
const Prompt_1 = require("./Prompt");
const database_1 = require("../config/database");
let AnonymousPromptCopy = class AnonymousPromptCopy {
    id;
    prompt;
    promptId;
    ipHash; // Hashed IP address for privacy
    createdAt;
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
exports.AnonymousPromptCopy = AnonymousPromptCopy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AnonymousPromptCopy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Prompt_1.Prompt, { onDelete: 'CASCADE' }),
    __metadata("design:type", Prompt_1.Prompt)
], AnonymousPromptCopy.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AnonymousPromptCopy.prototype, "promptId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AnonymousPromptCopy.prototype, "ipHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AnonymousPromptCopy.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.AfterInsert)(),
    (0, typeorm_1.AfterRemove)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnonymousPromptCopy.prototype, "updatePromptTotals", null);
exports.AnonymousPromptCopy = AnonymousPromptCopy = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['promptId', 'ipHash'], { unique: true }) // Ensure each IP can only copy a prompt once
], AnonymousPromptCopy);
