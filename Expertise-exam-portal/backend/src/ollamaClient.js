// Talks to a locally running Ollama instance to generate exam questions.
// Ollama remains the ONLY question generator. The selected language is sent
// on every generation request so the question, options and explanation are
// generated in that language.

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

const DIFFICULTY_GUIDANCE = {
  easy: "fundamental, beginner-friendly concepts. Someone who has studied the basics for a few weeks should be able to answer.",
  medium: "practical, intermediate concepts that require hands-on experience, not just definitions.",
  hard: "advanced, nuanced concepts, edge cases, or performance/design trade-offs that only an experienced practitioner would know.",
};

// llama3.2:3b is slow on CPU, so asking for one question per HTTP request
// makes a 10-question paper take many minutes. Small batches are a better
// balance: fewer model startups while still being reliable for a 3B model.
const MAX_BATCH_SIZE = 5;
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 150000;
const MAX_GENERATION_ATTEMPTS = 8;

const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
    },
    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
    explanation: { type: "string" },
  },
  required: ["question", "options", "correctIndex", "explanation"],
  additionalProperties: false,
};

const BATCH_SCHEMA = {
  type: "array",
  items: QUESTION_SCHEMA,
  minItems: 1,
  maxItems: MAX_BATCH_SIZE,
};

function buildPrompt({ skill, difficulty, avoid, language, batchSize }) {
  // Keep the prompt small. A huge avoid list makes a small local model slower.
  const compactAvoid = difficulty === "hard"
    ? []
    : (avoid || [])
        .filter((q) => typeof q === "string" && q.trim())
        .slice(-6);

  const avoidBlock = compactAvoid.length
    ? `\nDO NOT repeat or closely rephrase these already-used questions:\n${compactAvoid.map((q) => `- ${q}`).join("\n")}\n`
    : "";

  return `You are an exam-question generator for a technical certification platform.

Generate EXACTLY ${batchSize} different multiple-choice question(s) for the skill "${skill}".

TARGET LANGUAGE: ${language}
LANGUAGE REQUIREMENT — VERY IMPORTANT:
- Write every question ONLY in ${language}.
- Write all answer options ONLY in ${language}.
- Write every explanation ONLY in ${language}.
- Do not write English sentences anywhere in the generated content.
- English technical terms, programming keywords, code, API names, and proper nouns may remain unchanged when they normally stay in English.

Difficulty: ${difficulty.toUpperCase()} — ${DIFFICULTY_GUIDANCE[difficulty]}
${avoidBlock}

For HARD questions, vary the topic across concepts such as edge cases, performance, debugging, architecture, security, data structures, concurrency, or real-world behavior. Do not repeat a question pattern.
Rules for EVERY question:
- Exactly 4 options.
- Exactly 1 option is correct.
- correctIndex MUST be a zero-based integer: 0, 1, 2, or 3.
- Questions must be different from each other.
- Keep questions and options reasonably short.
- Give a short explanation in ${language}.
- Do not include markdown, headings, commentary, or extra text.

Return ONLY a JSON ARRAY containing exactly ${batchSize} objects.
Each object MUST have this shape:
{
  "question": "${language} question",
  "options": ["${language} option 1", "${language} option 2", "${language} option 3", "${language} option 4"],
  "correctIndex": 0,
  "explanation": "${language} explanation"
}`;
}



