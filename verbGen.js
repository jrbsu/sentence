// Equivalent of definitions.py in JavaScript
export const diphthongDict = {
    "1": "aj",
    "2": "ij",
    "3": "oj",
    "4": "tt",
    "5": "kk",
};
export const diphthongDictInv = Object.fromEntries(Object.entries(diphthongDict).map(([k, v]) => [v, k]));
export const ipaDict = {
    "c": "ç",
    "e": "ɛ",
    "ë": "ə",
    "g": "ɟ",
    "ï": "ɪ",
    "k": "c",
    "o": "ʌ",
    "x": "ʝ",
    "z": "ʃ",
    "ž": "ʒ",
    "1": "eɪ",
    "2": "aɪ",
    "3": "ʌɪ",
    "4": "tʼ",
    "5": "cʼ",
};
export const moodDict = {
    "normal": ["", "", false],
    "negative": ["an", "not, NEG", true],
    "abilitive": ["tti", "to be able to, ABL", false],
    "optative": ["kki", "to want to, OPT", false],
    "dubitative": ["do", "might, DUB", true],
    "conditional": ["sa", "would; depends upon another condition, COND", true],
    "questioning": ["ko", "questioning, QUES", true],
    "deonotic": ["afi", "should, DEO", false]
};
export const tenses = ["pres", "hab", "past", "fut"];
export const persons = ["1s", "1p", "2", "3s", "3p", "form"];

export const gajraEnds = {
    "pres": { "1s": "", "1p": "er", "2": "da", "3s": "as", "3p": "ilan", "form": "ket" },
    "hab": { "1s": "ne", "1p": "nera", "2": "na", "3s": "anes", "3p": "inen", "form": "ket" },
    "past": { "1s": "rë", "1p": "era", "2": "ra", "3s": "arës", "3p": "irën", "form": "etrë" },
    "fut": { "1s": "", "1p": "", "2": "", "3s": "", "3p": "", "form": "" }
};

export const nonGajraEnds = {
    "pres": { "1s": "i", "1p": "er", "2": "ada", "3s": "as", "3p": "ilan", "form": "eket" },
    "hab": { "1s": "ene", "1p": "enera", "2": "ana", "3s": "anes", "3p": "inen", "form": "eket" },
    "past": { "1s": "erë", "1p": "era", "2": "ara", "3s": "arës", "3p": "irën", "form": "etrë" },
    "fut": { "1s": "o", "1p": "o", "2": "o", "3s": "o", "3p": "o", "form": "o" }
};

export const verb_begins = {
    "fut": { "1s": "e", "1p": "era", "2": "da", "3s": "la", "3p": "lan", "form": "ket" }
};

export const verb_begins_vowel = {
    "fut": { "1s": "en", "1p": "eran", "2": "dan", "3s": "lan", "3p": "lan", "form": "ket" }
};

export function checkGajra(verb) {
    const newVerb = verb.replace(/[iëe]$/, "");
    const regex = /[aeëio](n|d|g|t|k|s|z|c|x|l|r|n|d|g|t|k|s|z|c|x|l|r|(aj|ij|oj))$/;
    const isGajra = regex.test(newVerb) && newVerb.length > 1;
    console.log(isGajra);
    return isGajra;
}

function multipleReplace(dict, text) {
    const regex = new RegExp(Object.keys(dict).join('|'), 'gi');
    return text.replace(regex, matched => dict[matched.toLowerCase()]);
}

export function dedupe(word) {
    let newWord = word.replace(/tt/g, '4').replace(/kk/g, '5');
    newWord = newWord.replace(/i([aeioë])/g, 'j$1');
    newWord = newWord.replace(/([vszcxfljrž])e/g, '$1ë');
    newWord = newWord.replace(/([a-z])\1+/g, '$1');
    newWord = newWord.replace(/([aeioë])([aeioë])/g, '$1j$2');
    newWord = newWord.replace(/([mntkdg])ë/g, '$1e');
    newWord = newWord.replace(/4/g, 'tt').replace(/5/g, 'kk');
    return newWord;
}

export function stress(word, listNeeded = false) {
    let syllableList = [];
    let holding = multipleReplace(diphthongDictInv, word);
    holding = holding.replace(/(f|v|s|z|c|x|l|j|r|ž)e/g, '$1ë');
    let letters = holding.replace(/[\s\?]/g, '').split('');
    let currentString = letters[0];
    for (let i = 1; i < letters.length; i++) {
        let letter = letters[i];
        let nextLetter = letters[i + 1] || 'b';
        let lastLetter = letters[i - 1] || 'b';

        if (/[123]/.test(letter)) {
            currentString += letter;
        } else if (currentString.length < 3 && /[cdfgklnrstxzaioeë45]/.test(letter) && /[bcdfgjklmnprstvwxz45]/.test(nextLetter) && !/[123]/.test(lastLetter)) {
            currentString += letter;
        } else if (currentString.length < 2 && /j/.test(letter) && /[aeioë]/.test(nextLetter)) {
            currentString += letter;
        } else if (currentString.length < 3 && /[123]/.test(lastLetter) && /[aeioë]/.test(letter)) {
            syllableList.push(currentString);
            currentString = letter;
        } else if (currentString.length === 3 && /.j[eëi]/.test(currentString)) {
            currentString += letter;
        } else {
            syllableList.push(currentString);
            currentString = letter;
        }
    }
    syllableList.push(currentString);
    let stressedSyllable = stressFinder(syllableList);
    syllableList[stressedSyllable] = syllableList[stressedSyllable].replace(/(v|s|z|c|x|f|l|j|r|ž)ë/g, '$1e');
    syllableList = syllableList.map(a => multipleReplace(diphthongDict, a));
    return listNeeded ? syllableList : dedupe(syllableList.join(''));
}

export function stressFinder(syllables) {
    const index = syllables.findIndex(x => /(tt|kk)/.test(x));
    return index === -1 ? 0 : index;
}

export function generateVerbs(verbType, verb) {
    let isGajra = checkGajra(verb); // Check if the current word requires Gajra mutation
    let verbEndings = isGajra ? gajraEnds : nonGajraEnds;
    const suffixNeeded = moodDict[verbType][2]; // Whether the verb type requires a suffix
    let suffix = moodDict[verbType][0]; // Suffix from the mood dictionary
    console.log(suffix);

    let newVerb = suffixNeeded ? verb + suffix : verb;
    newVerb = newVerb.replace(/[ëei]$/, '');

    const verbs = {};
    tenses.forEach(tense => {
        verbs[tense] = {};
        persons.forEach(person => {
            // Start with the new base which might include the mood suffix
            let verbForm = newVerb;
            
            // Append the correct ending based on tense and person
            console.log({verbForm, verbEndings});
            verbForm += verbEndings[tense][person];

            // Additional logic specific to the 'fut' tense
            if (tense === "fut") {
                // Adjust verb form based on whether the initial character is a vowel or consonant
                verbForm = (("aeëioAËEIO").includes(verbForm[0]) ? verb_begins_vowel[tense][person] : verb_begins[tense][person]) + verbForm;
                // Handle specific character replacements in the middle of a word
                verbForm = verbForm.replace('ž', 'z');
            }
            
            // Finally, apply stress to the verb form
            verbForm = stress(verbForm); 

            // Store the fully formed verb
            verbs[tense][person] = verbForm;
            let a = verbEndings[tense][person]
            console.log({tense, person, newVerb, verbForm, a, suffixNeeded, isGajra});
        });
    });
    console.log({verbEndings, verbs});

    return verbs;
}
