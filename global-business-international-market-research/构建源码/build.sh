#!/bin/bash
# 构建脚本：按正确顺序组装，并为无 script 标签的内容文件添加包裹
set -e
cd "F:/个人想法实践记录-项目制-agent产出/_build_gbmr"
OUT="../global_business_market_research.html"
TMP="_tmp_wrap.html"

# 需要包裹的文件（纯 JS 数据，无 script 标签）
WRAP_LIST="p04_s1.html p05_s2.html p06_s3.html p07_s4.html p08_s5a.html p09_s5b.html p10_s6.html p11_s7.html p12_s8.html"

# 1. 头部
cat p01_head.html > "$OUT"

# 2. 核心引擎（声明 STAGES/MODULES/GLOSSARY/SOURCES/TOOLS 与全部渲染逻辑）
cat p03_core.js >> "$OUT"
echo "" >> "$OUT"

# 3. 阶段数据
cat p02_stages.html >> "$OUT"
echo "" >> "$OUT"

# 4. 内容模块（逐个包裹 script）
for f in $WRAP_LIST; do
  echo "<script>" >> "$OUT"
  cat "$f" >> "$OUT"
  echo "</script>" >> "$OUT"
  echo "" >> "$OUT"
done

# 5. 工具
cat p13_tools.js >> "$OUT"
echo "" >> "$OUT"

# 6. 术语词典
cat p14_glossary.js >> "$OUT"
echo "" >> "$OUT"

# 7. 来源与数据库
cat p15_sources.js >> "$OUT"
echo "" >> "$OUT"

# 8. 初始化与收尾
cat p16_foot.html >> "$OUT"

echo "构建完成: $OUT"
ls -la "$OUT"
grep -c '<script>' "$OUT" | xargs echo "script 开始标签数:"
grep -c '</script>' "$OUT" | xargs echo "script 结束标签数:"
