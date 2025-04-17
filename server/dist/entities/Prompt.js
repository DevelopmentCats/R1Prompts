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
exports.Prompt = exports.PromptCategory = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const PromptMetrics_1 = require("./PromptMetrics");
const PromptVote_1 = require("./PromptVote");
const PromptCopy_1 = require("./PromptCopy");
const AnonymousPromptCopy_1 = require("./AnonymousPromptCopy");
const database_1 = require("../config/database");
var PromptCategory;
(function (PromptCategory) {
    PromptCategory["GENERAL"] = "general";
    PromptCategory["GENERATIVE_UI"] = "generative-ui";
    PromptCategory["TEACH_MODE"] = "teach-mode";
    PromptCategory["LAM"] = "lam";
})(PromptCategory || (exports.PromptCategory = PromptCategory = {}));
let Prompt = class Prompt {
    id;
    title;
    description;
    content;
    category = PromptCategory.GENERAL;
    isPublic = true;
    likes = 0;
    totalViews = 0;
    totalCopies = 0;
    averageRating = 0;
    tags = [];
    imageUrls = [];
    createdAt;
    updatedAt;
    author;
    authorSafe;
    metrics;
    votes;
    copies;
    anonymousCopies;
    async updateTotals() {
        // Update total copies
        const regularCopiesCount = await database_1.AppDataSource
            .getRepository(PromptCopy_1.PromptCopy)
            .count({
            where: { promptId: this.id }
        });
        const anonymousCopiesCount = await database_1.AppDataSource
            .getRepository(AnonymousPromptCopy_1.AnonymousPromptCopy)
            .count({
            where: { promptId: this.id }
        });
        this.totalCopies = regularCopiesCount + anonymousCopiesCount;
        // Update likes count from votes
        const votesCount = await database_1.AppDataSource
            .getRepository(PromptVote_1.PromptVote)
            .count({
            where: { promptId: this.id }
        });
        this.likes = votesCount;
        // Update average rating if needed
        const result = await database_1.AppDataSource
            .getRepository(PromptVote_1.PromptVote)
            .createQueryBuilder('vote')
            .select('AVG(vote.rating)', 'avgRating')
            .where('vote.promptId = :id', { id: this.id })
            .getRawOne();
        this.averageRating = result?.avgRating || 0;
    }
};
exports.Prompt = Prompt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Prompt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Prompt.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Prompt.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Prompt.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PromptCategory,
        default: PromptCategory.GENERAL,
    }),
    __metadata("design:type", String)
], Prompt.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Prompt.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Prompt.prototype, "likes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Prompt.prototype, "totalViews", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Prompt.prototype, "totalCopies", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Prompt.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { default: '' }),
    __metadata("design:type", Array)
], Prompt.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    __metadata("design:type", Array)
], Prompt.prototype, "imageUrls", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Prompt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Prompt.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.prompts, {
        eager: true
    }),
    (0, typeorm_1.JoinColumn)({ name: 'author_id' }),
    __metadata("design:type", User_1.User)
], Prompt.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromptMetrics_1.PromptMetrics, (metrics) => metrics.prompt),
    __metadata("design:type", Array)
], Prompt.prototype, "metrics", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromptVote_1.PromptVote, (vote) => vote.prompt),
    __metadata("design:type", Array)
], Prompt.prototype, "votes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PromptCopy_1.PromptCopy, (copy) => copy.prompt),
    __metadata("design:type", Array)
], Prompt.prototype, "copies", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AnonymousPromptCopy_1.AnonymousPromptCopy, (copy) => copy.prompt),
    __metadata("design:type", Array)
], Prompt.prototype, "anonymousCopies", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Prompt.prototype, "updateTotals", null);
exports.Prompt = Prompt = __decorate([
    (0, typeorm_1.Entity)('prompts'),
    (0, typeorm_1.Index)(['isPublic', 'createdAt']) // Main sorting and filtering
    ,
    (0, typeorm_1.Index)(['category', 'isPublic']) // Category filtering
    ,
    (0, typeorm_1.Index)(['isPublic', 'totalCopies']) // Copies sorting
], Prompt);
