import { db, problemsTable, testCasesTable } from "@workspace/db";

const problems = [
  {
    problem: {
      slug: "fizzbuzz",
      title: "FizzBuzz",
      description: `Print the numbers from 1 to N. But for multiples of 3 print "Fizz" instead of the number, for multiples of 5 print "Buzz", and for multiples of both 3 and 5 print "FizzBuzz".

**Input**
A single integer N (1 ≤ N ≤ 100).

**Output**
N lines, each containing either the number or "Fizz", "Buzz", or "FizzBuzz".

**Example**
Input: 15
Output:
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz`,
      difficulty: "easy" as const,
      points: 50,
      tags: ["loops", "conditionals"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 65536,
    },
    testCases: [
      { stdin: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", isSample: true, points: 10, orderIndex: 0 },
      { stdin: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isSample: true, points: 10, orderIndex: 1 },
      { stdin: "1", expectedOutput: "1", isSample: false, points: 10, orderIndex: 2 },
      { stdin: "3", expectedOutput: "1\n2\nFizz", isSample: false, points: 10, orderIndex: 3 },
      { stdin: "20", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz", isSample: false, points: 10, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "two-sum",
      title: "Two Sum",
      description: `Given an array of integers and a target value, find two numbers that add up to the target and print their 0-based indices (smaller index first).

You may assume exactly one solution exists and the same element cannot be used twice.

**Input**
Line 1: Two integers N (2 ≤ N ≤ 10^4) and target T.
Line 2: N space-separated integers.

**Output**
Two space-separated indices i j (i < j) such that nums[i] + nums[j] == target.

**Example**
Input:
4 9
2 7 11 15

Output:
0 1`,
      difficulty: "easy" as const,
      points: 100,
      tags: ["arrays", "hash-map"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "4 9\n2 7 11 15", expectedOutput: "0 1", isSample: true, points: 20, orderIndex: 0 },
      { stdin: "3 6\n3 2 4", expectedOutput: "1 2", isSample: true, points: 20, orderIndex: 1 },
      { stdin: "2 6\n3 3", expectedOutput: "0 1", isSample: false, points: 20, orderIndex: 2 },
      { stdin: "5 10\n1 3 7 5 2", expectedOutput: "1 3", isSample: false, points: 20, orderIndex: 3 },
      { stdin: "6 0\n-3 4 3 90 -7 7", expectedOutput: "0 2", isSample: false, points: 20, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "palindrome-check",
      title: "Palindrome Check",
      description: `Determine whether a given string is a palindrome. A palindrome reads the same forwards and backwards. Ignore case and consider only alphanumeric characters.

**Input**
A single string S (1 ≤ |S| ≤ 10^5).

**Output**
Print "YES" if S is a palindrome (ignoring case and non-alphanumeric characters), otherwise "NO".

**Example**
Input: A man a plan a canal Panama
Output: YES

Input: race a car
Output: NO`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["strings", "two-pointers"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 65536,
    },
    testCases: [
      { stdin: "A man a plan a canal Panama", expectedOutput: "YES", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "race a car", expectedOutput: "NO", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "racecar", expectedOutput: "YES", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "hello", expectedOutput: "NO", isSample: false, points: 15, orderIndex: 3 },
      { stdin: "Was it a car or a cat I saw", expectedOutput: "YES", isSample: false, points: 15, orderIndex: 4 },
      { stdin: "No lemon no melon", expectedOutput: "YES", isSample: false, points: 15, orderIndex: 5 },
    ],
  },
  {
    problem: {
      slug: "binary-search",
      title: "Binary Search",
      description: `Given a sorted array of distinct integers and a target value, return the index of the target using binary search. If not found, return -1.

**Input**
Line 1: Two integers N (1 ≤ N ≤ 10^5) and target T.
Line 2: N space-separated integers in strictly ascending order.

**Output**
The 0-based index of T in the array, or -1 if not found.

**Example**
Input:
6 9
-1 0 3 5 9 12

Output:
4`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["binary-search", "arrays"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "6 9\n-1 0 3 5 9 12", expectedOutput: "4", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "6 2\n-1 0 3 5 9 12", expectedOutput: "-1", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "1 0\n0", expectedOutput: "0", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "5 5\n1 3 5 7 9", expectedOutput: "2", isSample: false, points: 30, orderIndex: 3 },
      { stdin: "5 6\n1 3 5 7 9", expectedOutput: "-1", isSample: false, points: 30, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "longest-common-subsequence",
      title: "Longest Common Subsequence",
      description: `Given two strings, find the length of their longest common subsequence (LCS). A subsequence is a sequence derived by deleting some or no characters without changing the relative order of remaining characters.

**Input**
Line 1: String A (1 ≤ |A| ≤ 1000)
Line 2: String B (1 ≤ |B| ≤ 1000)

**Output**
A single integer — the length of the longest common subsequence.

**Example**
Input:
abcde
ace

Output:
3

Explanation: "ace" is a common subsequence of length 3.`,
      difficulty: "hard" as const,
      points: 200,
      tags: ["dynamic-programming", "strings"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "abcde\nace", expectedOutput: "3", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "abc\nabc", expectedOutput: "3", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "abc\ndef", expectedOutput: "0", isSample: false, points: 40, orderIndex: 2 },
      { stdin: "AGGTAB\nGXTXAYB", expectedOutput: "4", isSample: false, points: 40, orderIndex: 3 },
      { stdin: "ABCBDAB\nBDCABA", expectedOutput: "4", isSample: false, points: 40, orderIndex: 4 },
    ],
  },
];

async function main() {
  for (const { problem, testCases } of problems) {
    const existing = await db.query.problemsTable.findFirst({
      where: (p, { eq }) => eq(p.slug, problem.slug),
    });
    if (existing) {
      console.log(`Skipping existing problem: ${problem.title}`);
      continue;
    }
    const [inserted] = await db.insert(problemsTable).values(problem).returning();
    console.log(`Inserted problem: ${inserted.title} (id=${inserted.id})`);

    for (const tc of testCases) {
      await db.insert(testCasesTable).values({ problemId: inserted.id, ...tc });
    }
    console.log(`  → ${testCases.length} test cases added`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
