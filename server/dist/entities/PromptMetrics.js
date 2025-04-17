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
exports.PromptMetrics = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Prompt_1 = require("./Prompt");
let PromptMetrics = class PromptMetrics {
    id;
    prompt;
    user;
    views = 0;
    copies = 0;
    rating;
    createdAt;
    updatedAt;
};
exports.PromptMetrics = PromptMetrics;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PromptMetrics.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Prompt_1.Prompt, (prompt) => prompt.metrics, { onDelete: 'CASCADE' }),
    __metadata("design:type", Prompt_1.Prompt)
], PromptMetrics.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { onDelete: 'CASCADE' }),
    __metadata("design:type", User_1.User)
], PromptMetrics.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PromptMetrics.prototype, "views", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PromptMetrics.prototype, "copies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], PromptMetrics.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PromptMetrics.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PromptMetrics.prototype, "updatedAt", void 0);
exports.PromptMetrics = PromptMetrics = __decorate([
    (0, typeorm_1.Entity)('prompt_metrics'),
    (0, typeorm_1.Unique)(['prompt', 'user'])
], PromptMetrics);
