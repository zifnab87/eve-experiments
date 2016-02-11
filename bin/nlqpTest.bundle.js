(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var app_1 = require("./app");
(function (StateFlags) {
    StateFlags[StateFlags["COMPLETE"] = 0] = "COMPLETE";
    StateFlags[StateFlags["MOREINFO"] = 1] = "MOREINFO";
    StateFlags[StateFlags["NORESULT"] = 2] = "NORESULT";
})(exports.StateFlags || (exports.StateFlags = {}));
var StateFlags = exports.StateFlags;
// Entry point for NLQP
function parse(queryString) {
    var preTokens = preprocessQueryString(queryString);
    var tokens = formTokens(preTokens);
    var _a = formTree(tokens), tree = _a.tree, context = _a.context;
    var query = formQuery(tree);
    // Figure out the state flags
    var flag;
    if (query.projects.length === 0 && query.terms.length === 0) {
        flag = StateFlags.NORESULT;
    }
    else if (treeComplete(tree)) {
        flag = StateFlags.COMPLETE;
    }
    else {
        flag = StateFlags.MOREINFO;
    }
    return [{ tokens: tokens, tree: tree, context: context, query: query, score: undefined, state: flag }];
}
exports.parse = parse;
// Returns false if any nodes are not marked found
// Returns true if all nodes are marked found
function treeComplete(node) {
    if (node.found === false) {
        return false;
    }
    else {
        var childrenStatus = node.children.map(treeComplete);
        return childrenStatus.every(function (child) { return child === true; });
    }
}
// Performs some transformations to the query string before tokenizing
function preprocessQueryString(queryString) {
    // Add whitespace before commas
    var processedString = queryString.replace(new RegExp(",", 'g'), " , ");
    processedString = processedString.replace(new RegExp(";", 'g'), " ; ");
    processedString = processedString.replace(new RegExp("\\+", 'g'), " + ");
    processedString = processedString.replace(new RegExp("-", 'g'), " - ");
    processedString = processedString.replace(new RegExp("\\*", 'g'), " * ");
    processedString = processedString.replace(new RegExp("/", 'g'), " / ");
    processedString = processedString.replace(new RegExp("\\s+", 'g'), " ");
    // Get parts of speach with sentence information. It's okay if they're wrong; they 
    // will be corrected as we create the tree and match against the underlying data model
    var sentences = nlp.pos(processedString, { dont_combine: true }).sentences;
    // If no sentences were found, don't bother parsing
    if (sentences.length === 0) {
        return [];
    }
    var nlpcTokens = sentences[0].tokens;
    var preTokens = nlpcTokens.map(function (token, i) {
        return { ix: i, text: token.text, tag: token.pos.tag };
    });
    // Group quoted text here
    var quoteStarts = preTokens.filter(function (t) { return t.text.charAt(0) === "\""; });
    var quoteEnds = preTokens.filter(function (t) { return t.text.charAt(t.text.length - 1) === "\""; });
    // If we have balanced quotes, combine tokens
    if (quoteStarts.length === quoteEnds.length) {
        var end, start; // @HACK to get around block scoped variable restriction
        for (var i = 0; i < quoteStarts.length; i++) {
            start = quoteStarts[i];
            end = quoteEnds[i];
            // Get all tokens between quotes (inclusive)
            var quotedTokens = preTokens.filter(function (token) { return token.ix >= start.ix && token.ix <= end.ix; })
                .map(function (token) { return token.text; });
            var quotedText = quotedTokens.join(" ");
            // Remove quotes                           
            quotedText = quotedText.replace(new RegExp("\"", 'g'), "");
            // Create a new pretoken
            var newPreToken = { ix: start.ix, text: quotedText, tag: "NNQ" };
            preTokens.splice(preTokens.indexOf(start), quotedTokens.length, newPreToken);
        }
    }
    return preTokens;
}
exports.preprocessQueryString = preprocessQueryString;
var MajorPartsOfSpeech;
(function (MajorPartsOfSpeech) {
    MajorPartsOfSpeech[MajorPartsOfSpeech["ROOT"] = 0] = "ROOT";
    MajorPartsOfSpeech[MajorPartsOfSpeech["VERB"] = 1] = "VERB";
    MajorPartsOfSpeech[MajorPartsOfSpeech["ADJECTIVE"] = 2] = "ADJECTIVE";
    MajorPartsOfSpeech[MajorPartsOfSpeech["ADVERB"] = 3] = "ADVERB";
    MajorPartsOfSpeech[MajorPartsOfSpeech["NOUN"] = 4] = "NOUN";
    MajorPartsOfSpeech[MajorPartsOfSpeech["VALUE"] = 5] = "VALUE";
    MajorPartsOfSpeech[MajorPartsOfSpeech["GLUE"] = 6] = "GLUE";
    MajorPartsOfSpeech[MajorPartsOfSpeech["WHWORD"] = 7] = "WHWORD";
    MajorPartsOfSpeech[MajorPartsOfSpeech["SYMBOL"] = 8] = "SYMBOL";
})(MajorPartsOfSpeech || (MajorPartsOfSpeech = {}));
var MinorPartsOfSpeech;
(function (MinorPartsOfSpeech) {
    MinorPartsOfSpeech[MinorPartsOfSpeech["ROOT"] = 0] = "ROOT";
    // Verb
    MinorPartsOfSpeech[MinorPartsOfSpeech["VB"] = 1] = "VB";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBD"] = 2] = "VBD";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBN"] = 3] = "VBN";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBP"] = 4] = "VBP";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBZ"] = 5] = "VBZ";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBF"] = 6] = "VBF";
    MinorPartsOfSpeech[MinorPartsOfSpeech["CP"] = 7] = "CP";
    MinorPartsOfSpeech[MinorPartsOfSpeech["VBG"] = 8] = "VBG";
    // Adjective
    MinorPartsOfSpeech[MinorPartsOfSpeech["JJ"] = 9] = "JJ";
    MinorPartsOfSpeech[MinorPartsOfSpeech["JJR"] = 10] = "JJR";
    MinorPartsOfSpeech[MinorPartsOfSpeech["JJS"] = 11] = "JJS";
    // Adverb
    MinorPartsOfSpeech[MinorPartsOfSpeech["RB"] = 12] = "RB";
    MinorPartsOfSpeech[MinorPartsOfSpeech["RBR"] = 13] = "RBR";
    MinorPartsOfSpeech[MinorPartsOfSpeech["RBS"] = 14] = "RBS";
    // Noun
    MinorPartsOfSpeech[MinorPartsOfSpeech["NN"] = 15] = "NN";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNPA"] = 16] = "NNPA";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNAB"] = 17] = "NNAB";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NG"] = 18] = "NG";
    MinorPartsOfSpeech[MinorPartsOfSpeech["PRP"] = 19] = "PRP";
    MinorPartsOfSpeech[MinorPartsOfSpeech["PP"] = 20] = "PP";
    // Legacy Noun
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNP"] = 21] = "NNP";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNPS"] = 22] = "NNPS";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNO"] = 23] = "NNO";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNS"] = 24] = "NNS";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNA"] = 25] = "NNA";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NNQ"] = 26] = "NNQ";
    // Glue
    MinorPartsOfSpeech[MinorPartsOfSpeech["FW"] = 27] = "FW";
    MinorPartsOfSpeech[MinorPartsOfSpeech["IN"] = 28] = "IN";
    MinorPartsOfSpeech[MinorPartsOfSpeech["MD"] = 29] = "MD";
    MinorPartsOfSpeech[MinorPartsOfSpeech["CC"] = 30] = "CC";
    MinorPartsOfSpeech[MinorPartsOfSpeech["PDT"] = 31] = "PDT";
    MinorPartsOfSpeech[MinorPartsOfSpeech["DT"] = 32] = "DT";
    MinorPartsOfSpeech[MinorPartsOfSpeech["UH"] = 33] = "UH";
    MinorPartsOfSpeech[MinorPartsOfSpeech["EX"] = 34] = "EX";
    // Value
    MinorPartsOfSpeech[MinorPartsOfSpeech["CD"] = 35] = "CD";
    MinorPartsOfSpeech[MinorPartsOfSpeech["DA"] = 36] = "DA";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NU"] = 37] = "NU";
    // Symbol
    MinorPartsOfSpeech[MinorPartsOfSpeech["LT"] = 38] = "LT";
    MinorPartsOfSpeech[MinorPartsOfSpeech["GT"] = 39] = "GT";
    MinorPartsOfSpeech[MinorPartsOfSpeech["GTE"] = 40] = "GTE";
    MinorPartsOfSpeech[MinorPartsOfSpeech["LTE"] = 41] = "LTE";
    MinorPartsOfSpeech[MinorPartsOfSpeech["EQ"] = 42] = "EQ";
    MinorPartsOfSpeech[MinorPartsOfSpeech["NEQ"] = 43] = "NEQ";
    MinorPartsOfSpeech[MinorPartsOfSpeech["PLUS"] = 44] = "PLUS";
    MinorPartsOfSpeech[MinorPartsOfSpeech["MINUS"] = 45] = "MINUS";
    MinorPartsOfSpeech[MinorPartsOfSpeech["DIV"] = 46] = "DIV";
    MinorPartsOfSpeech[MinorPartsOfSpeech["MUL"] = 47] = "MUL";
    MinorPartsOfSpeech[MinorPartsOfSpeech["SEP"] = 48] = "SEP";
    // Wh- word
    MinorPartsOfSpeech[MinorPartsOfSpeech["WDT"] = 49] = "WDT";
    MinorPartsOfSpeech[MinorPartsOfSpeech["WP"] = 50] = "WP";
    MinorPartsOfSpeech[MinorPartsOfSpeech["WPO"] = 51] = "WPO";
    MinorPartsOfSpeech[MinorPartsOfSpeech["WRB"] = 52] = "WRB"; // Wh-adverb (however whenever where why)
})(MinorPartsOfSpeech || (MinorPartsOfSpeech = {}));
function cloneToken(token) {
    var clone = {
        ix: token.ix,
        originalWord: token.originalWord,
        normalizedWord: token.normalizedWord,
        POS: token.POS,
        properties: [],
    };
    token.properties.map(function (property) { return clone.properties.push(property); });
    return clone;
}
function newToken(word) {
    var token = {
        ix: 0,
        originalWord: word,
        normalizedWord: word,
        POS: MinorPartsOfSpeech.NN,
        properties: [],
    };
    return token;
}
var Properties;
(function (Properties) {
    Properties[Properties["ROOT"] = 0] = "ROOT";
    Properties[Properties["ENTITY"] = 1] = "ENTITY";
    Properties[Properties["COLLECTION"] = 2] = "COLLECTION";
    Properties[Properties["ATTRIBUTE"] = 3] = "ATTRIBUTE";
    Properties[Properties["QUANTITY"] = 4] = "QUANTITY";
    Properties[Properties["PROPER"] = 5] = "PROPER";
    Properties[Properties["PLURAL"] = 6] = "PLURAL";
    Properties[Properties["POSSESSIVE"] = 7] = "POSSESSIVE";
    Properties[Properties["BACKRELATIONSHIP"] = 8] = "BACKRELATIONSHIP";
    Properties[Properties["COMPARATIVE"] = 9] = "COMPARATIVE";
    Properties[Properties["SUPERLATIVE"] = 10] = "SUPERLATIVE";
    Properties[Properties["PRONOUN"] = 11] = "PRONOUN";
    Properties[Properties["SEPARATOR"] = 12] = "SEPARATOR";
    Properties[Properties["CONJUNCTION"] = 13] = "CONJUNCTION";
    Properties[Properties["COMPOUND"] = 14] = "COMPOUND";
    Properties[Properties["QUOTED"] = 15] = "QUOTED";
    Properties[Properties["FUNCTION"] = 16] = "FUNCTION";
    Properties[Properties["GROUPING"] = 17] = "GROUPING";
    Properties[Properties["OUTPUT"] = 18] = "OUTPUT";
    Properties[Properties["INPUT"] = 19] = "INPUT";
    Properties[Properties["NEGATES"] = 20] = "NEGATES";
    Properties[Properties["IMPLICIT"] = 21] = "IMPLICIT";
    Properties[Properties["AGGREGATE"] = 22] = "AGGREGATE";
    Properties[Properties["CALCULATE"] = 23] = "CALCULATE";
    Properties[Properties["OPERATOR"] = 24] = "OPERATOR";
})(Properties || (Properties = {}));
// Finds a given property in a token
function hasProperty(token, property) {
    var found = token.properties.indexOf(property);
    if (found !== -1) {
        return true;
    }
    else {
        return false;
    }
}
// take an input string, extract tokens
function formTokens(preTokens) {
    // Form a token for each word
    var cursorPos = -2;
    var tokens = preTokens.map(function (preToken, i) {
        var word = preToken.text;
        var tag = preToken.tag;
        var token = {
            ix: i + 1,
            originalWord: word,
            normalizedWord: word,
            start: cursorPos += 2,
            end: cursorPos += word.length - 1,
            POS: MinorPartsOfSpeech[tag],
            properties: [],
        };
        var before = "";
        // Add default attribute markers to nouns
        if (token.POS === MinorPartsOfSpeech.NNO ||
            token.POS === MinorPartsOfSpeech.PP) {
            token.properties.push(Properties.POSSESSIVE);
        }
        if (token.POS === MinorPartsOfSpeech.NNP ||
            token.POS === MinorPartsOfSpeech.NNPS ||
            token.POS === MinorPartsOfSpeech.NNPA) {
            token.properties.push(Properties.PROPER);
        }
        if (token.POS === MinorPartsOfSpeech.NNPS ||
            token.POS === MinorPartsOfSpeech.NNS) {
            token.properties.push(Properties.PLURAL);
        }
        if (token.POS === MinorPartsOfSpeech.PP ||
            token.POS === MinorPartsOfSpeech.PRP) {
            token.properties.push(Properties.PRONOUN);
        }
        if (token.POS === MinorPartsOfSpeech.NNQ) {
            token.properties.push(Properties.PROPER);
            token.properties.push(Properties.QUOTED);
        }
        // Add default properties to adjectives and adverbs
        if (token.POS === MinorPartsOfSpeech.JJR || token.POS === MinorPartsOfSpeech.RBR) {
            token.properties.push(Properties.COMPARATIVE);
        }
        else if (token.POS === MinorPartsOfSpeech.JJS || token.POS === MinorPartsOfSpeech.RBS) {
            token.properties.push(Properties.SUPERLATIVE);
        }
        // Add default properties to values
        if (token.POS === MinorPartsOfSpeech.CD ||
            token.POS === MinorPartsOfSpeech.NU) {
            token.properties.push(Properties.QUANTITY);
        }
        // Add default properties to separators
        if (token.POS === MinorPartsOfSpeech.CC) {
            token.properties.push(Properties.CONJUNCTION);
        }
        // normalize the word with the following transformations: 
        // --- strip punctuation
        // --- get rid of possessive ending 
        // --- convert to lower case
        // --- singularize
        // If the word is quoted
        if (token.POS === MinorPartsOfSpeech.NNQ ||
            token.POS === MinorPartsOfSpeech.CD) {
            token.normalizedWord = word;
        }
        else {
            var normalizedWord = word;
            // --- strip punctuation
            normalizedWord = normalizedWord.replace(/\.|\?|\!|/g, '');
            // --- get rid of possessive ending
            before = normalizedWord;
            normalizedWord = normalizedWord.replace(/'s|'$/, '');
            // Heuristic: If the word had a possessive ending, it has to be a possessive noun of some sort      
            if (before !== normalizedWord) {
                if (getMajorPOS(token.POS) !== MajorPartsOfSpeech.NOUN) {
                    token.POS = MinorPartsOfSpeech.NN;
                }
                token.properties.push(Properties.POSSESSIVE);
            }
            // --- convert to lowercase
            before = normalizedWord;
            normalizedWord = normalizedWord.toLowerCase();
            // Heuristic: if the word is not the first word in the sentence and it had capitalization, then it is probably a proper noun
            if (before !== normalizedWord && i !== 0) {
                token.POS = MinorPartsOfSpeech.NNP;
                token.properties.push(Properties.PROPER);
            }
            // --- if the word is a (not proper) noun or verb, singularize
            if ((getMajorPOS(token.POS) === MajorPartsOfSpeech.NOUN || getMajorPOS(token.POS) === MajorPartsOfSpeech.VERB) && !hasProperty(token, Properties.PROPER)) {
                before = normalizedWord;
                normalizedWord = singularize(normalizedWord);
                // Heuristic: If the word changed after singularizing it, then it was plural to begin with
                if (before !== normalizedWord) {
                    token.properties.push(Properties.PLURAL);
                }
            }
            token.normalizedWord = normalizedWord;
        }
        // Heuristic: Special case "in" classified as an adjective. e.g. "the in crowd". This is an uncommon usage
        if (token.normalizedWord === "in" && getMajorPOS(token.POS) === MajorPartsOfSpeech.ADJECTIVE) {
            token.POS = MinorPartsOfSpeech.IN;
        }
        // Heuristic: Special case words with no ambiguous POS that NLPC misclassifies
        switch (token.normalizedWord) {
            case "of":
                token.properties.push(Properties.BACKRELATIONSHIP);
                break;
            case "per":
                token.properties.push(Properties.BACKRELATIONSHIP);
                token.properties.push(Properties.GROUPING);
                break;
            case "all":
                token.POS = MinorPartsOfSpeech.PDT;
                break;
            case "had":
                token.POS = MinorPartsOfSpeech.VBD;
                break;
            case "has":
                token.POS = MinorPartsOfSpeech.VBZ;
                break;
            case "is":
                token.POS = MinorPartsOfSpeech.CP;
                break;
            case "was":
                token.POS = MinorPartsOfSpeech.CP;
                break;
            case "as":
                token.POS = MinorPartsOfSpeech.CP;
                break;
            case "were":
                token.POS = MinorPartsOfSpeech.CP;
                break;
            case "be":
                token.POS = MinorPartsOfSpeech.CP;
                break;
            case "do":
                token.POS = MinorPartsOfSpeech.VBP;
                break;
            case "no":
                token.properties.push(Properties.NEGATES);
                break;
            case "neither":
                token.POS = MinorPartsOfSpeech.CC;
                token.properties.push(Properties.NEGATES);
                break;
            case "nor":
                token.POS = MinorPartsOfSpeech.CC;
                token.properties.push(Properties.NEGATES);
                break;
            case "except":
                token.POS = MinorPartsOfSpeech.CC;
                token.properties.push(Properties.NEGATES);
                break;
            case "without":
                token.POS = MinorPartsOfSpeech.CC;
                token.properties.push(Properties.NEGATES);
                break;
            case "not":
                token.POS = MinorPartsOfSpeech.CC;
                token.properties.push(Properties.NEGATES);
                break;
            case "average":
                token.POS = MinorPartsOfSpeech.NN;
                break;
            case "mean":
                token.POS = MinorPartsOfSpeech.NN;
                break;
            case "their":
                token.properties.push(Properties.PLURAL);
                break;
            case "most":
                token.POS = MinorPartsOfSpeech.JJS;
                token.properties.push(Properties.SUPERLATIVE);
                break;
            case "best":
                token.POS = MinorPartsOfSpeech.JJS;
                token.properties.push(Properties.SUPERLATIVE);
                break;
            case "will":
                // 'will' can be a noun
                if (getMajorPOS(token.POS) !== MajorPartsOfSpeech.NOUN) {
                    token.POS = MinorPartsOfSpeech.MD;
                }
                break;
            case "years":
                token.POS = MinorPartsOfSpeech.NN;
                token.normalizedWord = "year";
                token.properties.push(Properties.PLURAL);
                break;
        }
        // Special case symbols
        switch (token.normalizedWord) {
            case ">":
                token.POS = MinorPartsOfSpeech.GT;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case ">=":
                token.POS = MinorPartsOfSpeech.GTE;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case "<":
                token.POS = MinorPartsOfSpeech.LT;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case "<=":
                token.POS = MinorPartsOfSpeech.LTE;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case "=":
                token.POS = MinorPartsOfSpeech.EQ;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case "!=":
                token.POS = MinorPartsOfSpeech.NEQ;
                token.properties.push(Properties.COMPARATIVE);
                break;
            case "+":
                token.POS = MinorPartsOfSpeech.PLUS;
                token.properties.push(Properties.OPERATOR);
                break;
            case "-":
                token.POS = MinorPartsOfSpeech.MINUS;
                token.properties.push(Properties.OPERATOR);
                break;
            case "*":
                token.POS = MinorPartsOfSpeech.MUL;
                token.properties.push(Properties.OPERATOR);
                break;
            case "/":
                token.POS = MinorPartsOfSpeech.DIV;
                token.properties.push(Properties.OPERATOR);
                break;
            case ",":
                token.POS = MinorPartsOfSpeech.SEP;
                token.properties.push(Properties.SEPARATOR);
                break;
            case ";":
                token.POS = MinorPartsOfSpeech.SEP;
                token.properties.push(Properties.SEPARATOR);
                break;
        }
        token.properties = token.properties.filter(onlyUnique);
        return token;
    });
    // Correct wh- tokens
    for (var _i = 0; _i < tokens.length; _i++) {
        var token = tokens[_i];
        if (token.normalizedWord === "that" ||
            token.normalizedWord === "whatever" ||
            token.normalizedWord === "which") {
            // determiners become wh- determiners
            if (token.POS === MinorPartsOfSpeech.DT) {
                token.POS = MinorPartsOfSpeech.WDT;
            }
            else if (token.POS === MinorPartsOfSpeech.PRP || token.POS === MinorPartsOfSpeech.PP) {
                token.POS = MinorPartsOfSpeech.WP;
            }
            continue;
        }
        // who and whom are wh- pronouns
        if (token.normalizedWord === "who" ||
            token.normalizedWord === "what" ||
            token.normalizedWord === "whom") {
            token.POS = MinorPartsOfSpeech.WP;
            continue;
        }
        // whose is the only wh- possessive pronoun
        if (token.normalizedWord === "whose") {
            token.POS = MinorPartsOfSpeech.WPO;
            token.properties.push(Properties.POSSESSIVE);
            continue;
        }
        // adverbs become wh- adverbs
        if (token.normalizedWord === "how" ||
            token.normalizedWord === "when" ||
            token.normalizedWord === "however" ||
            token.normalizedWord === "whenever" ||
            token.normalizedWord === "where" ||
            token.normalizedWord === "why") {
            token.POS = MinorPartsOfSpeech.WRB;
            continue;
        }
    }
    // Sentence-level POS corrections
    // Heuristic: If there are no verbs in the sentence, there can be no adverbs. Turn them into adjectives
    var verbs = tokens.filter(function (token) { return getMajorPOS(token.POS) === MajorPartsOfSpeech.VERB; });
    if (verbs.length === 0) {
        var adverbs = tokens.filter(function (token) { return getMajorPOS(token.POS) === MajorPartsOfSpeech.ADVERB; });
        adverbs.map(function (adverb) { return adverbToAdjective(adverb); });
    }
    else {
        // Heuristic: Adverbs are located close to verbs
        // Get the distance from each adverb to the closest verb as a percentage of the length of the sentence.
        var adverbs = tokens.filter(function (token) { return getMajorPOS(token.POS) === MajorPartsOfSpeech.ADVERB; });
        adverbs.map(function (adverb) {
            var closestVerb = tokens.length;
            verbs.map(function (verb) {
                var dist = Math.abs(adverb.ix - verb.ix);
                if (dist < closestVerb) {
                    closestVerb = dist;
                }
            });
            var distRatio = closestVerb / tokens.length;
            // Threshold the distance an adverb can be from the verb
            // if it is too far, make it an adjective instead
            if (distRatio > .25) {
                adverbToAdjective(adverb);
            }
        });
    }
    var rootToken = {
        ix: 0,
        originalWord: tokens.map(function (token) { return token.originalWord; }).join(" "),
        normalizedWord: tokens.map(function (token) { return token.normalizedWord; }).join(" "),
        POS: MinorPartsOfSpeech.ROOT,
        properties: [Properties.ROOT],
    };
    tokens = [rootToken].concat(tokens);
    // Link tokens to eachother
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        token.prev = tokens[i - 1];
        token.next = tokens[i + 1];
    }
    log(tokenArrayToString(tokens));
    return tokens;
}
function adverbToAdjective(token) {
    var word = token.normalizedWord;
    // Heuristic: Words that end in -est are superlative
    if (word.substr(word.length - 3, word.length) === "est") {
        token.POS = MinorPartsOfSpeech.JJS;
        token.properties.push(Properties.SUPERLATIVE);
    }
    else if (word.substr(word.length - 2, word.length) === "er") {
        token.POS = MinorPartsOfSpeech.JJR;
        token.properties.push(Properties.COMPARATIVE);
    }
    else {
        token.POS = MinorPartsOfSpeech.JJ;
    }
    return token;
}
function getMajorPOS(minorPartOfSpeech) {
    // ROOT
    if (minorPartOfSpeech === MinorPartsOfSpeech.ROOT) {
        return MajorPartsOfSpeech.ROOT;
    }
    // Verb
    if (minorPartOfSpeech === MinorPartsOfSpeech.VB ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBD ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBN ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBP ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBZ ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBF ||
        minorPartOfSpeech === MinorPartsOfSpeech.VBG) {
        return MajorPartsOfSpeech.VERB;
    }
    // Adjective
    if (minorPartOfSpeech === MinorPartsOfSpeech.JJ ||
        minorPartOfSpeech === MinorPartsOfSpeech.JJR ||
        minorPartOfSpeech === MinorPartsOfSpeech.JJS) {
        return MajorPartsOfSpeech.ADJECTIVE;
    }
    // Adjverb
    if (minorPartOfSpeech === MinorPartsOfSpeech.RB ||
        minorPartOfSpeech === MinorPartsOfSpeech.RBR ||
        minorPartOfSpeech === MinorPartsOfSpeech.RBS) {
        return MajorPartsOfSpeech.ADVERB;
    }
    // Noun
    if (minorPartOfSpeech === MinorPartsOfSpeech.NN ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNA ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNPA ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNAB ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNP ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNPS ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNS ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNQ ||
        minorPartOfSpeech === MinorPartsOfSpeech.NNO ||
        minorPartOfSpeech === MinorPartsOfSpeech.NG ||
        minorPartOfSpeech === MinorPartsOfSpeech.PRP ||
        minorPartOfSpeech === MinorPartsOfSpeech.PP) {
        return MajorPartsOfSpeech.NOUN;
    }
    // Value
    if (minorPartOfSpeech === MinorPartsOfSpeech.CD ||
        minorPartOfSpeech === MinorPartsOfSpeech.DA ||
        minorPartOfSpeech === MinorPartsOfSpeech.NU) {
        return MajorPartsOfSpeech.VALUE;
    }
    // Glue
    if (minorPartOfSpeech === MinorPartsOfSpeech.FW ||
        minorPartOfSpeech === MinorPartsOfSpeech.IN ||
        minorPartOfSpeech === MinorPartsOfSpeech.CP ||
        minorPartOfSpeech === MinorPartsOfSpeech.MD ||
        minorPartOfSpeech === MinorPartsOfSpeech.CC ||
        minorPartOfSpeech === MinorPartsOfSpeech.PDT ||
        minorPartOfSpeech === MinorPartsOfSpeech.DT ||
        minorPartOfSpeech === MinorPartsOfSpeech.UH ||
        minorPartOfSpeech === MinorPartsOfSpeech.EX) {
        return MajorPartsOfSpeech.GLUE;
    }
    // Symbol
    if (minorPartOfSpeech === MinorPartsOfSpeech.LT ||
        minorPartOfSpeech === MinorPartsOfSpeech.GT ||
        minorPartOfSpeech === MinorPartsOfSpeech.GTE ||
        minorPartOfSpeech === MinorPartsOfSpeech.LTE ||
        minorPartOfSpeech === MinorPartsOfSpeech.EQ ||
        minorPartOfSpeech === MinorPartsOfSpeech.NEQ ||
        minorPartOfSpeech === MinorPartsOfSpeech.PLUS ||
        minorPartOfSpeech === MinorPartsOfSpeech.MINUS ||
        minorPartOfSpeech === MinorPartsOfSpeech.DIV ||
        minorPartOfSpeech === MinorPartsOfSpeech.MUL ||
        minorPartOfSpeech === MinorPartsOfSpeech.SEP) {
        return MajorPartsOfSpeech.SYMBOL;
    }
    // Wh-Word
    if (minorPartOfSpeech === MinorPartsOfSpeech.WDT ||
        minorPartOfSpeech === MinorPartsOfSpeech.WP ||
        minorPartOfSpeech === MinorPartsOfSpeech.WPO ||
        minorPartOfSpeech === MinorPartsOfSpeech.WRB) {
        return MajorPartsOfSpeech.WHWORD;
    }
}
// Wrap pluralize to special case certain words it gets wrong
function singularize(word) {
    var specialCases = ["his", "times", "has", "downstairs", "united states", "its"];
    for (var _i = 0; _i < specialCases.length; _i++) {
        var specialCase = specialCases[_i];
        if (specialCase === word) {
            return word;
        }
    }
    return pluralize(word, 1);
}
function cloneNode(node) {
    var token = cloneToken(node.token);
    var cloneNode = newNode(token);
    cloneNode.entity = node.entity;
    cloneNode.collection = node.collection;
    cloneNode.attribute = node.attribute;
    cloneNode.fxn = node.fxn;
    cloneNode.found = node.found;
    node.properties.map(function (property) { return cloneNode.properties.push(property); });
    return cloneNode;
}
function newNode(token) {
    var node = {
        ix: token.ix,
        name: token.normalizedWord,
        parent: undefined,
        children: [],
        token: token,
        properties: token.properties,
        found: false,
        hasProperty: hasProperty,
        toString: nodeToString,
        next: nextNode,
        prev: previousNode,
        addChild: addChild,
    };
    token.node = node;
    function hasProperty(property) {
        var found = node.properties.indexOf(property);
        if (found !== -1) {
            return true;
        }
        else {
            return false;
        }
    }
    function nextNode() {
        var token = node.token;
        var nextToken = token.next;
        if (nextToken !== undefined) {
            return nextToken.node;
        }
        return undefined;
    }
    function previousNode() {
        var token = node.token;
        var prevToken = token.prev;
        if (prevToken !== undefined) {
            return prevToken.node;
        }
        return undefined;
    }
    function addChild(newChild) {
        node.children.push(newChild);
        newChild.parent = node;
    }
    function nodeToString(depth) {
        if (depth === undefined) {
            depth = 0;
        }
        var childrenStrings = node.children.map(function (childNode) { return childNode.toString(depth + 1); }).join("\n");
        var children = childrenStrings.length > 0 ? "\n" + childrenStrings : "";
        var indent = Array(depth + 1).join(" ");
        var index = node.ix === undefined ? "+ " : node.ix + ": ";
        var properties = node.properties.length === 0 ? "" : "(" + node.properties.map(function (property) { return Properties[property]; }).join("|") + ")";
        var attribute = node.attribute === undefined ? "" : "[" + node.attribute.variable + " (" + node.attribute.value + ")] ";
        var entity = node.entity === undefined ? "" : "[" + node.entity.displayName + "] ";
        var collection = node.collection === undefined ? "" : "[" + node.collection.displayName + "] ";
        var fxn = node.fxn === undefined ? "" : "[" + node.fxn.name + "] ";
        var negated = node.hasProperty(Properties.NEGATES) ? "!" : "";
        var found = node.found ? "*" : " ";
        var entityOrProperties = found === " " ? "" + properties : "" + negated + fxn + entity + collection + attribute;
        properties = properties.length === 2 ? "" : properties;
        var nodeString = "|" + found + indent + index + node.name + " " + entityOrProperties + children;
        return nodeString;
    }
    return node;
}
//------------------------------------
// Various node manipulation functions
//------------------------------------
// Removes the node and its children from the tree, 
// and makes it a child of the target node
function reroot(node, target) {
    node.parent.children.splice(node.parent.children.indexOf(node), 1);
    target.addChild(node);
}
// Removes a node from the tree
// The node's children get added to its parent
// returns the node or undefined if the operation failed
function removeNode(node) {
    if (node.hasProperty(Properties.ROOT)) {
        return node;
    }
    if (node.parent === undefined && node.children.length === 0) {
        return node;
    }
    var parent = node.parent;
    var children = node.children;
    // Rewire
    parent.children = parent.children.concat(children);
    parent.children.sort(function (a, b) { return a.ix - b.ix; });
    children.map(function (child) { return child.parent = parent; });
    // Get rid of references on current node
    parent.children.splice(parent.children.indexOf(node), 1);
    node.parent = undefined;
    node.children = [];
    return node;
}
// Returns the first ancestor node that has been found
function previouslyMatched(node, ignoreFunctions) {
    if (ignoreFunctions === undefined) {
        ignoreFunctions = false;
    }
    if (node.parent === undefined) {
        return undefined;
    }
    else if (!ignoreFunctions && node.parent.hasProperty(Properties.FUNCTION) && !node.parent.hasProperty(Properties.CONJUNCTION)) {
        return undefined;
    }
    else if (node.parent.hasProperty(Properties.ENTITY) ||
        node.parent.hasProperty(Properties.ATTRIBUTE) ||
        node.parent.hasProperty(Properties.COLLECTION)) {
        return node.parent;
    }
    else {
        return previouslyMatched(node.parent, ignoreFunctions);
    }
}
// Returns the first ancestor node that has been found
function previouslyMatchedEntityOrCollection(node, ignoreFunctions) {
    if (ignoreFunctions === undefined) {
        ignoreFunctions = false;
    }
    if (node.parent === undefined) {
        return undefined;
    }
    else if (!ignoreFunctions && node.parent.hasProperty(Properties.FUNCTION) && !node.parent.hasProperty(Properties.CONJUNCTION)) {
        return undefined;
    }
    else if (node.parent.hasProperty(Properties.ENTITY) ||
        node.parent.hasProperty(Properties.COLLECTION)) {
        return node.parent;
    }
    else {
        return previouslyMatchedEntityOrCollection(node.parent, ignoreFunctions);
    }
}
// Inserts a node after the target, moving all of the
// target's children to the node
// Before: [Target] -> [Children]
// After:  [Target] -> [Node] -> [Children]
function insertAfterNode(node, target) {
    node.parent = target;
    node.children = target.children;
    target.children.map(function (n) { return n.parent = node; });
    target.children = [node];
}
// Find all leaf nodes stemming from a given node
function findLeafNodes(node) {
    if (node.children.length === 0) {
        return [node];
    }
    else {
        var foundLeafs = node.children.map(findLeafNodes);
        var flatLeafs = flattenNestedArray(foundLeafs);
        return flatLeafs;
    }
}
/*function moveNode(node: Node, target: Node): void {
  if (node.hasProperty(Properties.ROOT)) {
    return;
  }
  let parent = node.parent;
  parent.children.splice(parent.children.indexOf(node),1);
  parent.children = parent.children.concat(node.children);
  node.children.map((child) => child.parent = parent);
  node.children = [];
  node.parent = target;
  target.children.push(node);
}*/
// Finds a parent node with the specified property, 
// returns undefined if no node was found
function findParentWithProperty(node, property) {
    if (node.hasProperty(Properties.ROOT)) {
        return undefined;
    }
    if (node.parent.hasProperty(property)) {
        return node.parent;
    }
    else {
        return findParentWithProperty(node.parent, property);
    }
}
// Finds a parent node with the specified property, 
// returns undefined if no node was found
function findChildWithProperty(node, property) {
    if (node.children.length === 0) {
        return undefined;
    }
    if (node.hasProperty(property)) {
        return node;
    }
    else {
        var childrenWithProperty = node.children.filter(function (child) { return child.hasProperty(property); });
        if (childrenWithProperty !== undefined) {
            return childrenWithProperty[0];
        }
        else {
            var results = node.children.map(function (child) { return findChildWithProperty(child, property); }).filter(function (result) { return result !== undefined; });
            if (results.length > 0) {
                return results[0];
            }
        }
    }
}
// Finds a parent node with the specified POS, 
// returns undefined if no node was found
function findParentWithPOS(node, majorPOS) {
    if (getMajorPOS(node.token.POS) === MajorPartsOfSpeech.ROOT) {
        return undefined;
    }
    if (getMajorPOS(node.parent.token.POS) === majorPOS) {
        return node.parent;
    }
    else {
        return findParentWithPOS(node.parent, majorPOS);
    }
}
/*
// Sets node to be a sibling of its parent
// Before: [Grandparent] -> [Parent] -> [Node]
// After:  [Grandparent] -> [Parent]
//                       -> [Node]
function promoteNode(node: Node): void {
  if (node.parent.hasProperty(Properties.ROOT)) {
    return;
  }
  let newSibling = node.parent;
  let newParent = newSibling.parent;
  // Set parent
  node.parent = newParent;
  // Remove node from parent's children
  newSibling.children.splice(newSibling.children.indexOf(node),1);
  // Add node to new parent's children
  newParent.children.push(node);
}*/
// Makes the node's parent a child of the node.
// The node's grandparent is then the node's parent
// Before: [Grandparent] -> [Parent] -> [Node]
// After: [Grandparen] -> [Node] -> [Parent]
function makeParentChild(node) {
    var parent = node.parent;
    // Do not swap with root
    if (parent.hasProperty(Properties.ROOT)) {
        return;
    }
    // Set parents
    node.parent = parent.parent;
    parent.parent = node;
    // Remove node as a child from parent
    parent.children.splice(parent.children.indexOf(node), 1);
    // Set children
    node.children = node.children.concat(parent);
    node.parent.children.push(node);
    node.parent.children.splice(node.parent.children.indexOf(parent), 1);
}
// Swaps a node with its parent. The node's parent
// is then the parent's parent, and its child is the parent.
// The parent gets the node's children
function swapWithParent(node) {
    var parent = node.parent;
    var pparent = parent.parent;
    if (parent.hasProperty(Properties.ROOT)) {
        return;
    }
    parent.parent = node;
    parent.children = node.children;
    pparent.children.splice(pparent.children.indexOf(parent), 1);
    node.parent = pparent;
    node.children = [parent];
    pparent.children.push(node);
}
(function (FunctionTypes) {
    FunctionTypes[FunctionTypes["FILTER"] = 0] = "FILTER";
    FunctionTypes[FunctionTypes["AGGREGATE"] = 1] = "AGGREGATE";
    FunctionTypes[FunctionTypes["BOOLEAN"] = 2] = "BOOLEAN";
    FunctionTypes[FunctionTypes["CALCULATE"] = 3] = "CALCULATE";
})(exports.FunctionTypes || (exports.FunctionTypes = {}));
var FunctionTypes = exports.FunctionTypes;
function newContext() {
    return {
        entities: [],
        collections: [],
        attributes: [],
        fxns: [],
        groupings: [],
        relationships: [],
        maybeEntities: [],
        maybeAttributes: [],
        maybeCollections: [],
        maybeFunctions: [],
        maybeArguments: [],
    };
}
function wordToFunction(word) {
    switch (word) {
        case "taller":
            return { name: ">", type: FunctionTypes.FILTER, attribute: "height", fields: ["a", "b"], project: false };
        case "shorter":
            return { name: "<", type: FunctionTypes.FILTER, attribute: "length", fields: ["a", "b"], project: false };
        case "longer":
            return { name: ">", type: FunctionTypes.FILTER, attribute: "length", fields: ["a", "b"], project: false };
        case "younger":
            return { name: "<", type: FunctionTypes.FILTER, attribute: "age", fields: ["a", "b"], project: false };
        case "&":
        case "and":
            return { name: "and", type: FunctionTypes.BOOLEAN, fields: [], project: false };
        case "or":
            return { name: "or", type: FunctionTypes.BOOLEAN, fields: [], project: false };
        case "total":
        case "sum":
            return { name: "sum", type: FunctionTypes.AGGREGATE, fields: ["sum", "value"], project: true };
        case "average":
        case "avg":
        case "mean":
            return { name: "average", type: FunctionTypes.AGGREGATE, fields: ["average", "value"], project: true };
        case "plus":
        case "add":
        case "+":
            return { name: "+", type: FunctionTypes.CALCULATE, fields: ["result", "a", "b"], project: true };
        case "subtract":
        case "minus":
        case "-":
            return { name: "-", type: FunctionTypes.CALCULATE, fields: ["result", "a", "b"], project: true };
        case "times":
        case "multiply":
        case "multiplied":
        case "*":
            return { name: "*", type: FunctionTypes.CALCULATE, fields: ["result", "a", "b"], project: true };
        case "divide":
        case "divided":
        case "/":
            return { name: "/", type: FunctionTypes.CALCULATE, fields: ["result", "a", "b"], project: true };
        default:
            return undefined;
    }
}
function formTree(tokens) {
    var tree;
    var subsumedNodes = [];
    // Turn tokens into nodes
    var nodes = tokens.filter(function (token) { return token.node === undefined; }).map(newNode);
    // Build ngrams
    // @TODO Build ngrams by largest to smallest so I don't have to sort at the end
    // @HACK also this feels hacky, although it seems right. Maybe there is a better way
    var n = 4;
    var ngrams = [];
    var inode;
    for (var i = 1; i < nodes.length; i++) {
        var insideGrams = [];
        for (var j = 0; j < n; j++) {
            inode = nodes[i + j];
            if (inode === undefined) {
                break;
            }
            if (insideGrams.length === 0) {
                for (var k = j; k < Math.min(n, nodes.length - i); k++) {
                    insideGrams.push([inode]);
                }
            }
            else {
                for (var k = j; k < Math.min(n, nodes.length - i); k++) {
                    var igram = insideGrams[k];
                    igram.push(inode);
                }
            }
        }
        ngrams = ngrams.concat(insideGrams);
    }
    // Sort the ngrams by length
    ngrams.sort(function (b, a) { return a.length - b.length; });
    // Check each ngram for a display name      
    var matchedNgrams = [];
    for (var _i = 0; _i < ngrams.length; _i++) {
        var ngram = ngrams[_i];
        var allFound = ngram.every(function (node) { return node.found; });
        if (allFound !== true) {
            var displayName = ngram.map(function (node) { return node.name; }).join(" ");
            log(displayName);
            var foundName = app_1.eve.findOne("display name", { name: displayName });
            log(foundName);
            // If the display name is in the system, mark all the nodes as found 
            if (foundName !== undefined) {
                ngram.map(function (node) { return node.found = true; });
                matchedNgrams.push(ngram);
            }
        }
    }
    // Turn ngrams into compound nodes
    for (var _a = 0; _a < matchedNgrams.length; _a++) {
        var ngram = matchedNgrams[_a];
        // Don't do anything for 1-grams
        if (ngram.length === 1) {
            ngram[0].found = false;
            continue;
        }
        log(ngram);
        var displayName = ngram.map(function (node) { return node.name; }).join(" ");
        var lastGram = ngram[ngram.length - 1];
        var compoundToken = newToken(displayName);
        var compoundNode = newNode(compoundToken);
        compoundNode.constituents = ngram;
        compoundNode.ix = lastGram.ix;
        // Inherit properties from the nodes
        compoundNode.properties = lastGram.properties;
        // Insert compound node and remove constituent nodes
        nodes.splice(nodes.indexOf(ngram[0]), ngram.length, compoundNode);
    }
    // Do a quick pass to identify functions
    tokens.map(function (token) {
        var node = token.node;
        var fxn = wordToFunction(node.name);
        if (fxn !== undefined) {
            node.fxn = fxn;
            fxn.node = node;
            node.properties.push(Properties.FUNCTION);
            if (node.fxn.type === FunctionTypes.AGGREGATE) {
                node.properties.push(Properties.AGGREGATE);
            }
            else if (node.fxn.type === FunctionTypes.CALCULATE) {
                node.properties.push(Properties.CALCULATE);
            }
        }
    });
    // Link nodes end to end
    nodes.map(function (thisNode, i) {
        var nextNode = nodes[i + 1];
        if (nextNode !== undefined) {
            thisNode.found = false;
            thisNode.addChild(nextNode);
        }
    });
    // At this point we should only have a single root.
    nodes = nodes.filter(function (node) { return node.parent === undefined; });
    tree = nodes.pop();
    function resolveEntities(node, context) {
        var relationship;
        loop0: while (node !== undefined) {
            context.maybeAttributes = context.maybeAttributes.filter(function (maybeAttr) { return !maybeAttr.found; });
            log("------------------------------------------");
            log(node);
            // Handle nodes that we previously found but need to get hooked up to a function
            if (node.found && node.hasProperty(Properties.ATTRIBUTE) && node.children.length === 0 && context.maybeArguments.length > 0) {
                log("Handling missing attribute");
                var argument = context.maybeArguments.shift();
                if (node.parent.hasProperty(Properties.ENTITY) || node.parent.hasProperty(Properties.COLLECTION)) {
                    var parent_1 = removeNode(node.parent);
                    argument.addChild(parent_1);
                    removeNode(node);
                    parent_1.addChild(node);
                    argument.found = true;
                    if (parent_1.collection) {
                        parent_1.collection.project = false;
                    }
                    else {
                        parent_1.entity.project = false;
                    }
                }
                break;
            }
            // Skip certain nodes
            if (node.found ||
                node.hasProperty(Properties.IMPLICIT) ||
                node.hasProperty(Properties.ROOT)) {
                log("Skipping...");
                break;
            }
            // Remove certain nodes
            if (!node.hasProperty(Properties.FUNCTION)) {
                if (node.hasProperty(Properties.SEPARATOR) ||
                    getMajorPOS(node.token.POS) === MajorPartsOfSpeech.WHWORD ||
                    getMajorPOS(node.token.POS) === MajorPartsOfSpeech.GLUE) {
                    log("Removing node \"" + node.name + "\"");
                    node = node.children[0];
                    if (node !== undefined) {
                        var rNode = removeNode(node.parent);
                        if (rNode.hasProperty(Properties.GROUPING)) {
                            node.properties.push(Properties.GROUPING);
                        }
                        if (rNode.hasProperty(Properties.NEGATES)) {
                            node.properties.push(Properties.NEGATES);
                        }
                    }
                    continue;
                }
            }
            // Handle quantities
            if (node.hasProperty(Properties.QUANTITY)) {
                log("Handling quantity...");
                if (isNumeric(node.name) === false) {
                    break;
                }
                // Create an attribute for the quantity 
                var quantityAttribute = {
                    id: node.name,
                    displayName: node.name,
                    value: "" + node.name,
                    variable: "" + node.name,
                    node: node,
                    project: false,
                };
                node.attribute = quantityAttribute;
                node.properties.push(Properties.ATTRIBUTE);
                node.found = true;
                // If there is a maybeArgument, attach the quantity to it
                if (context.maybeArguments.length > 0) {
                    var argument = context.maybeArguments.shift();
                    var qNode = node;
                    node = qNode.children[0];
                    removeNode(qNode);
                    argument.addChild(qNode);
                    argument.found = true;
                    continue;
                }
                break;
            }
            // Handle functions
            if (node.hasProperty(Properties.FUNCTION)) {
                log("Handling function...");
                // Handle comparative functions
                if (node.hasProperty(Properties.COMPARATIVE)) {
                    var attribute = node.fxn.attribute;
                    var compAttrToken = newToken(node.fxn.attribute);
                    compAttrToken.properties.push(Properties.IMPLICIT);
                    var compAttrNode = newNode(compAttrToken);
                    compAttrNode.fxn = node.fxn;
                    // Add two argument nodes
                    var argumentTokenA = newToken("a");
                    var argumentNodeA = newNode(argumentTokenA);
                    argumentNodeA.properties.push(Properties.IMPLICIT);
                    argumentNodeA.properties.push(Properties.INPUT);
                    node.addChild(argumentNodeA);
                    context.maybeArguments.push(argumentNodeA);
                    var argumentTokenB = newToken("b");
                    var argumentNodeB = newNode(argumentTokenB);
                    argumentNodeB.properties.push(Properties.IMPLICIT);
                    argumentNodeB.properties.push(Properties.INPUT);
                    node.addChild(argumentNodeB);
                    context.maybeArguments.push(argumentNodeB);
                    // Find a node for the LHS of the comaparison
                    var matchedNode_1 = previouslyMatched(node);
                    var compAttrNode1 = cloneNode(compAttrNode);
                    relationship = findRelationship(matchedNode_1, compAttrNode1, context);
                    if (relationship.type === RelationshipTypes.DIRECT) {
                        removeNode(matchedNode_1);
                        matchedNode_1.addChild(compAttrNode1);
                        compAttrNode1.attribute.project = false;
                        argumentNodeA.addChild(matchedNode_1);
                        argumentNodeA.found = true;
                        context.maybeArguments.shift();
                    }
                    // Push the RHS attribute onto the context and continue searching
                    context.maybeAttributes.push(compAttrNode);
                    node.found = true;
                }
                else if (node.hasProperty(Properties.AGGREGATE)) {
                    // Add an output token
                    var outputToken = newToken("output");
                    var outputNode = newNode(outputToken);
                    outputNode.found = true;
                    outputNode.properties.push(Properties.IMPLICIT);
                    outputNode.properties.push(Properties.OUTPUT);
                    var outputAttribute = {
                        id: outputNode.name,
                        displayName: outputNode.name,
                        value: node.fxn.name + "|" + outputNode.name,
                        variable: node.fxn.name + "|" + outputNode.name,
                        node: outputNode,
                        project: true,
                    };
                    outputNode.attribute = outputAttribute;
                    node.addChild(outputNode);
                    // Add an input node
                    var argumentToken = newToken("input");
                    var argumentNode = newNode(argumentToken);
                    argumentNode.properties.push(Properties.IMPLICIT);
                    argumentNode.properties.push(Properties.INPUT);
                    node.addChild(argumentNode);
                    context.maybeArguments.push(argumentNode);
                    node.found = true;
                }
                else if (node.hasProperty(Properties.CALCULATE)) {
                    // Create a result node
                    var resultToken = newToken(node.fxn.fields[0]);
                    var resultNode = newNode(resultToken);
                    resultNode.properties.push(Properties.OUTPUT);
                    resultNode.properties.push(Properties.IMPLICIT);
                    var resultAttribute = {
                        id: resultNode.name,
                        displayName: resultNode.name,
                        value: node.fxn.name + "|" + resultNode.name,
                        variable: node.fxn.name + "|" + resultNode.name,
                        node: resultNode,
                        project: true,
                    };
                    resultNode.attribute = resultAttribute;
                    node.addChild(resultNode);
                    resultNode.found = true;
                    // Add two argument nodes
                    var argumentTokenA = newToken("a");
                    var argumentNodeA = newNode(argumentTokenA);
                    argumentNodeA.properties.push(Properties.IMPLICIT);
                    argumentNodeA.properties.push(Properties.INPUT);
                    node.addChild(argumentNodeA);
                    var argumentTokenB = newToken("b");
                    var argumentNodeB = newNode(argumentTokenB);
                    argumentNodeB.properties.push(Properties.IMPLICIT);
                    argumentNodeB.properties.push(Properties.INPUT);
                    node.addChild(argumentNodeB);
                    // If we already found a numerical attribute, rewire it
                    var foundQuantity = findParentWithProperty(node, Properties.QUANTITY);
                    if (foundQuantity !== undefined && foundQuantity.found === true) {
                        removeNode(foundQuantity);
                        argumentNodeA.addChild(foundQuantity);
                        argumentNodeA.found = true;
                        foundQuantity.attribute.project = false;
                        // If the node has an entity, rewire it as a child of the function
                        if (foundQuantity.attribute.entity) {
                            foundQuantity.attribute.entity.project = false;
                        }
                    }
                    else {
                        context.maybeArguments.push(argumentNodeA);
                    }
                    context.maybeArguments.push(argumentNodeB);
                    node.found = true;
                }
                else if (node.hasProperty(Properties.CONJUNCTION)) {
                    node.found = true;
                }
                context.fxns.push(node.fxn);
                log(tree.toString());
                break;
            }
            // Handle pronouns
            if (node.hasProperty(Properties.PRONOUN)) {
                log("Handling pronoun...");
                var matchedNode_2 = previouslyMatchedEntityOrCollection(node, true);
                if (matchedNode_2 !== undefined) {
                    if (matchedNode_2.collection !== undefined) {
                        node.collection = matchedNode_2.collection;
                        node.properties.push(Properties.COLLECTION);
                        node.found = true;
                        log("Found: " + matchedNode_2.name);
                        break;
                    }
                    else if (matchedNode_2.entity !== undefined) {
                        node.entity = matchedNode_2.entity;
                        node.properties.push(Properties.ENTITY);
                        node.found = true;
                        log("Found: " + matchedNode_2.name);
                        break;
                    }
                }
                log("No pronoun match found");
                break;
            }
            // Find the relationship between parent and child nodes
            // Previously matched node
            var matchedNode = previouslyMatched(node);
            if (matchedNode !== undefined) {
                log("Match in context of previously matched node \"" + matchedNode.name + "\"");
                // Find relationship between previously matched node and this one
                if (matchedNode.hasProperty(Properties.POSSESSIVE)) {
                    if (matchedNode.hasProperty(Properties.ENTITY)) {
                        var found = findEntityAttribute(node, matchedNode.entity, context);
                        if (found === true) {
                            relationship = { type: RelationshipTypes.DIRECT };
                        }
                        else {
                            findCollectionOrEntity(node, context);
                        }
                    }
                    else {
                        relationship = findRelationship(matchedNode, node, context);
                    }
                }
                else {
                    findCollectionOrEntity(node, context);
                    relationship = findRelationship(matchedNode, node, context);
                }
            }
            else {
                findCollectionOrEntity(node, context);
                for (var _i = 0, _a = context.maybeAttributes; _i < _a.length; _i++) {
                    var maybeAttr = _a[_i];
                    log("Matching previously unmatched nodes...");
                    relationship = findRelationship(maybeAttr, node, context);
                    // Rewire found attributes
                    if (maybeAttr.found === true) {
                        removeNode(maybeAttr);
                        // If the attr was an implicit attribute derived from a function,
                        // move the node to be a child of the function and reroot the rest of the query
                        if (maybeAttr.hasProperty(Properties.IMPLICIT)) {
                            maybeAttr.attribute.project = false;
                            var thisNode = node;
                            node = node.children[0];
                            if (node !== undefined) {
                                reroot(node, findParentWithProperty(node, Properties.ROOT));
                            }
                            thisNode.addChild(maybeAttr);
                            if (context.maybeArguments.length > 0) {
                                var fxnArgNode = context.maybeArguments.shift();
                                reroot(thisNode, fxnArgNode);
                                fxnArgNode.found = true;
                                continue loop0;
                            }
                        }
                        else {
                            node.addChild(maybeAttr);
                        }
                    }
                }
                ;
            }
            // Rewire node to reflect an argument of a function
            if (node.hasProperty(Properties.ATTRIBUTE) && context.maybeArguments.length > 0) {
                var argument = context.maybeArguments.shift();
                var qNode = node;
                node = qNode.children[0];
                removeNode(qNode);
                argument.addChild(qNode);
                argument.found = true;
                if (qNode.attribute.entity) {
                    qNode.attribute.entity.project = false;
                }
                continue;
            }
            // Rewire nodes to reflect found relationship
            if (relationship !== undefined && relationship.type !== RelationshipTypes.NONE) {
                // For a direct relationship, move the found node to the entity/collection
                if (relationship.type === RelationshipTypes.DIRECT) {
                    if (node.attribute) {
                        var targetNode = void 0;
                        if (node.attribute.collection && node.parent !== node.attribute.collection.node) {
                            targetNode = node.attribute.collection.node;
                        }
                        else if (node.attribute.entity && node.parent !== node.attribute.entity.node) {
                            targetNode = node.attribute.entity.node;
                        }
                        if (targetNode !== undefined) {
                            var rNode = node;
                            node = node.children[0];
                            removeNode(rNode);
                            targetNode.addChild(rNode);
                            continue;
                        }
                    }
                }
                else if (relationship.type === RelationshipTypes.ONEHOP) {
                    log(relationship);
                    if (relationship.nodes[0].collection) {
                        var collection = relationship.nodes[0].collection;
                        var linkID = relationship.links[0];
                        var nCollection = findEveCollection(linkID);
                        if (nCollection !== undefined) {
                            // Create a new link node
                            var token = newToken(nCollection.displayName);
                            var nNode = newNode(token);
                            insertAfterNode(nNode, collection.node);
                            nNode.collection = nCollection;
                            nCollection.node = nNode;
                            context.collections.push(nCollection);
                            // Build a collection attribute to link with parent
                            var collectionAttribute = {
                                id: collection.displayName,
                                displayName: collection.displayName,
                                collection: nCollection,
                                value: "" + collection.displayName,
                                variable: "" + collection.displayName,
                                node: nNode,
                                project: false,
                            };
                            nNode.properties.push(Properties.IMPLICIT);
                            nNode.properties.push(Properties.ATTRIBUTE);
                            nNode.properties.push(Properties.COLLECTION);
                            nNode.attribute = collectionAttribute;
                            context.attributes.push(collectionAttribute);
                            nNode.found = true;
                            nNode.children[0].attribute.collection = nCollection;
                        }
                    }
                    else if (relationship.nodes[0].entity) {
                        var entity = relationship.nodes[0].entity;
                        var linkID = relationship.links[0];
                        var nCollection = findEveCollection(linkID);
                        if (nCollection !== undefined) {
                            // Create a new link node
                            var token = newToken(nCollection.displayName);
                            var nNode = newNode(token);
                            insertAfterNode(nNode, entity.node);
                            nNode.collection = nCollection;
                            nCollection.node = nNode;
                            nNode.properties.push(Properties.IMPLICIT);
                            nNode.properties.push(Properties.ATTRIBUTE);
                            nNode.properties.push(Properties.COLLECTION);
                            nNode.found = true;
                            context.collections.push(nCollection);
                            // Build a collection attribute to link with parent
                            var collectionAttribute = {
                                id: undefined,
                                displayName: nCollection.displayName,
                                collection: nCollection,
                                value: "" + entity.id,
                                variable: "" + entity.displayName,
                                node: nNode,
                                project: false,
                            };
                            nNode.attribute = collectionAttribute;
                            context.attributes.push(collectionAttribute);
                            nNode.children[0].attribute.collection = nCollection;
                        }
                    }
                }
                else if (relationship.type === RelationshipTypes.INTERSECTION) {
                    var _b = relationship.nodes, nodeA = _b[0], nodeB = _b[1];
                    nodeA.collection.variable = nodeB.collection.variable;
                    nodeB.collection.project = false;
                }
            }
            // If no collection or entity has been found, do some work depending on the node
            if (node.found === false && !node.hasProperty(Properties.IMPLICIT)) {
                log("Not found");
                log(context);
                context.maybeAttributes.push(node);
            }
            break;
        }
        // Resolve entities for the children
        if (node !== undefined) {
            node.children.map(function (child) { return resolveEntities(child, context); });
        }
        return context;
    }
    log(tree.toString());
    log("Resolving entities...");
    var context = newContext();
    resolveEntities(tree, context);
    log("Entities resolved!");
    // Rewire groupings and aggregates
    // @TODO Do this in a rewire step
    var aggregate = findChildWithProperty(tree, Properties.AGGREGATE);
    if (aggregate !== undefined) {
        var grouping = findChildWithProperty(aggregate, Properties.GROUPING);
        if (grouping !== undefined) {
            removeNode(grouping);
            insertAfterNode(grouping, aggregate.parent);
        }
    }
    // Sort children to preserve argument order in functions
    function sortChildren(node) {
        node.children.sort(function (a, b) { return a.ix - b.ix; });
        node.children.map(sortChildren);
    }
    sortChildren(tree);
    // Mark root as found
    tree.found = true;
    log(tree.toString());
    return { tree: tree, context: context };
}
function cloneEntity(entity) {
    var clone = {
        id: entity.id,
        displayName: entity.displayName,
        content: entity.content,
        node: entity.node,
        entityAttribute: entity.entityAttribute,
        variable: entity.variable,
        project: entity.project,
    };
    return clone;
}
function cloneCollection(collection) {
    var clone = {
        id: collection.id,
        displayName: collection.displayName,
        count: collection.count,
        node: collection.node,
        variable: collection.variable,
        project: collection.project,
    };
    return clone;
}
// Returns the entity with the given display name.
// If the entity is not found, returns undefined
// Two error modes here: 
// 1) the name is not found in "display name"
// 2) the name is found in "display name" but not found in "entity"
// can 2) ever happen?
// Returns the collection with the given display name.
function findEveEntity(search) {
    log("Searching for entity: " + search);
    var foundEntity;
    var name;
    // Try to find by display name first
    var display = app_1.eve.findOne("display name", { name: search });
    if (display !== undefined) {
        foundEntity = app_1.eve.findOne("entity", { entity: display.id });
        name = search;
    }
    else {
        foundEntity = app_1.eve.findOne("entity", { entity: search });
    }
    // Build the entity
    if (foundEntity !== undefined) {
        if (name === undefined) {
            display = app_1.eve.findOne("display name", { id: search });
            name = display.name;
        }
        var entity = {
            id: foundEntity.entity,
            displayName: name,
            content: foundEntity.content,
            variable: foundEntity.entity,
            entityAttribute: false,
            project: true,
        };
        log(" Found: " + name);
        return entity;
    }
    else {
        log(" Not found: " + search);
        return undefined;
    }
}
exports.findEveEntity = findEveEntity;
// Returns the collection with the given display name.
function findEveCollection(search) {
    log("Searching for collection: " + search);
    var foundCollection;
    var name;
    // Try to find by display name first
    var display = app_1.eve.findOne("display name", { name: search });
    if (display !== undefined) {
        foundCollection = app_1.eve.findOne("collection", { collection: display.id });
        name = search;
    }
    else {
        foundCollection = app_1.eve.findOne("collection", { collection: search });
    }
    // Build the collection
    if (foundCollection !== undefined) {
        if (name === undefined) {
            display = app_1.eve.findOne("display name", { id: search });
            name = display.name;
        }
        var collection = {
            id: foundCollection.collection,
            displayName: name,
            count: foundCollection.count,
            variable: name,
            project: true,
        };
        log(" Found: " + name);
        return collection;
    }
    else {
        log(" Not found: " + search);
        return undefined;
    }
}
// Returns the attribute with the given display name attached to the given entity
// If the entity does not have that attribute, or the entity does not exist, returns undefined
function findEveAttribute(name, entity) {
    log("Searching for attribute: " + name);
    log(" Entity: " + entity.displayName);
    var foundAttribute = app_1.eve.findOne("entity eavs", { entity: entity.id, attribute: name });
    if (foundAttribute !== undefined) {
        var attribute = {
            id: foundAttribute.attribute,
            displayName: name,
            entity: entity,
            value: foundAttribute.value,
            variable: (entity.displayName + "|" + name).replace(/ /g, ''),
            project: true,
        };
        log(" Found: " + name + " " + attribute.variable + " => " + attribute.value);
        log(attribute);
        return attribute;
    }
    log(" Not found: " + name);
    return undefined;
}
var RelationshipTypes;
(function (RelationshipTypes) {
    RelationshipTypes[RelationshipTypes["NONE"] = 0] = "NONE";
    RelationshipTypes[RelationshipTypes["DIRECT"] = 1] = "DIRECT";
    RelationshipTypes[RelationshipTypes["ONEHOP"] = 2] = "ONEHOP";
    RelationshipTypes[RelationshipTypes["TWOHOP"] = 3] = "TWOHOP";
    RelationshipTypes[RelationshipTypes["INTERSECTION"] = 4] = "INTERSECTION";
})(RelationshipTypes || (RelationshipTypes = {}));
function findRelationship(nodeA, nodeB, context) {
    if (nodeA.hasProperty(Properties.QUANTITY) || nodeB.hasProperty(Properties.QUANTITY)) {
        log("Quantities have no relationship to anything else in the system");
        return { type: RelationshipTypes.NONE };
    }
    log("Finding relationship between \"" + nodeA.name + "\" and \"" + nodeB.name + "\"");
    var relationship;
    // If both nodes are Collections, find their relationship
    if (nodeA.hasProperty(Properties.COLLECTION) && nodeB.hasProperty(Properties.COLLECTION)) {
        relationship = findCollectionToCollectionRelationship(nodeA.collection, nodeB.collection);
    }
    else if (nodeA.hasProperty(Properties.COLLECTION) && !(nodeB.hasProperty(Properties.COLLECTION) || nodeB.hasProperty(Properties.ENTITY))) {
        relationship = findCollectionToAttrRelationship(nodeA.collection, nodeB, context);
    }
    else if (nodeB.hasProperty(Properties.COLLECTION) && !(nodeA.hasProperty(Properties.COLLECTION) || nodeA.hasProperty(Properties.ENTITY))) {
        relationship = findCollectionToAttrRelationship(nodeB.collection, nodeA, context);
    }
    else if (nodeA.hasProperty(Properties.COLLECTION) && nodeB.hasProperty(Properties.ENTITY)) {
        relationship = findCollectionToEntRelationship(nodeA.collection, nodeB.entity);
    }
    else if (nodeB.hasProperty(Properties.COLLECTION) && nodeA.hasProperty(Properties.ENTITY)) {
        relationship = findCollectionToEntRelationship(nodeB.collection, nodeA.entity);
    }
    else if (nodeA.hasProperty(Properties.ENTITY) && !(nodeB.hasProperty(Properties.COLLECTION) || nodeB.hasProperty(Properties.ENTITY))) {
        relationship = findEntToAttrRelationship(nodeA.entity, nodeB, context);
    }
    else if (nodeB.hasProperty(Properties.ENTITY) && !(nodeA.hasProperty(Properties.COLLECTION) || nodeA.hasProperty(Properties.ENTITY))) {
        relationship = findEntToAttrRelationship(nodeB.entity, nodeA, context);
    }
    else if (nodeA.hasProperty(Properties.ATTRIBUTE) && !(nodeB.hasProperty(Properties.COLLECTION) || nodeB.hasProperty(Properties.ENTITY))) {
        relationship = findEntToAttrRelationship(nodeA.attribute.entity, nodeB, context);
    }
    else if (nodeB.hasProperty(Properties.ATTRIBUTE) && !(nodeA.hasProperty(Properties.COLLECTION) || nodeA.hasProperty(Properties.ENTITY))) {
        relationship = findEntToAttrRelationship(nodeB.attribute.entity, nodeA, context);
    }
    // If we found a relationship, add it to the context
    if (relationship !== undefined && relationship.type !== RelationshipTypes.NONE) {
        context.relationships.push(relationship);
        return relationship;
    }
    else {
        return { type: RelationshipTypes.NONE };
    }
}
// e.g. "meetings john was in"
function findCollectionToEntRelationship(coll, ent) {
    log("Finding Coll -> Ent relationship between \"" + coll.displayName + "\" and \"" + ent.displayName + "\"...");
    /*if (coll === "collections") {
      if (eve.findOne("collection entities", { entity: ent.id })) {
        return { type: RelationshipTypes.DIRECT };
      }
    }*/
    if (app_1.eve.findOne("collection entities", { collection: coll.id, entity: ent.id })) {
        log("Found Direct relationship");
        return { type: RelationshipTypes.DIRECT };
    }
    var relationship = app_1.eve.query("")
        .select("collection entities", { collection: coll.id }, "collection")
        .select("directionless links", { entity: ["collection", "entity"], link: ent.id }, "links")
        .exec();
    if (relationship.unprojected.length) {
        log("Found One-Hop Relationship");
        return { type: RelationshipTypes.ONEHOP };
    } /*
    // e.g. events with chris granger (events -> meetings -> chris granger)
    let relationships2 = eve.query(``)
      .select("collection entities", { collection: coll }, "collection")
      .select("directionless links", { entity: ["collection", "entity"] }, "links")
      .select("directionless links", { entity: ["links", "link"], link: ent }, "links2")
      .exec();
    if (relationships2.unprojected.length) {
      let entities = extractFromUnprojected(relationships2.unprojected, 1, 3);
      return { type: RelationshipTypes.TWOHOP };
    }*/
    log("No relationship found :(");
    return { type: RelationshipTypes.NONE };
}
function findEntToAttrRelationship(entity, attr, context) {
    log("Finding Ent -> Attr relationship between \"" + entity.displayName + "\" and \"" + attr.name + "\"...");
    // Check for a direct relationship
    // e.g. "Josh's age"
    var found = findEntityAttribute(attr, entity, context);
    if (found === true) {
        return { type: RelationshipTypes.DIRECT };
    }
    // Check for a one-hop relationship
    // e.g. "Salaries in engineering"
    var relationship = app_1.eve.query("")
        .select("directionless links", { entity: entity.id }, "links")
        .select("entity eavs", { entity: ["links", "link"], attribute: attr.name }, "eav")
        .exec();
    if (relationship.unprojected.length) {
        log("Found One-Hop Relationship");
        log(relationship);
        // Find the one-hop link
        var entities = extractFromUnprojected(relationship.unprojected, 0, 2);
        var collections = findCommonCollections(entities);
        var linkID;
        if (collections.length > 0) {
            // @HACK Choose the correct collection in a smart way. 
            // Largest collection other than entity or testdata?
            linkID = collections[0];
        }
        var entityAttribute = {
            id: attr.name,
            displayName: attr.name,
            value: entity.displayName + "|" + attr.name,
            variable: entity.displayName + "|" + attr.name,
            node: attr,
            project: true,
        };
        attr.attribute = entityAttribute;
        context.attributes.push(entityAttribute);
        attr.properties.push(Properties.ATTRIBUTE);
        attr.found = true;
        return { links: [linkID], type: RelationshipTypes.ONEHOP, nodes: [entity.node, attr] };
    }
    /*
    let relationships2 = eve.query(``)
      .select("directionless links", { entity: entity.id }, "links")
      .select("directionless links", { entity: ["links", "link"] }, "links2")
      .select("entity eavs", { entity: ["links2", "link"], attribute: attr }, "eav")
      .exec();
    if (relationships2.unprojected.length) {
      let entities = extractFromUnprojected(relationships2.unprojected, 0, 3);
      let entities2 = extractFromUnprojected(relationships2.unprojected, 1, 3);
      //return { distance: 2, type: RelationshipTypes.ENTITY_ATTRIBUTE, nodes: [findCommonCollections(entities), findCommonCollections(entities2)] };
    }*/
    log("No relationship found :(");
    return { type: RelationshipTypes.NONE };
}
function findCollectionToCollectionRelationship(collA, collB) {
    log("Finding Coll -> Coll relationship between \"" + collA.displayName + "\" and \"" + collB.displayName + "\"...");
    // are there things in both sets?
    var intersection = app_1.eve.query(collA.displayName + "->" + collB.displayName)
        .select("collection entities", { collection: collA.id }, "collA")
        .select("collection entities", { collection: collB.id, entity: ["collA", "entity"] }, "collB")
        .exec();
    // is there a relationship between things in both sets
    var relationships = app_1.eve.query("relationships between " + collA.displayName + " and " + collB.displayName)
        .select("collection entities", { collection: collA.id }, "collA")
        .select("directionless links", { entity: ["collA", "entity"] }, "links")
        .select("collection entities", { collection: collB.id, entity: ["links", "link"] }, "collB")
        .group([["links", "link"]])
        .aggregate("count", {}, "count")
        .project({ type: ["links", "link"], count: ["count", "count"] })
        .exec();
    var maxRel = { count: 0 };
    for (var _i = 0, _a = relationships.results; _i < _a.length; _i++) {
        var result = _a[_i];
        if (result.count > maxRel.count)
            maxRel = result;
    }
    // we divide by two because unprojected results pack rows next to eachother
    // and we have two selects.
    var intersectionSize = intersection.unprojected.length / 2;
    if (maxRel.count > intersectionSize) {
        // @TODO
        return { type: RelationshipTypes.NONE };
    }
    else if (intersectionSize > maxRel.count) {
        return { type: RelationshipTypes.INTERSECTION, nodes: [collA.node, collB.node] };
    }
    else if (maxRel.count === 0 && intersectionSize === 0) {
        return { type: RelationshipTypes.NONE };
    }
    else {
        // @TODO
        return { type: RelationshipTypes.NONE };
    }
}
exports.findCollectionToCollectionRelationship = findCollectionToCollectionRelationship;
function findCollectionToAttrRelationship(coll, attr, context) {
    // Finds a direct relationship between collection and attribute
    // e.g. "pets' lengths"" => pet -> length
    log("Finding Coll -> Attr relationship between \"" + coll.displayName + "\" and \"" + attr.name + "\"...");
    var relationship = app_1.eve.query("")
        .select("collection entities", { collection: coll.id }, "collection")
        .select("entity eavs", { entity: ["collection", "entity"], attribute: attr.name }, "eav")
        .exec();
    if (relationship.unprojected.length > 0) {
        log("Found Direct Relationship");
        var collectionAttribute = {
            id: attr.name,
            displayName: attr.name,
            collection: coll,
            value: coll.displayName + "|" + attr.name,
            variable: coll.displayName + "|" + attr.name,
            node: attr,
            project: true,
        };
        attr.attribute = collectionAttribute;
        context.attributes.push(collectionAttribute);
        attr.properties.push(Properties.ATTRIBUTE);
        attr.found = true;
        return { type: RelationshipTypes.DIRECT, nodes: [coll.node, attr] };
    }
    // Finds a one hop relationship
    // e.g. "department salaries" => department -> employee -> salary
    relationship = app_1.eve.query("")
        .select("collection entities", { collection: coll.id }, "collection")
        .select("directionless links", { entity: ["collection", "entity"] }, "links")
        .select("entity eavs", { entity: ["links", "link"], attribute: attr.name }, "eav")
        .exec();
    if (relationship.unprojected.length > 0) {
        log("Found One-Hop Relationship");
        log(relationship);
        // Find the one-hop link
        var entities = extractFromUnprojected(relationship.unprojected, 1, 3);
        var collections = findCommonCollections(entities);
        var linkID;
        if (collections.length > 0) {
            // @HACK Choose the correct collection in a smart way. 
            // Largest collection other than entity or testdata?
            linkID = collections[0];
        }
        // Build an attribute for the node
        var attribute = {
            id: attr.name,
            displayName: attr.name,
            collection: coll,
            value: coll.displayName + "|" + attr.name,
            variable: coll.displayName + "|" + attr.name,
            node: attr,
            project: true,
        };
        attr.attribute = attribute;
        context.attributes.push(attribute);
        attr.properties.push(Properties.ATTRIBUTE);
        attr.found = true;
        return { links: [linkID], type: RelationshipTypes.ONEHOP, nodes: [coll.node, attr] };
    }
    // Not sure if this one works... using the entity table, a 2 hop link can
    // be found almost anywhere, yielding results like
    // e.g. "Pets heights" => pets -> snake -> entity -> corey -> height
    /*relationship = eve.query(``)
      .select("collection entities", { collection: coll.id }, "collection")
      .select("directionless links", { entity: ["collection", "entity"] }, "links")
      .select("directionless links", { entity: ["links", "link"] }, "links2")
      .select("entity eavs", { entity: ["links2", "link"], attribute: attr }, "eav")
      .exec();
    if (relationship.unprojected.length > 0) {
      return true;
    }*/
    log("No relationship found :(");
    return { type: RelationshipTypes.NONE };
}
// Extracts entities from unprojected results
function extractFromUnprojected(coll, ix, size) {
    var results = [];
    for (var i = 0, len = coll.length; i < len; i += size) {
        results.push(coll[i + ix]["link"]);
    }
    return results;
}
// Find collections that entities have in common
function findCommonCollections(entities) {
    var intersection = entityTocollectionsArray(entities[0]);
    intersection.sort();
    for (var _i = 0, _a = entities.slice(1); _i < _a.length; _i++) {
        var entId = _a[_i];
        var cur = entityTocollectionsArray(entId);
        cur.sort();
        arrayIntersect(intersection, cur);
    }
    intersection.sort(function (a, b) {
        return app_1.eve.findOne("collection", { collection: a })["count"] - app_1.eve.findOne("collection", { collection: b })["count"];
    });
    return intersection;
}
function entityTocollectionsArray(entity) {
    var entities = app_1.eve.find("collection entities", { entity: entity });
    return entities.map(function (a) { return a["collection"]; });
}
function findCollectionAttribute(node, collection, context, relationship) {
    // The attribute is an attribute of members of the collection
    if (relationship.type === RelationshipTypes.DIRECT) {
        var collectionAttribute = {
            id: node.name,
            displayName: node.name,
            collection: collection,
            value: collection.displayName + "|" + node.name,
            variable: collection.displayName + "|" + node.name,
            node: node,
            project: true,
        };
        node.attribute = collectionAttribute;
        context.attributes.push(collectionAttribute);
        node.found = true;
        return true;
    }
    else if (relationship.type === RelationshipTypes.ONEHOP) {
        var linkID = relationship.links[0];
        var nCollection = findEveCollection(linkID);
        if (nCollection !== undefined) {
            // Create a new link node
            var token = {
                ix: 0,
                originalWord: nCollection.displayName,
                normalizedWord: nCollection.displayName,
                POS: MinorPartsOfSpeech.NN,
                properties: [],
            };
            var nNode = newNode(token);
            insertAfterNode(nNode, collection.node);
            nNode.collection = nCollection;
            nCollection.node = nNode;
            context.collections.push(nCollection);
            // Build a collection attribute to link with parent
            var collectionAttribute = {
                id: collection.displayName,
                displayName: collection.displayName,
                collection: nCollection,
                value: "" + collection.displayName,
                variable: "" + collection.displayName,
                node: nNode,
                project: false,
            };
            nNode.attribute = collectionAttribute;
            context.attributes.push(collectionAttribute);
            nNode.found = true;
            // Build an attribute for the referenced node
            var attribute = {
                id: node.name,
                displayName: node.name,
                collection: nCollection,
                value: nCollection.displayName + "|" + node.name,
                variable: nCollection.displayName + "|" + node.name,
                node: node,
                project: true,
            };
            node.attribute = attribute;
            context.attributes.push(attribute);
            node.found = true;
            return true;
        }
        else {
            var entity = findEveEntity(linkID);
            if (entity !== undefined) {
            }
        }
    }
    return false;
}
function findEntityAttribute(node, entity, context) {
    var attribute = findEveAttribute(node.name, entity);
    if (attribute !== undefined) {
        if (isNumeric(attribute.value)) {
            node.properties.push(Properties.QUANTITY);
        }
        context.attributes.push(attribute);
        node.attribute = attribute;
        node.properties.push(Properties.ATTRIBUTE);
        attribute.node = node;
        // If the node is possessive, check to see if it is an entity
        if (node.hasProperty(Properties.POSSESSIVE) || node.hasProperty(Properties.BACKRELATIONSHIP)) {
            var entity_1 = findEveEntity("" + attribute.value);
            if (entity_1 !== undefined) {
                node.entity = entity_1;
                entity_1.variable = attribute.variable;
                entity_1.entityAttribute = true;
                entity_1.node = node;
                node.parent.entity.project = false;
                attribute.project = false;
                context.entities.push(entity_1);
                node.properties.push(Properties.ENTITY);
            }
        }
        node.found = true;
        var entityNode = entity.node;
        return true;
    }
    return false;
}
// searches for a collection first, then tries to find an entity
function findCollectionOrEntity(node, context) {
    var foundCollection = findCollection(node, context);
    if (foundCollection === true) {
        return true;
    }
    else {
        var foundEntity = findEntity(node, context);
        if (foundEntity === true) {
            return true;
        }
    }
    return false;
}
// searches for a collection first, then tries to find an entity
function findEntityOrCollection(node, context) {
    var foundEntity = findEntity(node, context);
    if (foundEntity === true) {
        return true;
    }
    else {
        var foundCollection = findCollection(node, context);
        if (foundCollection === true) {
            return true;
        }
    }
    return false;
}
function findCollection(node, context) {
    var collection = findEveCollection(node.name);
    if (collection !== undefined) {
        context.collections.push(collection);
        collection.node = node;
        node.collection = collection;
        node.found = true;
        node.properties.push(Properties.COLLECTION);
        if (node.hasProperty(Properties.GROUPING)) {
            context.groupings.push(node);
        }
        return true;
    }
    return false;
}
function findEntity(node, context) {
    var entity = findEveEntity(node.name);
    if (entity !== undefined) {
        context.entities.push(entity);
        entity.node = node;
        node.entity = entity;
        node.found = true;
        node.properties.push(Properties.ENTITY);
        if (node.hasProperty(Properties.GROUPING)) {
            context.groupings.push(node);
        }
        return true;
    }
    return false;
}
function negateTerm(term) {
    var negate = newQuery([term]);
    negate.type = "negate";
    return negate;
}
function newQuery(terms, subqueries, projects) {
    if (terms === undefined) {
        terms = [];
    }
    if (subqueries === undefined) {
        subqueries = [];
    }
    if (projects === undefined) {
        projects = [];
    }
    // Dedupe terms
    var termStrings = terms.map(termToString);
    var uniqueTerms = termStrings.map(function (value, index, self) {
        return self.indexOf(value) === index;
    });
    terms = terms.filter(function (term, index) { return uniqueTerms[index]; });
    var query = {
        type: "query",
        terms: terms,
        subqueries: subqueries,
        projects: projects,
        toString: queryToString,
    };
    function queryToString(depth) {
        if (query.terms.length === 0 && query.projects.length === 0) {
            return "";
        }
        if (depth === undefined) {
            depth = 0;
        }
        var indent = Array(depth + 1).join("\t");
        var queryString = indent + "(";
        // Map each term/subquery/project to a string
        var typeString = query.type;
        var termString = query.terms.map(function (term) { return termToString(term, depth + 1); }).join("\n");
        var subqueriesString = query.subqueries.map(function (query) { return query.toString(depth + 1); }).join("\n");
        var projectsString = query.projects.map(function (term) { return termToString(term, depth + 1); }).join("\n");
        // Now compose the query string
        queryString += typeString;
        queryString += termString === "" ? "" : "\n" + termString;
        queryString += subqueriesString === "" ? "" : "\n" + subqueriesString;
        queryString += projectsString === "" ? "" : "\n" + projectsString;
        // Close out the query
        queryString += "\n" + indent + ")";
        return queryString;
    }
    function termToString(term, depth) {
        if (depth === undefined) {
            depth = 0;
        }
        var indent = Array(depth + 1).join("\t");
        var termString = indent + "(";
        termString += term.type + " ";
        termString += "" + (term.table === undefined ? "" : "\"" + term.table + "\" ");
        termString += term.fields.map(function (field) { return (":" + field.name + " " + (field.variable ? field.value : "\"" + field.value + "\"")); }).join(" ");
        termString += ")";
        return termString;
    }
    return query;
}
exports.newQuery = newQuery;
function formQuery(node) {
    var query = newQuery();
    var projectFields = [];
    // Handle the child nodes
    var childQueries = node.children.map(formQuery);
    // Subsume child queries
    var combinedProjectFields = [];
    for (var _i = 0; _i < childQueries.length; _i++) {
        var cQuery = childQueries[_i];
        query.terms = query.terms.concat(cQuery.terms);
        query.subqueries = query.subqueries.concat(cQuery.subqueries);
        // Combine unnamed projects
        for (var _a = 0, _b = cQuery.projects; _a < _b.length; _a++) {
            var project_1 = _b[_a];
            if (project_1.table === undefined) {
                combinedProjectFields = combinedProjectFields.concat(project_1.fields);
            }
        }
    }
    if (combinedProjectFields.length > 0) {
        var project_2 = {
            type: "project!",
            fields: combinedProjectFields,
        };
        query.projects.push(project_2);
    }
    // If the node is a grouping node, stuff the query into a subquery
    // and take its projects
    if (node.hasProperty(Properties.GROUPING)) {
        var subquery = query;
        query = newQuery();
        query.projects = query.projects.concat(subquery.projects);
        subquery.projects = [];
        query.subqueries.push(subquery);
    }
    // Handle the current node
    // Just return at the root
    if (node.hasProperty(Properties.ROOT)) {
        // Reverse the order of fields in the projects
        for (var _c = 0, _d = query.projects; _c < _d.length; _c++) {
            var project_3 = _d[_c];
            project_3.fields = project_3.fields.reverse();
        }
        return query;
    }
    // Handle functions -------------------------------
    if (node.fxn !== undefined) {
        // Skip functions with no arguments
        if (node.fxn.fields.length === 0) {
            return query;
        }
        // Collection all input and output nodes which were found
        var nestedArgs = node.children.filter(function (child) { return (child.hasProperty(Properties.INPUT) || child.hasProperty(Properties.OUTPUT))
            && child.found === true; })
            .map(findLeafNodes);
        var args = flattenNestedArray(nestedArgs);
        // If we have the right number of arguments, proceed
        // @TODO surface an error if the arguments are wrong
        var output;
        if (args.length === node.fxn.fields.length) {
            var fields = args.map(function (arg, i) {
                return { name: "" + node.fxn.fields[i],
                    value: "" + arg.attribute.variable,
                    variable: true };
            });
            var term = {
                type: "select",
                table: node.fxn.name,
                fields: fields,
            };
            // If an aggregate is grouped, we have to push the aggregate into a subquery
            if (node.fxn.type === FunctionTypes.AGGREGATE && query.subqueries.length > 0) {
                var subquery = query.subqueries[0];
                if (subquery !== undefined) {
                    subquery.terms.push(term);
                }
            }
            else {
                query.terms.push(term);
            }
            // project output if necessary
            if (node.fxn.project === true) {
                var outputFields = args.filter(function (arg) { return arg.hasProperty(Properties.OUTPUT); })
                    .map(function (arg) {
                    return { name: "" + node.fxn.name,
                        value: "" + arg.attribute.variable,
                        variable: true };
                });
                projectFields = projectFields.concat(outputFields);
                query.projects = [];
            }
        }
    }
    // Handle attributes -------------------------------
    if (node.attribute !== undefined) {
        var attr = node.attribute;
        var entity = attr.entity;
        var collection = attr.collection;
        var fields = [];
        var entityField;
        // Entity
        if (entity !== undefined) {
            entityField = { name: "entity",
                value: "" + (attr.entity.entityAttribute ? attr.entity.variable : attr.entity.id),
                variable: attr.entity.entityAttribute };
        }
        else if (collection !== undefined) {
            entityField = { name: "entity",
                value: "" + attr.collection.displayName,
                variable: true };
        }
        else {
            return query;
        }
        fields.push(entityField);
        // Attribute
        if (attr.id !== undefined) {
            var attrField = { name: "attribute",
                value: attr.id,
                variable: false };
            fields.push(attrField);
        }
        // Value
        var valueField = { name: "value",
            value: attr.id === undefined ? attr.value : attr.variable,
            variable: attr.id !== undefined };
        fields.push(valueField);
        var term = {
            type: "select",
            table: "entity eavs",
            fields: fields,
        };
        query.terms.push(term);
        // project if necessary
        if (node.attribute.project === true && !node.hasProperty(Properties.NEGATES)) {
            var attributeField = { name: "" + node.attribute.id,
                value: node.attribute.variable,
                variable: true };
            projectFields.push(attributeField);
        }
    }
    // Handle collections -------------------------------
    if (node.collection !== undefined && !node.hasProperty(Properties.PRONOUN)) {
        var entityField = { name: "entity",
            value: node.collection.variable,
            variable: true };
        var collectionField = { name: "collection",
            value: node.collection.id,
            variable: false };
        var term = {
            type: "select",
            table: "is a attributes",
            fields: [entityField, collectionField],
        };
        query.terms.push(term);
        // project if necessary
        if (node.collection.project === true && !node.hasProperty(Properties.NEGATES)) {
            var collectionField_1 = { name: "" + node.collection.displayName.replace(new RegExp(" ", 'g'), ""),
                value: "" + node.collection.variable,
                variable: true };
            projectFields.push(collectionField_1);
        }
    }
    // Handle entities -------------------------------
    if (node.entity !== undefined && !node.hasProperty(Properties.PRONOUN)) {
        // project if necessary
        if (node.entity.project === true) {
            var entityField = { name: "" + node.entity.displayName.replace(new RegExp(" ", 'g'), ""),
                value: "" + (node.entity.entityAttribute ? node.entity.variable : node.entity.id),
                variable: node.entity.entityAttribute };
            projectFields.push(entityField);
        }
    }
    var project = {
        type: "project!",
        fields: projectFields,
    };
    if (node.hasProperty(Properties.NEGATES)) {
        var negatedTerm = query.terms.pop();
        var negatedQuery = negateTerm(negatedTerm);
        query.subqueries.push(negatedQuery);
    }
    query.projects.push(project);
    return query;
}
// ----------------------------------------------------------------------------
// Debug utility functions
// ---------------------------------------------------------------------------- 
var divider = "--------------------------------------------------------------------------------";
exports.debug = false;
function log(x) {
    if (exports.debug) {
        console.log(x);
    }
}
function nodeArrayToString(nodes) {
    var nodeArrayString = nodes.map(function (node) { return node.toString(); }).join("\n" + divider + "\n");
    return divider + "\n" + nodeArrayString + "\n" + divider;
}
exports.nodeArrayToString = nodeArrayToString;
function tokenToString(token) {
    var properties = "(" + token.properties.map(function (property) { return Properties[property]; }).join("|") + ")";
    properties = properties.length === 2 ? "" : properties;
    var tokenSpan = token.start === undefined ? " " : " [" + token.start + "-" + token.end + "] ";
    var tokenString = token.ix + ": " + token.originalWord + " | " + token.normalizedWord + " | " + MajorPartsOfSpeech[getMajorPOS(token.POS)] + " | " + MinorPartsOfSpeech[token.POS] + " | " + properties;
    return tokenString;
}
exports.tokenToString = tokenToString;
function tokenArrayToString(tokens) {
    var tokenArrayString = tokens.map(function (token) { return tokenToString(token); }).join("\n");
    return divider + "\n" + tokenArrayString + "\n" + divider;
}
exports.tokenArrayToString = tokenArrayToString;
// ----------------------------------------------------------------------------
// Utility functions
// ----------------------------------------------------------------------------
function flattenNestedArray(nestedArray) {
    var flattened = [].concat.apply([], nestedArray);
    return flattened;
}
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
function arrayIntersect(a, b) {
    var ai = 0;
    var bi = 0;
    var result = [];
    while (ai < a.length && bi < b.length) {
        if (a[ai] < b[bi])
            ai++;
        else if (a[ai] > b[bi])
            bi++;
        else {
            result.push(a[ai]);
            ai++;
            bi++;
        }
    }
    return result;
}
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
window["NLQP"] = exports;

},{"./app":2}],2:[function(require,module,exports){
/// <reference path="microReact.ts" />
/// <reference path="../vendor/marked.d.ts" />
var microReact = require("./microReact");
var runtime = require("./runtime");
var uiRenderer_1 = require("./uiRenderer");
var utils_1 = require("./utils");
exports.syncedTables = ["sourced eav", "view", "action", "action source", "action mapping", "action mapping constant", "action mapping sorted", "action mapping limit"];
exports.eveLocalStorageKey = "eve";
//---------------------------------------------------------
// Renderer
//---------------------------------------------------------
var perfStats;
var perfStatsUi;
var updateStat = 0;
function initRenderer() {
    exports.renderer = new microReact.Renderer();
    exports.uiRenderer = new uiRenderer_1.UIRenderer(exports.eve);
    document.body.appendChild(exports.renderer.content);
    window.addEventListener("resize", render);
    perfStatsUi = document.createElement("div");
    perfStatsUi.id = "perfStats";
    document.body.appendChild(perfStatsUi);
}
if (utils_1.ENV === "browser")
    var performance = window["performance"] || { now: function () { return (new Date()).getTime(); } };
exports.renderRoots = {};
function render() {
    if (!exports.renderer || exports.renderer.queued)
        return;
    exports.renderer.queued = true;
    requestAnimationFrame(function () {
        var stats = {};
        var start = performance.now();
        var trees = [];
        for (var root in exports.renderRoots) {
            trees.push(exports.renderRoots[root]());
        }
        stats.root = (performance.now() - start).toFixed(2);
        if (+stats.root > 10)
            console.info("Slow root: " + stats.root);
        start = performance.now();
        var dynamicUI = exports.eve.find("system ui").map(function (ui) { return ui["template"]; });
        if (utils_1.DEBUG && utils_1.DEBUG.UI_COMPILE) {
            console.info("compiling", dynamicUI);
            console.info("*", exports.uiRenderer.compile(dynamicUI));
        }
        trees.push.apply(trees, exports.uiRenderer.compile(dynamicUI));
        stats.uiCompile = (performance.now() - start).toFixed(2);
        if (+stats.uiCompile > 10)
            console.info("Slow ui compile: " + stats.uiCompile);
        start = performance.now();
        exports.renderer.render(trees);
        stats.render = (performance.now() - start).toFixed(2);
        stats.update = updateStat.toFixed(2);
        perfStatsUi.textContent = "";
        perfStatsUi.textContent += "root: " + stats.root;
        perfStatsUi.textContent += " | ui compile: " + stats.uiCompile;
        perfStatsUi.textContent += " | render: " + stats.render;
        perfStatsUi.textContent += " | update: " + stats.update;
        perfStats = stats;
        exports.renderer.queued = false;
    });
}
exports.render = render;
var storeQueued = false;
function storeLocally() {
    if (storeQueued)
        return;
    storeQueued = true;
    setTimeout(function () {
        var serialized = exports.eve.serialize(true);
        if (exports.eveLocalStorageKey === "eve") {
            for (var _i = 0; _i < exports.syncedTables.length; _i++) {
                var synced = exports.syncedTables[_i];
                delete serialized[synced];
            }
        }
        delete serialized["provenance"];
        localStorage[exports.eveLocalStorageKey] = JSON.stringify(serialized);
        storeQueued = false;
    }, 1000);
}
//---------------------------------------------------------
// Dispatch
//---------------------------------------------------------
var dispatches = {};
function handle(event, func) {
    if (dispatches[event]) {
        console.error("Overwriting handler for '" + event + "'");
    }
    dispatches[event] = func;
}
exports.handle = handle;
function dispatch(event, info, dispatchInfo) {
    var result = dispatchInfo;
    if (!result) {
        result = exports.eve.diff();
        result.meta.render = true;
        result.meta.store = true;
    }
    result.dispatch = function (event, info) {
        return dispatch(event, info, result);
    };
    result.commit = function () {
        var start = performance.now();
        // result.remove("builtin entity", {entity: "render performance statistics"});
        // result.add("builtin entity", {entity: "render performance statistics", content: `
        // # Render performance statistics ({is a: system})
        // root: {root: ${perfStats.root}}
        // ui compile: {ui compile: ${perfStats.uiCompile}}
        // render: {render: ${perfStats.render}}
        // update: {update: ${perfStats.update}}
        // Horrible hack, disregard this: {perf stats: render performance statistics}
        // `});
        if (!runtime.INCREMENTAL) {
            exports.eve.applyDiff(result);
        }
        else {
            exports.eve.applyDiffIncremental(result);
        }
        if (result.meta.render) {
            render();
        }
        if (result.meta.store) {
            storeLocally();
            if (exports.eveLocalStorageKey === "eve") {
                sendChangeSet(result);
            }
        }
        updateStat = performance.now() - start;
    };
    if (!event)
        return result;
    var func = dispatches[event];
    if (!func) {
        console.error("No dispatches for '" + event + "' with " + JSON.stringify(info));
    }
    else {
        func(result, info);
    }
    return result;
}
exports.dispatch = dispatch;
//---------------------------------------------------------
// State
//---------------------------------------------------------
exports.eve = runtime.indexer();
exports.initializers = {};
exports.activeSearches = {};
function init(name, func) {
    exports.initializers[name] = func;
}
exports.init = init;
function executeInitializers() {
    for (var initName in exports.initializers) {
        exports.initializers[initName]();
    }
}
//---------------------------------------------------------
// Websocket
//---------------------------------------------------------
var me = utils_1.uuid();
if (this.localStorage) {
    if (localStorage["me"])
        me = localStorage["me"];
    else
        localStorage["me"] = me;
}
function connectToServer() {
    exports.socket = new WebSocket("ws://" + (window.location.hostname || "localhost") + ":8080");
    exports.socket.onerror = function () {
        console.error("Failed to connect to server, falling back to local storage");
        exports.eveLocalStorageKey = "local-eve";
        executeInitializers();
        render();
    };
    exports.socket.onopen = function () {
        sendServer("connect", me);
    };
    exports.socket.onmessage = function (data) {
        var parsed = JSON.parse(data.data);
        console.log("WS MESSAGE:", parsed);
        if (parsed.kind === "load") {
            // eve.load(parsed.data);
            executeInitializers();
            render();
        }
        else if (parsed.kind === "changeset") {
            var diff = exports.eve.diff();
            diff.tables = parsed.data;
            exports.eve.applyDiff(diff);
            render();
        }
    };
}
function sendServer(messageKind, data) {
    if (!exports.socket)
        return;
    exports.socket.send(JSON.stringify({ kind: messageKind, me: me, time: (new Date).getTime(), data: data }));
}
function sendChangeSet(changeset) {
    if (!exports.socket)
        return;
    var changes = {};
    var send = false;
    for (var _i = 0; _i < exports.syncedTables.length; _i++) {
        var table = exports.syncedTables[_i];
        if (changeset.tables[table]) {
            send = true;
            changes[table] = changeset.tables[table];
        }
    }
    if (send)
        sendServer("changeset", changes);
}
//---------------------------------------------------------
// Go
//---------------------------------------------------------
if (utils_1.ENV === "browser") {
    document.addEventListener("DOMContentLoaded", function (event) {
        initRenderer();
        // connectToServer();
        exports.eveLocalStorageKey = "local-eve";
        executeInitializers();
        render();
    });
}
init("load data", function () {
    var stored = localStorage[exports.eveLocalStorageKey];
    if (stored) {
        exports.eve.load(stored);
    }
});
if (utils_1.ENV === "browser")
    window["app"] = exports;

},{"./microReact":4,"./runtime":6,"./uiRenderer":7,"./utils":8}],3:[function(require,module,exports){
var utils_1 = require("./utils");
var runtime = require("./runtime");
var app = require("./app");
var app_1 = require("./app");
var parser_1 = require("./parser");
var uiRenderer_1 = require("./uiRenderer");
exports.ixer = app_1.eve;
//-----------------------------------------------------------------------------
// Utilities
//-----------------------------------------------------------------------------
// export function UIFromDSL(str:string):UI {
//   function processElem(data:UIElem):UI {
//     let elem = new UI(data.id || uuid());
//     if(data.binding) elem.bind(data.bindingKind === "query" ? parseDSL(data.binding);
//     if(data.embedded) elem.embed(data.embedded);
//     if(data.attributes) elem.attributes(data.attributes);
//     if(data.events) elem.events(data.events);
//     if(data.children) {
//       for(let child of data.children) elem.child(processElem(child));
//     }
//     return elem;
//   }
//   return processElem(parseUI(str));
// }
var BSPhase = (function () {
    function BSPhase(ixer, changeset) {
        if (changeset === void 0) { changeset = ixer.diff(); }
        this.ixer = ixer;
        this.changeset = changeset;
        this._views = {};
        this._viewFields = {};
        this._entities = [];
        this._uis = {};
        this._queries = {};
        this._names = {};
    }
    BSPhase.prototype.viewKind = function (view) {
        return this._views[view];
    };
    BSPhase.prototype.viewFields = function (view) {
        return this._viewFields[view];
    };
    BSPhase.prototype.apply = function (nukeExisting) {
        for (var view in this._views) {
            if (this._views[view] === "table")
                exports.ixer.addTable(view, this._viewFields[view]);
        }
        if (nukeExisting) {
            for (var view in this._views) {
                if (this._views[view] !== "table")
                    this.changeset.merge(runtime.Query.remove(view, this.ixer));
            }
            for (var _i = 0, _a = this._entities; _i < _a.length; _i++) {
                var entity = _a[_i];
                this.changeset.remove("builtin entity", { entity: entity });
            }
            for (var ui in this._uis)
                this.changeset.merge(uiRenderer_1.UI.remove(ui, this.ixer));
        }
        exports.ixer.applyDiff(this.changeset);
    };
    //-----------------------------------------------------------------------------
    // Macros
    //-----------------------------------------------------------------------------
    BSPhase.prototype.addFact = function (table, fact) {
        this.changeset.add(table, fact);
        return this;
    };
    BSPhase.prototype.addEntity = function (entity, name, kinds, attributes, extraContent) {
        entity = utils_1.builtinId(entity);
        this._names[name] = entity;
        this._entities.push(entity);
        this.addFact("display name", { id: entity, name: name });
        var isAs = [];
        for (var _i = 0; _i < kinds.length; _i++) {
            var kind = kinds[_i];
            var sourceId = entity + ",is a," + kind;
            isAs.push("{" + kind + "|rep=link; eav source = " + sourceId + "}");
            var collEntity = utils_1.builtinId(kind);
            this.addFact("display name", { id: collEntity, name: kind });
            this.addFact("sourced eav", { entity: entity, attribute: "is a", value: collEntity, source: sourceId });
        }
        var collectionsText = "";
        if (isAs.length)
            collectionsText = utils_1.titlecase(name) + " is a " + isAs.slice(0, -1).join(", ") + " " + (isAs.length > 1 ? "and" : "") + " " + isAs[isAs.length - 1] + ".";
        var content = (_a = ["\n      #", "\n      ", "\n    "], _a.raw = ["\n      #", "\n      ", "\n    "], utils_1.unpad(6)(_a, name, collectionsText));
        if (attributes) {
            content += "\n##Attributes\n";
            for (var attr in attributes) {
                var sourceId = entity + "," + attr + "," + attributes[attr];
                var query = name + "'s " + attr;
                var queryId = query.replace(" ", "-");
                content += attr + ": {" + query + "|rep=CSV; field=" + attr + "; eav source = " + sourceId + "}\n";
                var value = this._names[attributes[attr]] || attributes[attr];
                this.addFact("sourced eav", { entity: entity, attribute: attr, value: value, source: sourceId });
                var artifacts = parser_1.parseDSL("(query :$$view \"" + queryId + "\"\n                                     (entity-eavs :entity \"" + entity + "\" :attribute \"" + attr + "\" :value v)\n                                     (project! :entity \"" + entity + "\" :" + attr + " v))");
                this.addArtifacts(artifacts);
                this.addFact("query to id", { query: query, id: queryId });
            }
        }
        if (extraContent)
            content += "\n" + extraContent;
        var page = entity + "|root";
        this.addFact("page content", { page: page, content: content });
        this.addFact("entity page", { entity: entity, page: page });
        return this;
        var _a;
    };
    BSPhase.prototype.addView = function (view, kind, fields) {
        this._views[view] = kind;
        this._viewFields[view] = fields;
        this.addFact("view", { view: view, kind: kind });
        for (var _i = 0; _i < fields.length; _i++) {
            var field = fields[_i];
            this.addFact("field", { view: view, field: field });
        }
        var entity = view + " view";
        this.addEntity(entity, entity, ["system", kind], undefined, (_a = ["\n      ## Fields\n      ", "\n    "], _a.raw = ["\n      ## Fields\n      ", "\n    "], utils_1.unpad(6)(_a, fields.map(function (field) { return ("* " + field); }).join("\n      "))));
        return this;
        var _a;
    };
    BSPhase.prototype.addTable = function (view, fields) {
        this.addView(view, "table", fields);
        return this;
    };
    BSPhase.prototype.addUnion = function (view, fields, builtin) {
        if (builtin === void 0) { builtin = true; }
        this.addView(view, "union", fields);
        if (builtin) {
            var table = "builtin " + view;
            this.addTable(table, fields);
            this.addUnionMember(view, table);
        }
        return this;
    };
    BSPhase.prototype.addUnionMember = function (union, member, mapping) {
        // apply the natural mapping.
        if (!mapping) {
            if (this.viewKind(union) !== "union")
                throw new Error("Union '" + union + "' must be added before adding members");
            mapping = {};
            for (var _i = 0, _a = this.viewFields(union); _i < _a.length; _i++) {
                var field = _a[_i];
                mapping[field] = field;
            }
        }
        var action = union + " <-- " + member + " <-- " + JSON.stringify(mapping);
        this.addFact("action", { view: union, action: action, kind: "union", ix: 0 })
            .addFact("action source", { action: action, "source view": member });
        for (var field in mapping) {
            var mapped = mapping[field];
            if (mapped.constructor === Array) {
                this.addFact("action mapping constant", { action: action, from: field, "value": mapped[0] });
            }
            else {
                this.addFact("action mapping", { action: action, from: field, "to source": member, "to field": mapped });
            }
        }
        return this;
    };
    BSPhase.prototype.addQuery = function (view, query) {
        query.name = view;
        this._queries[view] = query;
        this.addView(view, "query", Object.keys(query.projectionMap || {}));
        this.changeset.merge(query.changeset(this.ixer));
        return this;
    };
    BSPhase.prototype.addArtifacts = function (artifacts) {
        var views = artifacts.views;
        for (var view in artifacts.views) {
            this._views[view] = "query";
        }
        for (var id in views)
            this.changeset.merge(views[id].changeset(app_1.eve));
        return this;
    };
    BSPhase.prototype.addUI = function (id, ui) {
        ui.id = id;
        this._uis[id] = ui;
        this.addEntity(id, id, ["system", "ui"]);
        this.changeset.merge(ui.changeset(this.ixer));
        return this;
    };
    return BSPhase;
})();
//-----------------------------------------------------------------------------
// Runtime Setup
//-----------------------------------------------------------------------------
app.init("bootstrap", function bootstrap() {
    //-----------------------------------------------------------------------------
    // Entity System
    //-----------------------------------------------------------------------------
    var phase = new BSPhase(app_1.eve);
    phase.addTable("manual entity", ["entity", "content"]);
    phase.addTable("sourced eav", ["entity", "attribute", "value", "source"]);
    phase.addTable("page content", ["page", "content"]);
    phase.addTable("entity page", ["entity", "page"]);
    phase.addTable("action entity", ["entity", "content", "source"]);
    phase
        .addEntity("entity", "entity", ["system"])
        .addEntity("collection", "collection", ["system"])
        .addEntity("system", "system", ["system", "collection"])
        .addEntity("union", "union", ["system", "collection"])
        .addEntity("query", "query", ["system", "collection"])
        .addEntity("table", "table", ["system", "collection"])
        .addEntity("ui", "ui", ["system", "collection"])
        .addEntity("home", "home", ["system"], undefined, (_a = ["\n      {entity|rep = directory}\n    "], _a.raw = ["\n      {entity|rep = directory}\n    "], utils_1.unpad(6)(_a)));
    phase.addUnion("entity eavs", ["entity", "attribute", "value"], true)
        .addUnionMember("entity eavs", "generated eav", { entity: "entity", attribute: "attribute", value: "value" })
        .addUnionMember("entity eavs", "sourced eav", { entity: "entity", attribute: "attribute", value: "value" })
        .addUnionMember("entity eavs", "added eavs");
    phase.addUnion("entity links", ["entity", "link", "type"])
        .addUnionMember("entity links", "eav entity links")
        .addUnionMember("entity links", "is a attributes", { entity: "entity", link: "collection", type: ["is a"] });
    phase.addUnion("directionless links", ["entity", "link"])
        .addUnionMember("directionless links", "entity links")
        .addUnionMember("directionless links", "entity links", { entity: "link", link: "entity" });
    phase.addUnion("collection entities", ["entity", "collection"])
        .addUnionMember("collection entities", "is a attributes");
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: entity\"\n      (entity-page :entity entity :page page)\n      (page-content :page page :content content)\n      (project! \"entity\" :entity entity :content content))\n  "));
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: unmodified added bits\"\n      (added-bits :entity entity :content content)\n      (negate (manual-entity :entity entity))\n      (project! \"unmodified added bits\" :entity entity :content content))\n  "));
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: is a attributes\"\n      (entity-eavs :attribute \"is a\" :entity entity :value value)\n      (project! \"is a attributes\" :collection value :entity entity))\n  "));
    // @HACK: this view is required because you can't currently join a select on the result of a function.
    // so we create a version of the eavs table that already has everything lowercased.
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: lowercase eavs\"\n      (entity-eavs :entity entity :attribute attribute :value value)\n      (lowercase :text value :result lowercased)\n      (project! \"lowercase eavs\" :entity entity :attribute attribute :value lowercased))\n  "));
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: eav entity links\"\n      (entity-eavs :entity entity :attribute attribute :value value)\n      (entity :entity value)\n      (project! \"eav entity links\" :entity entity :type attribute :link value))\n  "));
    phase.addArtifacts(parser_1.parseDSL("\n    (query :$$view \"bs: collection\"\n      (is-a-attributes :collection entity)\n      (query :$$view \"bs: collection count\"\n        (is-a-attributes :collection entity :entity child)\n        (count :count childCount))\n      (project! \"collection\" :collection entity :count childCount))\n  "));
    phase.addEntity("entity", "entity", ["system"]);
    phase.addEntity("collection", "collection", ["system"]);
    phase.addArtifacts(parser_1.parseDSL((_b = ["\n    (query :$$view \"bs: entity eavs from entities\"\n      (entity :entity entity)\n      (project! \"entity eavs\" :entity entity :attribute \"is a\" :value \"", "\"))\n  "], _b.raw = ["\n    (query :$$view \"bs: entity eavs from entities\"\n      (entity :entity entity)\n      (project! \"entity eavs\" :entity entity :attribute \"is a\" :value \"", "\"))\n  "], utils_1.unpad(4)(_b, utils_1.builtinId("entity")))));
    phase.addArtifacts(parser_1.parseDSL((_c = ["\n    (query :$$view \"bs: entity eavs from collections\"\n      (is-a-attributes :collection coll)\n      (project! \"entity eavs\" :entity coll :attribute \"is a\" :value \"", "\"))\n  "], _c.raw = ["\n    (query :$$view \"bs: entity eavs from collections\"\n      (is-a-attributes :collection coll)\n      (project! \"entity eavs\" :entity coll :attribute \"is a\" :value \"", "\"))\n  "], utils_1.unpad(4)(_c, utils_1.builtinId("collection")))));
    /*  phase.addArtifacts(parseDSL(unpad(4) `
        (query
          (entity :entity entity)
          (negate (query
            (directionless-links :entity entity :link link)
            (!= link "AUTOGENERATED entity THIS SHOULDN'T SHOW UP ANYWHERE")
            (!= link "AUTOGENERATED orphaned THIS SHOULDN'T SHOW UP ANYWHERE")
            ))
          (project! "entity eavs" :entity coll :attribute "is a" :value "AUTOGENERATED collection THIS SHOULDN'T SHOW UP ANYWHERE"))
    `));*/
    phase.addTable("ui pane", ["pane", "contains", "kind"]);
    if (app_1.eve.find("ui pane").length === 0)
        phase.addFact("ui pane", { pane: "p1", contains: "pet", kind: 0 });
    phase.apply(true);
    //-----------------------------------------------------------------------------
    // UI
    //-----------------------------------------------------------------------------
    phase = new BSPhase(app_1.eve);
    // @FIXME: These should probably be unionized.
    function resolve(table, fields) {
        return fields.map(function (field) { return (table + ": " + field); });
    }
    phase.addTable("ui template", resolve("ui template", ["template", "parent", "ix"]));
    phase.addTable("ui template binding", resolve("ui template binding", ["template", "query"]));
    phase.addTable("ui embed", resolve("ui embed", ["embed", "template", "parent", "ix"]));
    phase.addTable("ui embed scope", resolve("ui embed scope", ["embed", "key", "value"]));
    phase.addTable("ui embed scope binding", resolve("ui embed scope binding", ["embed", "key", "source", "alias"]));
    phase.addTable("ui attribute", resolve("ui attribute", ["template", "property", "value"]));
    phase.addTable("ui attribute binding", resolve("ui attribute binding", ["template", "property", "source", "alias"]));
    phase.addTable("ui event", resolve("ui event", ["template", "event"]));
    phase.addTable("ui event state", resolve("ui event state", ["template", "event", "key", "value"]));
    phase.addTable("ui event state binding", resolve("ui event state binding", ["template", "event", "key", "source", "alias"]));
    phase.addTable("system ui", ["template"]);
    phase.apply(true);
    //-----------------------------------------------------------------------------
    // Testing
    //-----------------------------------------------------------------------------
    phase = new BSPhase(app_1.eve);
    var testData = {
        "test data": [],
        pet: [],
        exotic: [],
        dangerous: [],
        cat: ["pet"],
        dog: ["pet"],
        fish: ["pet"],
        snake: ["pet", "exotic"],
        koala: ["pet", "exotic"],
        sloth: ["pet", "exotic"],
        kangaroo: ["exotic"],
        giraffe: ["exotic"],
        gorilla: ["exotic", "dangerous"],
        company: [],
        kodowa: ["company"],
        department: [],
        engineering: ["department"],
        operations: ["department"],
        magic: ["department"],
        employee: [],
        josh: ["employee"],
        corey: ["employee"],
        chris: ["employee"],
        rob: ["employee"],
        eric: ["employee"],
    };
    var testAttrs = {
        cat: { length: 4 },
        dog: { length: 3 },
        fish: { length: 1 },
        snake: { length: 4 },
        koala: { length: 3 },
        sloth: { length: 3 },
        engineering: { company: "kodowa" },
        operations: { company: "kodowa" },
        magic: { company: "kodowa" },
        josh: { department: "engineering", salary: 7 },
        corey: { department: "engineering", salary: 10 },
        chris: { department: "engineering", salary: 10 },
        eric: { department: "engineering", salary: 7 },
        rob: { department: "operations", salary: 10 },
    };
    for (var entity in testData)
        phase.addEntity(entity, entity, ["test data"].concat(testData[entity]), testAttrs[entity], "");
    // phase.addTable("department", ["department"])
    //   .addFact("department", {department: "engineering"})
    //   .addFact("department", {department: "operations"})
    //   .addFact("department", {department: "magic"});
    // phase.addTable("employee", ["department", "employee", "salary"])
    //   .addFact("employee", {department: "engineering", employee: "josh", salary: 10})
    //   .addFact("employee", {department: "engineering", employee: "corey", salary: 11})
    //   .addFact("employee", {department: "engineering", employee: "chris", salary: 7})
    //   .addFact("employee", {department: "operations", employee: "rob", salary: 7});
    phase.apply(true);
    window["p"] = phase;
    var _a, _b, _c;
});
window["bootstrap"] = exports;

},{"./app":2,"./parser":5,"./runtime":6,"./uiRenderer":7,"./utils":8}],4:[function(require,module,exports){
function now() {
    if (window.performance) {
        return window.performance.now();
    }
    return (new Date()).getTime();
}
function shallowEquals(a, b) {
    if (a === b)
        return true;
    if (!a || !b)
        return false;
    for (var k in a) {
        if (a[k] !== b[k])
            return false;
    }
    for (var k in b) {
        if (b[k] !== a[k])
            return false;
    }
    return true;
}
function postAnimationRemove(elements) {
    for (var _i = 0; _i < elements.length; _i++) {
        var elem = elements[_i];
        if (elem.parentNode)
            elem.parentNode.removeChild(elem);
    }
}
var Renderer = (function () {
    function Renderer() {
        this.content = document.createElement("div");
        this.content.className = "__root";
        this.elementCache = { "__root": this.content };
        this.prevTree = {};
        this.tree = {};
        this.postRenders = [];
        this.lastDiff = { adds: [], updates: {} };
        var self = this;
        this.handleEvent = function handleEvent(e) {
            var id = (e.currentTarget || e.target)["_id"];
            var elem = self.tree[id];
            if (!elem)
                return;
            var handler = elem[e.type];
            if (handler) {
                handler(e, elem);
            }
        };
    }
    Renderer.compile = function (elem) {
        if (!elem.id)
            throw new Error("Cannot compile element with id " + elem.id);
        var renderer = Renderer._compileRenderer[elem.id];
        if (!renderer)
            renderer = Renderer._compileRenderer[elem.id] = new Renderer();
        renderer.render([elem]);
        return renderer.elementCache[elem.id];
    };
    Renderer.prototype.reset = function () {
        this.prevTree = this.tree;
        this.tree = {};
        this.postRenders = [];
    };
    Renderer.prototype.domify = function () {
        var fakePrev = {}; //create an empty object once instead of every instance of the loop
        var elements = this.tree;
        var prevElements = this.prevTree;
        var diff = this.lastDiff;
        var adds = diff.adds;
        var updates = diff.updates;
        var elemKeys = Object.keys(updates);
        var elementCache = this.elementCache;
        var tempTween = {};
        //Create all the new elements to ensure that they're there when they need to be
        //parented
        for (var i = 0, len = adds.length; i < len; i++) {
            var id = adds[i];
            var cur = elements[id];
            var div;
            if (cur.svg) {
                div = document.createElementNS("http://www.w3.org/2000/svg", cur.t || "rect");
            }
            else {
                div = document.createElement(cur.t || "div");
            }
            div._id = id;
            elementCache[id] = div;
            if (cur.enter) {
                if (cur.enter.delay) {
                    cur.enter.display = "auto";
                    div.style.display = "none";
                }
                Velocity(div, cur.enter, cur.enter);
            }
        }
        for (var i = 0, len = elemKeys.length; i < len; i++) {
            var id = elemKeys[i];
            var cur = elements[id];
            var prev = prevElements[id] || fakePrev;
            var type = updates[id];
            var div;
            if (type === "replaced") {
                var me = elementCache[id];
                if (me.parentNode)
                    me.parentNode.removeChild(me);
                if (cur.svg) {
                    div = document.createElementNS("http://www.w3.org/2000/svg", cur.t || "rect");
                }
                else {
                    div = document.createElement(cur.t || "div");
                }
                prev = fakePrev;
                div._id = id;
                elementCache[id] = div;
            }
            else if (type === "removed") {
                //NOTE: Batching the removes such that you only remove the parent
                //didn't actually make this faster surprisingly. Given that this
                //strategy is much simpler and there's no noticable perf difference
                //we'll just do the dumb thing and remove all the children one by one.
                var me = elementCache[id];
                if (prev.leave) {
                    prev.leave.complete = postAnimationRemove;
                    if (prev.leave.absolute) {
                        me.style.position = "absolute";
                    }
                    Velocity(me, prev.leave, prev.leave);
                }
                else if (me.parentNode)
                    me.parentNode.removeChild(me);
                elementCache[id] = null;
                continue;
            }
            else {
                div = elementCache[id];
            }
            var style = div.style;
            if (cur.c !== prev.c)
                div.className = cur.c;
            if (cur.draggable !== prev.draggable)
                div.draggable = cur.draggable === undefined ? null : "true";
            if (cur.contentEditable !== prev.contentEditable)
                div.contentEditable = cur.contentEditable !== undefined ? JSON.stringify(cur.contentEditable) : "inherit";
            if (cur.colspan !== prev.colspan)
                div.colSpan = cur.colspan;
            if (cur.placeholder !== prev.placeholder)
                div.placeholder = cur.placeholder;
            if (cur.selected !== prev.selected)
                div.selected = cur.selected;
            if (cur.value !== prev.value)
                div.value = cur.value;
            if (cur.t === "input" && cur.type !== prev.type)
                div.type = cur.type;
            if (cur.t === "input" && cur.checked !== prev.checked)
                div.checked = cur.checked;
            if ((cur.text !== prev.text || cur.strictText) && div.textContent !== cur.text)
                div.textContent = cur.text === undefined ? "" : cur.text;
            if (cur.tabindex !== prev.tabindex)
                div.setAttribute("tabindex", cur.tabindex);
            if (cur.href !== prev.href)
                div.setAttribute("href", cur.href);
            if (cur.src !== prev.src)
                div.setAttribute("src", cur.src);
            if (cur.data !== prev.data)
                div.setAttribute("data", cur.data);
            if (cur.download !== prev.download)
                div.setAttribute("download", cur.download);
            if (cur.allowfullscreen !== prev.allowfullscreen)
                div.setAttribute("allowfullscreen", cur.allowfullscreen);
            // animateable properties
            var tween = cur.tween || tempTween;
            if (cur.flex !== prev.flex) {
                if (tween.flex)
                    tempTween.flex = cur.flex;
                else
                    style.flex = cur.flex === undefined ? "" : cur.flex;
            }
            if (cur.left !== prev.left) {
                if (tween.left)
                    tempTween.left = cur.left;
                else
                    style.left = cur.left === undefined ? "" : cur.left;
            }
            if (cur.top !== prev.top) {
                if (tween.top)
                    tempTween.top = cur.top;
                else
                    style.top = cur.top === undefined ? "" : cur.top;
            }
            if (cur.height !== prev.height) {
                if (tween.height)
                    tempTween.height = cur.height;
                else
                    style.height = cur.height === undefined ? "auto" : cur.height;
            }
            if (cur.width !== prev.width) {
                if (tween.width)
                    tempTween.width = cur.width;
                else
                    style.width = cur.width === undefined ? "auto" : cur.width;
            }
            if (cur.zIndex !== prev.zIndex) {
                if (tween.zIndex)
                    tempTween.zIndex = cur.zIndex;
                else
                    style.zIndex = cur.zIndex;
            }
            if (cur.backgroundColor !== prev.backgroundColor) {
                if (tween.backgroundColor)
                    tempTween.backgroundColor = cur.backgroundColor;
                else
                    style.backgroundColor = cur.backgroundColor || "transparent";
            }
            if (cur.borderColor !== prev.borderColor) {
                if (tween.borderColor)
                    tempTween.borderColor = cur.borderColor;
                else
                    style.borderColor = cur.borderColor || "none";
            }
            if (cur.borderWidth !== prev.borderWidth) {
                if (tween.borderWidth)
                    tempTween.borderWidth = cur.borderWidth;
                else
                    style.borderWidth = cur.borderWidth || 0;
            }
            if (cur.borderRadius !== prev.borderRadius) {
                if (tween.borderRadius)
                    tempTween.borderRadius = cur.borderRadius;
                else
                    style.borderRadius = (cur.borderRadius || 0) + "px";
            }
            if (cur.opacity !== prev.opacity) {
                if (tween.opacity)
                    tempTween.opacity = cur.opacity;
                else
                    style.opacity = cur.opacity === undefined ? 1 : cur.opacity;
            }
            if (cur.fontSize !== prev.fontSize) {
                if (tween.fontSize)
                    tempTween.fontSize = cur.fontSize;
                else
                    style.fontSize = cur.fontSize;
            }
            if (cur.color !== prev.color) {
                if (tween.color)
                    tempTween.color = cur.color;
                else
                    style.color = cur.color || "inherit";
            }
            var animKeys = Object.keys(tempTween);
            if (animKeys.length) {
                Velocity(div, tempTween, tween);
                tempTween = {};
            }
            // non-animation style properties
            if (cur.backgroundImage !== prev.backgroundImage)
                style.backgroundImage = "url('" + cur.backgroundImage + "')";
            if (cur.border !== prev.border)
                style.border = cur.border || "none";
            if (cur.textAlign !== prev.textAlign) {
                style.alignItems = cur.textAlign;
                if (cur.textAlign === "center") {
                    style.textAlign = "center";
                }
                else if (cur.textAlign === "flex-end") {
                    style.textAlign = "right";
                }
                else {
                    style.textAlign = "left";
                }
            }
            if (cur.verticalAlign !== prev.verticalAlign)
                style.justifyContent = cur.verticalAlign;
            if (cur.fontFamily !== prev.fontFamily)
                style.fontFamily = cur.fontFamily || "inherit";
            if (cur.transform !== prev.transform)
                style.transform = cur.transform || "none";
            if (cur.style !== prev.style)
                div.setAttribute("style", cur.style);
            if (cur.dangerouslySetInnerHTML !== prev.dangerouslySetInnerHTML)
                div.innerHTML = cur.dangerouslySetInnerHTML;
            // debug/programmatic properties
            if (cur.semantic !== prev.semantic)
                div.setAttribute("data-semantic", cur.semantic);
            if (cur.debug !== prev.debug)
                div.setAttribute("data-debug", cur.debug);
            // SVG properties
            if (cur.svg) {
                if (cur.fill !== prev.fill)
                    div.setAttributeNS(null, "fill", cur.fill);
                if (cur.stroke !== prev.stroke)
                    div.setAttributeNS(null, "stroke", cur.stroke);
                if (cur.strokeWidth !== prev.strokeWidth)
                    div.setAttributeNS(null, "stroke-width", cur.strokeWidth);
                if (cur.d !== prev.d)
                    div.setAttributeNS(null, "d", cur.d);
                if (cur.c !== prev.c)
                    div.setAttributeNS(null, "class", cur.c);
                if (cur.x !== prev.x)
                    div.setAttributeNS(null, "x", cur.x);
                if (cur.y !== prev.y)
                    div.setAttributeNS(null, "y", cur.y);
                if (cur.dx !== prev.dx)
                    div.setAttributeNS(null, "dx", cur.dx);
                if (cur.dy !== prev.dy)
                    div.setAttributeNS(null, "dy", cur.dy);
                if (cur.cx !== prev.cx)
                    div.setAttributeNS(null, "cx", cur.cx);
                if (cur.cy !== prev.cy)
                    div.setAttributeNS(null, "cy", cur.cy);
                if (cur.r !== prev.r)
                    div.setAttributeNS(null, "r", cur.r);
                if (cur.height !== prev.height)
                    div.setAttributeNS(null, "height", cur.height);
                if (cur.width !== prev.width)
                    div.setAttributeNS(null, "width", cur.width);
                if (cur.xlinkhref !== prev.xlinkhref)
                    div.setAttributeNS('http://www.w3.org/1999/xlink', "href", cur.xlinkhref);
                if (cur.startOffset !== prev.startOffset)
                    div.setAttributeNS(null, "startOffset", cur.startOffset);
                if (cur.id !== prev.id)
                    div.setAttributeNS(null, "id", cur.id);
                if (cur.viewBox !== prev.viewBox)
                    div.setAttributeNS(null, "viewBox", cur.viewBox);
                if (cur.transform !== prev.transform)
                    div.setAttributeNS(null, "transform", cur.transform);
                if (cur.draggable !== prev.draggable)
                    div.setAttributeNS(null, "draggable", cur.draggable);
                if (cur.textAnchor !== prev.textAnchor)
                    div.setAttributeNS(null, "text-anchor", cur.textAnchor);
            }
            //events
            if (cur.dblclick !== prev.dblclick)
                div.ondblclick = cur.dblclick !== undefined ? this.handleEvent : undefined;
            if (cur.click !== prev.click)
                div.onclick = cur.click !== undefined ? this.handleEvent : undefined;
            if (cur.contextmenu !== prev.contextmenu)
                div.oncontextmenu = cur.contextmenu !== undefined ? this.handleEvent : undefined;
            if (cur.mousedown !== prev.mousedown)
                div.onmousedown = cur.mousedown !== undefined ? this.handleEvent : undefined;
            if (cur.mousemove !== prev.mousemove)
                div.onmousemove = cur.mousemove !== undefined ? this.handleEvent : undefined;
            if (cur.mouseup !== prev.mouseup)
                div.onmouseup = cur.mouseup !== undefined ? this.handleEvent : undefined;
            if (cur.mouseover !== prev.mouseover)
                div.onmouseover = cur.mouseover !== undefined ? this.handleEvent : undefined;
            if (cur.mouseout !== prev.mouseout)
                div.onmouseout = cur.mouseout !== undefined ? this.handleEvent : undefined;
            if (cur.mouseleave !== prev.mouseleave)
                div.onmouseleave = cur.mouseleave !== undefined ? this.handleEvent : undefined;
            if (cur.mousewheel !== prev.mousewheel)
                div.onmouseheel = cur.mousewheel !== undefined ? this.handleEvent : undefined;
            if (cur.dragover !== prev.dragover)
                div.ondragover = cur.dragover !== undefined ? this.handleEvent : undefined;
            if (cur.dragstart !== prev.dragstart)
                div.ondragstart = cur.dragstart !== undefined ? this.handleEvent : undefined;
            if (cur.dragend !== prev.dragend)
                div.ondragend = cur.dragend !== undefined ? this.handleEvent : undefined;
            if (cur.drag !== prev.drag)
                div.ondrag = cur.drag !== undefined ? this.handleEvent : undefined;
            if (cur.drop !== prev.drop)
                div.ondrop = cur.drop !== undefined ? this.handleEvent : undefined;
            if (cur.scroll !== prev.scroll)
                div.onscroll = cur.scroll !== undefined ? this.handleEvent : undefined;
            if (cur.focus !== prev.focus)
                div.onfocus = cur.focus !== undefined ? this.handleEvent : undefined;
            if (cur.blur !== prev.blur)
                div.onblur = cur.blur !== undefined ? this.handleEvent : undefined;
            if (cur.input !== prev.input)
                div.oninput = cur.input !== undefined ? this.handleEvent : undefined;
            if (cur.change !== prev.change)
                div.onchange = cur.change !== undefined ? this.handleEvent : undefined;
            if (cur.keyup !== prev.keyup)
                div.onkeyup = cur.keyup !== undefined ? this.handleEvent : undefined;
            if (cur.keydown !== prev.keydown)
                div.onkeydown = cur.keydown !== undefined ? this.handleEvent : undefined;
            if (type === "added" || type === "replaced" || type === "moved") {
                var parentEl = elementCache[cur.parent];
                if (parentEl) {
                    if (cur.ix >= parentEl.children.length) {
                        parentEl.appendChild(div);
                    }
                    else {
                        parentEl.insertBefore(div, parentEl.children[cur.ix]);
                    }
                }
            }
        }
    };
    Renderer.prototype.diff = function () {
        var a = this.prevTree;
        var b = this.tree;
        var as = Object.keys(a);
        var bs = Object.keys(b);
        var updated = {};
        var adds = [];
        for (var i = 0, len = as.length; i < len; i++) {
            var id = as[i];
            var curA = a[id];
            var curB = b[id];
            if (curB === undefined) {
                updated[id] = "removed";
                continue;
            }
            if (curA.t !== curB.t) {
                updated[id] = "replaced";
                continue;
            }
            if (curA.ix !== curB.ix || curA.parent !== curB.parent) {
                updated[id] = "moved";
                continue;
            }
            if (!curB.dirty
                && curA.c === curB.c
                && curA.key === curB.key
                && curA.dangerouslySetInnerHTML === curB.dangerouslySetInnerHTML
                && curA.tabindex === curB.tabindex
                && curA.href === curB.href
                && curA.src === curB.src
                && curA.data === curB.data
                && curA.download === curB.download
                && curA.allowfullscreen === curB.allowfullscreen
                && curA.placeholder === curB.placeholder
                && curA.selected === curB.selected
                && curA.draggable === curB.draggable
                && curA.contentEditable === curB.contentEditable
                && curA.value === curB.value
                && curA.type === curB.type
                && curA.checked === curB.checked
                && curA.text === curB.text
                && curA.top === curB.top
                && curA.flex === curB.flex
                && curA.left === curB.left
                && curA.width === curB.width
                && curA.height === curB.height
                && curA.zIndex === curB.zIndex
                && curA.backgroundColor === curB.backgroundColor
                && curA.backgroundImage === curB.backgroundImage
                && curA.color === curB.color
                && curA.colspan === curB.colspan
                && curA.border === curB.border
                && curA.borderColor === curB.borderColor
                && curA.borderWidth === curB.borderWidth
                && curA.borderRadius === curB.borderRadius
                && curA.opacity === curB.opacity
                && curA.fontFamily === curB.fontFamily
                && curA.fontSize === curB.fontSize
                && curA.textAlign === curB.textAlign
                && curA.transform === curB.transform
                && curA.verticalAlign === curB.verticalAlign
                && curA.semantic === curB.semantic
                && curA.debug === curB.debug
                && curA.style === curB.style
                && (curB.svg === undefined || (curA.x === curB.x
                    && curA.y === curB.y
                    && curA.dx === curB.dx
                    && curA.dy === curB.dy
                    && curA.cx === curB.cx
                    && curA.cy === curB.cy
                    && curA.r === curB.r
                    && curA.d === curB.d
                    && curA.fill === curB.fill
                    && curA.stroke === curB.stroke
                    && curA.strokeWidth === curB.strokeWidth
                    && curA.startOffset === curB.startOffset
                    && curA.textAnchor === curB.textAnchor
                    && curA.viewBox === curB.viewBox
                    && curA.xlinkhref === curB.xlinkhref))) {
                continue;
            }
            updated[id] = "updated";
        }
        for (var i = 0, len = bs.length; i < len; i++) {
            var id = bs[i];
            var curA = a[id];
            if (curA === undefined) {
                adds.push(id);
                updated[id] = "added";
                continue;
            }
        }
        this.lastDiff = { adds: adds, updates: updated };
        return this.lastDiff;
    };
    Renderer.prototype.prepare = function (root) {
        var elemLen = 1;
        var tree = this.tree;
        var elements = [root];
        var elem;
        for (var elemIx = 0; elemIx < elemLen; elemIx++) {
            elem = elements[elemIx];
            if (elem.parent === undefined)
                elem.parent = "__root";
            if (elem.id === undefined)
                elem.id = "__root__" + elemIx;
            tree[elem.id] = elem;
            if (elem.postRender !== undefined) {
                this.postRenders.push(elem);
            }
            var children = elem.children;
            if (children !== undefined) {
                for (var childIx = 0, len = children.length; childIx < len; childIx++) {
                    var child = children[childIx];
                    if (child === undefined)
                        continue;
                    if (child.id === undefined) {
                        child.id = elem.id + "__" + childIx;
                    }
                    if (child.ix === undefined) {
                        child.ix = childIx;
                    }
                    if (child.parent === undefined) {
                        child.parent = elem.id;
                    }
                    elements.push(child);
                    elemLen++;
                }
            }
        }
        return tree;
    };
    Renderer.prototype.postDomify = function () {
        var postRenders = this.postRenders;
        var diff = this.lastDiff.updates;
        var elementCache = this.elementCache;
        for (var i = 0, len = postRenders.length; i < len; i++) {
            var elem = postRenders[i];
            var id = elem.id;
            if (diff[id] === "updated" || diff[id] === "added" || diff[id] === "replaced" || elem.dirty || diff[id] === "moved") {
                elem.postRender(elementCache[elem.id], elem);
            }
        }
    };
    Renderer.prototype.render = function (elems) {
        this.reset();
        // We sort elements by depth to allow them to be self referential.
        elems.sort(function (a, b) { return (a.parent ? a.parent.split("__").length : 0) - (b.parent ? b.parent.split("__").length : 0); });
        var start = now();
        for (var _i = 0; _i < elems.length; _i++) {
            var elem = elems[_i];
            var post = this.prepare(elem);
        }
        var prepare = now();
        var d = this.diff();
        var diff = now();
        this.domify();
        var domify = now();
        this.postDomify();
        var postDomify = now();
        var time = now() - start;
        if (time > 5) {
            console.log("slow render (> 5ms): ", time, {
                prepare: prepare - start,
                diff: diff - prepare,
                domify: domify - diff,
                postDomify: postDomify - domify
            });
        }
    };
    // @TODO: A more performant implementation would have a way of rendering subtrees and just have a lambda Renderer to compile into
    Renderer._compileRenderer = {};
    return Renderer;
})();
exports.Renderer = Renderer;

},{}],5:[function(require,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var utils_1 = require("./utils");
var runtime = require("./runtime");
var app_1 = require("./app");
var ParseError = (function (_super) {
    __extends(ParseError, _super);
    function ParseError(message, line, lineIx, charIx, length) {
        if (charIx === void 0) { charIx = 0; }
        if (length === void 0) { length = line && (line.length - charIx); }
        _super.call(this, message);
        this.message = message;
        this.line = line;
        this.lineIx = lineIx;
        this.charIx = charIx;
        this.length = length;
        this.name = "Parse Error";
    }
    ParseError.prototype.toString = function () {
        return (_a = ["\n      ", ": ", "\n      ", "\n      ", "\n      ", "\n    "], _a.raw = ["\n      ", ": ", "\n      ", "\n      ", "\n      ", "\n    "], utils_1.unpad(6)(_a, this.name, this.message, this.lineIx !== undefined ? "On line " + (this.lineIx + 1) + ":" + this.charIx : "", this.line, utils_1.underline(this.charIx, this.length)));
        var _a;
    };
    return ParseError;
})(Error);
function readWhile(str, pattern, startIx) {
    var endIx = startIx;
    while (str[endIx] !== undefined && str[endIx].match(pattern))
        endIx++;
    return str.slice(startIx, endIx);
}
function readUntil(str, sentinel, startIx, unsatisfiedErr) {
    var endIx = str.indexOf(sentinel, startIx);
    if (endIx === -1) {
        if (unsatisfiedErr)
            return unsatisfiedErr;
        return str.slice(startIx);
    }
    return str.slice(startIx, endIx);
}
function readUntilAny(str, sentinels, startIx, unsatisfiedErr) {
    var endIx = -1;
    for (var _i = 0; _i < sentinels.length; _i++) {
        var sentinel = sentinels[_i];
        var ix = str.indexOf(sentinel, startIx);
        if (ix === -1 || endIx !== -1 && ix > endIx)
            continue;
        endIx = ix;
    }
    if (endIx === -1) {
        if (unsatisfiedErr)
            return unsatisfiedErr;
        return str.slice(startIx);
    }
    return str.slice(startIx, endIx);
}
// export function parseUI(str:string):UIElem {
//   let root:UIElem = {};
//   let errors = [];
//   let lineIx = 0;
//   let lines = str.split("\n");
//   let stack:{indent: number, elem: UIElem}[] = [{indent: -2, elem: root}];
//   // @FIXME: Chunk into element chunks instead of lines to enable in-argument continuation.
//   for(let line of lines) {
//     let charIx = 0;
//     while(line[charIx] === " ") charIx++;
//     let indent = charIx;
//     if(line[charIx] === undefined)  continue;
//     let parent:UIElem;
//     for(let stackIx = stack.length - 1; stackIx >= 0; stackIx--) {
//       if(indent > stack[stackIx].indent) {
//         parent = stack[stackIx].elem;
//         break;
//       } else stack.pop();
//     }
//     let keyword = readUntil(line, " ", charIx);
//     charIx += keyword.length;
//     if(keyword[0] === "~" || keyword[0] === "%") { // Handle binding
//       charIx -= keyword.length - 1;
//       let kind = keyword[0] === "~" ? "plan" : "query";
//       if(!parent.binding) {
//         parent.binding = line.slice(charIx);
//         parent.bindingKind = kind;
//       } else if(kind === parent.bindingKind) parent.binding += "\n" + line.slice(charIx);
//       else {
//         errors.push(new ParseError(`UI must be bound to a single type of query.`, line, lineIx));
//         continue;
//       }
//       charIx = line.length;
//     } else if(keyword[0] === "@") { // Handle event
//       charIx -= keyword.length - 1;
//       let err;
//       while(line[charIx] === " ") charIx++;
//       let lastIx = charIx;
//       let eventRaw = readUntil(line, "{", charIx);
//       charIx += eventRaw.length;
//       let event = eventRaw.trim();
//       if(!event) err = new ParseError(`UI event must specify a valid event name`, line, lineIx, lastIx, eventRaw.length);
//       let state;
//       [state, charIx] = getMapArgs(line, lineIx, charIx);
//       if(state instanceof Error && !err) err = state;
//       if(err) {
//         errors.push(err);
//         lineIx++;
//         continue;
//       }
//       if(!parent.events) parent.events = {};
//       parent.events[event] = state;
//     } else if(keyword[0] === ">") { // Handle embed
//       charIx -= keyword.length - 1;
//       let err;
//       while(line[charIx] === " ") charIx++;
//       let lastIx = charIx;
//       let embedIdRaw = readUntil(line, "{", charIx);
//       charIx += embedIdRaw.length;
//       let embedId = embedIdRaw.trim();
//       if(!embedId) err = new ParseError(`UI embed must specify a valid element id`, line, lineIx, lastIx, embedIdRaw.length);
//       let scope;
//       [scope = {}, charIx] = getMapArgs(line, lineIx, charIx);
//       if(scope instanceof Error && !err) err = scope;
//       if(err) {
//         errors.push(err);
//         lineIx++;
//         continue;
//       }
//       let elem = {embedded: scope, id: embedId};
//       if(!parent.children) parent.children = [];
//       parent.children.push(elem);
//       stack.push({indent, elem});
//     } else { // Handle element
//       let err;
//       if(!keyword) err = new ParseError(`UI element must specify a valid tag name`, line, lineIx, charIx, 0);
//       while(line[charIx] === " ") charIx++;
//       let classesRaw = readUntil(line, "{", charIx);
//       charIx += classesRaw.length;
//       let classes = classesRaw.trim();
//       let attributes;
//       [attributes = {}, charIx] = getMapArgs(line, lineIx, charIx);
//       if(attributes instanceof Error && !err) err = attributes;
//       if(err) {
//         errors.push(err);
//         lineIx++;
//         continue;
//       }
//       attributes["t"] = keyword;
//       if(classes) attributes["c"] = classes;
//       let elem:UIElem = {id: attributes["id"], attributes};
//       if(!parent.children) parent.children = [];
//       parent.children.push(elem);
//       stack.push({indent, elem});
//     }
//     lineIx++;
//   }
//   if(errors.length) {
//     for(let err of errors) {
//       console.error(err);
//     }
//   }
//   return root;
// }
//-----------------------------------------------------------------------------
// Eve DSL Parser
//-----------------------------------------------------------------------------
var TOKEN_TYPE;
(function (TOKEN_TYPE) {
    TOKEN_TYPE[TOKEN_TYPE["EXPR"] = 0] = "EXPR";
    TOKEN_TYPE[TOKEN_TYPE["IDENTIFIER"] = 1] = "IDENTIFIER";
    TOKEN_TYPE[TOKEN_TYPE["KEYWORD"] = 2] = "KEYWORD";
    TOKEN_TYPE[TOKEN_TYPE["STRING"] = 3] = "STRING";
    TOKEN_TYPE[TOKEN_TYPE["LITERAL"] = 4] = "LITERAL";
})(TOKEN_TYPE || (TOKEN_TYPE = {}));
;
var Token = (function () {
    function Token(type, value, lineIx, charIx) {
        this.type = type;
        this.value = value;
        this.lineIx = lineIx;
        this.charIx = charIx;
    }
    Token.identifier = function (value, lineIx, charIx) {
        return new Token(Token.TYPE.IDENTIFIER, value, lineIx, charIx);
    };
    Token.keyword = function (value, lineIx, charIx) {
        return new Token(Token.TYPE.KEYWORD, value, lineIx, charIx);
    };
    Token.string = function (value, lineIx, charIx) {
        return new Token(Token.TYPE.STRING, value, lineIx, charIx);
    };
    Token.literal = function (value, lineIx, charIx) {
        return new Token(Token.TYPE.LITERAL, value, lineIx, charIx);
    };
    Token.prototype.toString = function () {
        if (this.type === Token.TYPE.KEYWORD)
            return ":" + this.value;
        else if (this.type === Token.TYPE.STRING)
            return "\"" + this.value + "\"";
        else
            return this.value.toString();
    };
    Token.TYPE = TOKEN_TYPE;
    return Token;
})();
exports.Token = Token;
var Sexpr = (function () {
    function Sexpr(val, lineIx, charIx, syntax) {
        if (syntax === void 0) { syntax = "expr"; }
        this.lineIx = lineIx;
        this.charIx = charIx;
        this.syntax = syntax;
        this.type = Token.TYPE.EXPR;
        if (val)
            this.value = val.slice();
    }
    Sexpr.list = function (value, lineIx, charIx, syntax) {
        if (value === void 0) { value = []; }
        value = value.slice();
        value.unshift(Token.identifier("list", lineIx, charIx ? charIx + 1 : undefined));
        return new Sexpr(value, lineIx, charIx, syntax ? "list" : undefined);
    };
    Sexpr.hash = function (value, lineIx, charIx, syntax) {
        if (value === void 0) { value = []; }
        value = value.slice();
        value.unshift(Token.identifier("hash", lineIx, charIx ? charIx + 1 : undefined));
        return new Sexpr(value, lineIx, charIx, syntax ? "hash" : undefined);
    };
    Sexpr.asSexprs = function (values) {
        for (var _i = 0; _i < values.length; _i++) {
            var raw = values[_i];
            if (!(raw instanceof Sexpr))
                throw new ParseError("All top level entries must be expressions (got " + raw + ")", undefined, raw.lineIx, raw.charIx);
            else {
                var op = raw.operator;
                if (op.type !== Token.TYPE.IDENTIFIER)
                    throw new ParseError("All expressions must begin with an identifier", undefined, raw.lineIx, raw.charIx);
            }
        }
        return values;
    };
    Sexpr.prototype.toString = function () {
        var content = this.value && this.value.map(function (token) { return token.toString(); }).join(" ");
        var argsContent = this.value && this.arguments.map(function (token) { return token.toString(); }).join(" ");
        if (this.syntax === "hash")
            return "{" + argsContent + "}";
        else if (this.syntax === "list")
            return "[" + argsContent + "]";
        else
            return "(" + content + ")";
    };
    Sexpr.prototype.push = function (val) {
        this.value = this.value || [];
        return this.value.push(val);
    };
    Sexpr.prototype.nth = function (n, val) {
        if (val) {
            this.value = this.value || [];
            return this.value[n] = val;
        }
        return this.value && this.value[n];
    };
    Object.defineProperty(Sexpr.prototype, "operator", {
        get: function () {
            return this.value && this.value[0];
        },
        set: function (op) {
            this.value = this.value || [];
            this.value[0] = op;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Sexpr.prototype, "arguments", {
        get: function () {
            return this.value && this.value.slice(1);
        },
        set: function (args) {
            this.value = this.value || [];
            this.value.length = 1;
            this.value.push.apply(this.value, args);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Sexpr.prototype, "length", {
        get: function () {
            return this.value && this.value.length;
        },
        enumerable: true,
        configurable: true
    });
    return Sexpr;
})();
exports.Sexpr = Sexpr;
var TOKEN_TO_TYPE = {
    "(": "expr",
    ")": "expr",
    "[": "list",
    "]": "list",
    "{": "hash",
    "}": "hash"
};
var hygienicSymbolCounter = 0;
function readSexprs(text) {
    var root = Sexpr.list();
    var token;
    var sexpr = root;
    var sexprs = [root];
    var lines = text.split("\n");
    var lineIx = 0;
    var mode;
    for (var _i = 0; _i < lines.length; _i++) {
        var line = lines[_i];
        var line_1 = lines[lineIx];
        var charIx = 0;
        if (mode === "string")
            token.value += "\n";
        while (charIx < line_1.length) {
            if (mode === "string") {
                if (line_1[charIx] === "\"" && line_1[charIx - 1] !== "\\") {
                    sexpr.push(token);
                    token = mode = undefined;
                    charIx++;
                }
                else
                    token.value += line_1[charIx++];
                continue;
            }
            var padding = readWhile(line_1, /\s/, charIx);
            charIx += padding.length;
            if (padding.length) {
                if (token)
                    sexpr.push(token);
                token = undefined;
            }
            if (charIx >= line_1.length)
                continue;
            if (line_1[charIx] === ";") {
                charIx = line_1.length;
            }
            else if (line_1[charIx] === "\"") {
                if (!sexpr.length)
                    throw new ParseError("Literal must be an argument in a sexpr.", line_1, lineIx, charIx);
                mode = "string";
                token = Token.string("", lineIx, charIx);
                charIx++;
            }
            else if (line_1[charIx] === ":") {
                if (!sexpr.length)
                    throw new ParseError("Literal must be an argument in a sexpr.", line_1, lineIx, charIx);
                var keyword = readUntilAny(line_1, [" ", ")", "]", "}"], ++charIx);
                sexpr.push(Token.keyword(keyword, lineIx, charIx - 1));
                charIx += keyword.length;
            }
            else if (line_1[charIx] === "(" || line_1[charIx] === "[" || line_1[charIx] === "{") {
                if (token)
                    throw new ParseError("Sexpr arguments must be space separated.", line_1, lineIx, charIx);
                var type = TOKEN_TO_TYPE[line_1[charIx]];
                if (type === "hash")
                    sexpr = Sexpr.hash(undefined, lineIx, charIx);
                else if (type === "list")
                    sexpr = Sexpr.list(undefined, lineIx, charIx);
                else
                    sexpr = new Sexpr(undefined, lineIx, charIx);
                sexpr.syntax = type;
                sexprs.push(sexpr);
                charIx++;
            }
            else if (line_1[charIx] === ")" || line_1[charIx] === "]" || line_1[charIx] === "}") {
                var child = sexprs.pop();
                var type = TOKEN_TO_TYPE[line_1[charIx]];
                if (child.syntax !== type)
                    throw new ParseError("Must terminate " + child.syntax + " before terminating " + type, line_1, lineIx, charIx);
                sexpr = sexprs[sexprs.length - 1];
                if (!sexpr)
                    throw new ParseError("Too many closing parens", line_1, lineIx, charIx);
                sexpr.push(child);
                charIx++;
            }
            else {
                var literal = readUntilAny(line_1, [" ", ")", "]", "}"], charIx);
                var length_1 = literal.length;
                literal = utils_1.coerceInput(literal);
                var type = typeof literal === "string" ? "identifier" : "literal";
                if (!sexpr.length && type !== "identifier")
                    throw new ParseError("Expr must begin with identifier.", line_1, lineIx, charIx);
                if (type === "identifier") {
                    var dotIx = literal.indexOf(".");
                    if (dotIx !== -1) {
                        var child = new Sexpr([
                            Token.identifier("get", lineIx, charIx + 1),
                            Token.identifier(literal.slice(0, dotIx), lineIx, charIx + 3),
                            Token.string(literal.slice(dotIx + 1), lineIx, charIx + 5 + dotIx)
                        ], lineIx, charIx);
                        sexpr.push(child);
                    }
                    else
                        sexpr.push(Token.identifier(literal, lineIx, charIx));
                }
                else
                    sexpr.push(Token.literal(literal, lineIx, charIx));
                charIx += length_1;
            }
        }
        lineIx++;
    }
    if (token)
        throw new ParseError("Unterminated " + TOKEN_TYPE[token.type] + " token", lines[lineIx - 1], lineIx - 1);
    var lastIx = lines.length - 1;
    if (sexprs.length > 1)
        throw new ParseError("Too few closing parens", lines[lastIx], lastIx, lines[lastIx].length);
    return root;
}
exports.readSexprs = readSexprs;
function macroexpandDSL(sexpr) {
    // @TODO: Implement me.
    var op = sexpr.operator;
    if (op.value === "eav") {
        throw new Error("@TODO: Implement me!");
    }
    else if (op.value === "one-of") {
        // (one-of (query ...body) (query ...body) ...) =>
        // (union
        //   (def q1 (query ...body1))
        //   (def q2 (query (negate q1) ...body2)))
        throw new Error("@TODO: Implement me!");
    }
    else if (op.value === "negate") {
        if (sexpr.length > 2)
            throw new ParseError("Negate only takes a single body", undefined, sexpr.lineIx, sexpr.charIx);
        var select = macroexpandDSL(Sexpr.asSexprs(sexpr.arguments)[0]);
        select.push(Token.keyword("$$negated"));
        select.push(Token.literal(true));
        return select;
    }
    else if (["hash", "list", "get", "def", "query", "union", "select", "member", "project!", "insert!", "remove!", "load!"].indexOf(op.value) === -1) {
        // (foo-bar :a 5) => (select "foo bar" :a 5)
        var source = op;
        source.type = Token.TYPE.STRING;
        source.value = source.value.replace(/(.?)-(.)/g, "$1 $2");
        var args = sexpr.arguments;
        args.unshift(source);
        sexpr.arguments = args;
        sexpr.operator = Token.identifier("select");
    }
    return sexpr;
}
exports.macroexpandDSL = macroexpandDSL;
var VALUE;
(function (VALUE) {
    VALUE[VALUE["NULL"] = 0] = "NULL";
    VALUE[VALUE["SCALAR"] = 1] = "SCALAR";
    VALUE[VALUE["SET"] = 2] = "SET";
    VALUE[VALUE["VIEW"] = 3] = "VIEW";
})(VALUE || (VALUE = {}));
;
function parseDSL(text) {
    var artifacts = { views: {} };
    var lines = text.split("\n");
    var root = readSexprs(text);
    for (var _i = 0, _a = Sexpr.asSexprs(root.arguments); _i < _a.length; _i++) {
        var raw = _a[_i];
        parseDSLSexpr(raw, artifacts);
    }
    return artifacts;
}
exports.parseDSL = parseDSL;
function parseDSLSexpr(raw, artifacts, context, parent, resultVariable) {
    if (parent instanceof runtime.Query)
        var query = parent;
    else
        var union = parent;
    var sexpr = macroexpandDSL(raw);
    var op = sexpr.operator;
    if (op.type !== Token.TYPE.IDENTIFIER)
        throw new ParseError("Evaluated sexpr must begin with an identifier ('" + op + "' is a " + Token.TYPE[op.type] + ")", "", raw.lineIx, raw.charIx);
    if (op.value === "list") {
        var $$body = parseArguments(sexpr, undefined, "$$body").$$body;
        return { type: VALUE.SCALAR, value: $$body.map(function (token, ix) { return resolveTokenValue("list item " + ix, token, context); }) };
    }
    if (op.value === "hash") {
        var args = parseArguments(sexpr);
        for (var arg in args)
            args[arg] = resolveTokenValue("hash item " + arg, args[arg], context);
        return { type: VALUE.SET, value: args };
    }
    if (op.value === "insert!") {
        var changeset = artifacts.changeset || app_1.eve.diff();
        for (var _i = 0, _a = sexpr.arguments; _i < _a.length; _i++) {
            var arg = _a[_i];
            var table = arg.value[0];
            var fact = {};
            for (var ix = 1; ix < arg.value.length; ix += 2) {
                var key = arg.value[ix];
                var value = arg.value[ix + 1];
                fact[key.value] = value.value;
            }
            changeset.add(table.value, fact);
        }
        artifacts.changeset = changeset;
        return;
    }
    if (op.value === "remove!") {
        var changeset = artifacts.changeset || app_1.eve.diff();
        for (var _b = 0, _c = sexpr.arguments; _b < _c.length; _b++) {
            var arg = _c[_b];
            var table = arg.value[0];
            var fact = {};
            for (var ix = 1; ix < arg.value.length; ix += 2) {
                var key = arg.value[ix];
                var value = arg.value[ix + 1];
                fact[key.value] = value.value;
            }
            changeset.remove(table.value, fact);
        }
        artifacts.changeset = changeset;
        return;
    }
    if (op.value === "load!") {
        throw new Error("(load! ..) has not been implemented yet");
    }
    if (op.value === "query") {
        var neueContext = [];
        var _d = parseArguments(sexpr, undefined, "$$body"), $$view = _d.$$view, $$negated = _d.$$negated, $$body = _d.$$body;
        var queryId = $$view ? resolveTokenValue("view", $$view, context, VALUE.SCALAR) : utils_1.uuid();
        var neue = new runtime.Query(app_1.eve, queryId);
        neue["displayName"] = sexpr.toString();
        if (utils_1.DEBUG.instrumentQuery)
            instrumentQuery(neue, utils_1.DEBUG.instrumentQuery);
        artifacts.views[queryId] = neue;
        var aggregated = false;
        for (var _e = 0, _f = Sexpr.asSexprs($$body); _e < _f.length; _e++) {
            var raw_1 = _f[_e];
            var state = parseDSLSexpr(raw_1, artifacts, neueContext, neue);
            if (state && state.aggregated)
                aggregated = true;
        }
        var projectionMap = neue.projectionMap;
        var projected = true;
        if (!projectionMap) {
            projectionMap = {};
            projected = false;
            for (var _g = 0; _g < neueContext.length; _g++) {
                var variable = neueContext[_g];
                projectionMap[variable.name] = variable.value;
            }
        }
        if (Object.keys(projectionMap).length)
            neue.project(projectionMap);
        // Join subquery to parent.
        if (parent) {
            var select = new Sexpr([Token.identifier(query ? "select" : "member"), Token.string(queryId)], raw.lineIx, raw.charIx);
            var groups = [];
            for (var _h = 0; _h < neueContext.length; _h++) {
                var variable = neueContext[_h];
                if (projected && !variable.projection)
                    continue;
                var field = variable.projection || variable.name;
                select.push(Token.keyword(field));
                if (query)
                    select.push(Token.identifier(variable.name));
                else
                    select.push(Sexpr.list([Token.string(field)]));
                if (context) {
                    for (var _j = 0; _j < context.length; _j++) {
                        var parentVar = context[_j];
                        if (parentVar.name === variable.name)
                            groups.push(variable.value);
                    }
                }
            }
            if ($$negated) {
                select.push(Token.keyword("$$negated"));
                select.push($$negated);
            }
            if (groups.length && aggregated)
                neue.group(groups);
            parseDSLSexpr(select, artifacts, context, parent);
        }
        return { value: queryId, type: VALUE.VIEW, projected: projected, context: neueContext };
    }
    if (op.value === "union") {
        var _k = parseArguments(sexpr, undefined, "$$body"), $$view = _k.$$view, $$body = _k.$$body, $$negated = _k.$$negated;
        var unionId = $$view ? resolveTokenValue("view", $$view, context, VALUE.SCALAR) : utils_1.uuid();
        var neue = new runtime.Union(app_1.eve, unionId);
        if (utils_1.DEBUG.instrumentQuery)
            instrumentQuery(neue, utils_1.DEBUG.instrumentQuery);
        artifacts.views[unionId] = neue;
        var mappings = {};
        for (var _l = 0, _m = Sexpr.asSexprs($$body); _l < _m.length; _l++) {
            var raw_2 = _m[_l];
            var child = macroexpandDSL(raw_2);
            if (child.operator.value !== "query" && child.operator.value !== "union")
                throw new ParseError("Unions may only contain queries", "", raw_2.lineIx, raw_2.charIx);
            var res = parseDSLSexpr(child, artifacts, context, neue);
            for (var _o = 0, _p = res.context; _o < _p.length; _o++) {
                var variable = _p[_o];
                if (res.projected && !variable.projection)
                    continue;
                var field = variable.projection || variable.name;
                if (!mappings[field])
                    mappings[field] = {};
                mappings[field][variable.name] = true;
            }
        }
        // Join subunion to parent
        if (parent) {
            var select = new Sexpr([Token.identifier(query ? "select" : "member"), Token.string(unionId)], raw.lineIx, raw.charIx);
            for (var field in mappings) {
                var mappingVariables = Object.keys(mappings[field]);
                if (mappingVariables.length > 1)
                    throw new ParseError("All variables projected to a single union field must have the same name. Field '" + field + "' has " + mappingVariables.length + " fields (" + mappingVariables.join(", ") + ")", "", raw.lineIx, raw.charIx);
                select.push(Token.keyword(field));
                select.push(Token.identifier(mappingVariables[0]));
            }
            console.log("union select", select.toString());
            parseDSLSexpr(select, artifacts, context, parent);
        }
        return { type: VALUE.VIEW, value: unionId, mappings: mappings };
    }
    if (op.value === "member") {
        if (!union)
            throw new ParseError("Cannot add member to non-union parent", "", raw.lineIx, raw.charIx);
        var args = parseArguments(sexpr, ["$$view"]);
        var $$view = args.$$view, $$negated = args.$$negated;
        var view = resolveTokenValue("view", $$view, context, VALUE.SCALAR);
        if (view === undefined)
            throw new ParseError("Must specify a view to be unioned", "", raw.lineIx, raw.charIx);
        var join = {};
        for (var arg in args) {
            if (arg === "$$view" || arg === "$$negated")
                continue;
            join[arg] = resolveTokenValue("member field", args[arg], context);
        }
        if (runtime.QueryFunctions[view])
            throw new ParseError("Cannot union primitive view '" + view + "'", "", raw.lineIx, raw.charIx);
        union.union(view, join);
        return;
    }
    if (!parent)
        throw new ParseError("Non-query or union sexprs must be contained within a query or union", "", raw.lineIx, raw.charIx);
    if (op.value === "select") {
        if (!query)
            throw new ParseError("Cannot add select to non-query parent", "", raw.lineIx, raw.charIx);
        var selectId = utils_1.uuid();
        var $$view = getArgument(sexpr, "$$view", ["$$view"]);
        var view = resolveTokenValue("view", $$view, context, VALUE.SCALAR);
        if (view === undefined)
            throw new ParseError("Must specify a view to be selected", "", raw.lineIx, raw.charIx);
        var primitive = runtime.QueryFunctions[view];
        //@TODO: Move this to an eve table to allow user defined defaults
        var args = parseArguments(sexpr, ["$$view"].concat(getDefaults(view)));
        var $$negated = args.$$negated;
        var join = {};
        for (var arg in args) {
            var value = args[arg];
            var variable = void 0;
            if (arg === "$$view" || arg === "$$negated")
                continue;
            if (value instanceof Token && value.type !== Token.TYPE.IDENTIFIER) {
                join[arg] = args[arg].value;
                continue;
            }
            if (value instanceof Sexpr) {
                var result = parseDSLSexpr(value, artifacts, context, parent, "$$temp-" + hygienicSymbolCounter++ + "-" + arg);
                if (!result || result.type === VALUE.NULL)
                    throw new Error("Cannot set parameter '" + arg + "' to null value '" + value.toString() + "'");
                if (result.type === VALUE.VIEW) {
                    var view_1 = result.value;
                    var resultField_1 = getResult(view_1);
                    if (!resultField_1)
                        throw new Error("Cannot set parameter '" + arg + "' to select without default result field");
                    for (var _q = 0; _q < context.length; _q++) {
                        var curVar = context[_q];
                        for (var _r = 0, _s = curVar.constraints; _r < _s.length; _r++) {
                            var constraint = _s[_r];
                            if (constraint[0] === view_1 && constraint[1] === resultField_1) {
                                variable = curVar;
                                break;
                            }
                        }
                    }
                }
            }
            else
                variable = getDSLVariable(value.value, context);
            if (variable) {
                join[arg] = variable.value;
                variable.constraints.push([view, arg]);
            }
            else if ($$negated && $$negated.value)
                throw new ParseError("Cannot bind field in negated select to undefined variable '" + value.value + "'", "", raw.lineIx, raw.charIx);
            else
                context.push({ name: value.value, type: VALUE.SCALAR, value: [selectId, arg], constraints: [[view, arg]] }); // @TODO: does this not need to add to the join map?
        }
        var resultField = getResult(view);
        if (resultVariable && resultField && !join[resultField]) {
            join[resultField] = [selectId, resultField];
            context.push({ name: resultVariable, type: VALUE.SCALAR, value: [selectId, resultField], constraints: [[view, resultField]] });
        }
        if (primitive) {
            if ($$negated) {
                if (primitive.inverse)
                    view = primitive.inverse;
                else
                    throw new ParseError("Cannot invert primitive calculation '" + view + "'", "", raw.lineIx, raw.charIx);
            }
            if (primitive.aggregate)
                query.aggregate(view, join, selectId);
            else
                query.calculate(view, join, selectId);
        }
        else if ($$negated)
            query.deselect(view, join);
        else
            query.select(view, join, selectId);
        return {
            type: VALUE.VIEW,
            value: view,
            aggregated: primitive && primitive.aggregate
        };
    }
    if (op.value === "project!") {
        var args = parseArguments(sexpr, ["$$view"]);
        var $$view = args.$$view, $$negated = args.$$negated;
        var projectionMap = {};
        for (var arg in args) {
            var value = args[arg];
            if (arg === "$$view" || arg === "$$negated")
                continue;
            if (value.type !== Token.TYPE.IDENTIFIER) {
                projectionMap[arg] = args[arg].value;
                continue;
            }
            var variable = getDSLVariable(value.value, context);
            if (variable) {
                if (variable.static)
                    projectionMap[arg] = variable.value;
                else if (!$$view) {
                    variable.projection = arg;
                    projectionMap[arg] = variable.value;
                }
                else
                    projectionMap[arg] = [variable.name];
            }
            else
                throw new ParseError("Cannot bind projected field to undefined variable '" + value.value + "'", "", raw.lineIx, raw.charIx);
        }
        var view = resolveTokenValue("view", $$view, context, VALUE.SCALAR);
        if (view === undefined) {
            if (query.projectionMap)
                throw new ParseError("Query can only self-project once", "", raw.lineIx, raw.charIx);
            if ($$negated && $$negated.value)
                throw new ParseError("Cannot negate self-projection", "", raw.lineIx, raw.charIx);
            // Project self
            query.project(projectionMap);
        }
        else {
            var union_1 = artifacts.views[view] || new runtime.Union(app_1.eve, view);
            if (utils_1.DEBUG.instrumentQuery && !artifacts.views[view])
                instrumentQuery(union_1, utils_1.DEBUG.instrumentQuery);
            artifacts.views[view] = union_1;
            // if($$negated && $$negated.value) union.ununion(queryId, projectionMap);
            if ($$negated && $$negated.value)
                throw new ParseError("Union projections may not be negated in the current runtime", "", raw.lineIx, raw.charIx);
            else
                union_1.union(query.name, projectionMap);
        }
        return;
    }
    throw new ParseError("Unknown DSL operator '" + op.value + "'", "", raw.lineIx, raw.charIx);
}
function resolveTokenValue(name, token, context, type) {
    if (!token)
        return;
    if (token instanceof Sexpr)
        return parseDSLSexpr(token, undefined, context);
    if (token instanceof Token && token.type === Token.TYPE.IDENTIFIER) {
        var variable = getDSLVariable(token.value, context, VALUE.SCALAR);
        if (!variable)
            throw new Error("Cannot bind " + name + " to undefined variable '" + token.value + "'");
        if (!variable.static)
            throw new Error("Cannot bind " + name + " to dynamic variable '" + token.value + "'");
        return variable.value;
    }
    return token.value;
}
function getDSLVariable(name, context, type) {
    if (!context)
        return;
    for (var _i = 0; _i < context.length; _i++) {
        var variable = context[_i];
        if (variable.name === name) {
            if (variable.static === false)
                throw new Error("Cannot statically look up dynamic variable '" + name + "'");
            if (type !== undefined && variable.type !== type)
                throw new Error("Expected variable '" + name + "' to have type '" + type + "', but instead has type '" + variable.type + "'");
            return variable;
        }
    }
}
function getDefaults(view) {
    return (runtime.QueryFunctions[view] && runtime.QueryFunctions[view].params) || [];
}
function getResult(view) {
    return runtime.QueryFunctions[view] && runtime.QueryFunctions[view].result;
}
function getArgument(root, param, defaults) {
    var ix = 1;
    var defaultIx = 0;
    for (var ix_1 = 1, cur = root.nth(ix_1); ix_1 < root.length; ix_1++) {
        if (cur.type === Token.TYPE.KEYWORD) {
            if (cur.value === param)
                return root.nth(ix_1 + 1);
            else
                ix_1 + 1;
        }
        else {
            if (defaults && defaultIx < defaults.length) {
                var keyword = defaults[defaultIx++];
                if (keyword === param)
                    return cur;
                else
                    ix_1 + 1;
            }
            throw new Error("Param '" + param + "' not in sexpr " + root.toString());
        }
    }
    throw new Error("Param '" + param + "' not in sexpr " + root.toString());
}
exports.getArgument = getArgument;
function parseArguments(root, defaults, rest) {
    var args = {};
    var defaultIx = 0;
    var keyword;
    var kwarg = false;
    for (var _i = 0, _a = root.arguments; _i < _a.length; _i++) {
        var raw = _a[_i];
        if (raw.type === Token.TYPE.KEYWORD) {
            if (keyword)
                throw new Error("Keywords may not be values '" + raw + "'");
            else
                keyword = raw.value;
        }
        else if (keyword) {
            if (args[keyword] === undefined) {
                args[keyword] = raw;
            }
            else {
                if (!(args[keyword] instanceof Array))
                    args[keyword] = [args[keyword]];
                args[keyword].push(raw);
            }
            keyword = undefined;
            defaultIx = defaults ? defaults.length : 0;
            kwarg = true;
        }
        else if (defaults && defaultIx < defaults.length) {
            args[defaults[defaultIx++]] = raw;
        }
        else if (rest) {
            args[rest] = args[rest] || [];
            args[rest].push(raw);
        }
        else {
            if (kwarg)
                throw new Error("Cannot specify an arg after a kwarg");
            else if (defaultIx)
                throw new Error("Too many args, expected: " + defaults.length + ", got: " + (defaultIx + 1));
            else
                throw new Error("Cannot specify an arg without default keys specified");
        }
    }
    return args;
}
exports.parseArguments = parseArguments;
if (utils_1.ENV === "browser")
    window["parser"] = exports;
function instrumentQuery(q, instrument) {
    var instrumentation = instrument;
    if (!instrument || instrument === true)
        instrumentation = function (fn, args) { return console.log("*", fn, ":", args); };
    var keys = [];
    for (var key in q)
        keys.push(key);
    keys.forEach(function (fn) {
        if (!q.constructor.prototype.hasOwnProperty(fn) || typeof q[fn] !== "function")
            return;
        var old = q[fn];
        q[fn] = function () {
            instrumentation(fn, arguments);
            return old.apply(this, arguments);
        };
    });
    return q;
}
exports.instrumentQuery = instrumentQuery;
function asDiff(ixer, artifacts) {
    var views = artifacts.views;
    var diff = ixer.diff();
    for (var id in views)
        diff.merge(views[id].changeset(app_1.eve));
    return diff;
}
exports.asDiff = asDiff;
function applyAsDiffs(artifacts) {
    var views = artifacts.views;
    for (var id in views)
        app_1.eve.applyDiff(views[id].changeset(app_1.eve));
    console.log("Applied diffs for:");
    for (var id in views)
        console.log("  * ", views[id] instanceof runtime.Query ? "Query" : "Union", views[id].name);
    return artifacts;
}
exports.applyAsDiffs = applyAsDiffs;
function logArtifacts(artifacts) {
    for (var view in artifacts.views)
        console.log(view, "\n", app_1.eve.find(view));
}
exports.logArtifacts = logArtifacts;

},{"./app":2,"./runtime":6,"./utils":8}],6:[function(require,module,exports){
var utils_1 = require("./utils");
var runtime = exports;
exports.MAX_NUMBER = 9007199254740991;
exports.INCREMENTAL = false;
function objectsIdentical(a, b) {
    var aKeys = Object.keys(a);
    for (var _i = 0; _i < aKeys.length; _i++) {
        var key = aKeys[_i];
        //TODO: handle non-scalar values
        if (a[key] !== b[key])
            return false;
    }
    return true;
}
function indexOfFact(haystack, needle) {
    var ix = 0;
    for (var _i = 0; _i < haystack.length; _i++) {
        var fact = haystack[_i];
        if (fact.__id === needle.__id) {
            return ix;
        }
        ix++;
    }
    return -1;
}
function removeFact(haystack, needle) {
    var ix = indexOfFact(haystack, needle);
    if (ix > -1)
        haystack.splice(ix, 1);
    return haystack;
}
exports.removeFact = removeFact;
function diffAddsAndRemoves(adds, removes) {
    var localHash = {};
    var hashToFact = {};
    var hashes = [];
    for (var _i = 0; _i < adds.length; _i++) {
        var add = adds[_i];
        var hash = add.__id;
        if (localHash[hash] === undefined) {
            localHash[hash] = 1;
            hashToFact[hash] = add;
            hashes.push(hash);
        }
        else {
            localHash[hash]++;
        }
        add.__id = hash;
    }
    for (var _a = 0; _a < removes.length; _a++) {
        var remove = removes[_a];
        var hash = remove.__id;
        if (localHash[hash] === undefined) {
            localHash[hash] = -1;
            hashToFact[hash] = remove;
            hashes.push(hash);
        }
        else {
            localHash[hash]--;
        }
        remove.__id = hash;
    }
    var realAdds = [];
    var realRemoves = [];
    for (var _b = 0; _b < hashes.length; _b++) {
        var hash = hashes[_b];
        var count = localHash[hash];
        if (count > 0) {
            var fact = hashToFact[hash];
            realAdds.push(fact);
        }
        else if (count < 0) {
            var fact = hashToFact[hash];
            realRemoves.push(fact);
        }
    }
    return { adds: realAdds, removes: realRemoves };
}
function generateEqualityFn(keys) {
    return new Function("a", "b", "return " + keys.map(function (key, ix) {
        if (key.constructor === Array) {
            return "a['" + key[0] + "']['" + key[1] + "'] === b['" + key[0] + "']['" + key[1] + "']";
        }
        else {
            return "a[\"" + key + "\"] === b[\"" + key + "\"]";
        }
    }).join(" && ") + ";");
}
function generateStringFn(keys) {
    var keyStrings = [];
    for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];
        if (key.constructor === Array) {
            keyStrings.push("a['" + key[0] + "']['" + key[1] + "']");
        }
        else {
            keyStrings.push("a['" + key + "']");
        }
    }
    var final = keyStrings.join(' + "|" + ');
    return new Function("a", "return " + final + ";");
}
function generateUnprojectedSorterCode(unprojectedSize, sorts) {
    var conditions = [];
    var path = [];
    var distance = unprojectedSize;
    for (var _i = 0; _i < sorts.length; _i++) {
        var sort = sorts[_i];
        var condition = "";
        for (var _a = 0; _a < path.length; _a++) {
            var prev = path[_a];
            var table_1 = prev[0], key_1 = prev[1];
            condition += "unprojected[j-" + (distance - table_1) + "]['" + key_1 + "'] === item" + table_1 + "['" + key_1 + "'] && ";
        }
        var table = sort[0], key = sort[1], dir = sort[2];
        var op = ">";
        if (dir === "descending") {
            op = "<";
        }
        condition += "unprojected[j-" + (distance - table) + "]['" + key + "'] " + op + " item" + table + "['" + key + "']";
        conditions.push(condition);
        path.push(sort);
    }
    var items = [];
    var repositioned = [];
    var itemAssignments = [];
    for (var ix = 0; ix < distance; ix++) {
        items.push("item" + ix + " = unprojected[j+" + ix + "]");
        repositioned.push("unprojected[j+" + ix + "] = unprojected[j - " + (distance - ix) + "]");
        itemAssignments.push(("unprojected[j+" + ix + "] = item" + ix));
    }
    return "for (var i = 0, len = unprojected.length; i < len; i += " + distance + ") {\n      var j = i, " + items.join(", ") + ";\n      for(; j > " + (distance - 1) + " && (" + conditions.join(" || ") + "); j -= " + distance + ") {\n        " + repositioned.join(";\n") + "\n      }\n      " + itemAssignments.join(";\n") + "\n  }";
}
function generateCollector(keys) {
    var code = "var runtime = this;\n";
    var ix = 0;
    var checks = "";
    var removes = "var cur = index";
    for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];
        if (key.constructor === Array) {
            removes += "[remove['" + key[0] + "']['" + key[1] + "']]";
        }
        else {
            removes += "[remove['" + key + "']]";
        }
    }
    removes += ";\nruntime.removeFact(cur, remove);";
    for (var _a = 0; _a < keys.length; _a++) {
        var key = keys[_a];
        ix++;
        if (key.constructor === Array) {
            checks += "value = add['" + key[0] + "']['" + key[1] + "']\n";
        }
        else {
            checks += "value = add['" + key + "']\n";
        }
        var path = "cursor[value]";
        checks += "if(!" + path + ") " + path + " = ";
        if (ix === keys.length) {
            checks += "[]\n";
        }
        else {
            checks += "{}\n";
        }
        checks += "cursor = " + path + "\n";
    }
    code += "\nfor(var ix = 0, len = removes.length; ix < len; ix++) {\nvar remove = removes[ix];\n" + removes + "\n}\nfor(var ix = 0, len = adds.length; ix < len; ix++) {\nvar add = adds[ix];\nvar cursor = index;\nvar value;\n" + checks + "  cursor.push(add);\n}\nreturn index;";
    return (new Function("index", "adds", "removes", code)).bind(runtime);
}
function generateCollector2(keys) {
    var hashParts = [];
    for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];
        if (key.constructor === Array) {
            hashParts.push("add['" + key[0] + "']['" + key[1] + "']");
        }
        else {
            hashParts.push("add['" + key + "']");
        }
    }
    var code = "\n    var ixCache = cache.ix;\n    var idCache = cache.id;\n    for(var ix = 0, len = removes.length; ix < len; ix++) {\n      var remove = removes[ix];\n      var id = remove.__id;\n      var key = idCache[id];\n      var factIx = ixCache[id];\n      var facts = index[key];\n      //swap the last fact with this one to prevent holes\n      var lastFact = facts.pop();\n      if(lastFact && lastFact.__id !== remove.__id) {\n        facts[factIx] = lastFact;\n        ixCache[lastFact.__id] = factIx;\n      } else if(facts.length === 0) {\n        delete index[key];\n      }\n      delete idCache[id];\n      delete ixCache[id];\n    }\n    for(var ix = 0, len = adds.length; ix < len; ix++) {\n      var add = adds[ix];\n      var id = add.__id;\n      var key = idCache[id] = " + hashParts.join(" + '|' + ") + ";\n      if(index[key] === undefined) index[key] = [];\n      var arr = index[key];\n      ixCache[id] = arr.length;\n      arr.push(add);\n    }\n    return index;";
    return new Function("index", "adds", "removes", "cache", code);
}
function mergeArrays(as, bs) {
    var ix = as.length;
    var start = ix;
    for (var _i = 0; _i < bs.length; _i++) {
        var b = bs[_i];
        as[ix] = bs[ix - start];
        ix++;
    }
    return as;
}
var Diff = (function () {
    function Diff(ixer) {
        this.ixer = ixer;
        this.tables = {};
        this.length = 0;
        this.meta = {};
    }
    Diff.prototype.ensureTable = function (table) {
        var tableDiff = this.tables[table];
        if (!tableDiff) {
            tableDiff = this.tables[table] = { adds: [], removes: [] };
        }
        return tableDiff;
    };
    Diff.prototype.add = function (table, obj) {
        var tableDiff = this.ensureTable(table);
        this.length++;
        tableDiff.adds.push(obj);
        return this;
    };
    Diff.prototype.addMany = function (table, objs) {
        var tableDiff = this.ensureTable(table);
        this.length += objs.length;
        mergeArrays(tableDiff.adds, objs);
        return this;
    };
    Diff.prototype.removeFacts = function (table, objs) {
        var tableDiff = this.ensureTable(table);
        this.length += objs.length;
        mergeArrays(tableDiff.removes, objs);
        return this;
    };
    Diff.prototype.remove = function (table, query) {
        var tableDiff = this.ensureTable(table);
        var found = this.ixer.find(table, query);
        this.length += found.length;
        mergeArrays(tableDiff.removes, found);
        return this;
    };
    Diff.prototype.merge = function (diff) {
        for (var table in diff.tables) {
            var tableDiff = diff.tables[table];
            this.addMany(table, tableDiff.adds);
            this.removeFacts(table, tableDiff.removes);
        }
        return this;
    };
    Diff.prototype.reverse = function () {
        var reversed = new Diff(this.ixer);
        for (var table in this.tables) {
            var diff = this.tables[table];
            reversed.addMany(table, diff.removes);
            reversed.removeFacts(table, diff.adds);
        }
        return reversed;
    };
    return Diff;
})();
exports.Diff = Diff;
var Indexer = (function () {
    function Indexer() {
        this.tables = {};
        this.globalCount = 0;
        this.edbTables = {};
    }
    Indexer.prototype.addTable = function (name, keys) {
        if (keys === void 0) { keys = []; }
        var table = this.tables[name];
        keys = keys.filter(function (key) { return key !== "__id"; });
        if (table && keys.length) {
            table.fields = keys;
            table.stringify = generateStringFn(keys);
        }
        else {
            table = this.tables[name] = { table: [], hashToIx: {}, factHash: {}, indexes: {}, triggers: {}, fields: keys, stringify: generateStringFn(keys), keyLookup: {} };
            this.edbTables[name] = true;
        }
        for (var _i = 0; _i < keys.length; _i++) {
            var key = keys[_i];
            if (key.constructor === Array) {
                table.keyLookup[key[0]] = key;
            }
            else {
                table.keyLookup[key] = key;
            }
        }
        return table;
    };
    Indexer.prototype.clearTable = function (name) {
        var table = this.tables[name];
        if (!table)
            return;
        table.table = [];
        table.factHash = {};
        for (var indexName in table.indexes) {
            table.indexes[indexName].index = {};
            table.indexes[indexName].cache = { id: {}, ix: {} };
        }
    };
    Indexer.prototype.updateTable = function (tableId, adds, removes) {
        var table = this.tables[tableId];
        if (!table || !table.fields.length) {
            var example = adds[0] || removes[0];
            table = this.addTable(tableId, Object.keys(example));
        }
        var stringify = table.stringify;
        var facts = table.table;
        var factHash = table.factHash;
        var hashToIx = table.hashToIx;
        var localHash = {};
        var hashToFact = {};
        var hashes = [];
        for (var _i = 0; _i < adds.length; _i++) {
            var add = adds[_i];
            var hash = add.__id || stringify(add);
            if (localHash[hash] === undefined) {
                localHash[hash] = 1;
                hashToFact[hash] = add;
                hashes.push(hash);
            }
            else {
                localHash[hash]++;
            }
            add.__id = hash;
        }
        for (var _a = 0; _a < removes.length; _a++) {
            var remove = removes[_a];
            var hash = remove.__id || stringify(remove);
            if (localHash[hash] === undefined) {
                localHash[hash] = -1;
                hashToFact[hash] = remove;
                hashes.push(hash);
            }
            else {
                localHash[hash]--;
            }
            remove.__id = hash;
        }
        var realAdds = [];
        var realRemoves = [];
        for (var _b = 0; _b < hashes.length; _b++) {
            var hash = hashes[_b];
            var count = localHash[hash];
            if (count > 0 && !factHash[hash]) {
                var fact = hashToFact[hash];
                realAdds.push(fact);
                facts.push(fact);
                factHash[hash] = fact;
                hashToIx[hash] = facts.length - 1;
            }
            else if (count < 0 && factHash[hash]) {
                var fact = hashToFact[hash];
                var ix = hashToIx[hash];
                //swap the last fact with this one to prevent holes
                var lastFact = facts.pop();
                if (lastFact && lastFact.__id !== fact.__id) {
                    facts[ix] = lastFact;
                    hashToIx[lastFact.__id] = ix;
                }
                realRemoves.push(fact);
                delete factHash[hash];
                delete hashToIx[hash];
            }
        }
        return { adds: realAdds, removes: realRemoves };
    };
    Indexer.prototype.collector = function (keys) {
        return {
            index: {},
            cache: { id: {}, ix: {} },
            hasher: generateStringFn(keys),
            collect: generateCollector2(keys),
        };
    };
    Indexer.prototype.factToIndex = function (table, fact) {
        var keys = Object.keys(fact);
        if (!keys.length)
            return table.table.slice();
        var index = this.index(table, keys);
        var result = index.index[index.hasher(fact)];
        if (result) {
            return result.slice();
        }
        return [];
    };
    Indexer.prototype.execDiff = function (diff) {
        var triggers = {};
        var realDiffs = {};
        var tableIds = Object.keys(diff.tables);
        for (var _i = 0; _i < tableIds.length; _i++) {
            var tableId = tableIds[_i];
            var tableDiff = diff.tables[tableId];
            if (tableDiff.adds.length === 0 && tableDiff.removes.length === 0)
                continue;
            var realDiff = this.updateTable(tableId, tableDiff.adds, tableDiff.removes);
            // go through all the indexes and update them.
            var table = this.tables[tableId];
            var indexes = Object.keys(table.indexes);
            for (var _a = 0; _a < indexes.length; _a++) {
                var indexName = indexes[_a];
                var index = table.indexes[indexName];
                index.collect(index.index, realDiff.adds, realDiff.removes, index.cache);
            }
            var curTriggers = Object.keys(table.triggers);
            for (var _b = 0; _b < curTriggers.length; _b++) {
                var triggerName = curTriggers[_b];
                var trigger = table.triggers[triggerName];
                triggers[triggerName] = trigger;
            }
            realDiffs[tableId] = realDiff;
        }
        return { triggers: triggers, realDiffs: realDiffs };
    };
    Indexer.prototype.execTrigger = function (trigger) {
        var table = this.table(trigger.name);
        // since views might be changed during the triggering process, we want to favor
        // just using the view itself as the trigger if it is one. Otherwise, we use the
        // trigger's exec function. This ensures that if a view is recompiled and added
        // that any already queued triggers will use the updated version of the view instead
        // of the old queued one.
        var _a = (table.view ? table.view.exec() : trigger.exec(this)) || {}, _b = _a.results, results = _b === void 0 ? undefined : _b, _c = _a.unprojected, unprojected = _c === void 0 ? undefined : _c;
        if (!results)
            return;
        var prevResults = table.factHash;
        var prevHashes = Object.keys(prevResults);
        table.unprojected = unprojected;
        if (results) {
            var diff = new Diff(this);
            this.clearTable(trigger.name);
            diff.addMany(trigger.name, results);
            var triggers = this.execDiff(diff).triggers;
            var newHashes = table.factHash;
            if (prevHashes.length === Object.keys(newHashes).length) {
                var same = true;
                for (var _i = 0; _i < prevHashes.length; _i++) {
                    var hash = prevHashes[_i];
                    if (!newHashes[hash]) {
                        same = false;
                        break;
                    }
                }
                return same ? undefined : triggers;
            }
            else {
                return triggers;
            }
        }
        return;
    };
    Indexer.prototype.transitivelyClearTriggers = function (startingTriggers) {
        var cleared = {};
        var remaining = Object.keys(startingTriggers);
        for (var ix = 0; ix < remaining.length; ix++) {
            var trigger = remaining[ix];
            if (cleared[trigger])
                continue;
            this.clearTable(trigger);
            cleared[trigger] = true;
            remaining.push.apply(remaining, Object.keys(this.table(trigger).triggers));
        }
        return cleared;
    };
    Indexer.prototype.execTriggers = function (triggers) {
        var newTriggers = {};
        var retrigger = false;
        for (var triggerName in triggers) {
            // console.log("Calling:", triggerName);
            var trigger = triggers[triggerName];
            var nextRound = this.execTrigger(trigger);
            if (nextRound) {
                retrigger = true;
                for (var trigger_1 in nextRound) {
                    // console.log("Queuing:", trigger);
                    newTriggers[trigger_1] = nextRound[trigger_1];
                }
            }
        }
        if (retrigger) {
            return newTriggers;
        }
    };
    //---------------------------------------------------------
    // Indexer Public API
    //---------------------------------------------------------
    Indexer.prototype.serialize = function (asObject) {
        var dump = {};
        for (var tableName in this.tables) {
            var table = this.tables[tableName];
            if (!table.isView) {
                dump[tableName] = table.table;
            }
        }
        if (asObject) {
            return dump;
        }
        return JSON.stringify(dump);
    };
    Indexer.prototype.load = function (serialized) {
        var dump = JSON.parse(serialized);
        var diff = this.diff();
        for (var tableName in dump) {
            diff.addMany(tableName, dump[tableName]);
        }
        if (exports.INCREMENTAL) {
            this.applyDiffIncremental(diff);
        }
        else {
            this.applyDiff(diff);
        }
    };
    Indexer.prototype.diff = function () {
        return new Diff(this);
    };
    Indexer.prototype.applyDiff = function (diff) {
        if (exports.INCREMENTAL) {
            return this.applyDiffIncremental(diff);
        }
        var _a = this.execDiff(diff), triggers = _a.triggers, realDiffs = _a.realDiffs;
        var cleared;
        var round = 0;
        if (triggers)
            cleared = this.transitivelyClearTriggers(triggers);
        while (triggers) {
            for (var trigger in triggers) {
                cleared[trigger] = false;
            }
            // console.group(`ROUND ${round}`);
            triggers = this.execTriggers(triggers);
            round++;
        }
        for (var _i = 0, _b = Object.keys(cleared); _i < _b.length; _i++) {
            var trigger = _b[_i];
            if (!cleared[trigger])
                continue;
            var view = this.table(trigger).view;
            if (view) {
                this.execTrigger(view);
            }
        }
    };
    Indexer.prototype.table = function (tableId) {
        var table = this.tables[tableId];
        if (table)
            return table;
        return this.addTable(tableId);
    };
    Indexer.prototype.index = function (tableOrId, keys) {
        var table;
        if (typeof tableOrId === "string")
            table = this.table(tableOrId);
        else
            table = tableOrId;
        keys.sort();
        var indexName = keys.filter(function (key) { return key !== "__id"; }).join("|");
        var index = table.indexes[indexName];
        if (!index) {
            var tableKeys = [];
            for (var _i = 0; _i < keys.length; _i++) {
                var key = keys[_i];
                tableKeys.push(table.keyLookup[key] || key);
            }
            index = table.indexes[indexName] = this.collector(tableKeys);
            index.collect(index.index, table.table, [], index.cache);
        }
        return index;
    };
    Indexer.prototype.find = function (tableId, query) {
        var table = this.tables[tableId];
        if (!table) {
            return [];
        }
        else if (!query) {
            return table.table.slice();
        }
        else {
            return this.factToIndex(table, query);
        }
    };
    Indexer.prototype.findOne = function (tableId, query) {
        return this.find(tableId, query)[0];
    };
    Indexer.prototype.query = function (name) {
        if (name === void 0) { name = "unknown"; }
        return new Query(this, name);
    };
    Indexer.prototype.union = function (name) {
        return new Union(this, name);
    };
    Indexer.prototype.trigger = function (name, table, exec, execIncremental) {
        var tables = (typeof table === "string") ? [table] : table;
        var trigger = { name: name, tables: tables, exec: exec, execIncremental: execIncremental };
        for (var _i = 0; _i < tables.length; _i++) {
            var tableId = tables[_i];
            var table_2 = this.table(tableId);
            table_2.triggers[name] = trigger;
        }
        if (!exports.INCREMENTAL) {
            var nextRound = this.execTrigger(trigger);
            while (nextRound) {
                nextRound = this.execTriggers(nextRound);
            }
            ;
        }
        else {
            if (!tables.length) {
                return exec(this);
            }
            var initial = (_a = {}, _a[tables[0]] = { adds: this.tables[tables[0]].table, removes: [] }, _a);
            var _b = this.execTriggerIncremental(trigger, initial), triggers = _b.triggers, changes = _b.changes;
            while (triggers) {
                var results = this.execTriggersIncremental(triggers, changes);
                if (!results)
                    break;
                triggers = results.triggers;
                changes = results.changes;
            }
        }
        var _a;
    };
    Indexer.prototype.asView = function (query) {
        var name = query.name;
        if (this.tables[name]) {
            this.removeView(name);
        }
        var view = this.table(name);
        this.edbTables[name] = false;
        view.view = query;
        view.isView = true;
        this.trigger(name, query.tables, query.exec.bind(query), query.execIncremental.bind(query));
    };
    Indexer.prototype.removeView = function (id) {
        for (var _i = 0, _a = this.tables; _i < _a.length; _i++) {
            var table = _a[_i];
            delete table.triggers[id];
        }
    };
    Indexer.prototype.totalFacts = function () {
        var total = 0;
        for (var tableName in this.tables) {
            total += this.tables[tableName].table.length;
        }
        return total;
    };
    Indexer.prototype.factsPerTable = function () {
        var info = {};
        for (var tableName in this.tables) {
            info[tableName] = this.tables[tableName].table.length;
        }
        return info;
    };
    Indexer.prototype.applyDiffIncremental = function (diff) {
        if (diff.length === 0)
            return;
        // console.log("DIFF SIZE: ", diff.length, diff);
        var _a = this.execDiff(diff), triggers = _a.triggers, realDiffs = _a.realDiffs;
        var round = 0;
        var changes = realDiffs;
        while (triggers) {
            // console.group(`ROUND ${round}`);
            // console.log("CHANGES: ", changes);
            var results = this.execTriggersIncremental(triggers, changes);
            // console.groupEnd();
            if (!results)
                break;
            triggers = results.triggers;
            changes = results.changes;
            round++;
        }
    };
    Indexer.prototype.execTriggerIncremental = function (trigger, changes) {
        var table = this.table(trigger.name);
        var adds, provenance, removes, info;
        if (trigger.execIncremental) {
            info = trigger.execIncremental(changes, table) || {};
            adds = info.adds;
            removes = info.removes;
        }
        else {
            trigger.exec();
            return;
        }
        var diff = new runtime.Diff(this);
        if (adds.length) {
            diff.addMany(trigger.name, adds);
        }
        if (removes.length) {
            diff.removeFacts(trigger.name, removes);
        }
        var updated = this.execDiff(diff);
        var realDiffs = updated.realDiffs;
        if (realDiffs[trigger.name] && (realDiffs[trigger.name].adds.length || realDiffs[trigger.name].removes)) {
            return { changes: realDiffs[trigger.name], triggers: updated.triggers };
        }
        else {
            return {};
        }
    };
    Indexer.prototype.execTriggersIncremental = function (triggers, changes) {
        var newTriggers = {};
        var nextChanges = {};
        var retrigger = false;
        var triggerKeys = Object.keys(triggers);
        for (var _i = 0; _i < triggerKeys.length; _i++) {
            var triggerName = triggerKeys[_i];
            // console.log("Calling:", triggerName);
            var trigger = triggers[triggerName];
            var nextRound = this.execTriggerIncremental(trigger, changes);
            if (nextRound && nextRound.changes) {
                nextChanges[triggerName] = nextRound.changes;
                if (nextRound.triggers) {
                    var nextRoundKeys = Object.keys(nextRound.triggers);
                    for (var _a = 0; _a < nextRoundKeys.length; _a++) {
                        var trigger_2 = nextRoundKeys[_a];
                        if (trigger_2 && nextRound.triggers[trigger_2]) {
                            retrigger = true;
                            // console.log("Queuing:", trigger);
                            newTriggers[trigger_2] = nextRound.triggers[trigger_2];
                        }
                    }
                }
            }
        }
        if (retrigger) {
            return { changes: nextChanges, triggers: newTriggers };
        }
    };
    return Indexer;
})();
exports.Indexer = Indexer;
function addProvenanceTable(ixer) {
    var table = ixer.addTable("provenance", ["table", ["row", "__id"], "row instance", "source", ["source row", "__id"]]);
    // generate some indexes that we know we're going to need upfront
    ixer.index("provenance", ["table", "row"]);
    ixer.index("provenance", ["table", "row instance"]);
    ixer.index("provenance", ["table", "source", "source row"]);
    ixer.index("provenance", ["table"]);
    return ixer;
}
exports.addProvenanceTable = addProvenanceTable;
function mappingToDiff(diff, action, mapping, aliases, reverseLookup) {
    for (var from in mapping) {
        var to = mapping[from];
        if (to.constructor === Array) {
            var source = to[0];
            if (typeof source === "number") {
                source = aliases[reverseLookup[source]];
            }
            else {
                source = aliases[source];
            }
            diff.add("action mapping", { action: action, from: from, "to source": source, "to field": to[1] });
        }
        else {
            diff.add("action mapping constant", { action: action, from: from, value: to });
        }
    }
    return diff;
}
exports.QueryFunctions = {};
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
        result = [];
    return result;
}
function define(name, opts, func) {
    var params = getParamNames(func);
    opts.name = name;
    opts.params = params;
    opts.func = func;
    exports.QueryFunctions[name] = opts;
}
exports.define = define;
var Query = (function () {
    function Query(ixer, name) {
        if (name === void 0) { name = "unknown"; }
        this.name = name;
        this.ixer = ixer;
        this.dirty = true;
        this.tables = [];
        this.joins = [];
        this.aliases = {};
        this.funcs = [];
        this.aggregates = [];
        this.unprojectedSize = 0;
        this.hasOrdinal = false;
    }
    Query.remove = function (view, ixer) {
        var diff = ixer.diff();
        diff.remove("view", { view: view });
        for (var _i = 0, _a = ixer.find("action", { view: view }); _i < _a.length; _i++) {
            var actionItem = _a[_i];
            var action = actionItem.action;
            diff.remove("action", { action: action });
            diff.remove("action source", { action: action });
            diff.remove("action mapping", { action: action });
            diff.remove("action mapping constant", { action: action });
            diff.remove("action mapping sorted", { action: action });
            diff.remove("action mapping limit", { action: action });
        }
        return diff;
    };
    Query.prototype.changeset = function (ixer) {
        var diff = ixer.diff();
        var aliases = {};
        var reverseLookup = {};
        for (var alias in this.aliases) {
            reverseLookup[this.aliases[alias]] = alias;
        }
        var view = this.name;
        diff.add("view", { view: view, kind: "query" });
        //joins
        for (var _i = 0, _a = this.joins; _i < _a.length; _i++) {
            var join = _a[_i];
            var action = utils_1.uuid();
            aliases[join.as] = action;
            if (!join.negated) {
                diff.add("action", { view: view, action: action, kind: "select", ix: join.ix });
            }
            else {
                diff.add("action", { view: view, action: action, kind: "deselect", ix: join.ix });
            }
            diff.add("action source", { action: action, "source view": join.table });
            mappingToDiff(diff, action, join.join, aliases, reverseLookup);
        }
        //functions
        for (var _b = 0, _c = this.funcs; _b < _c.length; _b++) {
            var func = _c[_b];
            var action = utils_1.uuid();
            aliases[func.as] = action;
            diff.add("action", { view: view, action: action, kind: "calculate", ix: func.ix });
            diff.add("action source", { action: action, "source view": func.name });
            mappingToDiff(diff, action, func.args, aliases, reverseLookup);
        }
        //aggregates
        for (var _d = 0, _e = this.aggregates; _d < _e.length; _d++) {
            var agg = _e[_d];
            var action = utils_1.uuid();
            aliases[agg.as] = action;
            diff.add("action", { view: view, action: action, kind: "aggregate", ix: agg.ix });
            diff.add("action source", { action: action, "source view": agg.name });
            mappingToDiff(diff, action, agg.args, aliases, reverseLookup);
        }
        //sort
        if (this.sorts) {
            var action = utils_1.uuid();
            diff.add("action", { view: view, action: action, kind: "sort", ix: exports.MAX_NUMBER });
            var ix = 0;
            for (var _f = 0, _g = this.sorts; _f < _g.length; _f++) {
                var sort = _g[_f];
                var source = sort[0], field = sort[1], direction = sort[2];
                if (typeof source === "number") {
                    source = aliases[reverseLookup[source]];
                }
                else {
                    source = aliases[source];
                }
                diff.add("action mapping sorted", { action: action, ix: ix, source: source, field: field, direction: direction });
                ix++;
            }
        }
        //group
        if (this.groups) {
            var action = utils_1.uuid();
            diff.add("action", { view: view, action: action, kind: "group", ix: exports.MAX_NUMBER });
            var ix = 0;
            for (var _h = 0, _j = this.groups; _h < _j.length; _h++) {
                var group = _j[_h];
                var source = group[0], field = group[1];
                if (typeof source === "number") {
                    source = aliases[reverseLookup[source]];
                }
                else {
                    source = aliases[source];
                }
                diff.add("action mapping sorted", { action: action, ix: ix, source: source, field: field, direction: "ascending" });
                ix++;
            }
        }
        //limit
        if (this.limitInfo) {
            var action = utils_1.uuid();
            diff.add("action", { view: view, action: action, kind: "limit", ix: exports.MAX_NUMBER });
            for (var limitType in this.limitInfo) {
                diff.add("action mapping limit", { action: action, "limit type": limitType, value: this.limitInfo[limitType] });
            }
        }
        //projection
        if (this.projectionMap) {
            var action = utils_1.uuid();
            diff.add("action", { view: view, action: action, kind: "project", ix: exports.MAX_NUMBER });
            mappingToDiff(diff, action, this.projectionMap, aliases, reverseLookup);
        }
        return diff;
    };
    Query.prototype.validateFields = function (tableName, joinObject) {
        var table = this.ixer.table(tableName);
        for (var field in joinObject) {
            if (table.fields.length && !table.keyLookup[field]) {
                throw new Error("Table '" + tableName + "' doesn't have a field '" + field + "'.\n\nAvailable fields: " + table.fields.join(", "));
            }
            var joinInfo = joinObject[field];
            if (joinInfo.constructor === Array) {
                var joinNumber = joinInfo[0], referencedField = joinInfo[1];
                if (typeof joinNumber !== "number") {
                    joinNumber = this.aliases[joinNumber];
                }
                var join = this.joins[joinNumber];
                if (join && join.ix === joinNumber) {
                    var referencedTable = this.ixer.table(join.table);
                    if (!referencedTable.fields.length)
                        continue;
                    if (!referencedTable.keyLookup[referencedField]) {
                        throw new Error("Table '" + join.table + "' doesn't have a field '" + referencedField + "'.\n\nAvailable fields: " + referencedTable.fields.join(", "));
                    }
                }
            }
        }
    };
    Query.prototype.select = function (table, join, as) {
        this.dirty = true;
        if (as) {
            this.aliases[as] = Object.keys(this.aliases).length;
        }
        this.unprojectedSize++;
        this.tables.push(table);
        this.validateFields(table, join);
        this.joins.push({ negated: false, table: table, join: join, as: as, ix: this.aliases[as] });
        return this;
    };
    Query.prototype.deselect = function (table, join) {
        this.dirty = true;
        this.tables.push(table);
        this.validateFields(table, join);
        this.joins.push({ negated: true, table: table, join: join, ix: this.joins.length * 1000 });
        return this;
    };
    Query.prototype.calculate = function (funcName, args, as) {
        this.dirty = true;
        if (as) {
            this.aliases[as] = Object.keys(this.aliases).length;
        }
        if (!exports.QueryFunctions[funcName].filter) {
            this.unprojectedSize++;
        }
        this.funcs.push({ name: funcName, args: args, as: as, ix: this.aliases[as] });
        return this;
    };
    Query.prototype.project = function (projectionMap) {
        this.projectionMap = projectionMap;
        this.validateFields(undefined, projectionMap);
        return this;
    };
    Query.prototype.group = function (groups) {
        this.dirty = true;
        if (groups[0] && groups[0].constructor === Array) {
            this.groups = groups;
        }
        else {
            if (!this.groups)
                this.groups = [];
            this.groups.push(groups);
        }
        return this;
    };
    Query.prototype.sort = function (sorts) {
        this.dirty = true;
        if (sorts[0] && sorts[0].constructor === Array) {
            this.sorts = sorts;
        }
        else {
            if (!this.sorts)
                this.sorts = [];
            this.sorts.push(sorts);
        }
        return this;
    };
    Query.prototype.limit = function (limitInfo) {
        this.dirty = true;
        if (!this.limitInfo) {
            this.limitInfo = {};
        }
        for (var key in limitInfo) {
            this.limitInfo[key] = limitInfo[key];
        }
        return this;
    };
    Query.prototype.aggregate = function (funcName, args, as) {
        this.dirty = true;
        if (as) {
            this.aliases[as] = Object.keys(this.aliases).length;
        }
        this.unprojectedSize++;
        this.aggregates.push({ name: funcName, args: args, as: as, ix: this.aliases[as] });
        return this;
    };
    Query.prototype.ordinal = function () {
        this.dirty = true;
        this.hasOrdinal = true;
        this.unprojectedSize++;
        return this;
    };
    Query.prototype.applyAliases = function (joinMap) {
        for (var field in joinMap) {
            var joinInfo = joinMap[field];
            if (joinInfo.constructor !== Array || typeof joinInfo[0] === "number")
                continue;
            var joinTable = joinInfo[0];
            if (joinTable === "ordinal") {
                joinInfo[0] = this.unprojectedSize - 1;
            }
            else if (this.aliases[joinTable] !== undefined) {
                joinInfo[0] = this.aliases[joinTable];
            }
            else {
                throw new Error("Invalid alias used: " + joinTable);
            }
        }
    };
    Query.prototype.toAST = function () {
        var cursor = { type: "query",
            children: [] };
        var root = cursor;
        var results = [];
        // by default the only thing we return are the unprojected results
        var returns = ["unprojected", "provenance"];
        // we need an array to store our unprojected results
        root.children.push({ type: "declaration", var: "unprojected", value: "[]" });
        root.children.push({ type: "declaration", var: "provenance", value: "[]" });
        root.children.push({ type: "declaration", var: "projected", value: "{}" });
        // run through each table nested in the order they were given doing pairwise
        // joins along the way.
        for (var _i = 0, _a = this.joins; _i < _a.length; _i++) {
            var join = _a[_i];
            var table = join.table, ix = join.ix, negated = join.negated;
            var cur = {
                type: "select",
                table: table,
                passed: ix === 0,
                ix: ix,
                negated: negated,
                children: [],
                join: false,
            };
            // we only want to eat the cost of dealing with indexes
            // if we are actually joining on something
            var joinMap = join.join;
            this.applyAliases(joinMap);
            if (joinMap && Object.keys(joinMap).length !== 0) {
                root.children.unshift({ type: "declaration", var: "query" + ix, value: "{}" });
                cur.join = joinMap;
            }
            cursor.children.push(cur);
            if (!negated) {
                results.push({ type: "select", ix: ix });
            }
            cursor = cur;
        }
        // at the bottom of the joins, we calculate all the functions based on the values
        // collected
        for (var _b = 0, _c = this.funcs; _b < _c.length; _b++) {
            var func = _c[_b];
            var args = func.args, name_1 = func.name, ix = func.ix;
            var funcInfo = exports.QueryFunctions[name_1];
            this.applyAliases(args);
            root.children.unshift({ type: "functionDeclaration", ix: ix, info: funcInfo });
            if (funcInfo.multi || funcInfo.filter) {
                var node = { type: "functionCallMultiReturn", ix: ix, args: args, info: funcInfo, children: [] };
                cursor.children.push(node);
                cursor = node;
            }
            else {
                cursor.children.push({ type: "functionCall", ix: ix, args: args, info: funcInfo, children: [] });
            }
            if (!funcInfo.noReturn && !funcInfo.filter) {
                results.push({ type: "function", ix: ix });
            }
        }
        // now that we're at the bottom of the join, store the unprojected result
        cursor.children.push({ type: "result", results: results });
        //Aggregation
        //sort the unprojected results based on groupings and the given sorts
        var sorts = [];
        var alreadySorted = {};
        if (this.groups) {
            this.applyAliases(this.groups);
            for (var _d = 0, _e = this.groups; _d < _e.length; _d++) {
                var group = _e[_d];
                var table = group[0], field = group[1];
                sorts.push(group);
                alreadySorted[(table + "|" + field)] = true;
            }
        }
        if (this.sorts) {
            this.applyAliases(this.sorts);
            for (var _f = 0, _g = this.sorts; _f < _g.length; _f++) {
                var sort = _g[_f];
                var table = sort[0], field = sort[1];
                if (!alreadySorted[(table + "|" + field)]) {
                    sorts.push(sort);
                }
            }
        }
        var size = this.unprojectedSize;
        if (sorts.length) {
            root.children.push({ type: "sort", sorts: sorts, size: size, children: [] });
        }
        //then we need to run through the sorted items and do the aggregate as a fold.
        if (this.aggregates.length || sorts.length || this.limitInfo || this.hasOrdinal) {
            // we need to store group info for post processing of the unprojected results
            // this will indicate what group number, if any, that each unprojected result belongs to
            root.children.unshift({ type: "declaration", var: "groupInfo", value: "[]" });
            returns.push("groupInfo");
            var aggregateChildren = [];
            for (var _h = 0, _j = this.aggregates; _h < _j.length; _h++) {
                var func = _j[_h];
                var args = func.args, name_2 = func.name, ix = func.ix;
                var funcInfo = exports.QueryFunctions[name_2];
                this.applyAliases(args);
                root.children.unshift({ type: "functionDeclaration", ix: ix, info: funcInfo });
                aggregateChildren.push({ type: "functionCall", ix: ix, resultsIx: results.length, args: args, info: funcInfo, unprojected: true, children: [] });
                results.push({ type: "placeholder" });
            }
            if (this.hasOrdinal === true) {
                aggregateChildren.push({ type: "ordinal" });
                results.push({ type: "placeholder" });
            }
            var aggregate = { type: "aggregate loop", groups: this.groups, limit: this.limitInfo, size: size, children: aggregateChildren };
            root.children.push(aggregate);
            cursor = aggregate;
        }
        if (this.projectionMap) {
            this.applyAliases(this.projectionMap);
            root.children.unshift({ type: "declaration", var: "results", value: "[]" });
            if (exports.INCREMENTAL) {
                cursor.children.push({ type: "provenance" });
            }
            cursor.children.push({ type: "projection", projectionMap: this.projectionMap, unprojected: this.aggregates.length });
            returns.push("results");
        }
        root.children.push({ type: "return", vars: returns });
        return root;
    };
    Query.prototype.compileParamString = function (funcInfo, args, unprojected) {
        if (unprojected === void 0) { unprojected = false; }
        var code = "";
        var params = funcInfo.params;
        if (unprojected)
            params = params.slice(1);
        for (var _i = 0; _i < params.length; _i++) {
            var param = params[_i];
            var arg = args[param];
            var argCode = void 0;
            if (arg.constructor === Array) {
                var property = "";
                if (arg[1]) {
                    property = "['" + arg[1] + "']";
                }
                if (!unprojected) {
                    argCode = "row" + arg[0] + property;
                }
                else {
                    argCode = "unprojected[ix + " + arg[0] + "]" + property;
                }
            }
            else {
                argCode = JSON.stringify(arg);
            }
            code += argCode + ", ";
        }
        return code.substring(0, code.length - 2);
    };
    Query.prototype.compileAST = function (root) {
        var code = "";
        var type = root.type;
        switch (type) {
            case "query":
                for (var _i = 0, _a = root.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    code += this.compileAST(child);
                }
                break;
            case "declaration":
                code += "var " + root.var + " = " + root.value + ";\n";
                break;
            case "functionDeclaration":
                code += "var func" + root.ix + " = QueryFunctions['" + root.info.name + "'].func;\n";
                break;
            case "functionCall":
                var ix = root.ix;
                var prev = "";
                if (root.unprojected) {
                    prev = "row" + ix;
                    if (root.info.params.length > 1)
                        prev += ",";
                }
                code += "var row" + ix + " = func" + ix + "(" + prev + this.compileParamString(root.info, root.args, root.unprojected) + ");\n";
                break;
            case "functionCallMultiReturn":
                var ix = root.ix;
                code += "var rows" + ix + " = func" + ix + "(" + this.compileParamString(root.info, root.args) + ");\n";
                code += "for(var funcResultIx" + ix + " = 0, funcLen" + ix + " = rows" + ix + ".length; funcResultIx" + ix + " < funcLen" + ix + "; funcResultIx" + ix + "++) {\n";
                code += "var row" + ix + " = rows" + ix + "[funcResultIx" + ix + "];\n";
                for (var _b = 0, _c = root.children; _b < _c.length; _b++) {
                    var child = _c[_b];
                    code += this.compileAST(child);
                }
                code += "}\n";
                break;
            case "select":
                var ix = root.ix;
                if (root.passed) {
                    code += "var rows" + ix + " = rootRows;\n";
                }
                else if (root.join) {
                    for (var key in root.join) {
                        var mapping = root.join[key];
                        if (mapping.constructor === Array) {
                            var tableIx = mapping[0], value = mapping[1];
                            code += "query" + ix + "['" + key + "'] = row" + tableIx + "['" + value + "'];\n";
                        }
                        else {
                            code += "query" + ix + "['" + key + "'] = " + JSON.stringify(mapping) + ";\n";
                        }
                    }
                    code += "var rows" + ix + " = ixer.factToIndex(ixer.table('" + root.table + "'), query" + ix + ");\n";
                }
                else {
                    code += "var rows" + ix + " = ixer.table('" + root.table + "').table;\n";
                }
                if (!root.negated) {
                    code += "for(var rowIx" + ix + " = 0, rowsLen" + ix + " = rows" + ix + ".length; rowIx" + ix + " < rowsLen" + ix + "; rowIx" + ix + "++) {\n";
                    code += "var row" + ix + " = rows" + ix + "[rowIx" + ix + "];\n";
                }
                else {
                    code += "if(!rows" + ix + ".length) {\n";
                }
                for (var _d = 0, _e = root.children; _d < _e.length; _d++) {
                    var child = _e[_d];
                    code += this.compileAST(child);
                }
                code += "}\n";
                break;
            case "result":
                var results = [];
                for (var _f = 0, _g = root.results; _f < _g.length; _f++) {
                    var result = _g[_f];
                    if (result.type === "placeholder") {
                        results.push("undefined");
                    }
                    else {
                        var ix_1 = result.ix;
                        results.push("row" + ix_1);
                    }
                }
                code += "unprojected.push(" + results.join(", ") + ");\n";
                break;
            case "sort":
                code += generateUnprojectedSorterCode(root.size, root.sorts) + "\n";
                break;
            case "aggregate loop":
                var projection = "";
                var aggregateCalls = [];
                var aggregateStates = [];
                var aggregateResets = [];
                var unprojected = {};
                var ordinal = false;
                var provenanceCode;
                for (var _h = 0, _j = root.children; _h < _j.length; _h++) {
                    var agg = _j[_h];
                    if (agg.type === "functionCall") {
                        unprojected[agg.ix] = true;
                        var compiled = this.compileAST(agg);
                        compiled += "\nunprojected[ix + " + agg.resultsIx + "] = row" + agg.ix + ";\n";
                        aggregateCalls.push(compiled);
                        aggregateStates.push("var row" + agg.ix + " = {};");
                        aggregateResets.push("row" + agg.ix + " = {};");
                    }
                    else if (agg.type === "projection") {
                        agg.unprojected = unprojected;
                        projection = this.compileAST(agg);
                    }
                    else if (agg.type === "ordinal") {
                        ordinal = "unprojected[ix+" + (this.unprojectedSize - 1) + "] = resultCount;\n";
                    }
                    else if (agg.type === "provenance") {
                        provenanceCode = this.compileAST(agg);
                    }
                }
                var aggregateCallsCode = aggregateCalls.join("");
                var differentGroupChecks = [];
                var groupCheck = "false";
                if (root.groups) {
                    for (var _k = 0, _l = root.groups; _k < _l.length; _k++) {
                        var group = _l[_k];
                        var table = group[0], field = group[1];
                        differentGroupChecks.push("unprojected[nextIx + " + table + "]['" + field + "'] !== unprojected[ix + " + table + "]['" + field + "']");
                    }
                    groupCheck = "(" + differentGroupChecks.join(" || ") + ")";
                }
                var resultsCheck = "";
                if (root.limit && root.limit.results) {
                    var limitValue = root.limit.results;
                    var offset = root.limit.offset;
                    if (offset) {
                        limitValue += offset;
                        projection = "if(resultCount >= " + offset + ") {\n              " + projection + "\n            }";
                    }
                    resultsCheck = "if(resultCount === " + limitValue + ") break;";
                }
                var groupLimitCheck = "";
                if (root.limit && root.limit.perGroup && root.groups) {
                    var limitValue = root.limit.perGroup;
                    var offset = root.limit.offset;
                    if (offset) {
                        limitValue += offset;
                        aggregateCallsCode = "if(perGroupCount >= " + offset + ") {\n              " + aggregateCallsCode + "\n            }";
                    }
                    groupLimitCheck = "if(perGroupCount === " + limitValue + ") {\n            while(!differentGroup) {\n              nextIx += " + root.size + ";\n              if(nextIx >= len) break;\n              groupInfo[nextIx] = undefined;\n              differentGroup = " + groupCheck + ";\n            }\n          }";
                }
                var groupDifference = "";
                var groupInfo = "";
                if (this.groups) {
                    groupInfo = "groupInfo[ix] = resultCount;";
                    var groupProjection = projection + "resultCount++;";
                    if (root.limit && root.limit.offset) {
                        groupProjection = "if(perGroupCount > " + root.limit.offset + ") {\n              " + groupProjection + "\n            }";
                        groupInfo = "if(perGroupCount >= " + root.limit.offset + ") {\n              " + groupInfo + "\n            }";
                    }
                    groupDifference = "\n          perGroupCount++\n          var differentGroup = " + groupCheck + ";\n          " + groupLimitCheck + "\n          if(differentGroup) {\n            " + groupProjection + "\n            " + aggregateResets.join("\n") + "\n            perGroupCount = 0;\n          }\n";
                }
                else {
                    groupDifference = "resultCount++;\n";
                    groupInfo = "groupInfo[ix] = 0;";
                }
                // if there are neither aggregates to calculate nor groups to build,
                // then we just need to worry about limiting
                if (!this.groups && aggregateCalls.length === 0) {
                    code = "var ix = 0;\n                  var resultCount = 0;\n                  var len = unprojected.length;\n                  while(ix < len) {\n                    " + resultsCheck + "\n                    " + (ordinal || "") + "\n                    " + provenanceCode + "\n                    " + projection + "\n                    groupInfo[ix] = resultCount;\n                    resultCount++;\n                    ix += " + root.size + ";\n                  }\n";
                    break;
                }
                code = "var resultCount = 0;\n                var perGroupCount = 0;\n                var ix = 0;\n                var nextIx = 0;\n                var len = unprojected.length;\n                " + aggregateStates.join("\n") + "\n                while(ix < len) {\n                  " + aggregateCallsCode + "\n                  " + groupInfo + "\n                  " + (ordinal || "") + "\n                  " + provenanceCode + "\n                  if(ix + " + root.size + " === len) {\n                    " + projection + "\n                    break;\n                  }\n                  nextIx += " + root.size + ";\n                  " + groupDifference + "\n                  " + resultsCheck + "\n                  ix = nextIx;\n                }\n";
                break;
            case "projection":
                var projectedVars = [];
                var idStringParts = [];
                for (var newField in root.projectionMap) {
                    var mapping = root.projectionMap[newField];
                    var value = "";
                    if (mapping.constructor === Array) {
                        if (mapping[1] === undefined) {
                            value = "unprojected[ix + " + mapping[0] + "]";
                        }
                        else if (!root.unprojected || root.unprojected[mapping[0]]) {
                            value = "row" + mapping[0] + "['" + mapping[1] + "']";
                        }
                        else {
                            value = "unprojected[ix + " + mapping[0] + "]['" + mapping[1] + "']";
                        }
                    }
                    else {
                        value = JSON.stringify(mapping);
                    }
                    projectedVars.push("projected['" + newField.replace(/'/g, "\\'") + "'] = " + value);
                    idStringParts.push(value);
                }
                code += projectedVars.join(";\n") + "\n";
                code += "projected.__id = " + idStringParts.join(" + \"|\" + ") + ";\n";
                code += "results.push(projected);\n";
                code += "projected = {};\n";
                break;
            case "provenance":
                var provenance = "var provenance__id = '';\n";
                var ids = [];
                for (var _m = 0, _o = this.joins; _m < _o.length; _m++) {
                    var join = _o[_m];
                    if (join.negated)
                        continue;
                    provenance += "provenance__id = tableId + '|' + projected.__id + '|' + rowInstance + '|" + join.table + "|' + row" + join.ix + ".__id; \n";
                    provenance += "provenance.push({table: tableId, row: projected, \"row instance\": rowInstance, source: \"" + join.table + "\", \"source row\": row" + join.ix + "});\n";
                    ids.push("row" + join.ix + ".__id");
                }
                code = "var rowInstance = " + ids.join(" + '|' + ") + ";\n        " + provenance;
                break;
            case "return":
                var returns = [];
                for (var _p = 0, _q = root.vars; _p < _q.length; _p++) {
                    var curVar = _q[_p];
                    returns.push(curVar + ": " + curVar);
                }
                code += "return {" + returns.join(", ") + "};";
                break;
        }
        return code;
    };
    // given a set of changes and a join order, determine the root facts that need
    // to be joined again to cover all the adds
    Query.prototype.reverseJoin = function (joins) {
        var changed = joins[0];
        var reverseJoinMap = {};
        // collect all the constraints and reverse them
        for (var _i = 0; _i < joins.length; _i++) {
            var join = joins[_i];
            for (var key in join.join) {
                var _a = join.join[key], source = _a[0], field = _a[1];
                if (source <= changed.ix) {
                    if (!reverseJoinMap[source]) {
                        reverseJoinMap[source] = {};
                    }
                    if (!reverseJoinMap[source][field])
                        reverseJoinMap[source][field] = [join.ix, key];
                }
            }
        }
        var recurse = function (joins, joinIx) {
            var code = "";
            if (joinIx >= joins.length) {
                return "others.push(row0)";
            }
            var _a = joins[joinIx], table = _a.table, ix = _a.ix, negated = _a.negated;
            var joinMap = joins[joinIx].join;
            // we only care about this guy if he's joined with at least one thing
            if (!reverseJoinMap[ix] && joinIx < joins.length - 1)
                return recurse(joins, joinIx + 1);
            else if (!reverseJoinMap)
                return "";
            var mappings = [];
            for (var key in reverseJoinMap[ix]) {
                var _b = reverseJoinMap[ix][key], sourceIx = _b[0], field = _b[1];
                if (sourceIx === changed.ix || reverseJoinMap[sourceIx] !== undefined) {
                    mappings.push("'" + key + "': row" + sourceIx + "['" + field + "']");
                }
            }
            for (var key in joinMap) {
                var value = joinMap[key];
                if (value.constructor !== Array) {
                    mappings.push("'" + key + "': " + JSON.stringify(value));
                }
            }
            if (negated) {
            }
            code += "\n            var rows" + ix + " = eve.find('" + table + "', {" + mappings.join(", ") + "});\n            for(var rowsIx" + ix + " = 0, rowsLen" + ix + " = rows" + ix + ".length; rowsIx" + ix + " < rowsLen" + ix + "; rowsIx" + ix + "++) {\n                var row" + ix + " = rows" + ix + "[rowsIx" + ix + "];\n                " + recurse(joins, joinIx + 1) + "\n            }\n            ";
            return code;
        };
        return recurse(joins, 1);
    };
    Query.prototype.compileIncrementalRowFinderCode = function () {
        var code = "var others = [];\n";
        var reversed = this.joins.slice().reverse();
        var checks = [];
        var ix = 0;
        for (var _i = 0; _i < reversed.length; _i++) {
            var join = reversed[_i];
            // we don't want to do this for the root
            if (ix === reversed.length - 1)
                break;
            checks.push("\n\t\t\tif(changes[\"" + join.table + "\"] && changes[\"" + join.table + "\"].adds) {\n                var curChanges" + join.ix + " = changes[\"" + join.table + "\"].adds;\n                for(var changeIx" + join.ix + " = 0, changeLen" + join.ix + " = curChanges" + join.ix + ".length; changeIx" + join.ix + " < changeLen" + join.ix + "; changeIx" + join.ix + "++) {\n                    var row" + join.ix + " = curChanges" + join.ix + "[changeIx" + join.ix + "];\n\t\t\t\t\t" + this.reverseJoin(reversed.slice(ix)) + "\n\t\t\t\t}\n\t\t\t}");
            ix++;
        }
        code += checks.join(" else");
        var last = reversed[ix];
        code += "\n\t\t\tif(changes[\"" + last.table + "\"] && changes[\"" + last.table + "\"].adds) {\n                var curChanges = changes[\"" + last.table + "\"].adds;\n\t\t\t\tfor(var changeIx = 0, changeLen = curChanges.length; changeIx < changeLen; changeIx++) {\n\t\t\t\t\tothers.push(curChanges[changeIx]);\n\t\t\t\t}\n\t\t\t}\n\t\t\treturn others;";
        return code;
    };
    Query.prototype.incrementalRemove = function (changes) {
        var ixer = this.ixer;
        var rowsToPostCheck = [];
        var provenanceDiff = this.ixer.diff();
        var removes = [];
        var indexes = ixer.table("provenance").indexes;
        var sourceRowLookup = indexes["source|source row|table"].index;
        var rowInstanceLookup = indexes["row instance|table"].index;
        var tableRowLookup = indexes["row|table"].index;
        var provenanceRemoves = [];
        var visited = {};
        for (var _i = 0, _a = this.joins; _i < _a.length; _i++) {
            var join = _a[_i];
            var change = changes[join.table];
            if (!visited[join.table] && change && change.removes.length) {
                visited[join.table] = true;
                for (var _b = 0, _c = change.removes; _b < _c.length; _b++) {
                    var remove = _c[_b];
                    var provenances = sourceRowLookup[join.table + '|' + remove.__id + '|' + this.name];
                    if (provenances) {
                        for (var _d = 0; _d < provenances.length; _d++) {
                            var provenance = provenances[_d];
                            if (!visited[provenance["row instance"]]) {
                                visited[provenance["row instance"]] = true;
                                var relatedProvenance = rowInstanceLookup[provenance["row instance"] + '|' + provenance.table];
                                for (var _e = 0; _e < relatedProvenance.length; _e++) {
                                    var related = relatedProvenance[_e];
                                    provenanceRemoves.push(related);
                                }
                            }
                            rowsToPostCheck.push(provenance);
                        }
                    }
                }
            }
        }
        provenanceDiff.removeFacts("provenance", provenanceRemoves);
        ixer.applyDiffIncremental(provenanceDiff);
        var isEdb = ixer.edbTables;
        for (var _f = 0; _f < rowsToPostCheck.length; _f++) {
            var row = rowsToPostCheck[_f];
            var supports = tableRowLookup[row.row.__id + '|' + row.table];
            if (!supports || supports.length === 0) {
                removes.push(row.row);
            }
        }
        return removes;
    };
    Query.prototype.canBeIncremental = function () {
        if (this.aggregates.length)
            return false;
        if (this.sorts)
            return false;
        if (this.groups)
            return false;
        if (this.limitInfo)
            return false;
        for (var _i = 0, _a = this.joins; _i < _a.length; _i++) {
            var join = _a[_i];
            if (join.negated)
                return false;
        }
        if (!this.joins.length)
            return false;
        return true;
    };
    Query.prototype.compile = function () {
        var ast = this.toAST();
        var code = this.compileAST(ast);
        this.compiled = new Function("ixer", "QueryFunctions", "tableId", "rootRows", code);
        if (this.canBeIncremental()) {
            this.incrementalRowFinder = new Function("changes", this.compileIncrementalRowFinderCode());
        }
        else {
            this.incrementalRowFinder = undefined;
        }
        this.dirty = false;
        return this;
    };
    Query.prototype.exec = function () {
        if (this.dirty) {
            this.compile();
        }
        var root = this.joins[0];
        var rows;
        if (root) {
            rows = this.ixer.find(root.table, root.join);
        }
        else {
            rows = [];
        }
        return this.compiled(this.ixer, exports.QueryFunctions, this.name, rows);
    };
    Query.prototype.execIncremental = function (changes, table) {
        if (this.dirty) {
            this.compile();
        }
        if (this.incrementalRowFinder) {
            var potentialRows = this.incrementalRowFinder(changes);
            // if the root select has some constant filters, then
            // the above rows need to be filtered down to only those that
            // match.
            var rows = [];
            var root = this.joins[0];
            var rootKeys = Object.keys(root.join);
            if (rootKeys.length > 0) {
                rowLoop: for (var _i = 0; _i < potentialRows.length; _i++) {
                    var row = potentialRows[_i];
                    for (var _a = 0; _a < rootKeys.length; _a++) {
                        var key = rootKeys[_a];
                        if (row[key] !== root.join[key])
                            continue rowLoop;
                    }
                    rows.push(row);
                }
            }
            else {
                rows = potentialRows;
            }
            var results = this.compiled(this.ixer, exports.QueryFunctions, this.name, rows);
            var adds = [];
            var prevHashes = table.factHash;
            var prevKeys = Object.keys(prevHashes);
            var suggestedRemoves = this.incrementalRemove(changes);
            var realDiff = diffAddsAndRemoves(results.results, suggestedRemoves);
            for (var _b = 0, _c = realDiff.adds; _b < _c.length; _b++) {
                var result = _c[_b];
                var id = result.__id;
                if (prevHashes[id] === undefined) {
                    adds.push(result);
                }
            }
            var diff = this.ixer.diff();
            diff.addMany("provenance", results.provenance);
            this.ixer.applyDiffIncremental(diff);
            // console.log("INC PROV DIFF", this.name, diff.length);
            return { provenance: results.provenance, adds: adds, removes: realDiff.removes };
        }
        else {
            var results = this.exec();
            var adds = [];
            var removes = [];
            var prevHashes = table.factHash;
            var prevKeys = Object.keys(prevHashes);
            var newHashes = {};
            for (var _d = 0, _e = results.results; _d < _e.length; _d++) {
                var result = _e[_d];
                var id = result.__id;
                newHashes[id] = result;
                if (prevHashes[id] === undefined) {
                    adds.push(result);
                }
            }
            for (var _f = 0; _f < prevKeys.length; _f++) {
                var hash = prevKeys[_f];
                var value = newHashes[hash];
                if (value === undefined) {
                    removes.push(prevHashes[hash]);
                }
            }
            var realDiff = diffAddsAndRemoves(adds, removes);
            var diff = this.ixer.diff();
            diff.remove("provenance", { table: this.name });
            diff.addMany("provenance", results.provenance);
            this.ixer.applyDiffIncremental(diff);
            // console.log("FULL PROV SIZE", this.name, diff.length);
            return { provenance: results.provenance, adds: realDiff.adds, removes: realDiff.removes };
        }
    };
    Query.prototype.debug = function () {
        console.log(this.compileAST(this.toAST()));
        console.time("exec");
        var results = this.exec();
        console.timeEnd("exec");
        console.log(results);
        return results;
    };
    return Query;
})();
exports.Query = Query;
var Union = (function () {
    function Union(ixer, name) {
        if (name === void 0) { name = "unknown"; }
        this.name = name;
        this.ixer = ixer;
        this.tables = [];
        this.sources = [];
        this.isStateful = false;
        this.prev = { results: [], hashes: {} };
        this.dirty = true;
    }
    Union.prototype.changeset = function (ixer) {
        var diff = ixer.diff();
        diff.add("view", { view: this.name, kind: "union" });
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            if (source.type === "+") {
                var action = utils_1.uuid();
                diff.add("action", { view: this.name, action: action, kind: "union", ix: 0 });
                diff.add("action source", { action: action, "source view": source.table });
                for (var field in source.mapping) {
                    var mapped = source.mapping[field];
                    if (mapped.constructor === Array)
                        diff.add("action mapping", { action: action, from: field, "to source": source.table, "to field": mapped[0] });
                    else
                        diff.add("action mapping constant", { action: action, from: field, value: mapped });
                }
            }
            else
                throw new Error("Unknown source type: '" + source.type + "'");
        }
        return diff;
    };
    Union.prototype.ensureHasher = function (mapping) {
        if (!this.hasher) {
            this.hasher = generateStringFn(Object.keys(mapping));
        }
    };
    Union.prototype.union = function (tableName, mapping) {
        this.dirty = true;
        this.ensureHasher(mapping);
        this.tables.push(tableName);
        this.sources.push({ type: "+", table: tableName, mapping: mapping });
        return this;
    };
    Union.prototype.toAST = function () {
        var root = { type: "union", children: [] };
        root.children.push({ type: "declaration", var: "results", value: "[]" });
        root.children.push({ type: "declaration", var: "provenance", value: "[]" });
        var hashesValue = "{}";
        if (this.isStateful) {
            hashesValue = "prevHashes";
        }
        root.children.push({ type: "declaration", var: "hashes", value: hashesValue });
        var ix = 0;
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            var action = void 0;
            if (source.type === "+") {
                action = { type: "result", ix: ix, children: [{ type: "provenance", source: source, ix: ix }] };
            }
            root.children.push({
                type: "source",
                ix: ix,
                table: source.table,
                mapping: source.mapping,
                children: [action],
            });
            ix++;
        }
        root.children.push({ type: "hashesToResults" });
        root.children.push({ type: "return", vars: ["results", "hashes", "provenance"] });
        return root;
    };
    Union.prototype.compileAST = function (root) {
        var code = "";
        var type = root.type;
        switch (type) {
            case "union":
                for (var _i = 0, _a = root.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    code += this.compileAST(child);
                }
                break;
            case "declaration":
                code += "var " + root.var + " = " + root.value + ";\n";
                break;
            case "source":
                var ix = root.ix;
                var mappingItems = [];
                for (var key in root.mapping) {
                    var mapping = root.mapping[key];
                    var value = void 0;
                    if (mapping.constructor === Array && mapping.length === 1) {
                        var field = mapping[0];
                        value = "sourceRow" + ix + "['" + field + "']";
                    }
                    else if (mapping.constructor === Array && mapping.length === 2) {
                        var _ = mapping[0], field = mapping[1];
                        value = "sourceRow" + ix + "['" + field + "']";
                    }
                    else {
                        value = JSON.stringify(mapping);
                    }
                    mappingItems.push("'" + key + "': " + value);
                }
                code += "var sourceRows" + ix + " = changes['" + root.table.replace(/'/g, "\\'") + "'];\n";
                code += "for(var rowIx" + ix + " = 0, rowsLen" + ix + " = sourceRows" + ix + ".length; rowIx" + ix + " < rowsLen" + ix + "; rowIx" + ix + "++) {\n";
                code += "var sourceRow" + ix + " = sourceRows" + ix + "[rowIx" + ix + "];\n";
                code += "var mappedRow" + ix + " = {" + mappingItems.join(", ") + "};\n";
                for (var _b = 0, _c = root.children; _b < _c.length; _b++) {
                    var child = _c[_b];
                    code += this.compileAST(child);
                }
                code += "}\n";
                break;
            case "result":
                var ix = root.ix;
                code += "var hash" + ix + " = hasher(mappedRow" + ix + ");\n";
                code += "mappedRow" + ix + ".__id = hash" + ix + ";\n";
                code += "hashes[hash" + ix + "] = mappedRow" + ix + ";\n";
                for (var _d = 0, _e = root.children; _d < _e.length; _d++) {
                    var child = _e[_d];
                    code += this.compileAST(child);
                }
                break;
            case "removeResult":
                var ix = root.ix;
                code += "hashes[hasher(mappedRow" + ix + ")] = false;\n";
                break;
            case "hashesToResults":
                code += "var hashKeys = Object.keys(hashes);\n";
                code += "for(var hashKeyIx = 0, hashKeyLen = hashKeys.length; hashKeyIx < hashKeyLen; hashKeyIx++) {\n";
                code += "var curHashKey = hashKeys[hashKeyIx];";
                code += "var value = hashes[curHashKey];\n";
                code += "if(value !== false) {\n";
                code += "value.__id = curHashKey;\n";
                code += "results.push(value);\n";
                code += "}\n";
                code += "}\n";
                break;
            case "provenance":
                var source = root.source.table;
                var ix = root.ix;
                var provenance = "var provenance__id = '';\n";
                provenance += "provenance__id = '" + this.name.replace(/'/g, "\\'") + "|' + mappedRow" + ix + ".__id + '|' + rowInstance + '|" + source.replace(/'/g, "\\'") + "|' + sourceRow" + ix + ".__id; \n";
                provenance += "provenance.push({table: '" + this.name.replace(/'/g, "\\'") + "', row: mappedRow" + ix + ", \"row instance\": rowInstance, source: \"" + source.replace(/'/g, "\\'") + "\", \"source row\": sourceRow" + ix + "});\n";
                code = "var rowInstance = \"" + source.replace(/'/g, "\\'") + "|\" + mappedRow" + ix + ".__id;\n        " + provenance;
                break;
            case "return":
                code += "return {" + root.vars.map(function (name) { return (name + ": " + name); }).join(", ") + "};";
                break;
        }
        return code;
    };
    Union.prototype.compile = function () {
        var ast = this.toAST();
        var code = this.compileAST(ast);
        this.compiled = new Function("ixer", "hasher", "changes", code);
        this.dirty = false;
        return this;
    };
    Union.prototype.debug = function () {
        var code = this.compileAST(this.toAST());
        console.log(code);
        return code;
    };
    Union.prototype.exec = function () {
        if (this.dirty) {
            this.compile();
        }
        var changes = {};
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            changes[source.table] = this.ixer.table(source.table).table;
        }
        var results = this.compiled(this.ixer, this.hasher, changes);
        return results;
    };
    Union.prototype.incrementalRemove = function (changes) {
        var ixer = this.ixer;
        var rowsToPostCheck = [];
        var provenanceDiff = this.ixer.diff();
        var removes = [];
        var indexes = ixer.table("provenance").indexes;
        var sourceRowLookup = indexes["source|source row|table"].index;
        var rowInstanceLookup = indexes["row instance|table"].index;
        var tableRowLookup = indexes["row|table"].index;
        var provenanceRemoves = [];
        var visited = {};
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            var change = changes[source.table];
            if (!visited[source.table] && change && change.removes.length) {
                visited[source.table] = true;
                for (var _b = 0, _c = change.removes; _b < _c.length; _b++) {
                    var remove = _c[_b];
                    var provenances = sourceRowLookup[source.table + '|' + remove.__id + '|' + this.name];
                    if (provenances) {
                        for (var _d = 0; _d < provenances.length; _d++) {
                            var provenance = provenances[_d];
                            if (!visited[provenance["row instance"]]) {
                                visited[provenance["row instance"]] = true;
                                var relatedProvenance = rowInstanceLookup[provenance["row instance"] + '|' + provenance.table];
                                for (var _e = 0; _e < relatedProvenance.length; _e++) {
                                    var related = relatedProvenance[_e];
                                    provenanceRemoves.push(related);
                                }
                            }
                            rowsToPostCheck.push(provenance);
                        }
                    }
                }
            }
        }
        provenanceDiff.removeFacts("provenance", provenanceRemoves);
        ixer.applyDiffIncremental(provenanceDiff);
        var isEdb = ixer.edbTables;
        for (var _f = 0; _f < rowsToPostCheck.length; _f++) {
            var row = rowsToPostCheck[_f];
            var supports = tableRowLookup[row.row.__id + '|' + row.table];
            if (!supports || supports.length === 0) {
                removes.push(row.row);
            }
            else if (this.sources.length > 2) {
                var supportsToRemove = [];
                // otherwise if there are supports, then we need to walk the support
                // graph backwards and make sure every supporting row terminates at an
                // edb value. If not, then that support also needs to be removed
                for (var _g = 0; _g < supports.length; _g++) {
                    var support = supports[_g];
                    // if the support is already an edb, we're good to go.
                    if (isEdb[support.source])
                        continue;
                    if (!tableRowLookup[support["source row"].__id + '|' + support.source]) {
                        supportsToRemove.push(support);
                        continue;
                    }
                    // get all the supports for this support
                    var nodes = tableRowLookup[support["source row"].__id + '|' + support.source].slice();
                    var nodeIx = 0;
                    // iterate through all the nodes, if they have further supports then
                    // assume this node is ok and add those supports to the list of nodes to
                    // check. If we run into a node with no supports it must either be an edb
                    // or it's unsupported and this row instance needs to be removed.
                    while (nodeIx < nodes.length) {
                        var node = nodes[nodeIx];
                        if (isEdb[node.source]) {
                            nodeIx++;
                            continue;
                        }
                        var nodeSupports = tableRowLookup[node["source row"].__id + '|' + node.source];
                        if (!nodeSupports || nodeSupports.length === 0) {
                            supportsToRemove.push(support);
                            break;
                        }
                        else {
                            for (var _h = 0; _h < nodeSupports.length; _h++) {
                                var nodeSupport = nodeSupports[_h];
                                nodes.push(nodeSupport);
                            }
                            nodeIx++;
                        }
                    }
                }
                if (supportsToRemove.length) {
                    // we need to remove all the supports
                    var provenanceRemoves_1 = [];
                    for (var _j = 0; _j < supportsToRemove.length; _j++) {
                        var support = supportsToRemove[_j];
                        var relatedProvenance = rowInstanceLookup[support["row instance"] + '|' + support.table];
                        for (var _k = 0; _k < relatedProvenance.length; _k++) {
                            var related = relatedProvenance[_k];
                            provenanceRemoves_1.push(related);
                        }
                    }
                    var diff = ixer.diff();
                    diff.removeFacts("provenance", provenanceRemoves_1);
                    ixer.applyDiffIncremental(diff);
                    // now that all the unsupported provenances have been removed, check if there's anything
                    // left.
                    if (!tableRowLookup[row.row.__id + '|' + row.table] || tableRowLookup[row.row.__id + '|' + row.table].length === 0) {
                        removes.push(row.row);
                    }
                }
            }
        }
        return removes;
    };
    Union.prototype.execIncremental = function (changes, table) {
        if (this.dirty) {
            this.compile();
        }
        var sourceChanges = {};
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            var value = void 0;
            if (!changes[source.table]) {
                value = [];
            }
            else {
                value = changes[source.table].adds;
            }
            sourceChanges[source.table] = value;
        }
        var results = this.compiled(this.ixer, this.hasher, sourceChanges);
        var adds = [];
        var prevHashes = table.factHash;
        var prevKeys = Object.keys(prevHashes);
        var suggestedRemoves = this.incrementalRemove(changes);
        var realDiff = diffAddsAndRemoves(results.results, suggestedRemoves);
        for (var _b = 0, _c = realDiff.adds; _b < _c.length; _b++) {
            var result = _c[_b];
            var id = result.__id;
            if (prevHashes[id] === undefined) {
                adds.push(result);
            }
        }
        var diff = this.ixer.diff();
        diff.addMany("provenance", results.provenance);
        this.ixer.applyDiffIncremental(diff);
        return { provenance: results.provenance, adds: adds, removes: realDiff.removes };
    };
    return Union;
})();
exports.Union = Union;
//---------------------------------------------------------
// Builtin Primitives
//---------------------------------------------------------
runtime.define("count", { aggregate: true, result: "count" }, function (prev) {
    if (!prev.count) {
        prev.count = 0;
    }
    prev.count++;
    return prev;
});
runtime.define("sum", { aggregate: true, result: "sum" }, function (prev, value) {
    if (!prev.sum) {
        prev.sum = 0;
    }
    prev.sum += value;
    return prev;
});
runtime.define("average", { aggregate: true, result: "average" }, function (prev, value) {
    if (!prev.sum) {
        prev.sum = 0;
        prev.count = 0;
    }
    prev.count++;
    prev.sum += value;
    prev.average = prev.sum / prev.count;
    return prev;
});
runtime.define("lowercase", { result: "lowercase" }, function (text) {
    if (typeof text === "string") {
        return { result: text.toLowerCase() };
    }
    return { result: text };
});
runtime.define("=", { filter: true, inverse: "!=" }, function (a, b) {
    return a === b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define("!=", { filter: true, inverse: "=" }, function (a, b) {
    return a !== b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define(">", { filter: true, inverse: "<=" }, function (a, b) {
    return a > b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define("<", { filter: true, inverse: ">=" }, function (a, b) {
    return a < b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define(">=", { filter: true, inverse: "<" }, function (a, b) {
    return a >= b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define("<=", { filter: true, inverse: ">" }, function (a, b) {
    return a <= b ? runtime.SUCCEED : runtime.FAIL;
});
runtime.define("+", { result: "result" }, function (a, b) {
    return { result: a + b };
});
runtime.define("-", { result: "result" }, function (a, b) {
    return { result: a - b };
});
runtime.define("*", { result: "result" }, function (a, b) {
    return { result: a * b };
});
runtime.define("/", { result: "result" }, function (a, b) {
    return { result: a / b };
});
//---------------------------------------------------------
// AST and compiler
//---------------------------------------------------------
// view: view, kind[union|query|table]
// action: view, action, kind[select|calculate|project|union|ununion|stateful|limit|sort|group|aggregate], ix
// action source: action, source view
// action mapping: action, from, to source, to field
// action mapping constant: action, from, value
function addRecompileTriggers(eve) {
    var recompileTrigger = {
        exec: function (ixer) {
            for (var _i = 0, _a = ixer.find("view"); _i < _a.length; _i++) {
                var view = _a[_i];
                if (view.kind === "table")
                    continue;
                try {
                    var query = compile(ixer, view.view);
                    ixer.asView(query);
                }
                catch (e) {
                    console.error("BAD QUERY IN THE DB :(");
                    console.error("View Id: " + view.view);
                    console.log(e.stack);
                    ixer.applyDiff(Query.remove(view.view, ixer));
                }
            }
            return {};
        }
    };
    eve.addTable("view", ["view", "kind"]);
    eve.addTable("action", ["view", "action", "kind", "ix"]);
    eve.addTable("action source", ["action", "source view"]);
    eve.addTable("action mapping", ["action", "from", "to source", "to field"]);
    eve.addTable("action mapping constant", ["action", "from", "value"]);
    eve.addTable("action mapping sorted", ["action", "ix", "source", "field", "direction"]);
    eve.addTable("action mapping limit", ["action", "limit type", "value"]);
    eve.table("view").triggers["recompile"] = recompileTrigger;
    eve.table("action").triggers["recompile"] = recompileTrigger;
    eve.table("action source").triggers["recompile"] = recompileTrigger;
    eve.table("action mapping").triggers["recompile"] = recompileTrigger;
    eve.table("action mapping constant").triggers["recompile"] = recompileTrigger;
    eve.table("action mapping sorted").triggers["recompile"] = recompileTrigger;
    eve.table("action mapping limit").triggers["recompile"] = recompileTrigger;
    return eve;
}
function compile(ixer, viewId) {
    var view = ixer.findOne("view", { view: viewId });
    if (!view) {
        throw new Error("No view found for " + viewId + ".");
    }
    var compiled = ixer[view.kind](viewId);
    var actions = ixer.find("action", { view: viewId });
    if (!actions) {
        throw new Error("View " + viewId + " has no actions.");
    }
    // sort actions by ix
    actions.sort(function (a, b) { return a.ix - b.ix; });
    for (var _i = 0; _i < actions.length; _i++) {
        var action = actions[_i];
        var actionKind = action.kind;
        if (actionKind === "limit") {
            var limit = {};
            for (var _a = 0, _b = ixer.find("action mapping limit", { action: action.action }); _a < _b.length; _a++) {
                var limitMapping = _b[_a];
                limit[limitMapping["limit type"]] = limitMapping["value"];
            }
            compiled.limit(limit);
        }
        else if (actionKind === "sort" || actionKind === "group") {
            var sorted = [];
            var mappings = ixer.find("action mapping sorted", { action: action.action });
            mappings.sort(function (a, b) { return a.ix - b.ix; });
            for (var _c = 0; _c < mappings.length; _c++) {
                var mapping = mappings[_c];
                sorted.push([mapping["source"], mapping["field"], mapping["direction"]]);
            }
            if (sorted.length) {
                compiled[actionKind](sorted);
            }
            else {
                throw new Error(actionKind + " without any mappings: " + action.action);
            }
        }
        else {
            var mappings = ixer.find("action mapping", { action: action.action });
            var mappingObject = {};
            for (var _d = 0; _d < mappings.length; _d++) {
                var mapping = mappings[_d];
                var source_1 = mapping["to source"];
                var field = mapping["to field"];
                if (actionKind === "union" || actionKind === "ununion") {
                    mappingObject[mapping.from] = [field];
                }
                else {
                    mappingObject[mapping.from] = [source_1, field];
                }
            }
            var constants = ixer.find("action mapping constant", { action: action.action });
            for (var _e = 0; _e < constants.length; _e++) {
                var constant = constants[_e];
                mappingObject[constant.from] = constant.value;
            }
            var source = ixer.findOne("action source", { action: action.action });
            if (!source && actionKind !== "project") {
                throw new Error(actionKind + " action without a source in '" + viewId + "'");
            }
            if (actionKind !== "project") {
                compiled[actionKind](source["source view"], mappingObject, action.action);
            }
            else {
                compiled[actionKind](mappingObject);
            }
        }
    }
    return compiled;
}
exports.compile = compile;
//---------------------------------------------------------
// Public API
//---------------------------------------------------------
exports.SUCCEED = [{ success: true }];
exports.FAIL = [];
function indexer() {
    var ixer = new Indexer();
    addProvenanceTable(ixer);
    addRecompileTriggers(ixer);
    return ixer;
}
exports.indexer = indexer;
if (utils_1.ENV === "browser")
    window["runtime"] = exports;

},{"./utils":8}],7:[function(require,module,exports){
var utils_1 = require("./utils");
var runtime_1 = require("./runtime");
function resolve(table, fact) {
    var neue = {};
    for (var field in fact)
        neue[(table + ": " + field)] = fact[field];
    return neue;
}
function humanize(table, fact) {
    var neue = {};
    for (var field in fact)
        neue[field.slice(table.length + 2)] = fact[field];
    return neue;
}
function resolvedAdd(changeset, table, fact) {
    return changeset.add(table, resolve(table, fact));
}
function resolvedRemove(changeset, table, fact) {
    return changeset.remove(table, resolve(table, fact));
}
function humanizedFind(ixer, table, query) {
    var results = [];
    for (var _i = 0, _a = ixer.find(table, resolve(table, query)); _i < _a.length; _i++) {
        var fact = _a[_i];
        results.push(humanize(table, fact));
    }
    var diag = {};
    for (var table_1 in ixer.tables)
        diag[table_1] = ixer.tables[table_1].table.length;
    return results;
}
var UI = (function () {
    function UI(id) {
        this.id = id;
        this._children = [];
        this._attributes = {};
        this._events = {};
    }
    UI.remove = function (template, ixer) {
        var changeset = ixer.diff();
        resolvedRemove(changeset, "ui template", { template: template });
        resolvedRemove(changeset, "ui template binding", { template: template });
        var bindings = humanizedFind(ixer, "ui template binding", { template: template });
        for (var _i = 0; _i < bindings.length; _i++) {
            var binding = bindings[_i];
            changeset.merge(runtime_1.Query.remove(binding.binding, ixer));
        }
        resolvedRemove(changeset, "ui embed", { template: template });
        var embeds = humanizedFind(ixer, "ui embed", { template: template });
        for (var _a = 0; _a < embeds.length; _a++) {
            var embed = embeds[_a];
            resolvedRemove(changeset, "ui embed scope", { template: template, embed: embed.embed });
            resolvedRemove(changeset, "ui embed scope binding", { template: template, embed: embed.embed });
        }
        resolvedRemove(changeset, "ui attribute", { template: template });
        resolvedRemove(changeset, "ui attribute binding", { template: template });
        resolvedRemove(changeset, "ui event", { template: template });
        var events = humanizedFind(ixer, "ui event", { template: template });
        for (var _b = 0; _b < events.length; _b++) {
            var event_1 = events[_b];
            resolvedRemove(changeset, "ui event state", { template: template, event: event_1.event });
            resolvedRemove(changeset, "ui event state binding", { template: template, event: event_1.event });
        }
        for (var _c = 0, _d = humanizedFind(ixer, "ui template", { parent: template }); _c < _d.length; _c++) {
            var child = _d[_c];
            changeset.merge(UI.remove(child.template, ixer));
        }
        return changeset;
    };
    UI.prototype.copy = function () {
        var neue = new UI(this.id);
        neue._binding = this._binding;
        neue._embedded = this._embedded;
        neue._children = this._children;
        neue._attributes = this._attributes;
        neue._events = this._events;
        neue._parent = this._parent;
        return neue;
    };
    UI.prototype.changeset = function (ixer) {
        var changeset = ixer.diff();
        var parent = this._attributes["parent"] || (this._parent && this._parent.id) || "";
        var ix = this._attributes["ix"];
        if (ix === undefined)
            ix = (this._parent && this._parent._children.indexOf(this));
        if (ix === -1 || ix === undefined)
            ix = "";
        if (this._embedded)
            parent = "";
        resolvedAdd(changeset, "ui template", { template: this.id, parent: parent, ix: ix });
        if (this._binding) {
            if (!this._binding.name || this._binding.name === "unknown")
                this._binding.name = "bound view " + this.id;
            changeset.merge(this._binding.changeset(ixer));
            resolvedAdd(changeset, "ui template binding", { template: this.id, binding: this._binding.name });
        }
        if (this._embedded) {
            var embed = utils_1.uuid();
            resolvedAdd(changeset, "ui embed", { embed: embed, template: this.id, parent: (this._parent || {}).id, ix: ix });
            for (var key in this._embedded) {
                var value = this._attributes[key];
                if (value instanceof Array)
                    resolvedAdd(changeset, "ui embed scope binding", { embed: embed, key: key, source: value[0], alias: value[1] });
                else
                    resolvedAdd(changeset, "ui embed scope", { embed: embed, key: key, value: value });
            }
        }
        for (var property in this._attributes) {
            var value = this._attributes[property];
            if (value instanceof Array)
                resolvedAdd(changeset, "ui attribute binding", { template: this.id, property: property, source: value[0], alias: value[1] });
            else
                resolvedAdd(changeset, "ui attribute", { template: this.id, property: property, value: value });
        }
        for (var event_2 in this._events) {
            resolvedAdd(changeset, "ui event", { template: this.id, event: event_2 });
            var state = this._events[event_2];
            for (var key in state) {
                var value = state[key];
                if (value instanceof Array)
                    resolvedAdd(changeset, "ui event state binding", { template: this.id, event: event_2, key: key, source: value[0], alias: value[1] });
                else
                    resolvedAdd(changeset, "ui event state", { template: this.id, event: event_2, key: key, value: value });
            }
        }
        for (var _i = 0, _a = this._children; _i < _a.length; _i++) {
            var child = _a[_i];
            changeset.merge(child.changeset(ixer));
        }
        return changeset;
    };
    UI.prototype.load = function (template, ixer, parent) {
        var fact = humanizedFind(ixer, "ui template", { template: template })[0];
        if (!fact)
            return this;
        if (parent || fact.parent)
            this._parent = parent || new UI(this._parent);
        var binding = humanizedFind(ixer, "ui template binding", { template: template })[0];
        if (binding)
            this.bind((new runtime_1.Query(ixer, binding.binding)));
        var embed = humanizedFind(ixer, "ui embed", { template: template, parent: this._parent ? this._parent.id : "" })[0];
        if (embed) {
            var scope = {};
            for (var _i = 0, _a = humanizedFind(ixer, "ui embed scope", { embed: embed.embed }); _i < _a.length; _i++) {
                var attr = _a[_i];
                scope[attr.key] = attr.value;
            }
            for (var _b = 0, _c = humanizedFind(ixer, "ui embed scope binding", { embed: embed.embed }); _b < _c.length; _b++) {
                var attr = _c[_b];
                scope[attr.key] = [attr.source, attr.alias];
            }
            this.embed(scope);
        }
        for (var _d = 0, _e = humanizedFind(ixer, "ui attribute", { template: template }); _d < _e.length; _d++) {
            var attr = _e[_d];
            this.attribute(attr.property, attr.value);
        }
        for (var _f = 0, _g = humanizedFind(ixer, "ui attribute binding", { template: template }); _f < _g.length; _f++) {
            var attr = _g[_f];
            this.attribute(attr.property, [attr.source, attr.alias]);
        }
        for (var _h = 0, _j = humanizedFind(ixer, "ui event", { template: template }); _h < _j.length; _h++) {
            var event_3 = _j[_h];
            var state = {};
            for (var _k = 0, _l = humanizedFind(ixer, "ui event state", { template: template, event: event_3.event }); _k < _l.length; _k++) {
                var attr = _l[_k];
                state[event_3.key] = event_3.value;
            }
            for (var _m = 0, _o = humanizedFind(ixer, "ui event state binding", { template: template, event: event_3.event }); _m < _o.length; _m++) {
                var attr = _o[_m];
                state[event_3.key] = [event_3.source, event_3.alias];
            }
            this.event(event_3.event, state);
        }
        for (var _p = 0, _q = humanizedFind(ixer, "ui template", { parent: template }); _p < _q.length; _p++) {
            var child = _q[_p];
            this.child((new UI(child.template)).load(child.template, ixer, this));
        }
        return this;
    };
    UI.prototype.children = function (neue, append) {
        if (append === void 0) { append = false; }
        if (!neue)
            return this._children;
        if (!append)
            this._children.length = 0;
        for (var _i = 0; _i < neue.length; _i++) {
            var child = neue[_i];
            var copied = child.copy();
            copied._parent = this;
            this._children.push(copied);
        }
        return this._children;
    };
    UI.prototype.child = function (child, ix, embed) {
        child = child.copy();
        child._parent = this;
        if (embed)
            child.embed(embed);
        if (!ix)
            this._children.push(child);
        else
            this._children.splice(ix, 0, child);
        return child;
    };
    UI.prototype.removeChild = function (ix) {
        return this._children.splice(ix, 1);
    };
    UI.prototype.attributes = function (properties, merge) {
        if (merge === void 0) { merge = false; }
        if (!properties)
            return this._attributes;
        if (!merge) {
            for (var prop in this._attributes)
                delete this._attributes[prop];
        }
        for (var prop in properties)
            this._attributes[prop] = properties[prop];
        return this;
    };
    UI.prototype.attribute = function (property, value) {
        if (value === undefined)
            return this._attributes[property];
        this._attributes[property] = value;
        return this;
    };
    UI.prototype.removeAttribute = function (property) {
        delete this._attributes[property];
        return this;
    };
    UI.prototype.events = function (events, merge) {
        if (merge === void 0) { merge = false; }
        if (!events)
            return this._events;
        if (!merge) {
            for (var event_4 in this._events)
                delete this._events[event_4];
        }
        for (var event_5 in events)
            this._events[event_5] = events[event_5];
        return this;
    };
    UI.prototype.event = function (event, state) {
        if (state === undefined)
            return this._events[event];
        this._attributes[event] = state;
        return this;
    };
    UI.prototype.removeEvent = function (event) {
        delete this._events[event];
        return this;
    };
    UI.prototype.embed = function (scope) {
        if (scope === void 0) { scope = {}; }
        if (!scope) {
            this._embedded = undefined;
            return this;
        }
        if (scope === true)
            scope = {};
        this._embedded = scope;
        return this;
    };
    UI.prototype.bind = function (binding) {
        this._binding = binding;
        return this;
    };
    return UI;
})();
exports.UI = UI;
// @TODO: Finish reference impl.
// @TODO: Then build bit-generating version
var UIRenderer = (function () {
    function UIRenderer(ixer) {
        this.ixer = ixer;
        this.compiled = 0;
        this._tagCompilers = {};
        this._handlers = [];
    }
    UIRenderer.prototype.compile = function (roots) {
        if (utils_1.DEBUG.RENDERER)
            console.group("ui compile");
        var compiledElems = [];
        for (var _i = 0; _i < roots.length; _i++) {
            var root = roots[_i];
            // @TODO: reparent dynamic roots if needed.
            if (typeof root === "string") {
                var elems = this._compileWrapper(root, compiledElems.length);
                compiledElems.push.apply(compiledElems, elems);
                var base = this.ixer.findOne("ui template", { "ui template: template": root });
                if (!base)
                    continue;
                var parent_1 = base["ui template: parent"];
                if (parent_1) {
                    for (var _a = 0; _a < elems.length; _a++) {
                        var elem = elems[_a];
                        elem.parent = parent_1;
                    }
                }
            }
            else {
                if (!root.ix)
                    root.ix = compiledElems.length;
                compiledElems.push(root);
            }
        }
        if (utils_1.DEBUG.RENDERER)
            console.groupEnd();
        return compiledElems;
    };
    UIRenderer.prototype._compileWrapper = function (template, baseIx, constraints, bindingStack, depth) {
        if (constraints === void 0) { constraints = {}; }
        if (bindingStack === void 0) { bindingStack = []; }
        if (depth === void 0) { depth = 0; }
        var elems = [];
        var binding = this.ixer.findOne("ui template binding", { "ui template binding: template": template });
        if (!binding) {
            var elem = this._compileElement(template, bindingStack, depth);
            if (elem)
                elems[0] = elem;
        }
        else {
            var boundQuery = binding["ui template binding: binding"];
            var facts = this.getBoundFacts(boundQuery, constraints);
            var ix = 0;
            for (var _i = 0; _i < facts.length; _i++) {
                var fact = facts[_i];
                bindingStack.push(fact);
                var elem = this._compileElement(template, bindingStack, depth);
                bindingStack.pop();
                if (elem)
                    elems.push(elem);
            }
        }
        elems.sort(function (a, b) { return a.ix - b.ix; });
        var prevIx = undefined;
        for (var _a = 0; _a < elems.length; _a++) {
            var elem = elems[_a];
            elem.ix = elem.ix ? elem.ix + baseIx : baseIx;
            if (elem.ix === prevIx)
                elem.ix++;
            prevIx = elem.ix;
        }
        return elems;
    };
    UIRenderer.prototype._compileElement = function (template, bindingStack, depth) {
        if (utils_1.DEBUG.RENDERER)
            console.log(utils_1.repeat("  ", depth) + "* compile", template);
        var elementToChildren = this.ixer.index("ui template", ["ui template: parent"]);
        var elementToEmbeds = this.ixer.index("ui embed", ["ui embed: parent"]);
        var embedToScope = this.ixer.index("ui embed scope", ["ui embed scope: embed"]);
        var embedToScopeBinding = this.ixer.index("ui embed scope binding", ["ui embed scope binding: embed"]);
        var elementToAttrs = this.ixer.index("ui attribute", ["ui attribute: template"]);
        var elementToAttrBindings = this.ixer.index("ui attribute binding", ["ui attribute binding: template"]);
        var elementToEvents = this.ixer.index("ui event", ["ui event: template"]);
        this.compiled++;
        var base = this.ixer.findOne("ui template", { "ui template: template": template });
        if (!base) {
            console.warn("ui template " + template + " does not exist. Ignoring.");
            return undefined;
        }
        var attrs = elementToAttrs[template];
        var boundAttrs = elementToAttrBindings[template];
        var events = elementToEvents[template];
        // Handle meta properties
        var elem = { _template: template, ix: base["ui template: ix"] };
        // Handle static properties
        if (attrs) {
            for (var _i = 0; _i < attrs.length; _i++) {
                var _a = attrs[_i], prop = _a["ui attribute: property"], val = _a["ui attribute: value"];
                elem[prop] = val;
            }
        }
        // Handle bound properties
        if (boundAttrs) {
            // @FIXME: What do with source?
            for (var _b = 0; _b < boundAttrs.length; _b++) {
                var _c = boundAttrs[_b], prop = _c["ui attribute binding: property"], source = _c["ui attribute binding: source"], alias = _c["ui attribute binding: alias"];
                elem[prop] = this.getBoundValue(source, alias, bindingStack);
            }
        }
        // Attach event handlers
        if (events) {
            for (var _d = 0; _d < events.length; _d++) {
                var event_6 = events[_d]["ui event: event"];
                elem[event_6] = this.generateEventHandler(elem, event_6, bindingStack);
            }
        }
        // Compile children
        var children = elementToChildren[template] || [];
        var embeds = elementToEmbeds[template] || [];
        if (children.length || embeds.length) {
            elem.children = [];
            var childIx = 0, embedIx = 0;
            while (childIx < children.length || embedIx < embeds.length) {
                var child = children[childIx];
                var embed = embeds[embedIx];
                var add = void 0, constraints = {}, childBindingStack = bindingStack;
                if (!embed || child && child.ix <= embed.ix) {
                    add = children[childIx++]["ui template: template"];
                    // Resolve bound aliases into constraints
                    constraints = this.getBoundScope(bindingStack);
                }
                else {
                    add = embeds[embedIx++]["ui embed: template"];
                    for (var _e = 0, _f = embedToScope[embed["ui embed: embed"]] || []; _e < _f.length; _e++) {
                        var scope = _f[_e];
                        constraints[scope["ui embed scope: key"]] = scope["ui embed scope: value"];
                    }
                    for (var _g = 0, _h = embedToScopeBinding[embed["ui embed: embed"]] || []; _g < _h.length; _g++) {
                        var scope = _h[_g];
                        // @FIXME: What do about source?
                        var key = scope["ui embed scope binding: key"], source = scope["ui embed scope binding: source"], alias = scope["ui embed scope binding: alias"];
                        constraints[key] = this.getBoundValue(source, alias, bindingStack);
                    }
                    childBindingStack = [constraints];
                }
                elem.children.push.apply(elem.children, this._compileWrapper(add, elem.children.length, constraints, childBindingStack, depth + 1));
            }
        }
        if (this._tagCompilers[elem.t]) {
            try {
                this._tagCompilers[elem.t](elem);
            }
            catch (err) {
                console.warn("Failed to compile template: '" + template + "' due to '" + err + "' for element '" + JSON.stringify(elem) + "'");
                elem.t = "ui-error";
            }
        }
        return elem;
    };
    UIRenderer.prototype.getBoundFacts = function (query, constraints) {
        return this.ixer.find(query, constraints);
    };
    UIRenderer.prototype.getBoundScope = function (bindingStack) {
        var scope = {};
        for (var _i = 0; _i < bindingStack.length; _i++) {
            var fact = bindingStack[_i];
            for (var alias in fact)
                scope[alias] = fact[alias];
        }
        return scope;
    };
    //@FIXME: What do about source?
    UIRenderer.prototype.getBoundValue = function (source, alias, bindingStack) {
        for (var ix = bindingStack.length - 1; ix >= 0; ix--) {
            var fact = bindingStack[ix];
            if (source in fact && fact[alias])
                return fact[alias];
        }
    };
    UIRenderer.prototype.generateEventHandler = function (elem, event, bindingStack) {
        var template = elem["_template"];
        var memoKey = template + "::" + event;
        var attrKey = event + "::state";
        elem[attrKey] = this.getEventState(template, event, bindingStack);
        if (this._handlers[memoKey])
            return this._handlers[memoKey];
        var self = this;
        if (event === "change" || event === "input") {
            this._handlers[memoKey] = function (evt, elem) {
                var props = {};
                if (elem.t === "select" || elem.t === "input" || elem.t === "textarea")
                    props.value = evt.target.value;
                if (elem.type === "checkbox")
                    props.value = evt.target.checked;
                self.handleEvent(template, event, evt, elem, props);
            };
        }
        else {
            this._handlers[memoKey] = function (evt, elem) {
                self.handleEvent(template, event, evt, elem, {});
            };
        }
        return this._handlers[memoKey];
    };
    UIRenderer.prototype.handleEvent = function (template, eventName, event, elem, eventProps) {
        var attrKey = eventName + "::state";
        var state = elem[attrKey];
        var content = (_a = ["\n      # ", " ({is a: event})\n      ## Meta\n      event target: {event target: ", "}\n      event template: {event template: ", "}\n      event type: {event type: ", "}\n\n      ## State\n    "], _a.raw = ["\n      # ", " ({is a: event})\n      ## Meta\n      event target: {event target: ", "}\n      event template: {event template: ", "}\n      event type: {event type: ", "}\n\n      ## State\n    "], utils_1.unpad(6)(_a, eventName, elem.id, template, eventName));
        if (state["*event*"]) {
            for (var prop in state["*event*"])
                content += prop + ": {" + prop + ": " + eventProps[state["*event*"][prop]] + "}\n";
        }
        for (var prop in state) {
            if (prop === "*event*")
                continue;
            content += prop + ": {" + prop + ": " + state[prop] + "}\n";
        }
        var changeset = this.ixer.diff();
        var raw = utils_1.uuid();
        var entity = eventName + " event " + raw.slice(-12);
        changeset.add("builtin entity", { entity: entity, content: content });
        this.ixer.applyDiff(changeset);
        console.log(entity);
        var _a;
    };
    UIRenderer.prototype.getEventState = function (template, event, bindingStack) {
        var state = {};
        var staticAttrs = this.ixer.find("ui event state", { "ui event state: template": template, "ui event state: event": event });
        for (var _i = 0; _i < staticAttrs.length; _i++) {
            var _a = staticAttrs[_i], key = _a["ui event state: key"], val = _a["ui event state: value"];
            state[key] = val;
        }
        var boundAttrs = this.ixer.find("ui event state binding", { "ui event state binding: template": template, "ui event state binding: event": event });
        for (var _b = 0; _b < boundAttrs.length; _b++) {
            var _c = boundAttrs[_b], key = _c["ui event state binding: key"], source = _c["ui event state binding: source"], alias = _c["ui event state binding: alias"];
            if (source === "*event*") {
                state["*event*"] = state["*event*"] || {};
                state["*event*"][key] = alias;
            }
            else {
                state[key] = this.getBoundValue(source, alias, bindingStack);
            }
        }
        return state;
    };
    return UIRenderer;
})();
exports.UIRenderer = UIRenderer;
if (this.window)
    window["uiRenderer"] = exports;

},{"./runtime":6,"./utils":8}],8:[function(require,module,exports){
var uuid_1 = require("../vendor/uuid");
exports.uuid = uuid_1.v4;
exports.ENV = "browser";
try {
    window;
    window["utils"] = exports;
}
catch (err) {
    exports.ENV = "node";
}
exports.DEBUG = {};
if (exports.ENV === "browser")
    window["DEBUG"] = exports.DEBUG;
function builtinId(name) {
    return "AUTOGENERATED " + name + " THIS SHOULDN'T SHOW UP ANYWHERE";
}
exports.builtinId = builtinId;
exports.unpad = function (indent) {
    if (exports.unpad.memo[indent])
        return exports.unpad.memo[indent];
    return exports.unpad.memo[indent] = function (strings) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        if (!strings.length)
            return;
        var res = "";
        var ix = 0;
        for (var _a = 0; _a < strings.length; _a++) {
            var str = strings[_a];
            res += str + (values.length > ix ? values[ix++] : "");
        }
        if (res[0] === "\n")
            res = res.slice(1);
        var charIx = 0;
        while (true) {
            res = res.slice(0, charIx) + res.slice(charIx + indent);
            charIx = res.indexOf("\n", charIx) + 1;
            if (!charIx)
                break;
        }
        return res;
    };
};
exports.unpad.memo = {};
function repeat(str, length) {
    var len = length / str.length;
    var res = "";
    for (var ix = 0; ix < len; ix++)
        res += str;
    return (res.length > length) ? res.slice(0, length) : res;
}
exports.repeat = repeat;
function underline(startIx, length) {
    return repeat(" ", startIx) + "^" + repeat("~", length - 1);
}
exports.underline = underline;
function capitalize(word) {
    return word[0].toUpperCase() + word.slice(1);
}
exports.capitalize = capitalize;
function titlecase(name) {
    return name.split(" ").map(capitalize).join(" ");
}
exports.titlecase = titlecase;
var _slugifyReplacements = {
    "-": "dash",
    "_": "under",
    "$": "dollar",
    "&": "and",
    "+": "plus",
    ",": "comma",
    "/": "slash",
    ":": "colon",
    ";": "semicolon",
    "=": "equals",
    "?": "question",
    "@": "at",
    "<": "lt",
    ">": "gt",
    "#": "hash",
    "%": "percent",
    "{": "opencurly",
    "}": "closecurly",
    "|": "pipe",
    "\\": "whack",
    "^": "caret",
    "~": "tilde",
    "[": "openbracket",
    "]": "closebracket",
    "`": "grave"
};
var _deslugifyReplacements = {};
for (var char in _slugifyReplacements) {
    _deslugifyReplacements[_slugifyReplacements[char]] = char;
}
// Slugify encodes a uri component in a fairly human readable fashion
function slugify(text) {
    var url = "";
    for (var _i = 0; _i < text.length; _i++) {
        var char = text[_i];
        var replacement = _slugifyReplacements[char];
        if (char === " ") {
            url += "_";
        }
        else if (replacement) {
            url += "-'" + replacement + "-";
        }
        else {
            url += char;
        }
    }
    return encodeURIComponent(url);
}
exports.slugify = slugify;
function deslugify(url) {
    var text = [];
    for (var _i = 0, _a = url.split("_"); _i < _a.length; _i++) {
        var word = _a[_i];
        if (word.indexOf("-") === -1) {
            text.push(word);
            continue;
        }
        var replaced = "";
        var tokens = word.split("-");
        replaced += tokens.shift();
        var tail_1 = tokens.pop();
        for (var _b = 0; _b < tokens.length; _b++) {
            var token = tokens[_b];
            var replacement = _deslugifyReplacements[token.slice(1)];
            if (replacement && token.indexOf("'") === 0) {
                replaced += replacement;
            }
            else {
                replaced += token;
            }
        }
        replaced += tail_1;
        text.push(replaced);
    }
    return decodeURIComponent(text.join(" "));
}
exports.deslugify = deslugify;
exports.string = {
    unpad: exports.unpad,
    repeat: repeat,
    underline: underline,
    capitalize: capitalize,
    titlecase: titlecase,
    slugify: slugify,
    deslugify: deslugify
};
function tail(arr) {
    return arr[arr.length - 1];
}
exports.tail = tail;
exports.array = {
    tail: tail
};
function coerceInput(input) {
    // http://jsperf.com/regex-vs-plus-coercion
    if (!isNaN(+input))
        return +input;
    else if (input === "true")
        return true;
    else if (input === "false")
        return false;
    return input;
}
exports.coerceInput = coerceInput;
// Shallow copy the given object.
function copy(obj) {
    if (!obj || typeof obj !== "object")
        return obj;
    if (obj instanceof Array)
        return obj.slice();
    var res = {};
    for (var key in obj)
        res[key] = obj[key];
    return res;
}
exports.copy = copy;
function mergeObject(root, obj) {
    for (var key in obj) {
        root[key] = obj[key];
    }
    return root;
}
exports.mergeObject = mergeObject;
function autoFocus(node, elem) {
    if (!node.focused) {
        node.focused = true;
        node.focus();
    }
}
exports.autoFocus = autoFocus;
exports.KEYS = {
    ESC: 27,
    ENTER: 13,
    UP: 38,
    DOWN: 40,
    BACKSPACE: 8,
    "]": 221,
};
// FROM: http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
function setEndOfContentEditable(contentEditableElement) {
    var range, selection;
    if (document.createRange) {
        range = document.createRange(); //Create a range (a range is a like the selection but invisible)
        range.selectNodeContents(contentEditableElement); //Select the entire contents of the element with the range
        range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
        selection = window.getSelection(); //get the selection object (allows you to change selection)
        selection.removeAllRanges(); //remove any selections already made
        selection.addRange(range); //make the range you have just created the visible selection
    }
}
exports.setEndOfContentEditable = setEndOfContentEditable;
// LCG courtesy of <https://gist.github.com/Protonk/5389384>
function srand(z) {
    var m = Math.pow(2, 24), a = 16598013, c = 12820163;
    return function () { return z = (a * z + c) % m / m; };
}
exports.srand = srand;
// Shuffle courtesy of <http://stackoverflow.com/a/6274381>
function shuffle(o, rand) {
    if (rand === void 0) { rand = Math.random; }
    for (var j, x, i = o.length; i; j = Math.floor(rand() * i), x = o[--i], o[i] = o[j], o[j] = x)
        ;
    return o;
}
exports.shuffle = shuffle;
function sortByField(field) {
    return function (a, b) {
        return (a[field] === b[field]) ? 0 :
            (a[field] > b[field]) ? -1 :
                (a[field] < b[field]) ? 1 :
                    (a[field] === undefined) ? 1 : -1;
    };
}
exports.sortByField = sortByField;
function sortByLookup(lookup) {
    return function (a, b) {
        return (lookup[a] === lookup[b]) ? 0 :
            (lookup[a] > lookup[b]) ? -1 :
                (lookup[a] < lookup[b]) ? 1 :
                    (lookup[a] === undefined) ? 1 : -1;
    };
}
exports.sortByLookup = sortByLookup;
function location() {
    return window.location.hash.slice(1);
}
exports.location = location;

},{"../vendor/uuid":11}],9:[function(require,module,exports){
var app = require("../src/app");
var nlqp = require("../src/NLQueryParser");
var bootstrap = require("../src/bootstrap");
var dslparser = require("../src/parser");
var app_1 = require("../src/app");
// @HACK needed because browserify is being too clever by
// optimizing away unused code
var boostrapIxer = bootstrap.ixer;
app.renderRoots["nlqp"];
nlqp.debug = true;
function parseTest(queryString, n) {
    var parseResult;
    var avgTime = 0;
    var maxTime = 0;
    var minTime;
    var preTags = nlqp.preprocessQueryString(queryString);
    var pretagsToString = preTags.map(function (pt) { return ("(" + pt.text + "|" + pt.tag + ")"); }).join("");
    // Parse string and measure how long it takes
    for (var i = 0; i < n; i++) {
        var start = performance.now();
        parseResult = nlqp.parse(queryString)[0];
        var stop = performance.now();
        avgTime += stop - start;
        if (stop - start > maxTime) {
            maxTime = stop - start;
        }
        if (minTime === undefined) {
            minTime = stop - start;
        }
        else if (stop - start < minTime) {
            minTime = stop - start;
        }
    }
    // Display result
    var tokenStrings = nlqp.tokenArrayToString(parseResult.tokens);
    var timingDisplay = "Timing (avg, max, min): " + (avgTime / n).toFixed(2) + " | " + maxTime.toFixed(2) + " | " + minTime.toFixed(2) + " ";
    console.log(queryString);
    console.log(pretagsToString);
    console.log("State: " + nlqp.StateFlags[parseResult.state]);
    console.log(parseResult.context);
    console.log("-------------------------------------------------------------------------------------------");
    console.log("Tokens");
    console.log(tokenStrings);
    console.log("-------------------------------------------------------------------------------------------");
    console.log("Tree");
    console.log(parseResult.tree.toString());
    console.log("-------------------------------------------------------------------------------------------");
    console.log("Query");
    console.log("-------------------------------------------------------------------------------------------");
    console.log("Result");
    console.log(queryString);
    console.log(executeQuery(parseResult.query).join("\n"));
    console.log("-------------------------------------------------------------------------------------------");
    console.log(timingDisplay);
    console.log("===========================================================================================");
    return parseResult.state;
}
function executeQuery(query) {
    var resultsString = [];
    if (query.projects.length !== 0) {
        var queryString = query.toString();
        console.log(queryString);
        var artifacts = dslparser.parseDSL(queryString);
        var changeset = app_1.eve.diff();
        var results = [];
        for (var id in artifacts.views) {
            app_1.eve.asView(artifacts.views[id]);
        }
        for (var id in artifacts.views) {
            results.push(artifacts.views[id].exec());
        }
        console.log(results);
        results.forEach(function (result) {
            var projected = result.results;
            if (projected.length === 0) {
                return;
            }
            // Get each cell as a string
            var colWidths = [];
            var keys = Object.keys(projected[0]);
            keys.forEach(function (key) { colWidths.push(key.length); });
            var rows = projected.map(function (row) {
                var rowstring = keys.map(function (key, i) {
                    if (key === "__id") {
                        return "";
                    }
                    var value = "" + row[key];
                    var display = app_1.eve.findOne("display name", { id: value });
                    if (display !== undefined) {
                        value = display.name;
                    }
                    // Get the width of each row
                    if (colWidths[i] < value.length) {
                        colWidths[i] = value.length;
                    }
                    return value;
                });
                return rowstring;
            });
            // Turn rows into row strings
            var rowStrings = rows.map(function (row) {
                row = row.map(function (cell, i) {
                    var whitespace = Array(colWidths[i] - cell.length + 1).join(" ");
                    cell += whitespace;
                    return cell;
                });
                return "| " + row.join(" | ");
            });
            // Add a table header
            var tableHeader = "| " + keys.map(function (key, i) {
                if (key === "__id") {
                    return "";
                }
                var whitespace = Array(colWidths[i] - key.length + 1).join(" ");
                return key.toUpperCase() + whitespace;
            }).join(" | ");
            var divider = Array(tableHeader.length).join("-");
            var resultTable = divider += "\n" + tableHeader + "\n" + divider + "\n" + rowStrings.join("\n") + "\n" + divider;
            resultsString.push(resultTable);
        });
    }
    return resultsString;
}
var n = 1;
var phrases = [
    // -------------------------------
    // These are queries that we had problems with in the past
    // make sure they always work
    // -------------------------------
    "Grognar the Barbarian's sword"
];
/*
let siriphrases = [
  "Find videos I took at Iva's birthday party",
  "Find pics from my trip to Aspen in 2014",
  "Find a table for four people tonight in Chicago",
  "Find a table for four tonight in Chicago",
  "How is the weather tomorrow?",
  "Wake me up at 7AM tomorrow",
  "Move my 2PM meeting to 2:30",
  "Do I have any new texts from Rick?",
  "Show my selfies from New Year's Eve",
  "Call Dad at work",
  "Aiesha Turner is my mom",
  "Read my latest email",
  "Text peet 'See you soon smiley exlamation point'",
  "What is trending on Twitter?",
  "Call back my last missed call.",
  "Where is Brian?",
  "Find tweets with the hashtag BayBridge",
  "Read my last message from Andrew",
  "Do I have any new voicemail?",
  "FaceTime Sarah",
  "Redial that last number",
  "Play the last voicemail from Aaron",
  "When did Ingrid call me?",
  "Get my call history",
  "Mark the third one complete",
  "Add Greg to my 2:30 meeting on Thursday",
  "Remind me about this email Friday at noon", // noon should be a quantity
  "Create a new list called Groceries", // why isn't a|DT includeded in "a new list"
  "Where is my next meeting?", // How can we make meeting a noun?
  "Set an alarm for 9 AM every Friday", // AM needs to be special cased to attach to 9
  "Cancel my meetings on Friday", // Cancel needs to be a verb
  "Turn off all my alarms",
  "Add brussels sprouts to my grocery list",
  "Remind me to pay Noah back tomorrow morning",
  // Sports
  "When is the next Mavericks home game?",
  "Who is the quarterback for Dallas?",
  "Who has the most RBIs",
  "Who won the NBA finals?",
  "Where is Wrigley Field?",
  "How many regular-season games does each NBA team play?",
  "When is the LA Galaxy's next home game?",
  "Who do the Chicago Cubs play on September 21?", // 21 needs to merge with September
  "When does the football season start?",
  "What hockey teams play today?",
  "Did the Chicago cubs win on Thursday?",
  // Entertainment
  "Play Third Eye Blind's new album",
  "Play more like this",
  "Play the number one song right now", // Needs help with noun grouping tag accuracy
  "What song is playing right now?", // right now is problematic
  "What movies are playing today?",
  "Where is Unbroken playing around here?", // playing around here is problematic
  "I like this song",
  "What are some PG movies playing this afternoon",
  "Who sings this?", // tags are all wrong, heuristics don't help it
  "I want to hear the live version of this song",
  "Play only songs by Nicki Minaj",
  "What won best picture in 2000?",
  "How are the ratings for The Boxtrolls?",
  "Who directed A Perfect World?",
  "Do people like The Theory of Everything?",
  // Out and about (aka Foursquare queries)
  "Where is a good Indian place around here?", // "place around here" is tagged wrong, heuristics don't help
  "I am running low on gas",
  "What time does Whole Foods close?",
  "Give me public transit direction to the De Young Museum", // Public is tagged a verb
  "Where is a good inexpensive place to eat around here?", // "To eat aroung here" is not recognized
  "Make a reservation at a romantic restaurant tonight at 7PM",
  "Find a happy hour nearby", // nearby should be an adverb?
  "Find coffee near me",
  "What planes are flying above me?", // Tags are all wrong: planes is a verb, flying is an adverb
  "I need some aspirin",
  "How are the reviews for Long Bridge Pizza in San Francisco?",
  "Where is a good hair salon?",
  "What's the best retaurant in San Francisco?",
  "I need a good electrician",
  "Where am I?",
  "What is my ETA?",
  // Homekit
  "Turn the lights blue",
  "Turn off the radio", // "off" should be a particle
  "Turn off the printer in the office", // "off" should be a particle
  "Lock the front door", // front is classified a noun, should be an adhective
  "Set the brightness of the downstairs lights to 50%",
  "Set the Tahoe house to 72 degrees", // house is a verb
  "Turn off Chloe's light", // "off" should be a particle
  "Turn the living room lights all the way up", // lights is a verb
  "Turn on the bathroom heater",
  // Getting answers
  "Do I need an umbrella today?",
  "How is the Nikkei doing?",
  "When is daylight saving time?",
  "What is the definition of pragmatic?", // "pragmatic is an adjective"
  "What's the latest in San Francisco?",
  "Did the groundhog see its shadow?",
  "When is sunset in Paris", // sunset should be a noun
  "What is the population of Jamaica?",
  "What is the square root of 128?",
  "What is 40 degrees Farenheit in Celsius", // Here is an example where the proper noun combining heuristic fails
  "What is the temperature outside?", // outside is a preposition
  "What time is it in Berlin",
  "When was Abraham Lincoln born?", // This will get Abraham Lincoln, but we need to use "when" and "born" to figure out a date is expected
  "Show me the Orion constellation",
  "What's the high for Anchorage on Thursday?", // This breaks noun combining heuristic
  "How many dollars is 45 Euros",
  "What day is it?",
  "How many calories in a bagel?",
  "What is Apple's P/E ratio?",
  "Compare AAPL and NASDAQ",
  "How humid is it in New York right now", // Heuristics mess up tagging, "is" is a noun in order to use "humid" as an adjective
  "What's an 18% tip on $85?",
  "What is the UV index outside?",
  "How many cups in a liter",
  "Is it going to snow next week?",
];
*/
app.init("nlqp", function () {
    console.log("Running " + phrases.length + " tests...");
    console.log("===========================================================================================");
    var queryStates = phrases.map(function (phrase) { return parseTest(phrase, n); });
    var complete = queryStates.filter(function (state) { return state === nlqp.StateFlags.COMPLETE; }).length;
    var moreinfo = queryStates.filter(function (state) { return state === nlqp.StateFlags.MOREINFO; }).length;
    var noresult = queryStates.filter(function (state) { return state === nlqp.StateFlags.NORESULT; }).length;
    console.log("===========================================================================================");
    console.log("Total Queries: " + phrases.length + " | Complete: " + complete + " | MoreInfo: " + moreinfo + " | NoResult: " + noresult);
    console.log("===========================================================================================");
});

},{"../src/NLQueryParser":1,"../src/app":2,"../src/bootstrap":3,"../src/parser":5}],10:[function(require,module,exports){

},{}],11:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(_global.require) == 'function') {
    try {
      var _rb = _global.require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}).call(this);

},{}]},{},[9,10])