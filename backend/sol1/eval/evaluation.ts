import { handleUserQuestion } from "../src/index";
import { BENCHMARKS } from "./benchmarks";

import * as fs from "fs";
import * as path from "path";

/**
 * Call main function for x number of times for each question.
 * Then log all expected and actual answers
 */
async function runBenchmarks() {
  for (let qi = 0; qi < BENCHMARKS.length; qi++) {
    const { question, expected } = BENCHMARKS[qi];
    const outputFilePath = path.join(__dirname, "eval-solution-3.txt");

    for (let i = 0; i < 10; i++) {
      console.log(`-- RUN: ${i} for Question #${qi + 1}\n`);
      const logStream = fs.createWriteStream(outputFilePath, { flags: "a" });

      logStream.write(`\n=== Benchmark #${qi + 1}, Run #${i + 1} ===\n`);
      logStream.write(`Q: ${question}\n`);

      const actualAnswer = await handleUserQuestion(question, `${i}`);

      logStream.write(`-- Actual Answer:\n${actualAnswer}\n`);
      logStream.write(`-- Expected (Reference):\n${expected}\n`);

      logStream.end();
    }
  }
}

// npm run eval
(async () => {
  await runBenchmarks();
  console.log("Evaluation completed.");
})();
