/**
 * Returns a randomly generated string containing characters from the set [0-9a-zA-Z] with the given length.
 *
 * @param {number} length - the length of the generated string.
 * @returns {string} - the randomly generated string.
 */
function randomstring(length: number = 10) {
    let result = '';
    const randomchar = () => {
        const n = Math.floor(Math.random() * 62);
        if (n < 10)
            return n; // 0-9
        if (n < 36)
            return String.fromCharCode(n + 55); // A-Z
        return String.fromCharCode(n + 61); // a-z
    };
    while (result.length < length)
        result += randomchar();
    return result;
}

export {randomstring};