// Local safety-net questions. These are intentionally simple and skill-related so
// the assessment can still open when the local model times out or returns too
// few valid questions. They are NOT used when Ollama successfully supplies the
// requested count. Technical skill names are preserved because they are often
// proper names (Python, React, SQL, etc.).
const FALLBACK_TEXT = {
  English: {
    purpose: `What is the main purpose of {skill}?`,
    practice: `Which approach is generally considered a good practice when working with {skill}?`,
    debug: `When something does not work as expected in {skill}, what is a sensible first step?`,
    concept: `Which statement best describes a fundamental concept of {skill}?`,
    quality: `Which choice is most likely to improve the quality of work done with {skill}?`,
    optPurpose: "To solve problems or perform tasks using its concepts and features",
    optPractice: "Follow the documented and appropriate approach for the task",
    optDebug: "Check the input, error message, and relevant configuration",
    optConcept: "It provides concepts and techniques for solving problems in its domain",
    optQuality: "Use clear, tested, maintainable approaches appropriate to the task",
    wrong: ["Ignore the problem", "Always use random settings", "Avoid checking the documentation"],
    explanation: "This is a fundamental principle when working with {skill}."
  },
  Hindi: {
    purpose: `{skill} का मुख्य उद्देश्य क्या है?`,
    practice: `{skill} के साथ काम करते समय कौन-सा तरीका सामान्यतः अच्छा अभ्यास माना जाता है?`,
    debug: `{skill} में अपेक्षित परिणाम न मिलने पर पहला उचित कदम क्या होना चाहिए?`,
    concept: `{skill} की मूल अवधारणा का सबसे सही वर्णन कौन-सा है?`,
    quality: `{skill} के साथ किए गए काम की गुणवत्ता सुधारने के लिए कौन-सा विकल्प सबसे उपयुक्त है?`,
    optPurpose: "इसके सिद्धांतों और सुविधाओं का उपयोग करके कार्य या समस्या को हल करना",
    optPractice: "कार्य के अनुसार सही और प्रलेखित तरीका अपनाना",
    optDebug: "इनपुट, त्रुटि संदेश और संबंधित कॉन्फ़िगरेशन की जाँच करना",
    optConcept: "यह अपने क्षेत्र की समस्याओं को हल करने के लिए अवधारणाएँ और तकनीकें प्रदान करता है",
    optQuality: "कार्य के अनुसार स्पष्ट, परीक्षणित और रखरखाव योग्य तरीका अपनाना",
    wrong: ["समस्या को अनदेखा करना", "हमेशा यादृच्छिक सेटिंग्स का उपयोग करना", "दस्तावेज़ को कभी न देखना"],
    explanation: "यह {skill} के साथ काम करने का एक मूल सिद्धांत है।"
  },
  Tamil: {
    purpose: `{skill} இன் முக்கிய நோக்கம் என்ன?`,
    practice: `{skill} உடன் பணிபுரியும் போது பொதுவாக நல்ல நடைமுறையாகக் கருதப்படுவது எது?`,
    debug: `{skill} இல் எதிர்பார்த்த முடிவு கிடைக்கவில்லை என்றால் முதலில் என்ன செய்ய வேண்டும்?`,
    concept: `{skill} இன் அடிப்படை கருத்தை சரியாக விளக்குவது எது?`,
    quality: `{skill} மூலம் செய்யப்படும் பணியின் தரத்தை மேம்படுத்துவதற்கு ஏற்றது எது?`,
    optPurpose: "அதன் கருத்துகள் மற்றும் வசதிகளைப் பயன்படுத்தி பணிகளை அல்லது சிக்கல்களைத் தீர்ப்பது",
    optPractice: "பணிக்கு ஏற்ற சரியான மற்றும் ஆவணப்படுத்தப்பட்ட முறையைப் பின்பற்றுவது",
    optDebug: "உள்ளீடு, பிழைச் செய்தி மற்றும் தொடர்புடைய கட்டமைப்பைச் சரிபார்ப்பது",
    optConcept: "அதன் துறையில் உள்ள சிக்கல்களைத் தீர்க்க கருத்துகள் மற்றும் நுட்பங்களை வழங்குவது",
    optQuality: "தெளிவான, சோதிக்கப்பட்ட மற்றும் பராமரிக்கக்கூடிய முறையைப் பயன்படுத்துவது",
    wrong: ["சிக்கலைப் புறக்கணிப்பது", "எப்போதும் சீரற்ற அமைப்புகளைப் பயன்படுத்துவது", "ஆவணங்களைப் பார்க்காமல் இருப்பது"],
    explanation: "இது {skill} உடன் பணிபுரியும் ஒரு அடிப்படை கொள்கையாகும்."
  },
  Telugu: {
    purpose: `{skill} యొక్క ప్రధాన ఉద్దేశ్యం ఏమిటి?`,
    practice: `{skill} తో పనిచేసేటప్పుడు సాధారణంగా మంచి పద్ధతిగా పరిగణించేది ఏది?`,
    debug: `{skill} లో ఆశించిన ఫలితం రాకపోతే మొదట ఏమి చేయాలి?`,
    concept: `{skill} యొక్క ప్రాథమిక భావనను ఏది ఉత్తమంగా వివరిస్తుంది?`,
    quality: `{skill} తో చేసే పనిలో నాణ్యతను మెరుగుపరచడానికి ఏది ఉత్తమం?`,
    optPurpose: "దాని భావనలు మరియు లక్షణాలను ఉపయోగించి పనులు లేదా సమస్యలను పరిష్కరించడం",
    optPractice: "పనికి తగిన సరైన మరియు డాక్యుమెంట్ చేసిన విధానాన్ని అనుసరించడం",
    optDebug: "ఇన్‌పుట్, లోప సందేశం మరియు సంబంధిత కాన్ఫిగరేషన్‌ను తనిఖీ చేయడం",
    optConcept: "దాని రంగంలోని సమస్యలను పరిష్కరించడానికి భావనలు మరియు పద్ధతులను అందించడం",
    optQuality: "స్పష్టమైన, పరీక్షించిన మరియు నిర్వహించగల విధానాన్ని ఉపయోగించడం",
    wrong: ["సమస్యను పట్టించుకోకపోవడం", "ఎల్లప్పుడూ యాదృచ్ఛిక సెట్టింగ్‌లు ఉపయోగించడం", "డాక్యుమెంటేషన్ చూడకపోవడం"],
    explanation: "ఇది {skill} తో పనిచేయడంలో ఒక ప్రాథమిక సూత్రం."
  },
  Italian: {
    purpose: `Qual è lo scopo principale di {skill}?`,
    practice: `Quale approccio è generalmente considerato una buona pratica quando si lavora con {skill}?`,
    debug: `Quando qualcosa non funziona come previsto in {skill}, qual è un primo passo sensato?`,
    concept: `Quale affermazione descrive meglio un concetto fondamentale di {skill}?`,
    quality: `Quale scelta è più probabile che migliori la qualità del lavoro svolto con {skill}?`,
    optPurpose: "Usare i suoi concetti e le sue funzionalità per risolvere problemi o svolgere attività",
    optPractice: "Seguire un approccio corretto e documentato adatto all'attività",
    optDebug: "Controllare l'input, il messaggio di errore e la configurazione pertinente",
    optConcept: "Fornisce concetti e tecniche per risolvere problemi nel proprio ambito",
    optQuality: "Usare approcci chiari, testati e manutenibili adatti all'attività",
    wrong: ["Ignorare il problema", "Usare sempre impostazioni casuali", "Evitare la documentazione"],
    explanation: "Questo è un principio fondamentale quando si lavora con {skill}."
  },
  Russian: {
    purpose: `Какова основная цель {skill}?`,
    practice: `Какой подход обычно считается хорошей практикой при работе с {skill}?`,
    debug: `Если в {skill} что-то работает не так, как ожидалось, что разумно сделать в первую очередь?`,
    concept: `Какое утверждение лучше всего описывает фундаментальную концепцию {skill}?`,
    quality: `Какой выбор с наибольшей вероятностью повысит качество работы с {skill}?`,
    optPurpose: "Использовать его концепции и возможности для решения задач или проблем",
    optPractice: "Следовать правильному и документированному подходу, подходящему для задачи",
    optDebug: "Проверить входные данные, сообщение об ошибке и соответствующую конфигурацию",
    optConcept: "Предоставляет концепции и методы для решения проблем в своей области",
    optQuality: "Использовать понятные, проверенные и поддерживаемые подходы",
    wrong: ["Игнорировать проблему", "Всегда использовать случайные настройки", "Не обращаться к документации"],
    explanation: "Это один из основных принципов работы с {skill}."
  },
  Bengali: {
    purpose: `{skill}-এর প্রধান উদ্দেশ্য কী?`,
    practice: `{skill}-এর সাথে কাজ করার সময় কোনটি সাধারণত ভালো পদ্ধতি?`,
    debug: `{skill}-এ প্রত্যাশিত ফল না এলে প্রথমে কী করা উচিত?`,
    concept: `{skill}-এর মৌলিক ধারণা কোনটি সবচেয়ে ভালোভাবে ব্যাখ্যা করে?`,
    quality: `{skill}-এর কাজের মান উন্নত করতে কোনটি সবচেয়ে উপযুক্ত?`,
    optPurpose: "এর ধারণা ও বৈশিষ্ট্য ব্যবহার করে কাজ বা সমস্যা সমাধান করা",
    optPractice: "কাজ অনুযায়ী সঠিক ও নথিভুক্ত পদ্ধতি অনুসরণ করা",
    optDebug: "ইনপুট, ত্রুটি বার্তা এবং সংশ্লিষ্ট কনফিগারেশন পরীক্ষা করা",
    optConcept: "এর ক্ষেত্রের সমস্যা সমাধানের জন্য ধারণা ও কৌশল প্রদান করা",
    optQuality: "পরিষ্কার, পরীক্ষিত এবং রক্ষণাবেক্ষণযোগ্য পদ্ধতি ব্যবহার করা",
    wrong: ["সমস্যা উপেক্ষা করা", "সবসময় এলোমেলো সেটিং ব্যবহার করা", "ডকুমেন্টেশন না দেখা"],
    explanation: "এটি {skill}-এর সাথে কাজ করার একটি মৌলিক নীতি।"
  },
  Marathi: {
    purpose: `{skill} चा मुख्य उद्देश काय आहे?`,
    practice: `{skill} सोबत काम करताना कोणती पद्धत सामान्यतः चांगली मानली जाते?`,
    debug: `{skill} मध्ये अपेक्षित परिणाम मिळत नसल्यास प्रथम काय करावे?`,
    concept: `{skill} ची मूलभूत संकल्पना कोणती?`,
    quality: `{skill} मधील कामाची गुणवत्ता सुधारण्यासाठी काय योग्य आहे?`,
    optPurpose: "त्याच्या संकल्पना आणि सुविधांचा वापर करून कामे किंवा समस्या सोडवणे",
    optPractice: "कामासाठी योग्य आणि दस्तऐवजीकरण केलेली पद्धत वापरणे",
    optDebug: "इनपुट, त्रुटी संदेश आणि संबंधित कॉन्फिगरेशन तपासणे",
    optConcept: "त्याच्या क्षेत्रातील समस्या सोडवण्यासाठी संकल्पना आणि तंत्रे देणे",
    optQuality: "स्पष्ट, तपासलेली आणि देखभाल करण्यास सोपी पद्धत वापरणे",
    wrong: ["समस्या दुर्लक्षित करणे", "नेहमी यादृच्छिक सेटिंग वापरणे", "दस्तऐवज न पाहणे"],
    explanation: "हे {skill} सोबत काम करण्याचे मूलभूत तत्त्व आहे."
  },
  Gujarati: {
    purpose: `{skill} નો મુખ્ય હેતુ શું છે?`,
    practice: `{skill} સાથે કામ કરતી વખતે કઈ પદ્ધતિ સામાન્ય રીતે સારી ગણાય છે?`,
    debug: `{skill} માં અપેક્ષિત પરિણામ ન મળે તો પ્રથમ શું કરવું જોઈએ?`,
    concept: `{skill} ની મૂળભૂત સંકલ્પનાનું શ્રેષ્ઠ વર્ણન કયું છે?`,
    quality: `{skill} સાથેના કામની ગુણવત્તા સુધારવા માટે શું યોગ્ય છે?`,
    optPurpose: "તેના ખ્યાલો અને સુવિધાઓનો ઉપયોગ કરીને કામ અથવા સમસ્યાઓ ઉકેલવી",
    optPractice: "કાર્ય માટે યોગ્ય અને દસ્તાવેજીકૃત પદ્ધતિ અનુસરવી",
    optDebug: "ઇનપુટ, ભૂલ સંદેશ અને સંબંધિત કન્ફિગરેશન તપાસવું",
    optConcept: "તેના ક્ષેત્રની સમસ્યાઓ ઉકેલવા માટે ખ્યાલો અને તકનીકો આપવી",
    optQuality: "સ્પષ્ટ, પરીક્ષણ કરેલી અને જાળવણીયોગ્ય પદ્ધતિનો ઉપયોગ કરવો",
    wrong: ["સમસ્યાને અવગણવી", "હંમેશા રેન્ડમ સેટિંગ વાપરવી", "દસ્તાવેજીકરણ ન જોવું"],
    explanation: "આ {skill} સાથે કામ કરવાનો મૂળભૂત સિદ્ધાંત છે."
  },
  Kannada: {
    purpose: `{skill} ನ ಮುಖ್ಯ ಉದ್ದೇಶವೇನು?`,
    practice: `{skill} ಜೊತೆ ಕೆಲಸ ಮಾಡುವಾಗ ಸಾಮಾನ್ಯವಾಗಿ ಉತ್ತಮ ವಿಧಾನ ಯಾವುದು?`,
    debug: `{skill} ನಲ್ಲಿ ನಿರೀಕ್ಷಿತ ಫಲಿತಾಂಶ ಸಿಗದಿದ್ದರೆ ಮೊದಲು ಏನು ಮಾಡಬೇಕು?`,
    concept: `{skill} ನ ಮೂಲಭೂತ ಪರಿಕಲ್ಪನೆಯನ್ನು ಯಾವುದು ಉತ್ತಮವಾಗಿ ವಿವರಿಸುತ್ತದೆ?`,
    quality: `{skill} ಕೆಲಸದ ಗುಣಮಟ್ಟವನ್ನು ಸುಧಾರಿಸಲು ಯಾವುದು ಸೂಕ್ತ?`,
    optPurpose: "ಅದರ ಪರಿಕಲ್ಪನೆಗಳು ಮತ್ತು ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಬಳಸಿ ಕೆಲಸ ಅಥವಾ ಸಮಸ್ಯೆಗಳನ್ನು ಪರಿಹರಿಸುವುದು",
    optPractice: "ಕೆಲಸಕ್ಕೆ ಸೂಕ್ತವಾದ ಸರಿಯಾದ ಮತ್ತು ದಾಖಲಿತ ವಿಧಾನವನ್ನು ಅನುಸರಿಸುವುದು",
    optDebug: "ಇನ್‌ಪುಟ್, ದೋಷ ಸಂದೇಶ ಮತ್ತು ಸಂಬಂಧಿತ ಸಂರಚನೆಯನ್ನು ಪರಿಶೀಲಿಸುವುದು",
    optConcept: "ಅದರ ಕ್ಷೇತ್ರದ ಸಮಸ್ಯೆಗಳನ್ನು ಪರಿಹರಿಸಲು ಪರಿಕಲ್ಪನೆಗಳು ಮತ್ತು ತಂತ್ರಗಳನ್ನು ನೀಡುವುದು",
    optQuality: "ಸ್ಪಷ್ಟ, ಪರೀಕ್ಷಿತ ಮತ್ತು ನಿರ್ವಹಿಸಬಹುದಾದ ವಿಧಾನವನ್ನು ಬಳಸುವುದು",
    wrong: ["ಸಮಸ್ಯೆಯನ್ನು ನಿರ್ಲಕ್ಷಿಸುವುದು", "ಯಾದೃಚ್ಛಿಕ ಸೆಟ್ಟಿಂಗ್ ಬಳಸುವುದು", "ದಾಖಲೆಗಳನ್ನು ನೋಡದಿರುವುದು"],
    explanation: "ಇದು {skill} ಜೊತೆ ಕೆಲಸ ಮಾಡುವ ಮೂಲಭೂತ ತತ್ವವಾಗಿದೆ."
  },
  Malayalam: {
    purpose: `{skill}-ന്റെ പ്രധാന ഉദ്ദേശ്യം എന്താണ്?`,
    practice: `{skill} ഉപയോഗിച്ച് പ്രവർത്തിക്കുമ്പോൾ സാധാരണയായി നല്ല രീതിയായി കണക്കാക്കുന്നത് ഏത്?`,
    debug: `{skill}-ൽ പ്രതീക്ഷിച്ച ഫലം ലഭിക്കാത്തപ്പോൾ ആദ്യം എന്ത് ചെയ്യണം?`,
    concept: `{skill}-ന്റെ അടിസ്ഥാന ആശയം ഏറ്റവും നന്നായി വിവരിക്കുന്നത് ഏത്?`,
    quality: `{skill} ഉപയോഗിച്ചുള്ള ജോലിയുടെ ഗുണനിലവാരം മെച്ചപ്പെടുത്താൻ ഏത് ഉചിതമാണ്?`,
    optPurpose: "അതിന്റെ ആശയങ്ങളും സവിശേഷതകളും ഉപയോഗിച്ച് ജോലികളോ പ്രശ്നങ്ങളോ പരിഹരിക്കുക",
    optPractice: "ജോലിക്ക് അനുയോജ്യമായ ശരിയായതും രേഖപ്പെടുത്തിയതുമായ രീതി പിന്തുടരുക",
    optDebug: "ഇൻപുട്ട്, പിശക് സന്ദേശം, ബന്ധപ്പെട്ട കോൺഫിഗറേഷൻ എന്നിവ പരിശോധിക്കുക",
    optConcept: "അതിന്റെ മേഖലയിലെ പ്രശ്നങ്ങൾ പരിഹരിക്കാൻ ആശയങ്ങളും സാങ്കേതികവിദ്യകളും നൽകുക",
    optQuality: "വ്യക്തവും പരീക്ഷിച്ചതും പരിപാലിക്കാവുന്നതുമായ രീതി ഉപയോഗിക്കുക",
    wrong: ["പ്രശ്നം അവഗണിക്കുക", "എപ്പോഴും റാൻഡം സെറ്റിംഗ് ഉപയോഗിക്കുക", "ഡോക്യുമെന്റേഷൻ നോക്കാതിരിക്കുക"],
    explanation: "ഇത് {skill} ഉപയോഗിച്ച് പ്രവർത്തിക്കുന്നതിനുള്ള ഒരു അടിസ്ഥാന തത്വമാണ്."
  },
  Punjabi: {
    purpose: `{skill} ਦਾ ਮੁੱਖ ਉਦੇਸ਼ ਕੀ ਹੈ?`,
    practice: `{skill} ਨਾਲ ਕੰਮ ਕਰਦੇ ਸਮੇਂ ਕਿਹੜਾ ਤਰੀਕਾ ਆਮ ਤੌਰ 'ਤੇ ਚੰਗਾ ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ?`,
    debug: `{skill} ਵਿੱਚ ਉਮੀਦ ਅਨੁਸਾਰ ਨਤੀਜਾ ਨਾ ਮਿਲੇ ਤਾਂ ਪਹਿਲਾਂ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?`,
    concept: `{skill} ਦੀ ਮੂਲ ਧਾਰਨਾ ਨੂੰ ਸਭ ਤੋਂ ਵਧੀਆ ਕਿਹੜਾ ਬਿਆਨ ਕਰਦਾ ਹੈ?`,
    quality: `{skill} ਨਾਲ ਕੀਤੇ ਕੰਮ ਦੀ ਗੁਣਵੱਤਾ ਸੁਧਾਰਨ ਲਈ ਕੀ ਢੁਕਵਾਂ ਹੈ?`,
    optPurpose: "ਇਸ ਦੀਆਂ ਧਾਰਨਾਵਾਂ ਅਤੇ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਕੰਮ ਜਾਂ ਸਮੱਸਿਆਵਾਂ ਹੱਲ ਕਰਨਾ",
    optPractice: "ਕੰਮ ਲਈ ਢੁਕਵੀਂ ਸਹੀ ਅਤੇ ਦਸਤਾਵੇਜ਼ੀ ਵਿਧੀ ਅਪਣਾਉਣਾ",
    optDebug: "ਇਨਪੁੱਟ, ਗਲਤੀ ਸੰਦੇਸ਼ ਅਤੇ ਸੰਬੰਧਿਤ ਸੰਰਚਨਾ ਦੀ ਜਾਂਚ ਕਰਨਾ",
    optConcept: "ਇਸ ਦੇ ਖੇਤਰ ਦੀਆਂ ਸਮੱਸਿਆਵਾਂ ਹੱਲ ਕਰਨ ਲਈ ਧਾਰਨਾਵਾਂ ਅਤੇ ਤਕਨੀਕਾਂ ਦੇਣਾ",
    optQuality: "ਸਪਸ਼ਟ, ਪਰਖੀ ਹੋਈ ਅਤੇ ਸੰਭਾਲਣਯੋਗ ਵਿਧੀ ਵਰਤਣਾ",
    wrong: ["ਸਮੱਸਿਆ ਨੂੰ ਨਜ਼ਰਅੰਦਾਜ਼ ਕਰਨਾ", "ਹਮੇਸ਼ਾ ਰੈਂਡਮ ਸੈਟਿੰਗ ਵਰਤਣਾ", "ਦਸਤਾਵੇਜ਼ ਨਾ ਦੇਖਣਾ"],
    explanation: "ਇਹ {skill} ਨਾਲ ਕੰਮ ਕਰਨ ਦਾ ਇੱਕ ਮੂਲ ਸਿਧਾਂਤ ਹੈ।"
  },
  Urdu: {
    purpose: `{skill} کا بنیادی مقصد کیا ہے؟`,
    practice: `{skill} کے ساتھ کام کرتے وقت عام طور پر کون سا طریقہ بہتر سمجھا جاتا ہے؟`,
    debug: `{skill} میں مطلوبہ نتیجہ نہ ملے تو پہلا مناسب قدم کیا ہے؟`,
    concept: `{skill} کے بنیادی تصور کی بہترین وضاحت کون سی ہے؟`,
    quality: `{skill} کے کام کے معیار کو بہتر بنانے کے لیے کیا مناسب ہے؟`,
    optPurpose: "اس کے تصورات اور خصوصیات استعمال کرکے کام یا مسائل حل کرنا",
    optPractice: "کام کے مطابق درست اور دستاویزی طریقہ اختیار کرنا",
    optDebug: "ان پٹ، خرابی کے پیغام اور متعلقہ ترتیب کو جانچنا",
    optConcept: "اپنے شعبے کے مسائل حل کرنے کے لیے تصورات اور طریقے فراہم کرنا",
    optQuality: "واضح، آزمودہ اور قابلِ دیکھ بھال طریقہ استعمال کرنا",
    wrong: ["مسئلے کو نظر انداز کرنا", "ہمیشہ بے ترتیب ترتیبات استعمال کرنا", "دستاویزات نہ دیکھنا"],
    explanation: "یہ {skill} کے ساتھ کام کرنے کا ایک بنیادی اصول ہے۔"
  },
  French: {
    purpose: `Quel est l'objectif principal de {skill} ?`,
    practice: `Quelle approche est généralement une bonne pratique avec {skill} ?`,
    debug: `Si {skill} ne produit pas le résultat attendu, quelle est une première étape raisonnable ?`,
    concept: `Quelle affirmation décrit le mieux un concept fondamental de {skill} ?`,
    quality: `Quel choix peut le mieux améliorer la qualité du travail avec {skill} ?`,
    optPurpose: "Résoudre des problèmes ou réaliser des tâches avec ses concepts et fonctionnalités",
    optPractice: "Suivre une méthode correcte et documentée adaptée à la tâche",
    optDebug: "Vérifier les entrées, le message d'erreur et la configuration concernée",
    optConcept: "Fournir des concepts et techniques pour résoudre des problèmes de son domaine",
    optQuality: "Utiliser une approche claire, testée et maintenable adaptée à la tâche",
    wrong: ["Ignorer le problème", "Toujours utiliser des réglages aléatoires", "Éviter la documentation"],
    explanation: "C'est un principe fondamental pour travailler avec {skill}."
  },
  German: {
    purpose: `Was ist der Hauptzweck von {skill}?`,
    practice: `Welche Vorgehensweise gilt bei der Arbeit mit {skill} allgemein als gute Praxis?`,
    debug: `Wenn {skill} nicht wie erwartet funktioniert, was ist ein sinnvoller erster Schritt?`,
    concept: `Welche Aussage beschreibt ein grundlegendes Konzept von {skill} am besten?`,
    quality: `Welche Wahl verbessert die Qualität der Arbeit mit {skill} am ehesten?`,
    optPurpose: "Aufgaben oder Probleme mit seinen Konzepten und Funktionen lösen",
    optPractice: "Eine passende, korrekte und dokumentierte Vorgehensweise verwenden",
    optDebug: "Eingaben, Fehlermeldung und relevante Konfiguration prüfen",
    optConcept: "Konzepte und Techniken zur Lösung von Problemen in seinem Bereich bereitstellen",
    optQuality: "Eine klare, getestete und wartbare Vorgehensweise verwenden",
    wrong: ["Das Problem ignorieren", "Immer zufällige Einstellungen verwenden", "Dokumentation vermeiden"],
    explanation: "Dies ist ein grundlegendes Prinzip bei der Arbeit mit {skill}."
  },
  Spanish: {
    purpose: `¿Cuál es el objetivo principal de {skill}?`,
    practice: `¿Qué enfoque suele considerarse una buena práctica al trabajar con {skill}?`,
    debug: `Si {skill} no produce el resultado esperado, ¿cuál es un primer paso razonable?`,
    concept: `¿Qué afirmación describe mejor un concepto fundamental de {skill}?`,
    quality: `¿Qué opción puede mejorar más la calidad del trabajo con {skill}?`,
    optPurpose: "Resolver problemas o realizar tareas usando sus conceptos y funciones",
    optPractice: "Seguir un método correcto y documentado adecuado para la tarea",
    optDebug: "Comprobar la entrada, el mensaje de error y la configuración relacionada",
    optConcept: "Proporcionar conceptos y técnicas para resolver problemas de su área",
    optQuality: "Usar un enfoque claro, probado y mantenible adecuado para la tarea",
    wrong: ["Ignorar el problema", "Usar siempre configuraciones aleatorias", "Evitar la documentación"],
    explanation: "Este es un principio fundamental para trabajar con {skill}."
  },
  Portuguese: {
    purpose: `Qual é o principal objetivo de {skill}?`,
    practice: `Qual abordagem é geralmente considerada uma boa prática ao trabalhar com {skill}?`,
    debug: `Se {skill} não produzir o resultado esperado, qual é um primeiro passo razoável?`,
    concept: `Qual afirmação descreve melhor um conceito fundamental de {skill}?`,
    quality: `Qual escolha pode melhorar mais a qualidade do trabalho com {skill}?`,
    optPurpose: "Resolver problemas ou realizar tarefas usando seus conceitos e recursos",
    optPractice: "Seguir uma abordagem correta e documentada adequada à tarefa",
    optDebug: "Verificar a entrada, a mensagem de erro e a configuração relacionada",
    optConcept: "Fornecer conceitos e técnicas para resolver problemas de sua área",
    optQuality: "Usar uma abordagem clara, testada e fácil de manter",
    wrong: ["Ignorar o problema", "Usar sempre configurações aleatórias", "Evitar a documentação"],
    explanation: "Este é um princípio fundamental para trabalhar com {skill}."
  },
  Japanese: {
    purpose: `{skill} の主な目的は何ですか？`,
    practice: `{skill} を使用するとき、一般的に良い方法とされるのはどれですか？`,
    debug: `{skill} が期待どおりに動作しない場合、最初に何を確認するのが適切ですか？`,
    concept: `{skill} の基本概念を最もよく説明しているものはどれですか？`,
    quality: `{skill} を使った作業の品質を高めるには、どれが適切ですか？`,
    optPurpose: "その概念や機能を使って作業や問題を解決すること",
    optPractice: "作業に適した正しい文書化された方法に従うこと",
    optDebug: "入力、エラーメッセージ、関連する設定を確認すること",
    optConcept: "分野の問題を解決するための概念や技術を提供すること",
    optQuality: "明確でテスト済みの保守しやすい方法を使うこと",
    wrong: ["問題を無視する", "常にランダムな設定を使う", "ドキュメントを確認しない"],
    explanation: "これは {skill} を扱う際の基本的な原則です。"
  },
  Korean: {
    purpose: `{skill}의 주요 목적은 무엇입니까?`,
    practice: `{skill}을 사용할 때 일반적으로 좋은 방법으로 여겨지는 것은 무엇입니까?`,
    debug: `{skill}이 예상대로 동작하지 않을 때 먼저 무엇을 확인해야 합니까?`,
    concept: `{skill}의 기본 개념을 가장 잘 설명하는 것은 무엇입니까?`,
    quality: `{skill}을 사용한 작업의 품질을 높이려면 무엇이 적절합니까?`,
    optPurpose: "그 개념과 기능을 사용하여 작업이나 문제를 해결하는 것",
    optPractice: "작업에 맞는 올바르고 문서화된 방법을 따르는 것",
    optDebug: "입력, 오류 메시지 및 관련 설정을 확인하는 것",
    optConcept: "해당 분야의 문제를 해결하기 위한 개념과 기술을 제공하는 것",
    optQuality: "명확하고 테스트되었으며 유지 관리하기 쉬운 방법을 사용하는 것",
    wrong: ["문제를 무시하기", "항상 임의의 설정 사용하기", "문서를 확인하지 않기"],
    explanation: "이는 {skill}을 다루는 기본 원칙입니다."
  },
  Chinese: {
    purpose: `{skill} 的主要目的是什么？`,
    practice: `使用 {skill} 时，通常哪种方法被认为是良好的实践？`,
    debug: `如果 {skill} 没有产生预期结果，首先应该做什么？`,
    concept: `下面哪项最能描述 {skill} 的基本概念？`,
    quality: `哪种做法最有可能提高使用 {skill} 时的工作质量？`,
    optPurpose: "利用它的概念和功能完成任务或解决问题",
    optPractice: "根据任务采用正确且有文档支持的方法",
    optDebug: "检查输入、错误信息和相关配置",
    optConcept: "提供解决该领域问题所需的概念和技术",
    optQuality: "使用清晰、经过测试且易于维护的方法",
    wrong: ["忽略问题", "总是使用随机设置", "不查看文档"],
    explanation: "这是使用 {skill} 时的一项基本原则。"
  },
  Arabic: {
    purpose: `ما الهدف الرئيسي من {skill}؟`,
    practice: `ما الأسلوب الذي يُعد عادةً ممارسة جيدة عند العمل مع {skill}؟`,
    debug: `إذا لم يعمل {skill} كما هو متوقع، فما الخطوة الأولى المناسبة؟`,
    concept: `أي عبارة تصف مفهومًا أساسيًا في {skill} بشكل أفضل؟`,
    quality: `أي خيار يساعد أكثر في تحسين جودة العمل باستخدام {skill}؟`,
    optPurpose: "حل المشكلات أو تنفيذ المهام باستخدام مفاهيمه وميزاته",
    optPractice: "اتباع طريقة صحيحة وموثقة ومناسبة للمهمة",
    optDebug: "فحص المدخلات ورسالة الخطأ والإعدادات ذات الصلة",
    optConcept: "توفير مفاهيم وتقنيات لحل مشكلات مجاله",
    optQuality: "استخدام أسلوب واضح ومختبر وقابل للصيانة",
    wrong: ["تجاهل المشكلة", "استخدام إعدادات عشوائية دائمًا", "تجنب الوثائق"],
    explanation: "هذا مبدأ أساسي عند العمل مع {skill}."
  }
};

