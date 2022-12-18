import { Program } from '@hyperionbt/helios';
import fs from 'fs';

const src = fs.readFileSync('./order-book.hl').toString();

const program = Program.new(src);

const simplify = false;

export const uplcProgram = program.compile(simplify);

console.log(uplcProgram.serialize());