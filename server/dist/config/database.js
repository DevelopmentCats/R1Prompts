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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Prompt_1 = require("../entities/Prompt");
const PromptMetrics_1 = require("../entities/PromptMetrics");
const PromptVote_1 = require("../entities/PromptVote");
const PromptCopy_1 = require("../entities/PromptCopy");
const ApiKey_1 = require("../entities/ApiKey");
const GlobalStats_1 = require("../entities/GlobalStats");
const AnonymousPromptCopy_1 = require("../entities/AnonymousPromptCopy");
const _1702305963000_RenamePromptVoteColumns_1 = require("../migrations/1702305963000-RenamePromptVoteColumns");
const _1702305964000_UpdatePromptTotals_1 = require("../migrations/1702305964000-UpdatePromptTotals");
const _1702305965000_RemovePromptVoteValue_1 = require("../migrations/1702305965000-RemovePromptVoteValue");
const _1702330171000_UpdateAnonymousCopy_1 = require("../migrations/1702330171000-UpdateAnonymousCopy");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env' });
const isDevelopment = process.env.NODE_ENV !== 'production';
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'rabbitr1',
    password: process.env.DB_PASSWORD || 'Jennifer@97',
    database: process.env.DB_NAME || 'rabbitr1_prompts_prod', // Point to restored production db
    synchronize: isDevelopment, // Only synchronize in development
    logging: isDevelopment,
    entities: [User_1.User, Prompt_1.Prompt, PromptMetrics_1.PromptMetrics, PromptVote_1.PromptVote, PromptCopy_1.PromptCopy, ApiKey_1.ApiKey, GlobalStats_1.GlobalStats, AnonymousPromptCopy_1.AnonymousPromptCopy],
    subscribers: [],
    migrations: [
        _1702305963000_RenamePromptVoteColumns_1.RenamePromptVoteColumns1702305963000,
        _1702305964000_UpdatePromptTotals_1.UpdatePromptTotals1702305964000,
        _1702305965000_RemovePromptVoteValue_1.RemovePromptVoteValue1702305965000,
        _1702330171000_UpdateAnonymousCopy_1.UpdateAnonymousCopy1702330171000,
    ],
});