const FALLBACK_ALIASES = {
  English: "English", Hindi: "Hindi", Tamil: "Tamil", Telugu: "Telugu",
  Bengali: "Bengali", Marathi: "Marathi", Gujarati: "Gujarati", Kannada: "Kannada",
  Malayalam: "Malayalam", Punjabi: "Punjabi", Urdu: "Urdu", French: "French",
  German: "German", Spanish: "Spanish", Portuguese: "Portuguese", Japanese: "Japanese",
  Italian: "Italian", Russian: "Russian", Korean: "Korean", Chinese: "Chinese", Arabic: "Arabic"
};

function fallbackQuestion({ skill, difficulty, language, index }) {
  const lang = FALLBACK_ALIASES[language] || "English";
  const t = FALLBACK_TEXT[lang] || FALLBACK_TEXT.English;
  const patterns = ["purpose", "practice", "debug", "concept", "quality"];
  const options = [
    t.optPurpose,
    t.optPractice,
    t.optDebug,
    t.optQuality
  ];
  const pattern = patterns[index % patterns.length];
  const question = (t[pattern] || t.purpose).replace(/\{skill\}/g, skill);

  // Make the correct option correspond to the question type while keeping four
  // distinct choices. This is deliberately deterministic so fallback never
  // creates an invalid correctIndex.
  let correctIndex = 0;
  let explanation = t.explanation.replace(/\{skill\}/g, skill);
  if (pattern === "practice") correctIndex = 1;
  if (pattern === "debug") correctIndex = 2;
  if (pattern === "quality") correctIndex = 3;

  return {
    question,
    options: [...options],
    correctIndex,
    explanation: `${explanation} (${difficulty})`
  };
}

