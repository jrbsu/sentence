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
    let j = syllableList[stressedSyllable];
    console.log({syllableList, stressedSyllable, j});
    syllableList[stressedSyllable] = syllableList[stressedSyllable].replace(/(v|s|z|c|x|f|l|j|r|ž)ë/g, '$1e');
    syllableList = syllableList.map(a => multipleReplace(diphthongDict, a));
    return listNeeded ? syllableList : syllableList.join('');
}

export function stressFinder(syllables) {
    const index = syllables.findIndex(x => /(tt|kk)/.test(x));
    return index === -1 ? 0 : index;
}

export function ipaGen(sentence, isSyllables = false) {
    // Split sentence into words
    let words = sentence.split(/\s+/);  // Split by one or more spaces
    let results = [];

    words.forEach(word => {
        // Process each word
        let syllables = isSyllables ? word : stress(word, true); // Assume 'stress' function handles single words
        let IPAList = [];

        syllables.forEach(syllable => {
            let IPAInput = multipleReplace(diphthongDictInv, syllable);
            IPAInput = multipleReplace(ipaDict, IPAInput);
            IPAInput = IPAInput.replace(/-/g, ''); // handles suffixes
            IPAList.push(IPAInput);
        });

        // Apply stress mark after generating all IPA entries
        if (IPAList.length > 1) {
            let stressedSyllable = stressFinder(syllables);
            IPAList[stressedSyllable] = "ˈ" + IPAList[stressedSyllable];
        }

        // Handle special case vowels after stress has been applied to avoid double application
        IPAList = IPAList.map((ipa, index) => {
            if (index !== stressFinder(syllables) && /(?:v|s|z|c|x|f|l|j|r|ž)i/.test(syllables[index])) {
                return ipa.replace(/(v|s|ʒ|ç|ʝ|f|l|j|r|ʃ)i/g, '$1ɪ');
            }
            return ipa;
        });

        results.push(IPAList.join(''));
    });

    console.log("IPA for each word:", results);
    return results.join(' '); // Join all processed words back into a single string
}
