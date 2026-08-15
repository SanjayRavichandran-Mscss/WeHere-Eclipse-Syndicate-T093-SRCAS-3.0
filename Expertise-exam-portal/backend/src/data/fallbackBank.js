// Small safety-net question bank. Only used if the local Ollama model is
// unreachable or keeps returning malformed output, so the portal still works
// while you get Ollama set up. Ollama-generated questions are always
// preferred when available.

export const fallbackBank = {
  javascript: {
    easy: [
      q("What does `typeof []` return in JavaScript?", ["object", "array", "undefined", "function"], 0),
      q("Which keyword declares a block-scoped variable?", ["var", "let", "global", "static"], 1),
      q("What is the result of `2 + '2'` in JavaScript?", ["4", "'22'", "NaN", "22"], 1),
      q("Which method adds an item to the end of an array?", ["push()", "pop()", "shift()", "unshift()"], 0),
      q("What does `===` check that `==` doesn't?", ["Nothing", "Value only", "Type and value", "Reference only"], 2),
    ],
    medium: [
      q("What does `this` refer to inside a regular function called without a context?", ["The function itself", "undefined in strict mode", "The nearest object", "null always"], 1),
      q("What is a closure?", ["A loop construct", "A function bundled with its lexical scope", "A CSS property", "A type of array"], 1),
      q("What does `Array.prototype.map` return?", ["The original array", "A new array", "A single value", "undefined"], 1),
      q("What is event bubbling?", ["Events firing from parent to child", "Events firing from child to parent", "Events cancelling each other", "A memory leak"], 1),
      q("What does `Promise.all` do if one promise rejects?", ["Ignores it", "Rejects immediately", "Waits for all regardless", "Retries automatically"], 1),
    ],
    hard: [
      q("What causes a memory leak with closures in JS?", ["Garbage collector bugs", "Retaining references to unused outer variables", "Using `let`", "Using arrow functions"], 1),
      q("What is the microtask queue used for?", ["setTimeout callbacks", "Promise callbacks", "DOM events", "Web workers"], 1),
      q("What's the output order of sync code, microtasks, and macrotasks?", ["Macro, micro, sync", "Sync, micro, macro", "Micro, sync, macro", "Random"], 1),
      q("What does `Object.freeze` fail to do?", ["Prevent new properties", "Prevent deep nested mutation", "Prevent reassignment of properties", "Prevent deletion"], 1),
      q("Why can `for...in` be risky on arrays?", ["It's slower than for-loops", "It iterates enumerable inherited props too", "It doesn't work at all", "It only works on objects"], 1),
    ],
  },
  python: {
    easy: [
      q("Which symbol is used for comments in Python?", ["//", "#", "--", "/*"], 1),
      q("What type is returned by `3 / 2` in Python 3?", ["int", "float", "str", "bool"], 1),
      q("Which keyword defines a function?", ["func", "def", "function", "lambda only"], 1),
      q("What does `len('hello')` return?", ["4", "5", "6", "Error"], 1),
      q("Which data structure is ordered and mutable?", ["tuple", "set", "list", "frozenset"], 2),
    ],
    medium: [
      q("What does a Python decorator do?", ["Deletes a function", "Wraps and extends a function's behavior", "Compiles the code", "Only formats strings"], 1),
      q("What is the difference between `is` and `==`?", ["No difference", "`is` checks identity, `==` checks equality", "`is` is faster only", "`==` checks identity"], 1),
      q("What does a Python generator use to yield values?", ["return", "yield", "break", "pass"], 1),
      q("What's the purpose of `__init__` in a class?", ["Destroys the object", "Initializes a new instance", "Imports modules", "Defines static methods"], 1),
      q("What does list comprehension `[x*2 for x in range(3)]` produce?", ["[0,1,2]", "[0,2,4]", "[2,4,6]", "Error"], 1),
    ],
    hard: [
      q("What is the GIL in CPython?", ["A garbage collector", "A lock allowing one thread to execute Python bytecode at a time", "A type checker", "A build tool"], 1),
      q("What does `*args` and `**kwargs` allow?", ["Only positional args", "Variable-length positional and keyword args", "Only keyword args", "Nothing, it's invalid syntax"], 1),
      q("What's a metaclass in Python?", ["A class that inherits twice", "A class whose instances are classes", "A private class", "A deprecated feature"], 1),
      q("What does `functools.lru_cache` do?", ["Logs function calls", "Caches function results for reuse", "Limits recursion depth", "Encrypts return values"], 1),
      q("Why use `__slots__` in a class?", ["To add more attributes", "To reduce memory by disallowing dynamic attributes", "To enable multiple inheritance", "To speed up imports only"], 1),
    ],
  },
  react: {
    easy: [
      q("What function lets you add state to a functional component?", ["useEffect", "useState", "useRef", "useMemo"], 1),
      q("What does JSX compile down to?", ["HTML", "React.createElement calls", "CSS", "JSON"], 1),
      q("How do you pass data from parent to child?", ["State", "Props", "Context only", "Redux only"], 1),
      q("What hook runs side effects after render?", ["useState", "useEffect", "useReducer", "useCallback"], 1),
      q("What is a React 'key' used for in lists?", ["Styling", "Helping React identify changed items", "Encryption", "Routing"], 1),
    ],
    medium: [
      q("What problem does `useMemo` solve?", ["Avoiding unnecessary state", "Memoizing expensive computed values", "Handling routing", "Managing forms"], 1),
      q("What is prop drilling?", ["Passing props through many nested layers", "A React anti-pattern for styling", "A build error", "A testing technique"], 0),
      q("What does the Context API let you avoid?", ["useState", "Prop drilling", "JSX", "Virtual DOM"], 1),
      q("When does a class component call `componentDidUpdate`?", ["On mount only", "After a re-render caused by state/props change", "On unmount", "Never"], 1),
      q("What does `React.memo` do?", ["Adds state to a component", "Skips re-render if props are unchanged", "Removes a component", "Enables routing"], 1),
    ],
    hard: [
      q("What is the purpose of React's reconciliation algorithm?", ["Styling components", "Efficiently diffing and updating the virtual DOM", "Managing HTTP requests", "Bundling code"], 1),
      q("Why can custom hooks not be called conditionally?", ["Performance only", "React relies on consistent call order between renders", "They're deprecated", "They must be async"], 1),
      q("What does `useLayoutEffect` do differently from `useEffect`?", ["Nothing, they're identical", "Fires synchronously after DOM mutations, before paint", "Only works in class components", "Runs on the server only"], 1),
      q("What's a common cause of unnecessary re-renders in React?", ["Using JSX", "Passing new object/function references as props each render", "Using hooks", "Using semantic HTML"], 1),
      q("What does React's concurrent rendering enable?", ["Faster network calls", "Interruptible rendering for better responsiveness", "Server-only components", "Smaller bundle size"], 1),
    ],
  },
  "node.js": {
    easy: [
      q("What is Node.js built on?", ["SpiderMonkey", "V8 JavaScript engine", "Chakra", "JVM"], 1),
      q("Which module system does Node use by default in .js files?", ["ES Modules", "CommonJS", "AMD", "UMD"], 1),
      q("What does `npm` stand for informally?", ["Node Package Manager", "New Program Module", "Node Process Model", "Network Package Manager"], 0),
      q("Which global object represents the current module in CommonJS?", ["window", "module", "global.this", "document"], 1),
      q("What does `require('fs')` give you access to?", ["Networking", "File system operations", "HTTP server only", "Database driver"], 1),
    ],
    medium: [
      q("What is the Node.js Event Loop responsible for?", ["Compiling JS", "Handling async callbacks and non-blocking I/O", "Managing CSS", "Bundling modules"], 1),
      q("What does middleware do in Express?", ["Renders HTML only", "Processes requests/responses in a pipeline", "Only handles errors", "Replaces routing"], 1),
      q("What's the difference between `process.nextTick` and `setImmediate`?", ["No difference", "nextTick runs before I/O events, setImmediate after", "setImmediate runs first always", "Both are deprecated"], 1),
      q("Why use streams in Node.js?", ["To block execution", "To process data in chunks without loading it all into memory", "Only for logging", "To manage npm packages"], 1),
      q("What does `cluster` module help with?", ["Styling", "Utilizing multiple CPU cores", "Database migrations", "Type checking"], 1),
    ],
    hard: [
      q("How does Node.js handle CPU-bound tasks without blocking the event loop?", ["It can't", "Worker threads or offloading to child processes", "Automatically via V8", "Using more RAM"], 1),
      q("What's a common cause of memory leaks in long-running Node servers?", ["Using const", "Uncleared timers/listeners holding references", "Using async/await", "Using Express"], 1),
      q("What does backpressure mean in Node streams?", ["Network latency", "Consumer being slower than producer, requiring flow control", "A CPU throttling feature", "A security vulnerability"], 1),
      q("Why might `JSON.parse` on huge payloads block the event loop?", ["It's asynchronous", "It's a synchronous, CPU-bound operation", "It uses worker threads automatically", "It streams by default"], 1),
      q("What is the purpose of the libuv library in Node.js?", ["Parsing JSON", "Providing the event loop and async I/O abstraction", "Compiling TypeScript", "Managing npm packages"], 1),
    ],
  },
};

