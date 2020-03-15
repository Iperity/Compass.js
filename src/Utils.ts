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

/**
 * Encode unicode string to base64
 * SOURCE: https://stackoverflow.com/a/52647441
 * @param str - input string
 * @returns {string} - base64 string
 */
function b64EncodeUnicode(str: string) {
  // first we use encodeURIComponent to get percent-encoded UTF-8,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(Number(`0x${p1}`));
    }),
  );
}

export { randomstring, b64EncodeUnicode };