function fillWithLocalFallback({ collected, count, seen, skill, difficulty, language }) {
  let index = 0;
  while (collected.length < count && index < count * 3) {
    const question = fallbackQuestion({ skill, difficulty, language, index });
    const key = question.question.trim().toLowerCase();
    index += 1;
    if (seen.has(key)) continue;
    seen.add(key);
    question.__fallback = true;
    collected.push(question);
    console.warn(
      `[ollamaClient] FALLBACK accepted for ${skill}/${difficulty}/${language}: ${collected.length}/${count}`
    );
  }
  return collected;
}

function stripCodeFences(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Ollama's JSON mode is normally strict, but small local models can still
// occasionally append another JSON value or a short piece of text. Instead
// of rejecting the whole response, scan for complete balanced JSON values.
// This parser is string-aware, so braces inside JSON strings do not confuse it.
function scanCompleteJsonValues(text) {
  const values = [];
  const input = stripCodeFences(text);

  for (let i = 0; i < input.length; i += 1) {
    if (input[i] !== "[" && input[i] !== "{") continue;

    const start = i;
    const stack = [];
    let inString = false;
    let escaped = false;

    for (let j = i; j < input.length; j += 1) {
      const ch = input[j];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "[" || ch === "{") {
        stack.push(ch);
      } else if (ch === "]" || ch === "}") {
        const expected = ch === "]" ? "[" : "{";
        if (stack[stack.length - 1] !== expected) break;
        stack.pop();

        if (stack.length === 0) {
          const candidate = input.slice(start, j + 1);
          try {
            values.push(JSON.parse(candidate));
          } catch {
            // Keep scanning. A later complete JSON value may still be valid.
          }
          i = j;
          break;
        }
      }
    }
  }

  return values;
}

