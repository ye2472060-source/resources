// 修复 html: 后首行以 +' 开头的问题（一元加号导致 NaN）
const fs = require('fs');
const files = ['p04_s1.html','p05_s2.html','p06_s3.html','p07_s4.html','p08_s5a.html','p09_s5b.html','p10_s6.html','p11_s7.html','p12_s8.html'];
let total = 0;
files.forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  const re = /html:\n(\s*)\+'/g;
  const before = (s.match(re) || []).length;
  s = s.replace(re, 'html:\n$1\'');
  fs.writeFileSync(f, s);
  total += before;
  console.log(f, '修复', before, '处');
});
console.log('合计修复:', total);
