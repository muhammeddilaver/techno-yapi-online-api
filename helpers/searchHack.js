export const makeCaseInsensitiveRegexPattern = (keyword) => {
    keyword = decodeURIComponent(keyword);
    return keyword
        .split("")
        .map((char) => {
            if (char === "c" || char === "ç" || char === "C" || char === "Ç") {
                return "[cCçÇ]";
            }
            if (char === "ı" || char === "i" || char === "I" || char === "İ") {
                return "[ıIiİ]";
            }
            if (char === "u" || char === "ü" || char === "U" || char === "Ü") {
                return "[uUüÜ]";
            }
            if (char === "o" || char === "ö" || char === "O" || char === "Ö") {
                return "[oOöÖ]";
            }
            if (char === "s" || char === "ş" || char === "S" || char === "Ş") {
                return "[sSşŞ]";
            }
            if (char === ".") {
                return "\\.";
            } else {
                return char;
            }
        })
        .join("");
};

/* 
export const makeCaseInsensitiveRegexPattern = (keyword) => {
    keyword = decodeURIComponent(keyword);
    return keyword
        .split("")
        .map((char) => {
            if (char === "c" || char === "ç") {
                return "[cCçC]";
            }
            if (char === "ı" || char === "i") {
                return "[iİıI]";
            }
            if (char === "u" || char === "ü") {
                return "[uUüÜ]";
            }
            if (char === "o" || char === "ö") {
                return "[oOöÖ]";
            }
            if (char === "s" || char === "ş") {
                return "[sSşŞ]";
            }
            if (char === ".") {
                return "\\.";
            } else {
                return `[${char}${char.toUpperCase()}]`;
            }
        })
        .join("");
}; */
