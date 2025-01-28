/**
 * Benchmark entry with question and "expected" answer.
 */
interface BenchmarkEntry {
  question: string;
  expected: string;
}

/**
 * List of questions in Q&A pairs.
 */
export const BENCHMARKS: BenchmarkEntry[] = [
  {
    question: "What was the production volume last 24 hours?",
    expected: "The plant produced 18867.03 Liters of good product.",
  },
  {
    question: "Did we run at full capacity?",
    expected:
      "Since the maximum capacity is 53857 Liters, we utilized about 35% of the capacity.",
  },
  {
    question: "What were the reason for lost time or capacity?",
    expected:
      "Looking at the deviations that occurred in the last day, we had a single deviation with medium severity where it mentions a high bacterial count in raw milk.",
  },
  {
    question:
      "How was the yield based on input raw material volume and output production?",
    expected: "The yield is estimated to be 93.8%.",
  },
  {
    question: "What is the variation in output fat and protein last 24 hours?",
    expected:
      "The standard deviation for fat % is 0.35 and protein % is 0.14%.",
  },
  {
    question: "What is the process variation in the last 24 hours?",
    expected:
      "The mean temperature is 61.6 degrees with a standard deviation of 10.7 degrees and the mean pressure is 159.7 Psi and standard deviation is 16.7 PSI.",
  },
  {
    question: "Was the process stable?",
    expected:
      "The Cpk (Process Capability Index) is 0.23 of the process in the last day indicating that we are not within the specification limits and thus the process was not stable.",
  },
  {
    question: "Did we have any listed entries in the shift process log?",
    expected:
      "Yes, three entries are listed, one for the morning shift, one for the afternoon shift and one for the night shift. The night shift mentions an observed minor equipment malfunctions while in the morning and afternoon no significant issues were reported.",
  },
  {
    question: "Have we documented any non-conformities?",
    expected:
      "Yes, there is one entry on high bacterial count in raw milk that occurred at 3:58 and had a medium severity. It was solved at 4:30 and the action taken to solve it was conducting an additional pasteurization cycle.",
  },
  {
    question:
      "Does the shift process log contain any info that could explain the problems with raw milk?",
    expected:
      "There is an entry about minor equipment malfunction, this might explain the problem.",
  },
  {
    question:
      "Do we have similar deviations / situations in the past where we had high bacterial count in raw milk?",
    expected:
      "Yes, we had two other instances where we had high bacterial count in raw milk. These instances were on 2024-31-08 and 2024-07-12.",
  },
  {
    question: "What were the root causes for the deviations?",
    expected:
      "Here are several possible causes based on the data:\n1. Shift process logs mention minor equipment malfunction which might have led to the deviation\n2. Raw milk that arrived yesterday had a high bacterial count.",
  },
  {
    question: "What actions can be taken for solving the deviations?",
    expected:
      "In the past we have taken the following actions to solve similar deviations:\n1. Conducting an additional pasteurization cycle.\n2. Improving storage conditions and conducting training for handling.",
  },
  {
    question: "How can we reduce deviations in the future?",
    expected:
      "The model should look at previous deviations to see if there is a pattern, and suggest possible solutions. Will have to introduce fake data.",
  },
  {
    question:
      "What is the total quantity of raw materials received from each supplier?",
    expected:
      "Here is the list of each supplier along with the total quantity received from that supplier:\n- Sunshine Dairy 688642\n- Mountain Dairy 625807\n- Happy Cows 488432\n- Farm Fresh 498949\n- Valley Dairy 425845\n- Riverside Dairy 540302\n- Sunny Meadows 683266\n- Hillside Dairy 571867\n- Green Valley Dairy 699018\n- Country Milk 547333\n- Dairy Farms Inc. 621818\n- Highland Farms 580204",
  },
  {
    question:
      "What is the current version of the Pasteurization Process SOP and when was it last updated?",
    expected:
      "The current version is 3.9 and was last updated on the 10th of October 2024.",
  },
  {
    question: "Who were on the shift yesterday?",
    expected:
      "Sarah Brown worked on the morning shift while Mike Johnson worked the afternoon and night shift.",
  },
  {
    question:
      "What are the specification limits for the pasteurization process according to our SOPs?",
    expected:
      "The time must be between 32 and 35 minutes, while the temperature must be between 72 and 75 degrees.",
  },
  {
    question:
      "What are the most recent bacteria count levels recorded in our quality tests?",
    expected: "The most recent bacteria count level is 11814.",
  },
];
