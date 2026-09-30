let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const CATEGORIES = ["personal", "work", "study"];

// Lower-cases, trims and collapses extra spaces so texts can be compared fairly
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// 1. Notes whose text contains the word (ignoring case)
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}

// 2. The note with the most characters, or null if there are none
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 3. An object counting notes per category
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// 4. A sentence such as "5 notes: 2 personal, 1 work, 2 study."
function getSummary() {
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  const parts = [];
  for (const category of CATEGORIES) {
    if (counts[category]) {
      parts.push(`${counts[category]} ${category}`);
    }
  }
  if (parts.length === 0) {
    return `${total} ${word}.`;
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// 5. True if a note with the same text exists (ignoring case and extra spaces)
function isDuplicate(text) {
  const cleaned = normalize(text);
  return notes.some((note) => normalize(note.text) === cleaned);
}

// 6. Adds a note if it passes all checks; returns true or false
function addNote(text, category) {
  const cleaned = text.trim();
  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Not added: text must be 1-200 characters.");
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Not added: duplicate note.");
    return false;
  }
  const id = notes.length === 0 ? 1 : notes[notes.length - 1].id + 1;
  notes.push({ id: id, text: cleaned, category: category });
  return true;
}

// ---------- Tests ----------
const originalNotes = notes;

// searchNotes
console.log(searchNotes("the"));
// Expected: [ {id: 2, text: "Finish the Day 3 assignment", category: "study"},
//             {id: 3, text: "Email the project report to Grace", category: "work"} ]
console.log(searchNotes("MILK"));
// Expected: [ {id: 1, text: "Buy milk and bread", category: "personal"} ]
console.log(searchNotes("banana"));
// Expected: [] (no results)

// longestNote
console.log(longestNote());
// Expected: {id: 3, text: "Email the project report to Grace", category: "work"}
notes = [];
console.log(longestNote());
// Expected: null (no notes)
notes = originalNotes;

// countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory());
// Expected: {} (no notes)
notes = originalNotes;

// getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [originalNotes[4]];
console.log(getSummary());
// Expected: "1 note: 1 personal." (singular "note")
notes = [];
console.log(getSummary());
// Expected: "0 notes."
notes = originalNotes;

// isDuplicate
console.log(isDuplicate("call mum"));
// Expected: true (same text, different case)
console.log(isDuplicate("  BUY   milk and  bread "));
// Expected: true (extra spaces and capitals are ignored)
console.log(isDuplicate("Walk the dog"));
// Expected: false (not in the list yet)

// addNote
console.log(addNote("Walk the dog", "personal"));
// Expected: true
console.log(addNote("walk the dog", "personal"));
// Expected: logs "Not added: duplicate note." then false
console.log(addNote("   ", "work"));
// Expected: logs "Not added: text must be 1-200 characters." then false
console.log(addNote("a".repeat(201), "work"));
// Expected: logs "Not added: text must be 1-200 characters." then false
console.log(addNote("Plan the week", "hobby"));
// Expected: logs "Not added: category must be personal, work or study." then false
console.log(addNote("Plan the week", "work"));
// Expected: true

// Final check after the two successful additions
console.log(getSummary());
// Expected: "7 notes: 3 personal, 2 work, 2 study."