function q(question, options, correctIndex) {
  return { question, options, correctIndex, explanation: "" };
}

// Generic, templated fallback questions. Used only as a last-resort safety
// net when Ollama is unreachable/times out AND the candidate typed a skill
// that isn't one of the hand-written banks above (which, since the portal
// accepts any free-text skill, is the common case). `{skill}` is substituted
// with the candidate's actual skill so these at least read as being about
// the right topic, rather than generic filler — they're still not a
// substitute for real AI-generated questions on that skill.
const GENERIC_FALLBACK_TEMPLATES = {
  easy: [
    q("Which of these best describes a fundamental first step when learning {skill}?", ["Skipping the basics entirely", "Understanding core {skill} concepts and terminology", "Memorizing edge cases first", "Ignoring documentation"], 1),
    q("What generally distinguishes a beginner-level {skill} task from an advanced one?", ["Beginner tasks require no thought", "Beginner tasks focus on core, well-documented {skill} concepts", "Beginner tasks are always longer", "There's no real difference"], 1),
    q("Why is hands-on practice usually recommended when learning {skill}?", ["It replaces the need for concepts", "It reinforces {skill} concepts through applied experience", "It's faster than reading documentation", "It's only useful for physical skills"], 1),
    q("What's a reasonable first resource when starting to learn {skill}?", ["Advanced research papers only", "An introductory guide or course covering the fundamentals", "Nothing — jump straight into complex projects", "Skip theory and guess"], 1),
  ],
  medium: [
    q("What typically separates intermediate proficiency in {skill} from beginner knowledge?", ["Memorizing more trivia", "Applying {skill} concepts in practical, less guided scenarios", "Working faster only", "Avoiding documentation"], 1),
    q("Why do practitioners of {skill} often revisit fundamentals even at an intermediate level?", ["Fundamentals become irrelevant", "Solid fundamentals underpin more complex {skill} problem-solving", "It's required by certification bodies only", "It has no real benefit"], 1),
    q("What's a common sign of intermediate-level competence in {skill}?", ["Inability to explain basics", "Recognizing trade-offs between different {skill} approaches", "Only following tutorials exactly", "Avoiding real-world tasks"], 1),
  ],
  hard: [
    q("What generally characterizes expert-level understanding of {skill}?", ["Rote memorization only", "Recognizing nuanced {skill} edge cases and trade-offs others miss", "Refusing to use available tools", "Working in isolation from best practices"], 1),
    q("Why might an expert in {skill} deliberately choose a less common approach to a problem?", ["To make things harder", "Because it better fits specific constraints or trade-offs", "Randomly, without reasoning", "To avoid documentation"], 1),
    q("What often distinguishes expert troubleshooting in {skill} from beginner troubleshooting?", ["Guessing randomly", "Diagnosing root causes rather than just symptoms", "Avoiding the problem entirely", "Always restarting from scratch"], 1),
  ],
};

function buildGenericFallback(skill, difficulty) {
  const templates = GENERIC_FALLBACK_TEMPLATES[difficulty] || [];
  return templates.map((t) => ({
    ...t,
    question: t.question.replaceAll("{skill}", skill),
    options: t.options.map((o) => o.replaceAll("{skill}", skill)),
  }));
}

export function getFallbackQuestions(skill, difficulty, count) {
  const key = skill.toLowerCase();
  const bank = fallbackBank[key]?.[difficulty] || buildGenericFallback(skill, difficulty);
  // Shuffle and slice; if bank is smaller than count, repeat-fill (demo safety net).
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length] || shuffled[0]);
  }
  return result;
}
