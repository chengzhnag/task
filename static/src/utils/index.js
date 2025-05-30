/**
 * 生成指定长度的随机 UUID（十六进制）
 * @param {number} length - 期望生成的 UUID 长度（必须为正整数）
 * @returns {string} - 生成的随机 UUID 字符串
 */
export function generateUUID(length) {
  if (typeof length !== 'number' || length <= 0 || !Number.isInteger(length)) {
    throw new Error("Length must be a positive integer.");
  }

  const array = new Uint8Array(Math.ceil(length / 2)); // 每个字节生成两位十六进制字符
  window.crypto.getRandomValues(array); // 生成安全随机字节

  let result = '';
  for (const byte of array) {
    result += byte.toString(16).padStart(2, '0'); // 转换为两位十六进制字符串
  }

  return result.slice(0, length); // 截取指定长度
}