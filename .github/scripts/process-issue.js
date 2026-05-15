#!/usr/bin/env node

/**
 * AI Issue 处理脚本 - 使用 Anthropic SDK
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

// 环境变量
const API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = process.env.ANTHROPIC_BASE_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE || '';
const ISSUE_BODY = process.env.ISSUE_BODY || '';
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

// 初始化 Anthropic 客户端
const client = new Anthropic({
  apiKey: API_KEY,
  baseURL: BASE_URL
});

// 读取文件
function readFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf-8');
  }
  return '';
}

// 写入文件
function writeFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// 执行命令
function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    throw new Error(`命令失败: ${error.message}`);
  }
}

// HTTPS POST 请求
async function httpsPost(url, body) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Bot'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`GitHub API 错误: ${response.status}`);
  }

  return response.json();
}

// 解析 AI 响应中的代码块
function extractCodeBlocks(response) {
  const files = {};
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockPattern.exec(response)) !== null) {
    const lang = match[1] || '';
    const content = match[2].trim();

    // 根据 language 或内容判断文件类型
    if (lang === 'javascript' || content.includes('HANZI_DATA')) {
      files['data.js'] = content;
    }
  }

  return files;
}

// 主函数
async function main() {
  try {
    console.log('🤖 开始处理 Issue...');

    // 读取项目文件
    const claudeMd = readFile('CLAUDE.md');
    const dataJs = readFile('data.js');

    console.log('📤 调用 AI...');

    // 调用 AI
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: `你是汉字演化查询网站的 AI 助手。

【项目规范】
${claudeMd}

【当前 data.js 完整内容】
\`\`\`javascript
${dataJs}
\`\`\`

请分析用户需求并生成代码。输出格式：
1. 如果需要修改 data.js，使用 \`\`\`javascript 代码块输出完整内容
2. 确保保留所有已有汉字数据
3. 新增汉字参考已有格式，生成合理的 SVG 路径和描述`,
      messages: [{
        role: 'user',
        content: `处理 GitHub Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}\n\n内容:\n${ISSUE_BODY}\n\n请生成修改后的 data.js 完整内容。`
      }]
    });

    const aiResponse = msg.content[0].text;
    console.log('📥 AI 响应长度:', aiResponse.length);

    // 提取代码块
    const files = extractCodeBlocks(aiResponse);
    console.log('📋 解析到的文件:', Object.keys(files));

    if (!files['data.js']) {
      throw new Error('AI 未生成 data.js 内容');
    }

    // 创建分支
    const branchName = `ai/issue-${ISSUE_NUMBER}-${Date.now()}`;
    console.log('🌿 创建分支:', branchName);
    execCommand('git config user.name "AI Bot"');
    execCommand('git config user.email "ai-bot@github.com"');
    execCommand(`git checkout -b ${branchName}`);

    // 写入文件
    console.log('📝 写入文件: data.js');
    writeFile('data.js', files['data.js']);

    // 运行测试
    console.log('🧪 运行测试...');
    try {
      execCommand('node tests/validate-data.js');
      console.log('✅ 测试通过');
    } catch (error) {
      await httpsPost(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
        { body: `❌ 测试失败：\n\`\`\`\n${error.message}\n\`\`\`` }
      );
      throw error;
    }

    // 提交
    const commitMsg = `feat: ${ISSUE_TITLE.replace('[用户反馈] ', '').trim()}`;
    console.log('✅ 提交:', commitMsg);
    execCommand('git add -A');
    execCommand(`git commit -m "${commitMsg}"`);

    // 推送
    console.log('📤 推送分支...');
    execCommand(`git push -u origin ${branchName}`);

    // 创建 PR
    console.log('🔀 创建 PR...');
    const pr = await httpsPost(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        title: commitMsg,
        body: `自动处理 Issue #${ISSUE_NUMBER}\n\nCloses #${ISSUE_NUMBER}`,
        head: branchName,
        base: 'main'
      }
    );

    console.log('✅ PR 创建成功:', pr.html_url);

    // 评论
    await httpsPost(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
      {
        body: `✅ AI 处理完成！

**分支**: ${branchName}
**PR**: ${pr.html_url}

请 review 后合并。`
      }
    );

    console.log('🎉 完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    try {
      await httpsPost(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
        { body: `❌ 处理失败：\n\`\`\`\n${error.message}\n\`\`\`` }
      );
    } catch (e) {}
    process.exit(1);
  }
}

main();