function extractJsonValue(text) {
  const cleaned = stripCodeFences(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to tolerant extraction below.
  }

  const values = scanCompleteJsonValues(cleaned);
  if (!values.length) {
    throw new Error("Could not locate JSON in Ollama response");
  }

  // Prefer an array because batch generation asks Ollama for an array.
  const arrayValue = values.find(Array.isArray);
  if (arrayValue) return arrayValue;

  // If Ollama emitted several standalone question objects, treat them as a
  // batch rather than discarding all but the first one.
  const objects = values.filter(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  );
  if (objects.length > 1) return objects;
  return values[0];
}

function normalizeQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;

  const question = typeof raw.question === "string"
    ? raw.question
    : typeof raw.text === "string"
    ? raw.text
    : null;

  if (!question || !question.trim()) return null;

  let options = raw.options ?? raw.choices ?? raw.answers;
  if (options && !Array.isArray(options) && typeof options === "object") {
    options = Object.keys(options).sort().map((key) => options[key]);
  }

  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    !options.every((option) => typeof option === "string" && option.trim())
  ) {
    return null;
  }

  let correctRaw =
    raw.correctIndex ??
    raw.correct_index ??
    raw.correctAnswer ??
    raw.correct_answer ??
    raw.answerIndex ??
    raw.answer_index ??
    raw.answer ??
    raw.correct;

  let correctIndex = null;

  if (Number.isInteger(correctRaw)) {
    correctIndex = correctRaw;
  } else if (typeof correctRaw === "string") {
    const value = correctRaw.trim();
    if (/^[A-Da-d]$/.test(value)) {
      correctIndex = value.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(value)) {
      const n = Number(value);
      correctIndex = n >= 1 && n <= 4 ? n - 1 : n;
    } else {
      const match = options.findIndex(
        (option) => option.trim().toLowerCase() === value.toLowerCase()
      );
      if (match !== -1) correctIndex = match;
    }
  }

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return null;
  }

  return {
    question: question.trim(),
    options: options.map((option) => option.trim()),
    correctIndex,
    explanation: typeof raw.explanation === "string" ? raw.explanation.trim() : "",
  };
}

