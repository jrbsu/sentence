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
    word = dedupe(word);
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
    return listNeeded ? syllableList : syllableList.join('');
}

export function stressFinder(syllables) {
    const index = syllables.findIndex(x => /(tt|kk)/.test(x));
    return index === -1 ? 0 : index;
}

export function getNounData(noun) {
    let nounGajra = true;
    let nounEnd = noun.slice(-1);  // Equivalent to Python's current_word[-1]
    let secondLast = noun.slice(-2, -1);  // Equivalent to Python's current_word[-2:-1]
    let lastTwo = noun.slice(-3, -1);  // Equivalent to Python's current_word[-3:-1]

    // Check if the last two characters match specific consonant patterns
    if (/[bcdgjklmnprstvwxz][bcdgjklmnprstvwxz]/.test(lastTwo)) {
        nounGajra = false;
    }

    // Return an object or data as needed, example:
    return { nounEnd, secondLast, nounGajra };
}

export function convertSpecial(param) {
    return param === "true";
}

export function applyBasicMutation(noun, type, gender, isSpecial) {
    let result = noun;
    let { nounEnd, secondLast, nounGajra } = getNounData(noun)

    // Accusative Case Logic
    if (type === 'acc') {
        if (gender === "solar") {
            if (/[aio]/.test(nounEnd)) {
                if (/[fvszcxwljr]/.test(secondLast)) {
                    result = noun.replace(/[aio]$/, 'ë');
                } else {
                    result = noun.replace(/[aio]$/, 'e');
                }
            } else if (/[eë]/.test(nounEnd)) {
                result = noun.replace(/[eë]$/, 'o');
            } else {
                if (/[fvszcxwljr]/.test(secondLast) || /[fvszcxwljr]/.test(nounEnd)) {
                    result = noun + "ë";
                } else {
                    result = noun + "e";
                }
            }
        } else if (gender === "lunar") {
            if (noun.length <= 2 || !nounGajra) {
                result = noun + "jë";
            } else if (/[aio]/.test(nounEnd)) {
                result = noun.replace(/[aio]$/, 'jë');
            } else if (/[eë]/.test(nounEnd)) {
                result = noun.replace(/[eë]$/, 'ja');
            } else {
                result = noun + "jë";
            }
        }
        if (isSpecial && /[aioeë]/.test(nounEnd)) {
            result = noun + "s";  // Special case handling
        } else if (isSpecial) {
            result = noun + "es";  // Another special case
        }
    }

    // Dative Case Logic
    else if (type === 'dat') {
        if (/[io]/.test(nounEnd)) {
            if (noun.length > 2 || nounGajra) {
                result = noun.replace(/[io]$/, 'ë');
            } else {
                result = noun + "xë";
            }
        } else if (/[eë]/.test(nounEnd)) {
            if (noun.length > 2 || nounGajra) {
                result = noun.replace(/[eë]$/, 'o');
            } else {
                result = noun + "xo";
            }
        } else {
            result = noun + "a";
        }
        result = result.replace(/([bjmpvw])(x\w?)$/, '$1a$2');  // Correcting based on specific consonants
    }

    // Absolutive Case Logic
    else if (type === 'abs') {
        if (gender === "lunar") {
            result = /[aeëio]/.test(nounEnd) ? noun + "t" : noun + "at";
        } else if (gender === "solar") {
            result = /[aeëio]/.test(nounEnd) ? noun + "l" : noun + "al";
        }
    }

    // Ergative remains unchanged
    else if (type === 'erg') {
        result = noun; // Ergative does not change
    }

    return stress(result);
}

export function applyPossessiveMutation(noun, type, gender, isSpecial) {
    let result = noun;
    let lastLetter = noun.slice(-1);
    let vowelTest = /[aeëio]/.test(lastLetter);
    console.log(vowelTest);

    // Define suffixes for possessive based on type and conditions
    switch (type) {
        case '1sg':
            result += vowelTest ? "n" : "en";
            break;
        case '2sg':
            result += "dan"; // 2nd singular
            break;
        case '3sg':
            result += "lan"; // 3rd singular
            break;
        case '1pl':
            result += vowelTest ? "ran" : "eran";
            break;
        case '2pl':
            result += "danon"; // 2nd plural
            break;
        case '3pl':
            result += vowelTest ? "lanon" : "anon";
            break;
        default:
            // If no type matches, return the original form without any possessive mutation
            result = noun;
            break;
    }

    return stress(result);  // Return the possessive mutated form
}

export function applyGenitiveMutation(noun, type, gender, isSpecial) {
    let result = noun;
    let lastLetter = noun.slice(-1);
    let vowelTest = /[aeëio]/.test(lastLetter);
    let suffix = vowelTest ? "k" : "ek";
    if (type !== '') {
        result += suffix
    }

    return stress(result);  // Return the genitive mutated form
}

export function applySyntacticalMutation(noun, type, gender, isSpecial) {
    let result = noun;
    let lastLetter = noun.slice(-1);

    switch (type) {
        case 'ine':
            result += (/[aeëio]/.test(lastLetter)) ? "tta" : "itta";
            break;
        case 'ade':
            result += "jo";
            break;
        case 'abl':
            result += "va";
            break;
        case 'all':
            result += "zo";
            break;
        case 'instr':
            result += (/[aeëio]/.test(lastLetter)) ? "no" : "eno";
            break;
        default:
            // If no type matches, return the original form without any syntactical mutation
            break;
    }

    return stress(result); // Return the syntactically mutated form
}

export function applyNumberMutation(noun, type, gender, isSpecial) {
    let result = noun;
    let suffix = "";
    let lastLetter = noun.slice(-1);

    switch (type) {
        case 'abe':
            result += (/[aeëio]/.test(lastLetter)) ? "kke" : "ikke";
            break;
        case 'sing':
            // No additional suffix for singular; it's typically the same as the base form.
            break;
        case 'dual':
            result += (/[aeëio]/.test(lastLetter)) ? "de" : "ede";
            break;
        case 'plu':
            result += (/[aeëio]/.test(lastLetter)) ? "z" : "ez";
            break;
        case 'pau':
            result += (/[aeëio]/.test(lastLetter)) ? "rë" : "orë";
            break;
        case 'coll':
            result += (/[aeëio]/.test(lastLetter)) ? "ca" : "oca";
            break;
        default:
            // If no type matches, return the original form without any numerical mutation
            break;
    }

    return stress(result);  // Return the number mutated form
}

export function generateNoun(baseNoun, selections, gender, isSpecial) {
    isSpecial = convertSpecial(isSpecial);
    baseNoun = applyBasicMutation(baseNoun, selections.basic, gender, isSpecial);
    baseNoun = applyPossessiveMutation(baseNoun, selections.possessive, gender, isSpecial);
    baseNoun = applyGenitiveMutation(baseNoun, selections.genitive, gender, isSpecial);
    baseNoun = applySyntacticalMutation(baseNoun, selections.syntactical, gender, isSpecial);
    baseNoun = applyNumberMutation(baseNoun, selections.number, gender, isSpecial);
    return baseNoun;
}