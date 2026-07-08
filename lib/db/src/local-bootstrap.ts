import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import path from "node:path";
import * as schema from "./schema";

const localDatabasePath = process.env.LEETSTUDIO_DB_PATH ?? path.join(process.cwd(), ".local", "leetstudio-db");

const enumStatements = [
  `DO $$ BEGIN CREATE TYPE problem_difficulty AS ENUM ('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE submission_status AS ENUM ('queued', 'judging', 'accepted', 'partial', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'internal_error'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE test_result_status AS ENUM ('queued', 'processing', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'internal_error'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
];

const schemaStatements = [
  ...enumStatements,
  `CREATE TABLE IF NOT EXISTS users (
    id varchar PRIMARY KEY,
    email varchar UNIQUE,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS languages (
    id serial PRIMARY KEY,
    name varchar NOT NULL,
    judge0_id integer NOT NULL,
    monaco_id varchar NOT NULL,
    time_multiplier real NOT NULL DEFAULT 1,
    memory_multiplier real NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS problems (
    id serial PRIMARY KEY,
    slug varchar NOT NULL UNIQUE,
    title varchar NOT NULL,
    description text NOT NULL,
    difficulty problem_difficulty NOT NULL DEFAULT 'easy',
    points integer NOT NULL DEFAULT 100,
    tags text[] NOT NULL DEFAULT '{}'::text[],
    cpu_time_limit_seconds real NOT NULL DEFAULT 2,
    memory_limit_kb integer NOT NULL DEFAULT 262144,
    created_by_id varchar REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS contests (
    id serial PRIMARY KEY,
    slug varchar NOT NULL UNIQUE,
    title varchar NOT NULL,
    description text NOT NULL DEFAULT '',
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    created_by_id varchar REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS test_cases (
    id serial PRIMARY KEY,
    problem_id integer NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    stdin text NOT NULL DEFAULT '',
    expected_output text NOT NULL,
    is_sample boolean NOT NULL DEFAULT false,
    points integer NOT NULL DEFAULT 0,
    order_index integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS contest_problems (
    id serial PRIMARY KEY,
    contest_id integer NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id integer NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 100,
    label varchar NOT NULL DEFAULT 'A'
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id serial PRIMARY KEY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id integer NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    contest_id integer REFERENCES contests(id) ON DELETE SET NULL,
    language_id integer NOT NULL REFERENCES languages(id),
    source_code text NOT NULL,
    status submission_status NOT NULL DEFAULT 'queued',
    score integer NOT NULL DEFAULT 0,
    max_score integer NOT NULL DEFAULT 0,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    judged_at timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS submission_test_results (
    id serial PRIMARY KEY,
    submission_id integer NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id integer NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    judge0_token varchar,
    status test_result_status NOT NULL DEFAULT 'queued',
    time_ms real,
    memory_kb integer,
    stdout text,
    stderr text,
    compile_output text
  )`,
];

const seedLanguages = [
  { name: "C++ (GCC 9.2.0)", judge0Id: 54, monacoId: "cpp", timeMultiplier: 1, memoryMultiplier: 1 },
  { name: "Python (3.8.1)", judge0Id: 71, monacoId: "python", timeMultiplier: 3, memoryMultiplier: 1.5 },
  { name: "Java (OpenJDK 13.0.1)", judge0Id: 62, monacoId: "java", timeMultiplier: 2, memoryMultiplier: 2 },
];

const seedProblems = [
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
      slug: "best-time-to-buy-and-sell-stock",
      title: "Best Time to Buy and Sell Stock",
      description: `You are given an array prices where prices[i] is the price of a given stock on the i-th day. You want to maximize your profit by choosing a single day to buy and a different day in the future to sell. Return the maximum profit you can achieve. If no profit can be achieved, return 0.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers representing prices

**Output**
Maximum profit achievable

**Example**
Input:
6
7 1 5 3 6 4

Output:
5`,
      difficulty: "easy" as const,
      points: 100,
      tags: ["arrays", "dynamic-programming"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "6\n7 1 5 3 6 4", expectedOutput: "5", isSample: true, points: 20, orderIndex: 0 },
      { stdin: "5\n7 6 4 3 1", expectedOutput: "0", isSample: true, points: 20, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "0", isSample: false, points: 20, orderIndex: 2 },
      { stdin: "3\n1 2 3", expectedOutput: "2", isSample: false, points: 20, orderIndex: 3 },
      { stdin: "4\n3 2 1 5", expectedOutput: "4", isSample: false, points: 20, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "contains-duplicate",
      title: "Contains Duplicate",
      description: `Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers

**Output**
"true" if duplicate exists, "false" otherwise

**Example**
Input:
4
1 2 3 1

Output:
true`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["arrays", "hash-set"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "4\n1 2 3 1", expectedOutput: "true", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "4\n1 2 3 4", expectedOutput: "false", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "false", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "3\n1 1 1", expectedOutput: "true", isSample: false, points: 15, orderIndex: 3 },
      { stdin: "5\n1 2 3 4 5", expectedOutput: "false", isSample: false, points: 15, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "product-of-array-except-self",
      title: "Product of Array Except Self",
      description: `Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers

**Output**
N space-separated integers representing the product array

**Example**
Input:
4
1 2 3 4

Output:
24 12 8 6`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["arrays", "prefix-product"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "4\n1 2 3 4", expectedOutput: "24 12 8 6", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "3\n-1 1 0 -3 3", expectedOutput: "0 0 9 0 0", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "2\n1 2", expectedOutput: "2 1", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "5\n2 3 4 5 6", expectedOutput: "360 240 180 144 120", isSample: false, points: 30, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "maximum-subarray",
      title: "Maximum Subarray",
      description: `Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers

**Output**
Maximum sum of any contiguous subarray

**Example**
Input:
9
-2 1 -3 4 -1 2 1 -5 4

Output:
6`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["arrays", "dynamic-programming"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "1\n1", expectedOutput: "1", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "5\n5 4 -1 7 8", expectedOutput: "23", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "4\n-1 -2 -3 -4", expectedOutput: "-1", isSample: false, points: 30, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "maximum-product-subarray",
      title: "Maximum Product Subarray",
      description: `Given an integer array nums, find the contiguous subarray within an array (containing at least one number) which has the largest product.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^4)
Line 2: N space-separated integers

**Output**
Maximum product of any contiguous subarray

**Example**
Input:
3
2 3 -2 4

Output:
6`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["arrays", "dynamic-programming"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3\n2 3 -2 4", expectedOutput: "6", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "2\n-2 0 -1", expectedOutput: "0", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "3\n-2 3 -4", expectedOutput: "24", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "4\n2 -5 -2 -4 3", expectedOutput: "24", isSample: false, points: 35, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "find-minimum-in-rotated-sorted-array",
      title: "Find Minimum in Rotated Sorted Array",
      description: `Suppose an array sorted in ascending order is rotated at some pivot unknown to you. Find the minimum element. The array may contain duplicates.

**Input**
Line 1: Integer N (1 ≤ N ≤ 5000)
Line 2: N space-separated integers

**Output**
Minimum element in the array

**Example**
Input:
5
3 4 5 1 2

Output:
1`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["binary-search", "arrays"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "5\n3 4 5 1 2", expectedOutput: "1", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "4\n4 5 6 7", expectedOutput: "4", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "5\n2 2 2 0 1", expectedOutput: "0", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "3\n1 3 5", expectedOutput: "1", isSample: false, points: 30, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "search-in-rotated-sorted-array",
      title: "Search in Rotated Sorted Array",
      description: `There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is rotated at an unknown pivot index. Given the array nums after the rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.

**Input**
Line 1: Two integers N (1 ≤ N ≤ 5000) and target
Line 2: N space-separated integers

**Output**
Index of target or -1 if not found

**Example**
Input:
6 0
4 5 6 7 0 1 2

Output:
4`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["binary-search", "arrays"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "6 0\n4 5 6 7 0 1 2", expectedOutput: "4", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "6 3\n4 5 6 7 0 1 2", expectedOutput: "-1", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "1 1\n1", expectedOutput: "0", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "5 5\n1 3 5 7 9", expectedOutput: "2", isSample: false, points: 35, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "3sum",
      title: "3Sum",
      description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets. Output each triplet on a separate line with space-separated values in sorted order.

**Input**
Line 1: Integer N (1 ≤ N ≤ 3000)
Line 2: N space-separated integers

**Output**
All unique triplets that sum to 0, one per line, sorted

**Example**
Input:
6
-1 0 1 2 -1 -4

Output:
-1 -1 2
-1 0 1`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["arrays", "two-pointers"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "6\n-1 0 1 2 -1 -4", expectedOutput: "-1 -1 2\n-1 0 1", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "3\n0 0 0", expectedOutput: "0 0 0", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "4\n0 1 1", expectedOutput: "", isSample: false, points: 40, orderIndex: 2 },
      { stdin: "5\n-2 0 1 1 2", expectedOutput: "-2 0 2\n-2 1 1", isSample: false, points: 40, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "container-with-most-water",
      title: "Container With Most Water",
      description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.

**Input**
Line 1: Integer N (2 ≤ N ≤ 10^5)
Line 2: N space-separated integers representing heights

**Output**
Maximum area of water that can be contained

**Example**
Input:
9
1 8 6 2 5 4 8 3 7

Output:
49`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["arrays", "two-pointers"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "9\n1 8 6 2 5 4 8 3 7", expectedOutput: "49", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "2\n1 1", expectedOutput: "1", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "5\n4 3 2 1 4", expectedOutput: "16", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "3\n1 2 1", expectedOutput: "2", isSample: false, points: 35, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "valid-parentheses",
      title: "Valid Parentheses",
      description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.

**Input**
A single string s (1 ≤ |s| ≤ 10^4)

**Output**
"true" if valid, "false" otherwise

**Example**
Input: ()[]{}
Output: true`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["stack", "string"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 65536,
    },
    testCases: [
      { stdin: "()[]{}", expectedOutput: "true", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "(]", expectedOutput: "false", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "()", expectedOutput: "true", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "([)]", expectedOutput: "false", isSample: false, points: 15, orderIndex: 3 },
      { stdin: "{[]}", expectedOutput: "true", isSample: false, points: 15, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "min-stack",
      title: "Min Stack",
      description: `Design a stack that supports push, pop, top, and retrieving the minimum element in constant time. Implement the MinStack class with methods: push(x), pop(), top(), and getMin(). The input will be a series of operations. For each "getMin" operation, output the current minimum.

**Input**
First line: integer N (number of operations)
Next N lines: operations in format "push x", "pop", "top", or "getMin"

**Output**
For each "getMin" operation, output the minimum value on a new line

**Example**
Input:
6
push -2
push 0
push -3
getMin
pop
getMin

Output:
-3
-2`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["stack", "design"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "6\npush -2\npush 0\npush -3\ngetMin\npop\ngetMin", expectedOutput: "-3\n-2", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "4\npush 1\npush 2\ngetMin\ntop", expectedOutput: "1", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "5\npush 5\npush 4\ngetMin\npop\ngetMin", expectedOutput: "4\n5", isSample: false, points: 30, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "evaluate-reverse-polish-notation",
      title: "Evaluate Reverse Polish Notation",
      description: `Evaluate the value of an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, *, and /. Each operand may be an integer or another expression. Division between two integers should truncate toward zero.

**Input**
Line 1: Integer N (number of tokens)
Line 2: N space-separated tokens (operators or integers)

**Output**
Result of the evaluation

**Example**
Input:
5
2 1 + 3 *

Output:
9`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["stack", "math"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "5\n2 1 + 3 *", expectedOutput: "9", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "5\n4 13 5 / +", expectedOutput: "6", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "5\n10 6 9 3 + -11 * / * 17 + 5 +", expectedOutput: "22", isSample: false, points: 30, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "generate-parentheses",
      title: "Generate Parentheses",
      description: `Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses. Output each combination on a separate line.

**Input**
Integer n (1 ≤ n ≤ 8)

**Output**
All valid combinations of n pairs of parentheses, one per line

**Example**
Input: 3
Output:
((()))
(()())
(())()
()(())
()()()`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["backtracking", "string"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3", expectedOutput: "((()))\n(()())\n(())()\n()(())\n()()()", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "1", expectedOutput: "()", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "2", expectedOutput: "(())\n()()", isSample: false, points: 35, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "daily-temperatures",
      title: "Daily Temperatures",
      description: `Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the i-th day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers

**Output**
N space-separated integers

**Example**
Input:
8
73 74 75 71 69 72 76 73

Output:
1 1 4 2 1 1 0 0`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["stack", "array"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "8\n73 74 75 71 69 72 76 73", expectedOutput: "1 1 4 2 1 1 0 0", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "4\n30 40 50 60", expectedOutput: "1 1 1 0", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "4\n30 60 90", expectedOutput: "1 1 0", isSample: false, points: 30, orderIndex: 2 },
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
      slug: "valid-anagram",
      title: "Valid Anagram",
      description: `Given two strings s and t, return true if t is an anagram of s, and false otherwise.

**Input**
Two strings s and t on separate lines (1 ≤ |s|, |t| ≤ 5 * 10^4)

**Output**
"true" if anagram, "false" otherwise

**Example**
Input:
anagram
nagaram

Output:
true`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["strings", "hash-map"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 65536,
    },
    testCases: [
      { stdin: "anagram\nnagaram", expectedOutput: "true", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "rat\ncar", expectedOutput: "false", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "a\na", expectedOutput: "true", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "ab\nba", expectedOutput: "true", isSample: false, points: 15, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "longest-repeating-character-replacement",
      title: "Longest Repeating Character Replacement",
      description: `You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times. Return the length of the longest substring containing the same letter after performing the above operations.

**Input**
Line 1: String s (1 ≤ |s| ≤ 10^5)
Line 2: Integer k

**Output**
Maximum length of substring with same characters

**Example**
Input:
ABAB
2

Output:
4`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["sliding-window", "string"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "ABAB\n2", expectedOutput: "4", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "AABABBA\n1", expectedOutput: "4", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "AAAA\n0", expectedOutput: "4", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "ABCDE\n1", expectedOutput: "2", isSample: false, points: 35, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "minimum-window-substring",
      title: "Minimum Window Substring",
      description: `Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string.

**Input**
Two lines: string s and string t

**Output**
Minimum window substring or empty string

**Example**
Input:
ADOBECODEBANC
ABC

Output:
BANC`,
      difficulty: "hard" as const,
      points: 225,
      tags: ["sliding-window", "string"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "ADOBECODEBANC\nABC", expectedOutput: "BANC", isSample: true, points: 45, orderIndex: 0 },
      { stdin: "a\na", expectedOutput: "a", isSample: true, points: 45, orderIndex: 1 },
      { stdin: "a\naa", expectedOutput: "", isSample: false, points: 45, orderIndex: 2 },
      { stdin: "ab\nb", expectedOutput: "b", isSample: false, points: 45, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "group-anagrams",
      title: "Group Anagrams",
      description: `Given an array of strings strs, group the anagrams together. You can return the answer in any order. Output each group on a separate line with space-separated strings.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^4)
Line 2: N space-separated strings

**Output**
Groups of anagrams, each group on a separate line with space-separated strings

**Example**
Input:
4
eat tea tan ate nat bat

Output:
eat tea ate
tan nat
bat`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["hash-map", "string"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "4\neat tea tan ate nat bat", expectedOutput: "eat tea ate\ntan nat\nbat", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "1\na", expectedOutput: "a", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "3\nabc bca cab", expectedOutput: "abc bca cab", isSample: false, points: 35, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "valid-sudoku",
      title: "Valid Sudoku",
      description: `Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules: Each row must contain the digits 1-9 without repetition, each column must contain the digits 1-9 without repetition, and each of the nine 3x3 sub-boxes must contain the digits 1-9 without repetition.

**Input**
9 lines, each containing 9 characters (digits or '.' representing empty cells)

**Output**
"true" if valid, "false" otherwise

**Example**
Input:
53..7....
6..195...
.98....6.
8...6...3


4..8.3..1
7...2...6
.6....28.
...419..5
....8..79

Output:
true`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["matrix", "hash-set"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "53..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79", expectedOutput: "true", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "83..7....\n6..195...\n.98....6.\n8...6...3\n4..8.3..1\n7...2...6\n.6....28.\n...419..5\n....8..79", expectedOutput: "false", isSample: true, points: 30, orderIndex: 1 },
    ],
  },
  {
    problem: {
      slug: "longest-consecutive-sequence",
      title: "Longest Consecutive Sequence",
      description: `Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.

**Input**
Line 1: Integer N (1 ≤ N ≤ 10^5)
Line 2: N space-separated integers

**Output**
Length of longest consecutive sequence

**Example**
Input:
6
100 4 200 1 3 2

Output:
4`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["array", "hash-set"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "6\n100 4 200 1 3 2", expectedOutput: "4", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "1\n0", expectedOutput: "1", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "5\n1 2 0 1", expectedOutput: "3", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "4\n9 1 4 7 3 -1 0 5 8 -1 6", expectedOutput: "7", isSample: false, points: 30, orderIndex: 3 },
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
      slug: "search-a-2d-matrix",
      title: "Search a 2D Matrix",
      description: `Write an efficient algorithm that searches for a value target in an m x n integer matrix. This matrix has the following properties: Integers in each row are sorted from left to right, and the first integer of each row is greater than the last integer of the previous row.

**Input**
Line 1: Three integers m, n, and target
Next m lines: n space-separated integers each

**Output**
"true" if target exists, "false" otherwise

**Example**
Input:
3 4 3
1 3 5 7
10 11 16 20
23 30 34 60

Output:
true`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["binary-search", "matrix"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3 4 3\n1 3 5 7\n10 11 16 20\n23 30 34 60", expectedOutput: "true", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "3 4 13\n1 3 5 7\n10 11 16 20\n23 30 34 60", expectedOutput: "false", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "1 1 1\n1", expectedOutput: "true", isSample: false, points: 35, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "combination-sum",
      title: "Combination Sum",
      description: `Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen from candidates an unlimited number of times. Output each combination on a separate line with space-separated values in sorted order.

**Input**
Line 1: Two integers n (size of array) and target
Line 2: n space-separated distinct integers

**Output**
All unique combinations, one per line

**Example**
Input:
4 7
2 3 6 7

Output:
2 2 3
7`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["backtracking", "array"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "4 7\n2 3 6 7", expectedOutput: "2 2 3\n7", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "3 8\n2 3 5", expectedOutput: "2 2 2 2\n2 3 3\n3 5", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "1 1\n1", expectedOutput: "1", isSample: false, points: 40, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "word-search",
      title: "Word Search",
      description: `Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.

**Input**
Line 1: Two integers m and n
Next m lines: n characters each (no spaces)
Last line: the word to search

**Output**
"true" if word exists, "false" otherwise

**Example**
Input:
3 4
ABCE
SFCS
ADEE
ABCCED

Output:
true`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["backtracking", "matrix"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "3 4\nABCE\nSFCS\nADEE\nABCCED", expectedOutput: "true", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "3 4\nABCE\nSFCS\nADEE\nSEE", expectedOutput: "true", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "3 4\nABCE\nSFCS\nADEE\nABCB", expectedOutput: "false", isSample: false, points: 40, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "palindrome-partitioning",
      title: "Palindrome Partitioning",
      description: `Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitionings of s. Output each partitioning on a separate line with substrings separated by spaces.

**Input**
A string s (1 ≤ |s| ≤ 16)

**Output**
All possible palindrome partitionings

**Example**
Input:
aab

Output:
a a b
aa b`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["backtracking", "string"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "aab", expectedOutput: "a a b\naa b", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "a", expectedOutput: "a", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "aa", expectedOutput: "a a\naa", isSample: false, points: 40, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "coin-change",
      title: "Coin Change",
      description: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

**Input**
Line 1: Two integers n (number of coins) and amount
Line 2: n space-separated coin denominations

**Output**
Minimum number of coins or -1 if impossible

**Example**
Input:
3 11
1 2 5

Output:
3`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["dynamic-programming", "array"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "3 11\n1 2 5", expectedOutput: "3", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "1 3\n2", expectedOutput: "-1", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "1 0\n1", expectedOutput: "0", isSample: false, points: 40, orderIndex: 2 },
      { stdin: "2 6\n1 3", expectedOutput: "2", isSample: false, points: 40, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "subsets",
      title: "Subsets",
      description: `Given an integer array nums of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Output each subset on a separate line with space-separated values in sorted order.

**Input**
Line 1: Integer n
Line 2: n space-separated integers

**Output**
All possible subsets, one per line

**Example**
Input:
3
1 2 3

Output:

1
2
3
1 2
1 3
2 3
1 2 3`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["backtracking", "array"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "3\n1 2 3", expectedOutput: "\n1\n2\n3\n1 2\n1 3\n2 3\n1 2 3", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "1\n0", expectedOutput: "\n0", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "2\n1 2", expectedOutput: "\n1\n2\n1 2", isSample: false, points: 35, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "word-break",
      title: "Word Break",
      description: `Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.

**Input**
Line 1: String s
Line 2: Integer n (number of words in dictionary)
Line 3: n space-separated dictionary words

**Output**
"true" if s can be segmented, "false" otherwise

**Example**
Input:
leetcode
2
leet code

Output:
true`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["dynamic-programming", "string"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "leetcode\n2\nleet code", expectedOutput: "true", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "applepenapple\n2\napple pen", expectedOutput: "true", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "catsandog\n2\ncats dog sand and cat", expectedOutput: "false", isSample: false, points: 35, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "house-robber",
      title: "House Robber",
      description: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into the same night. Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.

**Input**
Line 1: Integer n
Line 2: n space-separated integers

**Output**
Maximum amount that can be robbed

**Example**
Input:
4
1 2 3 1

Output:
4`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["dynamic-programming", "array"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "4\n1 2 3 1", expectedOutput: "4", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "5\n2 7 9 3 1", expectedOutput: "12", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "1", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "3\n2 1 1", expectedOutput: "2", isSample: false, points: 30, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "house-robber-ii",
      title: "House Robber II",
      description: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. That means the first house is the neighbor of the last one. Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.

**Input**
Line 1: Integer n
Line 2: n space-separated integers

**Output**
Maximum amount that can be robbed

**Example**
Input:
3
2 3 2

Output:
3`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["dynamic-programming", "array"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3\n2 3 2", expectedOutput: "3", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "4\n1 2 3 1", expectedOutput: "4", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "1", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "2\n1 2", expectedOutput: "2", isSample: false, points: 35, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "decode-ways",
      title: "Decode Ways",
      description: `A message containing letters from A-Z can be encoded into numbers using the mapping 'A' -> "1", 'B' -> "2", ..., 'Z' -> "26". To decode an encoded message, all the digits must be grouped then mapped back into letters using the reverse of the mapping above (there may be multiple ways). Given a string s containing only digits, return the number of ways to decode it.

**Input**
A string s containing only digits (1 ≤ |s| ≤ 100)

**Output**
Number of ways to decode

**Example**
Input: 12
Output: 2`,
      difficulty: "medium" as const,
      points: 175,
      tags: ["dynamic-programming", "string"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "12", expectedOutput: "2", isSample: true, points: 35, orderIndex: 0 },
      { stdin: "226", expectedOutput: "3", isSample: true, points: 35, orderIndex: 1 },
      { stdin: "0", expectedOutput: "0", isSample: false, points: 35, orderIndex: 2 },
      { stdin: "06", expectedOutput: "0", isSample: false, points: 35, orderIndex: 3 },
      { stdin: "10", expectedOutput: "1", isSample: false, points: 35, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "unique-paths",
      title: "Unique Paths",
      description: `There is a robot on an m x n grid. The robot is initially located at the top-left corner. The robot tries to move to the bottom-right corner. The robot can only move either down or right at any point in time. Given the two integers m and n, return the number of possible unique paths that the robot can take to reach the bottom-right corner.

**Input**
Two integers m and n (1 ≤ m, n ≤ 100)

**Output**
Number of unique paths

**Example**
Input: 3 7
Output: 28`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["dynamic-programming", "combinatorics"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3 7", expectedOutput: "28", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "3 2", expectedOutput: "3", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "1 1", expectedOutput: "1", isSample: false, points: 30, orderIndex: 2 },
      { stdin: "2 2", expectedOutput: "2", isSample: false, points: 30, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "climbing-stairs",
      title: "Climbing Stairs",
      description: `You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**Input**
Integer n (1 ≤ n ≤ 45)

**Output**
Number of distinct ways to climb

**Example**
Input: 3
Output: 3`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["dynamic-programming"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 65536,
    },
    testCases: [
      { stdin: "3", expectedOutput: "3", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "2", expectedOutput: "2", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "1", expectedOutput: "1", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "4", expectedOutput: "5", isSample: false, points: 15, orderIndex: 3 },
      { stdin: "5", expectedOutput: "8", isSample: false, points: 15, orderIndex: 4 },
    ],
  },
  {
    problem: {
      slug: "max-depth-binary-tree",
      title: "Maximum Depth of Binary Tree",
      description: `Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node. Input is given as a level-order traversal with null markers for missing nodes.

**Input**
Line 1: Integer n (number of nodes including nulls)
Line 2: n space-separated values (integers or "null")

**Output**
Maximum depth

**Example**
Input:
7
3 9 20 null null 15 7

Output:
3`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["tree", "dfs"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "7\n3 9 20 null null 15 7", expectedOutput: "3", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "3\n1 null 2", expectedOutput: "2", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "1", isSample: false, points: 15, orderIndex: 2 },
      { stdin: "0", expectedOutput: "0", isSample: false, points: 15, orderIndex: 3 },
    ],
  },
  {
    problem: {
      slug: "invert-binary-tree",
      title: "Invert Binary Tree",
      description: `Given the root of a binary tree, invert the tree, and return its root. Input is given as a level-order traversal with null markers for missing nodes. Output the inverted tree as a level-order traversal.

**Input**
Line 1: Integer n (number of nodes including nulls)
Line 2: n space-separated values (integers or "null")

**Output**
Level-order traversal of inverted tree with null markers

**Example**
Input:
7
4 2 7 1 3 6 9

Output:
4 7 2 9 6 3 1`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["tree", "dfs"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "7\n4 2 7 1 3 6 9", expectedOutput: "4 7 2 9 6 3 1", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "3\n2 1 3", expectedOutput: "2 3 1", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "0", expectedOutput: "", isSample: false, points: 15, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "same-tree",
      title: "Same Tree",
      description: `Given the roots of two binary trees p and q, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value. Input is given as two level-order traversals.

**Input**
Line 1: Integer n1 (number of nodes in tree 1 including nulls)
Line 2: n1 space-separated values for tree 1
Line 3: Integer n2 (number of nodes in tree 2 including nulls)
Line 4: n2 space-separated values for tree 2

**Output**
"true" if same, "false" otherwise

**Example**
Input:
3
1 2 3
3
1 2 3

Output:
true`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["tree", "dfs"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "3\n1 2 3\n3\n1 2 3", expectedOutput: "true", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "3\n1 2\n3\n1 null 2", expectedOutput: "false", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "0\n0", expectedOutput: "true", isSample: false, points: 15, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "symmetric-tree",
      title: "Symmetric Tree",
      description: `Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center). Input is given as a level-order traversal with null markers.

**Input**
Line 1: Integer n (number of nodes including nulls)
Line 2: n space-separated values (integers or "null")

**Output**
"true" if symmetric, "false" otherwise

**Example**
Input:
7
1 2 2 3 4 4 3

Output:
true`,
      difficulty: "easy" as const,
      points: 75,
      tags: ["tree", "dfs"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "7\n1 2 2 3 4 4 3", expectedOutput: "true", isSample: true, points: 15, orderIndex: 0 },
      { stdin: "7\n1 2 2 null 3 null 3", expectedOutput: "false", isSample: true, points: 15, orderIndex: 1 },
      { stdin: "1\n1", expectedOutput: "true", isSample: false, points: 15, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "binary-tree-level-order",
      title: "Binary Tree Level Order Traversal",
      description: `Given the root of a binary tree, return the level order traversal of its nodes' values. Input is given as a level-order traversal with null markers. Output each level on a separate line with space-separated values.

**Input**
Line 1: Integer n (number of nodes including nulls)
Line 2: n space-separated values (integers or "null")

**Output**
Level order traversal, each level on a separate line

**Example**
Input:
9
3 9 20 null null 15 7

Output:
3
9 20
15 7`,
      difficulty: "medium" as const,
      points: 150,
      tags: ["tree", "bfs"],
      cpuTimeLimitSeconds: 1,
      memoryLimitKb: 131072,
    },
    testCases: [
      { stdin: "9\n3 9 20 null null 15 7", expectedOutput: "3\n9 20\n15 7", isSample: true, points: 30, orderIndex: 0 },
      { stdin: "1\n1", expectedOutput: "1", isSample: true, points: 30, orderIndex: 1 },
      { stdin: "0", expectedOutput: "", isSample: false, points: 30, orderIndex: 2 },
    ],
  },
  {
    problem: {
      slug: "number-of-islands",
      title: "Number of Islands",
      description: `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**Input**
Line 1: Two integers m and n
Next m lines: n characters each ('0' or '1')

**Output**
Number of islands

**Example**
Input:
4 5
11000
11000
00100
00011

Output:
3`,
      difficulty: "medium" as const,
      points: 200,
      tags: ["graph", "dfs", "matrix"],
      cpuTimeLimitSeconds: 2,
      memoryLimitKb: 262144,
    },
    testCases: [
      { stdin: "4 5\n11000\n11000\n00100\n00011", expectedOutput: "3", isSample: true, points: 40, orderIndex: 0 },
      { stdin: "3 3\n111\n101\n011", expectedOutput: "1", isSample: true, points: 40, orderIndex: 1 },
      { stdin: "2 2\n11\n11", expectedOutput: "1", isSample: false, points: 40, orderIndex: 2 },
      { stdin: "2 2\n10\n01", expectedOutput: "2", isSample: false, points: 40, orderIndex: 3 },
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

export async function initializeLocalDatabase() {
  await fs.mkdir(path.dirname(localDatabasePath), { recursive: true });

  const client = new PGlite(localDatabasePath);
  const localDb = drizzle(client, { schema });

  for (const statement of schemaStatements) {
    await localDb.execute(sql.raw(statement));
  }

  for (const language of seedLanguages) {
    const existingLanguage = await localDb.query.languagesTable.findFirst({
      where: (languageRow) => eq(languageRow.judge0Id, language.judge0Id),
    });

    if (!existingLanguage) {
      await localDb.insert(schema.languagesTable).values(language);
    }
  }

  for (const { problem, testCases } of seedProblems) {
    const existingProblem = await localDb.query.problemsTable.findFirst({
      where: (problemRow) => eq(problemRow.slug, problem.slug),
    });

    if (existingProblem) {
      continue;
    }

    const [insertedProblem] = await localDb.insert(schema.problemsTable).values(problem).returning();

    for (const testCase of testCases) {
      await localDb.insert(schema.testCasesTable).values({ problemId: insertedProblem.id, ...testCase });
    }
  }

  return localDb;
}