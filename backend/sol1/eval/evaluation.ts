import { handleUserQuestion } from "../src/index";
import { BENCHMARKS } from "./benchmarks";

/**
 * Call main function for x number of times for each question.
 * Then log all expected and actual answers
 */
async function runBenchmarks() {
  for (let i = 0; i < 10; i++) {
    console.log(`-- RUN: ${i}\n`);
    for (let qi = 0; qi < BENCHMARKS.length; qi++) {
      const { question, expected } = BENCHMARKS[qi];
      console.log(`\n=== Benchmark #${qi + 1} ===`);
      console.log(`Q: ${question}`);

      const actualAnswer = await handleUserQuestion(question, `${i}`);

      console.log(`-- Actual Answer:\n${actualAnswer}`);
      console.log(`-- Expected (Reference):\n${expected}`);
    }
  }
}

// npm run eval
(async () => {
  await runBenchmarks();
})();
