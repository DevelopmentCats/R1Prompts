import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Prompt } from '../entities/Prompt';
import { PromptMetrics } from '../entities/PromptMetrics';
import { PromptVote } from '../entities/PromptVote';
import { PromptCopy } from '../entities/PromptCopy';
import { ApiKey } from '../entities/ApiKey';
import { GlobalStats } from '../entities/GlobalStats';
import { AnonymousPromptCopy } from '../entities/AnonymousPromptCopy';
import { RenamePromptVoteColumns1702305963000 } from '../migrations/1702305963000-RenamePromptVoteColumns';
import { UpdatePromptTotals1702305964000 } from '../migrations/1702305964000-UpdatePromptTotals';
import { RemovePromptVoteValue1702305965000 } from '../migrations/1702305965000-RemovePromptVoteValue';
import { UpdateAnonymousCopy1702330171000 } from '../migrations/1702330171000-UpdateAnonymousCopy';
import { RemoveTotalVotes1702413600000 } from '../migrations/1702413600000-RemoveTotalVotes';
import { FixPromptTotals1702329231000 } from '../migrations/1702329231000-FixPromptTotals';
import { AddPromptVoteUnique1735223655158 } from '../migrations/1735223655158-AddPromptVoteUnique';
import { AddVoteTriggers1735748629000 } from '../migrations/1735748629000-AddVoteTriggers';
import { AddPromptVoteTrigger1735798629000 } from '../migrations/1735798629000-AddPromptVoteTrigger';
import { UpdateVotingSystem1735798630000 } from '../migrations/1735798630000-UpdateVotingSystem';
import { RemoveAverageRating1735798640000 } from '../migrations/1735798640000-RemoveAverageRating';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env' });

// Force disable synchronize to prevent schema sync issues with existing database
const synchronizeEnabled = false; // Set to false regardless of environment

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'rabbitr1',
  password: process.env.DB_PASSWORD || 'Jennifer@97',
  database: process.env.DB_NAME || 'rabbitr1_prompts',
  synchronize: synchronizeEnabled,  // Disabled synchronization to preserve database structure
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Prompt, PromptMetrics, PromptVote, PromptCopy, ApiKey, GlobalStats, AnonymousPromptCopy],
  subscribers: [],
  migrations: [
    RenamePromptVoteColumns1702305963000,
    UpdatePromptTotals1702305964000,
    RemovePromptVoteValue1702305965000,
    UpdateAnonymousCopy1702330171000,
    RemoveTotalVotes1702413600000,
    FixPromptTotals1702329231000,
    AddPromptVoteUnique1735223655158,
    AddVoteTriggers1735748629000,
    AddPromptVoteTrigger1735798629000,
    UpdateVotingSystem1735798630000,
    RemoveAverageRating1735798640000,
  ],
});
