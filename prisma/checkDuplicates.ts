import questions from "./questions"; // adjust path

const map = new Map<string, { choices: string[]; index: number }[]>();

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const key = `${q.text.trim().toLowerCase()}|${q.subject}`;
  const entry = { choices: q.choices, index: i };
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(entry);
}

let found = false;
for (const [key, entries] of map.entries()) {
  if (entries.length < 2) continue;
  // check if any two have different choice lists
  const firstChoices = entries[0].choices.join("|||");
  for (let j = 1; j < entries.length; j++) {
    if (entries[j].choices.join("|||") !== firstChoices) {
      console.log(`VARIANT at indices ${entries[0].index} and ${entries[j].index}:`);
      console.log(`  Key: ${key}`);
      console.log(`  Choices A: ${JSON.stringify(entries[0].choices)}`);
      console.log(`  Choices B: ${JSON.stringify(entries[j].choices)}`);
      found = true;
    }
  }
}

if (!found) console.log("All questions with identical text+subject have identical choices. Dedup was safe.");