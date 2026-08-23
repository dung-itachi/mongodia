/**
 * Add additional warning translation keys for Marketing Input
 */
const fs = require('fs');
const path = require('path');
const i18nPath = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const newKeys = [
  ['trong dữ liệu KHÔNG khớp sản phẩm đang chọn', 'in data does NOT match selected product', 'өгөгдөлд сонгосон бүтээгдэхүүн таарахгүй'],
  ['trong dữ liệu KHÔNG khớp combo đang chọn', 'in data does NOT match selected combo', 'өгөгдөлд сонгосон комбо таарахгүй'],
  ['thuộc sản phẩm', 'belongs to product', 'харьяалагдах бүтээгдэхүүн'],
  ['KHÔNG khớp sản phẩm đang chọn', 'does NOT match selected product', 'сонгосон бүтээгдэхүүн таарахгүй'],
  ['Nếu paste từ nguồn không có tab, hệ thống sẽ tự tìm phone bằng regex — đảm бảo có ít nhất 1 chuỗi số điện thoại rõ ràng trong dòng.', 'If pasting from source without tab, system will auto-find phone by regex — ensure at least 1 clear phone number in the line.', 'Хэрэв tab-гүй эх сурвалжаас буулгаж байгаа бол систем regex ашиглан утас хайж олох болно — мөрөнд дор хаяж 1 тодорхой утасны дугаар байгаа эсэхийг шалгаарай.'],
];

function addKey(content, lang, vi, value) {
  const langKey = `${lang}: {`;
  const langStart = content.indexOf(langKey);
  if (langStart === -1) return content;
  const blockStart = content.indexOf('{', langStart) + 1;
  let depth = 1;
  let i = blockStart;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const blockEnd = i - 1;
  const beforeInsert = content.substring(0, blockEnd);
  const lastNewline = beforeInsert.lastIndexOf('\n');
  const indentLine = beforeInsert.substring(lastNewline + 1);
  const indentMatch = indentLine.match(/^(\s*)/);
  const baseIndent = indentMatch ? indentMatch[1] : '    ';
  const escapedKey = vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`"${escapedKey}":\\s*"`, 'g');
  const blockContent = content.substring(blockStart, blockEnd);
  if (keyRegex.test(blockContent)) {
    console.log(`[${lang}] Skipping existing: "${vi}"`);
    return content;
  }
  const insertion = `\n${baseIndent}"${vi}": "${value.replace(/"/g, '\\"')}",`;
  return content.substring(0, blockEnd) + insertion + content.substring(blockEnd);
}

let enCount = 0, mnCount = 0;
for (const [vi, en, mn] of newKeys) {
  const before = content;
  content = addKey(content, 'en', vi, en);
  if (content !== before) enCount++;
  const before2 = content;
  content = addKey(content, 'mn', vi, mn);
  if (content !== before2) mnCount++;
}

fs.writeFileSync(i18nPath, content, 'utf8');
console.log(`Added ${enCount} keys to en, ${mnCount} keys to mn.`);
