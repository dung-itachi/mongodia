/**
 * Fix the bad key on line 1980 that has unescaped quotes
 */
const fs = require('fs');
const path = require('path');
const i18nPath = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const lines = content.split('\n');
// Line index 1979 is line 1980 in the file
if (lines[1979] && lines[1979].includes('Phone phải là 6-11 chữ số liên tục')) {
  // Replace it with a simpler key
  lines[1979] = '  "Phone phải là 6-11 chữ số liên tục": "Phone must be 6-11 continuous digits",';
  console.log('Fixed line 1980');
}

// Also fix the MN version on line 4096
if (lines[4095] && lines[4095].includes('Phone phải là 6-11 chữ số liên tục')) {
  lines[4095] = '  "Phone phải là 6-11 chữ số liên tục": "Утас нь 6-11 оронтой дараалсан тоо байх ёстой",';
  console.log('Fixed line 4096');
}

content = lines.join('\n');
fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Done');
