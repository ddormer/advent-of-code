import fs from "node:fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Registers = {
  x: number;
};

type IInstruction = {
  name: string;
  cyclesRemaining: number;
  args: readonly unknown[];
  cycle: (registers: Registers) => boolean;
};

class InstructionNoop implements IInstruction {
  name = "noop" as const;
  cyclesRemaining = 1;

  constructor(public args: readonly []) {
    this.args = args;
  }

  cycle(_: Registers): boolean {
    this.cyclesRemaining--;
    return !this.cyclesRemaining;
  }
}

class InstructionAddx implements IInstruction {
  readonly name = "addx" as const;
  cyclesRemaining = 2;

  constructor(public args: readonly [number]) {
    this.args = args;
  }

  cycle(registers: Registers): boolean {
    this.cyclesRemaining--;
    if (this.cyclesRemaining > 0) {
      return false;
    }
    registers.x += this.args[0];
    return true;
  }
}

const OPCODES = {
  noop: {
    ctor: InstructionNoop,
    parse: (args: string[]) => [] as const,
  },
  addx: {
    ctor: InstructionAddx,
    parse: (args: string[]): [number] | undefined => {
      if (args.length === 1 && typeof args[0] === "string") {
        const num = Number.parseInt(args[0], 10);
        if (Number.isFinite(num)) {
          return [num] as const;
        }
      }
    },
  },
};

type InstructionName = keyof typeof OPCODES;
type Instruction = InstanceType<(typeof OPCODES)[InstructionName]["ctor"]>;

function isOperationName(name: string | undefined): name is InstructionName {
  return name !== undefined && name in OPCODES;
}

function parseInstruction(line: string): Instruction {
  const [name, ...args] = line.split(" ");
  if (isOperationName(name)) {
    const instruction = OPCODES[name];
    const parsedArgs = instruction.parse(args) as any;
    if (parsedArgs !== undefined) {
      return new instruction.ctor(parsedArgs);
    }
  }
  throw new Error(`Unknown opcode: ${name}`);
}

function readFile(path: string): string {
  return fs.readFileSync(path, { encoding: "utf-8" });
}
function parseFile(data: string): Instruction[] {
  return data
    .split("\n")
    .filter((item) => item !== "")
    .map(parseInstruction);
}

const registers: Registers = { x: 1 };
const path = join(__dirname, "data.txt");
let instructions = parseFile(readFile(path));

function loadCpuInstructions() {
  return instructions.slice();
}

let cpuInstructions: Instruction[] = [];
let instructionPointer: number = 0;

function CpuTick() {
  if (instructionPointer >= cpuInstructions.length) {
    cpuInstructions = loadCpuInstructions();
    instructionPointer = 0;
  }

  const instruction = cpuInstructions[instructionPointer];
  if (instruction !== undefined) {
    if (instruction.cycle(registers)) {
      instructionPointer++;
    }
  }
}

function crtDraw(x: number, y: number, screen: string[][]) {
  if (x === 0 && y > 0) {
    console.log(screen[y - 1]?.join(""));
  }
  const crt_y = screen[y];
  if (crt_y !== undefined) {
    if ([registers.x, registers.x - 1, registers.x + 1].includes(x)) {
      crt_y[x] = "#";
    } else {
      crt_y[x] = ".";
    }
  }
}

function getCRT() {
  const crtWidth = 40;
  const crtHeight = 6;
  const crtState = {
    x: 0,
    y: 0,
    screen: Array.from({ length: crtHeight }, () => new Array(crtWidth)),
  };

  function CrtTick() {
    crtDraw(crtState.x, crtState.y, crtState.screen);
    if (crtState.x < crtWidth - 1) {
      crtState.x++;
    } else if (crtState.y < crtHeight) {
      crtState.x = 0;
      crtState.y++;
    }
  }

  return CrtTick;
}

function part1() {
  let count = 0;
  let sum = 0;
  while (true) {
    count++;
    if ([20, 60, 100, 140, 180, 220].includes(count)) {
      console.log(registers);
      sum += registers.x * count;
      console.log(sum);
    }
    CpuTick();
  }
}

function part2() {
  const crtTick = getCRT();
  while (true) {
    crtTick();
    CpuTick();
  }
}

part2();
