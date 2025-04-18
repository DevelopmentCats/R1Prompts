import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { PromptMetrics } from './PromptMetrics';
import { PromptVote } from './PromptVote';
import { PromptCopy } from './PromptCopy';
import { AnonymousPromptCopy } from './AnonymousPromptCopy';
import { SafeUser } from '../types/user';

export enum PromptCategory {
  GENERAL = 'general',
  GENERATIVE_UI = 'generative-ui',
  TEACH_MODE = 'teach-mode',
  LAM = 'lam',
}

@Entity('prompts')
@Index(['isPublic', 'createdAt']) // Main sorting and filtering
@Index(['category', 'isPublic']) // Category filtering
@Index(['isPublic', 'totalCopies']) // Copies sorting
@Index(['isPublic', 'totalVotes']) // Votes sorting 
export class Prompt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'enum',
    enum: PromptCategory,
    default: PromptCategory.GENERAL,
  })
  category: PromptCategory = PromptCategory.GENERAL;

  @Column({ default: true })
  isPublic: boolean = true;

  @Column({ default: 0 })
  totalVotes: number = 0; 

  @Column({ default: 0 })
  totalViews: number = 0;

  @Column({ default: 0 })
  totalCopies: number = 0;

  @Column('simple-array', { default: '' })
  tags: string[] = [];

  @Column('simple-array', { nullable: true })
  imageUrls: string[] = [];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.prompts, {
    eager: true
  })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  authorSafe?: SafeUser;

  @OneToMany(() => PromptMetrics, (metrics) => metrics.prompt)
  metrics!: PromptMetrics[];

  @OneToMany(() => PromptVote, (vote) => vote.prompt)
  votes!: PromptVote[];

  @OneToMany(() => PromptCopy, (copy) => copy.prompt)
  copies!: PromptCopy[];

  @OneToMany(() => AnonymousPromptCopy, (copy) => copy.prompt)
  anonymousCopies!: AnonymousPromptCopy[];
}
