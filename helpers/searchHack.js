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
};
