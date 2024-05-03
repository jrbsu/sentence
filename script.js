import { generateVerbs } from './verbGen.js';
import { generateNoun } from './nounGen.js';
import { ipaGen } from './ipaGen.js';

$(document).ready(function () {
    $(document).tooltip();
    const input = $('#autocompleteInput');
    const sentenceDisplay = $('#sentence');
    let words = [];
    let colorMap = {
        "n": "rgba(0, 100, 0, 1)",          // Dark Green
        "v": "rgba(0, 104, 139, 1)",        // Dark Sky Blue
        "adj": "rgba(204, 153, 0, 1)",      // Dark Yellow
        "pron": "rgba(105, 105, 105, 1)",   // Dark Gray
        "conj": "rgba(0, 128, 128, 1)",     // Dark Teal
        "adv": "rgba(139, 0, 0, 1)",        // Dark Red
        "ergative": "rgba(0, 100, 0, 1)",   // Dark Green, same as 'n'
        "accusitive": "rgba(204, 153, 0, 1)", // Dark Yellow, same as 'adj'
        "dative": "rgba(0, 0, 139, 1)",     // Dark Blue
        "absolutive": "rgba(139, 0, 0, 1)", // Dark Red, same as 'adv'
        "solar": "rgba(191, 144, 0, 1)",
        "lunar": "rgba(17, 85, 204, 1)",
    };
    let wordMap = {
        "n": "noun",
        "v": "verb",
        "adj": "adj",
        "pron": "noun"
    }
    let verbTypesObj = {
        "pres": { '1s': '', '1p': '', '2': '', '3s': '', '3p': '', 'form': '' },
        "hab": { '1s': '', '1p': '', '2': '', '3s': '', '3p': '', 'form': '' },
        "past": { '1s': '', '1p': '', '2': '', '3s': '', '3p': '', 'form': '' },
        "fut": { '1s': '', '1p': '', '2': '', '3s': '', '3p': '', 'form': '' },
    };
    let adjTypesObj = {
        "solar": "",
        "lunar": ""
    };
    for (const color in colorMap) {
        document.documentElement.style.setProperty(`--color-${color}`, `${colorMap[color]}`);
    }
    let suggestionsBox;
    let addedWords = []; // To track added words for undo functionality
    let excludedTypes = ["suff.", "pref.", "—", "Type", ""];
    let currentWord;
    let verbMood = 'normal';

    $.ajax({
        url: 'data.tsv',
        type: 'GET',
        success: function (data) {
            words = data.split('\n').map(function (line) {
                const parts = line.split('\t');
                return { word: parts[0], type: parts[1], definition: parts[2], isSpecial: parts[4], gender: parts[5], glossWord: parts[7] };
            });
            initAutocomplete();
        }
    });

    // Not necessary with the new function

    // $('#autocompleteInput').on('keypress', function (event) {
    //     var blockedChars = ['b', 'h', 'p', 'q', 'u', 'w'];
    //     var char = String.fromCharCode(event.which).toLowerCase();
    //     if (blockedChars.includes(char)) {
    //         event.preventDefault();
    //     }
    // });

    function normalizeText(text) {
        return text.replace(/ë/g, 'e').replace(/ž/g, 'z');
    }

    function createHighlightRegex(inputValue) {
        // Escape potentially problematic characters first
        let escapedInput = escapeRegExp(inputValue);
        // Replace characters in the escaped input with regex patterns to match both plain and accented versions
        let pattern = escapedInput.replace(/e/g, '[eë]').replace(/z/g, '[zž]');
        return new RegExp(pattern, 'gi');
    }
    
    function escapeRegExp(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); // Escapes special characters for regex
    }    
    
    function initAutocomplete() {
        suggestionsBox = $('<div></div>', {
            style: "width: 500px"
        });
        $('#input-container').after(suggestionsBox);
    
        input.on('input', function () {
            const inputValue = normalizeText($(this).val().toLowerCase());
    
            if (!inputValue) {
                suggestionsBox.hide();
                return;
            } else {
                suggestionsBox.show();
            }
    
            const highlightRegex = createHighlightRegex(inputValue);
    
            let filteredWords = words.filter(function (w) {
                const normalizedWord = normalizeText(w.word.toLowerCase());
                const normalizedDefinition = normalizeText(w.definition.toLowerCase());
                return (!excludedTypes.includes(w.type) &&
                        (normalizedWord.includes(inputValue) ||
                         normalizedDefinition.includes(inputValue)));
            });
    
            // Enhance sorting to prioritize exact matches
            filteredWords.sort(function (a, b) {
                const normalizedWordA = normalizeText(a.word.toLowerCase());
                const normalizedWordB = normalizeText(b.word.toLowerCase());
                const exactMatchA = (normalizedWordA === inputValue || normalizeText(a.definition.toLowerCase()) === inputValue);
                const exactMatchB = (normalizedWordB === inputValue || normalizeText(b.definition.toLowerCase()) === inputValue);
    
                if (exactMatchA && !exactMatchB) {
                    return -1; // Exact match A comes first
                } else if (!exactMatchA && exactMatchB) {
                    return 1; // Exact match B comes first
                } else {
                    // If both are exact matches or both are not, sort by whether the word contains the input
                    const wordMatchA = normalizedWordA.includes(inputValue);
                    const wordMatchB = normalizedWordB.includes(inputValue);
                    if (wordMatchA && !wordMatchB) {
                        return -1;
                    } else if (!wordMatchA && wordMatchB) {
                        return 1;
                    } else {
                        // If still tied, use natural order based on original list order
                        return 0;
                    }
                }
            });
    
            suggestionsBox.empty();
            $.each(filteredWords, function (i, word) {
                if (i >= 10) {
                    let moreWords = filteredWords.length - 10;
                    suggestionsBox.append(`<div class='dropdown-more'>(${moreWords} more words. Type more to see them.)</div>`);
                    return false;
                }
                const highlightedWord = word.word.replace(highlightRegex, match => `<span class="input-highlight">${match}</span>`);
                const highlightedDefinition = word.definition.replace(highlightRegex, match => `<span class="input-highlight">${match}</span>`);
    
                const div = $('<div></div>', {
                    html: `<span class="dropdown-word-text">${highlightedWord}</span> <span class="dropdown-word-type">(${word.type})</span> - <span class="dropdown-word-definition">${highlightedDefinition}</span>`,
                    class: `dropdown-word`,
                    click: function () {
                        addWordToSentence(word);
                    }
                });
                suggestionsBox.append(div);
            });
        });
    }    

    function populateDicts(word, wordType) {
        if (wordType == "adj") {
            adjTypesObj["solar"] = word + "lo";
            adjTypesObj["lunar"] = word + "te";
        } else if (wordType == "v") {
            const verbs = generateVerbs(verbMood, word);
            verbTypesObj = verbs;
        }
    }

    function resetCheckboxes() {
        $('input:checkbox').prop('checked', false);

        var checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function () {
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.disabled = false;
                $(checkbox).removeAttr("title");
            });
        });
    }

    function resetWord(word) {
        let wordTextElement = word.find('p.word-text');
        wordTextElement.html(word.attr('original'));
        $('h3').html(word.attr('original'));
    }

    function populateWordID(word) {
        let allIDs = [];
        $('input[type="checkbox"]').each(function() {
            // console.log($(this).attr('box-id') + ' is checked: ' + $(this).is(':checked'));
            if ($(this).is(':checked')) {
                let boxID = $(this).attr('box-id');
                allIDs.push(boxID);
            }
        });
        // console.log('Collected IDs: ', allIDs);
        word.attr('config', allIDs.join(','));
    }

    function populateNounSelections(word) {
        let config = word.attr('config');
        if (!config) {
            console.warn("Error: Config attribute is undefined or null.");
        } else {
            config = config.split(',');
        }
        let selectionsObj = {
            'basic': '',
            'possessive': '',
            'genitive': '',
            'syntactical': '',
            'number': ''
        }
        config.forEach(function (e) {
            let selection = e.split('-');
            let nounCase = selection[0]; // This is 'bas', '1sg', 'gen', etc.
            let caseType = selection[1]; // This is 'erg', 'acc', etc.

            selectionsObj.basic = caseType;
            // console.log({ selection, nounCase, caseType });

            // Determine the group based on the nounCase
            switch (nounCase) {
                case 'bas':
                    selectionsObj.basic = caseType;
                    break;
                case '1sg':
                case '2sg':
                case '3sg':
                case '1pl':
                case '2pl':
                case '3pl':
                    selectionsObj.possessive = nounCase;
                    break;
                case 'gen':
                    selectionsObj.genitive = nounCase;
                    break;
                case 'ine':
                case 'ade':
                case 'abl':
                case 'all':
                case 'instr':
                    selectionsObj.syntactical = nounCase;
                    break;
                case 'abe':
                case 'sing':
                case 'dual':
                case 'plu':
                case 'pau':
                case 'coll':
                    selectionsObj.number = nounCase;
                    break;
                default:
                    console.warn('Unrecognized nounCase: ' + nounCase);
                    break;
            }
        });
        return selectionsObj;
    }

    function getWordType(word) {
        let classes = word.attr('class').split(/\s+/);
        var regex = new RegExp('^word-');
        let wordType;
        $.each(classes, function (index, item) {
            if (regex.test(item)) {
                wordType = item.replace(regex, '');
            }
        });
        // console.log(wordType);
        return wordType;
    }

    function populateNoun(word) {
        return generateNoun(word.attr('original'), populateNounSelections(word), word.attr('gender'), word.attr('special'))
    }

    function handleNoun(e) {
        updateCheckboxStates(e.target);
        populateWordID(currentWord);
        let newWord = populateNoun(currentWord);
        let wordTextElement = currentWord.find('p.word-text');
        $('h3').html(newWord);
        wordTextElement.html(newWord);
    }

    $('#mood-selector').change(function() {
        let wordOriginal = currentWord.attr('original');
        populateDicts(wordOriginal, 'v');
        let checkedCheckbox = $('.verb-checkbox:checked').first();
        verbMood = $(this).val();
        const verbs = generateVerbs(verbMood, wordOriginal);
        verbTypesObj = verbs;
        // console.log(verbTypesObj);
        handleVerb(checkedCheckbox, true);
    });

    function handleVerb(e, moodChange) {
        // console.log(verbMood, verbTypesObj);
        let target = moodChange ? e : e.target;
        updateCheckboxStates(target);
        let boxID = $(target).attr('box-id');
        let form = boxID.split('-');
        let newWord = verbTypesObj[form[0]][form[1]];
        $(currentWord).attr('config', boxID);
        $('h3').html(newWord);
        let wordTextElement = currentWord.find('p.word-text');
        $(wordTextElement).html(newWord);
    }

    function handleAdj(e) {
        updateCheckboxStates(e.target);
        let gender = $(e.target).attr('gender');
        $(currentWord).attr('gender', gender);
        $(currentWord).attr('config', gender);
        let newWord = adjTypesObj[gender];
        $('h3').html(newWord);
        let wordTextElement = currentWord.find('p.word-text');
        $(wordTextElement).html(newWord);
    }

    function addWordToSentence(word) {
        $("#sentence").sortable();
        $("#sentence").disableSelection();

        let wordType = word.type.replace('\.', '');
        let wordTypeClass = `word-${wordType}`;
        let wordTitle = word.definition.replace("(\'\'|w)", "") // Replacing wiki formatting

        let isSpecial = word.isSpecial === "TRUE" ? true : false;

        let wordSpan = $('<li></li>', {
            class: `draggable-word ${wordTypeClass}`,
            sortable: true,
            wordType: wordType,
            title: wordTitle,
            original: word.word,
            gender: word.gender,
            gloss: word.glossWord,
            special: isSpecial,
            config: '',
        }).data('word', word.word);

        let genderClass = (wordType == "n") ? word.gender : '';

        let wordP = $('<p></p>', {
            text: word.word,
            class: `word-text ${genderClass}`
        }).appendTo(wordSpan);

        if (wordType == "n") {
            wordSpan.attr('config', ['bas-erg']);
        } else if (wordType == "v") {
            wordSpan.attr('config', ['pres-1s'])
        }

        suggestionsBox.empty();
        input.val('');
        input.focus();

        sentenceDisplay.append(wordSpan);

        addedWords.push(wordSpan); // Add word with its tooltip for undo functionality
        $('#undoButton').prop('disabled', false);

        addCloseButtons();
    }

    function switchActiveWord(activeWord) {
        $('#sentence li.draggable-word').each(function () {
            $(this).removeClass('highlighted');
        });
        activeWord.addClass('highlighted');
    }

    function clickWord(word) {
        resetCheckboxes();
        switchActiveWord(word);
        let wordText = word.text();
        let wordOriginal = word.attr('original');
        currentWord = word;
        $('#suffixSelection h3').html(wordText);
        let wordType = getWordType(word);
        let wordTypeObj = wordMap[wordType];

        populateDicts(wordOriginal, wordType);
        document.documentElement.style.setProperty('--word-type-color', colorMap[wordType]);

        $('.inflection-table').addClass('hidden');
        $(`.${wordTypeObj}-inflection-table`).removeClass('hidden');
        $('#suffixSelection').removeClass('hidden');
        let config = ""
        if (word.attr('config') != undefined) {
            config = word.attr('config').split(',');
        } else if (wordType == "n") {
            config = ["bas-erg"];
        }
        $.each(config, function (index, item) {
            document.querySelectorAll(`input[type="checkbox"][box-id="${item}"]`).forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }

    // Undo functionality
    $('#undoButton').click(function () {
        $('#suffixSelection').addClass('hidden');
        if (addedWords.length > 0) {
            addedWords.pop().remove();
            if (addedWords.length === 0) {
                $(this).prop('disabled', true);
            }
        }
    });

    // Reset functionality
    $('#resetButton').click(function () {
        resetWord(currentWord);
        resetCheckboxes();
    });

    $('#closeButton').click(function () {
        $('#suffixSelection').addClass('hidden');
        $('li').removeClass('highlighted');
    });

    $('#sentence').on('click', '.draggable-word', function () {
        var validClasses = ['word-n', 'word-pron', 'word-v', 'word-adj'];
        currentWord = $(this);
        var shouldTrigger = validClasses.some(cls => currentWord.hasClass(cls));
        if (shouldTrigger) {
            clickWord(currentWord);
        }
    });

    $('.noun-checkbox').click(handleNoun);
    $('.verb-checkbox').click(function(box) {
        handleVerb(box, false);
    });
    $('.adj-checkbox').click(handleAdj);

    var checkboxes = document.querySelectorAll('input[type="checkbox"][data-group]');

    // Function to handle updating checkbox states
    function updateCheckboxStates(targetCheckbox) {
        // console.log(targetCheckbox.dataset, targetCheckbox);
        const isChecked = targetCheckbox.checked;
        const currentGroup = targetCheckbox.dataset.group;
        const currentColumn = targetCheckbox.className.replace('noun-checkbox ', '');

        // Uncheck other checkboxes in the same group
        document.querySelectorAll(`input[type="checkbox"][data-group="${currentGroup}"]`).forEach(checkbox => {
            if (checkbox !== targetCheckbox) {
                checkbox.checked = false;
            }
            // console.log(`${checkbox.getAttribute('box-id')} is ${checkbox.checked}`);
        });

        // Handle enabling/disabling other checkboxes
        if (isChecked) {
            document.querySelectorAll(`input[type="checkbox"]:not(.${currentColumn})`).forEach(other => {
                other.disabled = true;
                $(other).prop("title", `The word is marked as ${currentColumn.replace(/(column-|noun-)/, '')}. Unselect those options to change its role.`);
            });
        } else {
            if (!document.querySelector(`input.${currentColumn}:checked`)) {
                document.querySelectorAll('input[type="checkbox"]').forEach(other => {
                    other.disabled = false;
                    $(other).removeAttr("title");
                });
            }
        }
    }

    // Attach event listeners to checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateCheckboxStates(this);
        });
    });

    function constructGloss(glossWord, config, wordType) {
        // Push the word itself first
        let glossComponents = [`${glossWord.toLowerCase()}`];

        if (config) {
            if (wordType == 'adj') {
                glossComponents.push(config.toUpperCase());
            } else {
                let hasBasicType = false;
                config.split(',').forEach(function (configItem) {
                    const [caseType, typeDetail] = configItem.split('-');
                    // console.log({ caseType, typeDetail, wordType });
                    let toPush = `${typeDetail ? typeDetail.toUpperCase() : ''}${caseType ? '-' + caseType.toUpperCase() : ''}`;
                    if (wordType == "n") {
                        if (caseType == "bas") {
                            toPush = typeDetail.toUpperCase();
                            hasBasicType = true;
                        } else if (["erg", "acc", "dat", "abs"].includes(typeDetail)) {
                            if (hasBasicType) {
                                toPush = caseType.toUpperCase();
                            } else {
                                hasBasicType = true;
                            }
                        }
                    }
                    glossComponents.push(toPush);
                });
            }
        } else {
            switch (wordType) {
                case 'n': glossComponents.push("ERG");
                case 'v': glossComponents.push("1S-PRES");
                case 'adj': glossComponents.push("NONE");
            }
        }

        // Clean up any leading or trailing dashes and return the result
        return glossComponents.join('-').replace(/^[-]+|[-]+$/g, '');
    }

    $('#generateButton').click(function () {
        let sentenceWords = [];
        let glossWords = [];

        $('#sentence li.draggable-word').each(function () {
            const wordText = $(this).text();
            const wordType = $(this).attr('wordtype');
            const glossWord = $(this).attr('gloss');
            const config = $(this).attr('config');

            if (wordText.length > 0) {
                sentenceWords.push(wordText);
                let thisGloss = constructGloss(glossWord, config, wordType);
                glossWords.push(thisGloss);
            }
        });

        // Check if there are no words to process
        if (sentenceWords.length === 0) {
            return; // Exit the function early if there are no words
        }

        // Construct the full sentence and gloss
        let fullSentence = sentenceWords.join(' ');
        let fullSentenceCap = fullSentence.charAt(0).toUpperCase() + fullSentence.slice(1) + '.';
        let fullGloss = glossWords.join(' ');

        // Output the results to the respective divs
        $('#outputSentence').text(fullSentenceCap);
        $('#outputIpa').text(`[${ipaGen(fullSentence)}]`);
        $('#outputGloss1').text(fullSentence);
        $('#outputGloss2').text(fullGloss);
    });

    // Function to add close buttons
    function addCloseButtons() {
        $('#sentence li').each(function () {
            // Check if the button already exists to avoid duplicates
            if ($(this).find('.close-btn').length === 0) {
                $(this).append('<button class="close-btn" aria-label="Close"></button>');
            }
        });
    }

    // Event listener for close buttons
    $('#sentence').on('click', '.close-btn', function (event) {
        event.stopImmediatePropagation();
        $(this).parent('li').remove(); // Remove the li that contains the clicked close button
        $('.suffix-selection').addClass('hidden');
        $('li').removeClass('highlighted');
    });
});