function normalizeBatch(raw) {
  if (Array.isArray(raw)) return raw.map(normalizeQuestion).filter(Boolean);
  const single = normalizeQuestion(raw);
  return single ? [single] : [];
}

async function callOllama(prompt, { timeoutMs = OLLAMA_TIMEOUT_MS, batchSize = 1 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  console.log(
    `[ollamaClient] Generating ${batchSize} question(s) with ${OLLAMA_MODEL} (${Math.round(timeoutMs / 1000)}s timeout)...`
  );

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: batchSize === 1 ? QUESTION_SCHEMA : BATCH_SCHEMA,
        keep_alive: "30m",
        options: {
          temperature: 0.35,
          num_predict: batchSize === 1 ? 220 : 520,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama request failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[ollamaClient] Ollama responded in ${elapsed}s with ${batchSize} requested question(s).`);
    return data.response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Ollama took longer than ${Math.round(timeoutMs / 1000)}s to respond (timed out)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate exactly `count` questions using Ollama.
 *
 * Important for llama3.2:3b: use batches of up to five rather than ten
 * separate requests. This avoids the previous 10 x ~60 second behaviour.
 * Every accepted question is still validated and duplicates are removed.
 */
export async function generateQuestions({ skill, difficulty, count, avoid = [], language = "English" }) {
  const collected = [];
  const seen = new Set(
    (avoid || [])
      .filter((q) => typeof q === "string" && q.trim())
      .map((q) => q.trim().toLowerCase())
  );

  console.log(`[ollamaClient] START ${skill}/${difficulty}/${language}: need ${count} question(s)`);

  // Do not send a large "avoid" list back to the 3B model. It makes hard-language
  // generation much less reliable. We still deduplicate locally.
  const maxAttempts = Math.max(MAX_GENERATION_ATTEMPTS, count + 2);
  let attempts = 0;

  while (collected.length < count && attempts < maxAttempts) {
    attempts += 1;
    const remaining = count - collected.length;
    const batchSize = Math.min(MAX_BATCH_SIZE, remaining);

    // For hard questions, use a fresh prompt each time. For easy/medium we can
    // include a very small avoid list to reduce accidental repeats.
    const localAvoid = difficulty === "hard"
      ? []
      : [...seen].slice(-6);

    const prompt = buildPrompt({
      skill,
      difficulty,
      avoid: localAvoid,
      language,
      batchSize,
    });

    try {
      const raw = await callOllama(prompt, { batchSize });
      console.log(`[ollamaClient] Response preview: ${String(raw || "").replace(/\s+/g, " ").slice(0, 350)}`);

      const parsed = extractJsonValue(raw);
      const questions = normalizeBatch(parsed);

      let accepted = 0;
      for (const question of questions) {
        if (collected.length >= count) break;
        const key = question.question.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(question);
        accepted += 1;
      }

      console.log(
        `[ollamaClient] ${skill}/${difficulty}/${language}: accepted ${accepted}; total ${collected.length}/${count}.`
      );

      if (collected.length >= count) break;

      // If a 5-item hard batch gives only 1-2 valid questions, immediately ask
      // for the exact remainder with a fresh prompt instead of repeatedly sending
      // the same rejected questions back to the model.
      if (accepted === 0 && batchSize > 1) {
        console.warn(`[ollamaClient] No new questions in attempt ${attempts}; refreshing prompt.`);
      }
    } catch (err) {
      console.warn(
        `[ollamaClient] Attempt ${attempts}/${maxAttempts} failed for ${skill}/${difficulty}/${language}: ${err.message}`
      );
    }
  }

  // Last-resort Ollama-only recovery: generate the remaining questions one at a
  // time with a short, focused prompt. This is only used when batch generation
  // cannot supply enough valid questions.
  while (collected.length < count && attempts < maxAttempts + 5) {
    attempts += 1;
    const remaining = count - collected.length;
    const prompt = buildPrompt({
      skill,
      difficulty,
      avoid: [],
      language,
      batchSize: 1,
    }) + `\n\nThis is recovery attempt ${attempts}. Create ONE new question on a different subtopic. Return exactly one JSON object, not an array.`;

    try {
      const raw = await callOllama(prompt, { batchSize: 1 });
      const parsed = extractJsonValue(raw);
      const questions = normalizeBatch(parsed);
      const question = questions[0];
      if (!question) continue;

      const key = question.question.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(question);
      console.log(`[ollamaClient] Recovery accepted; total ${collected.length}/${count}.`);
    } catch (err) {
      console.warn(`[ollamaClient] Recovery attempt failed: ${err.message}`);
    }
  }

  // Never leave the user with a blank/failed assessment. If Ollama could not
  // produce the complete batch, fill only the missing slots with local,
  // skill-related fallback questions in the selected language. Ollama-generated
  // questions are always kept first.
  if (collected.length < count) {
    const beforeFallback = collected.length;
    fillWithLocalFallback({
      collected,
      count,
      seen,
      skill,
      difficulty,
      language,
    });
    console.warn(
      `[ollamaClient] Ollama supplied ${beforeFallback}/${count}; local fallback supplied ${collected.length - beforeFallback}.`
    );
  }

  if (collected.length < count) {
    throw new Error(
      `Could not prepare ${count} questions for ${skill}/${difficulty}/${language}.`
    );
  }

  const usedFallback = collected.some((question) => question.__fallback === true);
  for (const question of collected) delete question.__fallback;

  console.log(`[ollamaClient] COMPLETE ${skill}/${difficulty}/${language}: ${collected.length}/${count}${usedFallback ? " (with fallback)" : ""}`);
  return { questions: collected, source: usedFallback ? "ollama+fallback" : "ollama" };
}

export async function checkOllamaHealth() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!res.ok) return { ok: false, error: `status ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    return { ok: true, models, configuredModel: OLLAMA_MODEL };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Warm the model once when the server starts. This keeps the model resident so
// the first real exam request does not also have to load it.
export function warmUpModel() {
  fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: "Reply with the single word READY.",
      stream: false,
      keep_alive: "30m",
      options: { num_predict: 4 },
    }),
  }).then(() => {
    console.log(`[ollamaClient] Model warm-up completed for ${OLLAMA_MODEL}.`);
  }).catch((err) => {
    console.warn(`[ollamaClient] Model warm-up skipped: ${err.message}`);
  });
}
