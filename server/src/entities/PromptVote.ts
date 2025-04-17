import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique
} from "typeorm";
import { Prompt } from "./Prompt";
import { User } from "./User";

@Entity("prompt_votes")
@Unique(["promptId", "userId"])  // Ensure one vote per user per prompt
@Index(["promptId", "userId"])   // Index for faster lookups
export class PromptVote {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    promptId!: string;

    @Column()
    userId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Prompt, prompt => prompt.votes)
    @JoinColumn({ name: "promptId" })
    prompt!: Prompt;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;
}
