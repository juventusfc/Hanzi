#!/usr/bin/env node

/**
 * 数据结构验证脚本
 * 用于验证 data.js 中的汉字演化数据是否符合规范
 */

const fs = require('fs');
const path = require('path');

// 读取并解析 data.js
function loadData() {
  const dataPath = path.join(__dirname, '..', 'data.js');
  const content = fs.readFileSync(dataPath, 'utf-8');

  // 提取 HANZI_DATA 对象
  const match = content.match(/const HANZI_DATA = ({[\s\S]*});/);
  if (!match) {
    console.error('❌ 无法找到 HANZI_DATA 对象');
    process.exit(1);
  }

  try {
    return eval(`(${match[1]})`);
  } catch (e) {
    console.error('❌ 解析 data.js 失败:', e.message);
    process.exit(1);
  }
}

// 验证单个汉字数据
function validateHanzi(char, data) {
  const errors = [];

  // 检查必需字段
  const requiredFields = ['char', 'oracle', 'bronze', 'seal', 'regular', 'meaning'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`缺少字段: ${field}`);
    }
  }

  // 检查 char 字段是否匹配
  if (data.char !== char) {
    errors.push(`char 字段 "${data.char}" 与键名 "${char}" 不匹配`);
  }

  // 检查四个字形阶段
  const stages = ['oracle', 'bronze', 'seal', 'regular'];
  for (const stage of stages) {
    const stageData = data[stage];
    if (!stageData) continue;

    if (stage === 'regular') {
      // 楷书需要 char 字段
      if (!stageData.char) {
        errors.push(`${stage} 缺少 char 字段`);
      }
    } else {
      // 其他阶段需要 svg 字段
      if (!stageData.svg) {
        errors.push(`${stage} 缺少 svg 字段`);
      }
    }

    // 所有阶段都需要 desc 字段
    if (!stageData.desc) {
      errors.push(`${stage} 缺少 desc 字段`);
    }
  }

  // 检查 meaning 字段
  if (!data.meaning || data.meaning.trim().length === 0) {
    errors.push('meaning 字段为空');
  }

  return errors;
}

// 主验证函数
function validate() {
  console.log('🔍 开始验证 data.js...\n');

  const data = loadData();
  const chars = Object.keys(data);

  if (chars.length === 0) {
    console.error('❌ HANZI_DATA 为空');
    process.exit(1);
  }

  console.log(`📊 找到 ${chars.length} 个汉字\n`);

  let totalErrors = 0;
  const errorDetails = {};

  for (const char of chars) {
    const errors = validateHanzi(char, data[char]);
    if (errors.length > 0) {
      totalErrors += errors.length;
      errorDetails[char] = errors;
    }
  }

  // 输出结果
  if (totalErrors === 0) {
    console.log('✅ 所有汉字数据验证通过！');
    console.log(`\n收录汉字列表: ${chars.join('、')}`);
    process.exit(0);
  } else {
    console.error(`❌ 发现 ${totalErrors} 个错误：\n`);

    for (const [char, errors] of Object.entries(errorDetails)) {
      console.error(`汉字 "${char}":`);
      errors.forEach(err => console.error(`  - ${err}`));
      console.error('');
    }

    process.exit(1);
  }
}

// 运行验证
validate();
