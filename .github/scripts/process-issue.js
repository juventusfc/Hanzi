#!/usr/bin/env node

/**
 * AI Issue 处理脚本
 * 使用智谱 GLM API 处理 GitHub Issue
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const https = require('https');

// 环境变量
const API_KEY = process.env.ZHIPU_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE || '';
const ISSUE_BODY = process.env.ISSUE_BODY || '';
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

// 智谱 API 配置
const ZHIPU_API_HOST = 'open.bigmodel.cn';
const ZHIPU_API_PATH = '/api/paas/v4/chat/completions';

// HTTPS 请求封装
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`API 返回错误: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(new Error(`解析响应失败: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 调用智谱 API
async function callZhipuAI(messages) {
  const options = {
    hostname: ZHIPU_API_HOST,
    port: 443,
    path: ZHIPU_API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  };

  const data = {
    model: 'glm-4-flash',
    messages: messages,
    temperature: 0.7,
    max_tokens: 4000
  };

  const response = await httpsRequest(options, data);
  return response.choices[0].message.content;
}

// HTTPS POST 请求（用于 GitHub API）
function httpsPost(url, body) {
  const urlObj = new URL(url);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Bot'
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`GitHub API 错误: ${res.statusCode} - ${responseBody}`));
          }
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// 读取文件内容
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
function execCommand(command, args = []) {
  try {
    return execSync(`${command} ${args.join(' ')}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`命令失败: ${error.message}`);
  }
}

// 解析 AI 响应
function parseAIResponse(response) {
  const result = {
    files: {},
    commitMessage: '',
    prTitle: '',
    prBody: ''
  };

  // 解析文件修改
  const filePattern = /<<<file:([^>]+)>>>\n([\s\S]*?)\n<<<\/file>/g;
  let match;
  while ((match = filePattern.exec(response)) !== null) {
    result.files[match[1]] = match[2];
  }

  // 解析提交信息
  const commitMatch = response.match(/<<<commit>>>\n(.+?)\n<<<\/commit>/);
  if (commitMatch) {
    result.commitMessage = commitMatch[1].trim();
  }

  // 解析 PR 标题
  const prTitleMatch = response.match(/<<<prTitle>>>\n(.+?)\n<<<\/prTitle>/);
  if (prTitleMatch) {
    result.prTitle = prTitleMatch[1].trim();
  }

  // 解析 PR 内容
  const prBodyMatch = response.match(/<<<prBody>>>\n([\s\S]*?)\n<<<\/prBody>/);
  if (prBodyMatch) {
    result.prBody = prBodyMatch[1].trim();
  }

  return result;
}

// 主函数
async function main() {
  try {
    console.log('🤖 开始处理 Issue...');

    // 读取项目文档
    const claudeMd = readFile('CLAUDE.md');
    const dataJs = readFile('data.js');

    // 构建提示词
    const systemPrompt = `你是一个专业的软件开发助手，负责处理汉字演化查询网站的 GitHub Issue。

项目规范：
${claudeMd}

当前 data.js 中的汉字列表：
${Object.keys(dataJs.match(/"[\u4e00-\u9fa5]+"/g) || []).join('、')}

请分析用户的 Issue，然后执行相应的操作。

输出格式要求：
1. 如果需要修改文件，使用以下格式：
<<<file:文件路径>>>
文件完整内容
<<</file>

2. 提交信息格式：
<<<commit>>>
type: 简短描述
<<</commit>

3. PR 标题格式：
<<<prTitle>>>
PR 标题
<<</prTitle>

4. PR 内容格式：
<<<prBody>>>
PR 描述
<<</prBody>

重要规则：
- 新增汉字时，确保四个字形阶段都有完整内容
- SVG 路径要合理，参考已有数据的格式
- 如果用户没有提供字形数据，根据字源知识创建合理的 SVG`;

    const userPrompt = `处理 GitHub Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}

Issue 内容:
${ISSUE_BODY}

请根据规范处理此 Issue。修改文件时请输出文件的完整内容。`;

    // 调用 AI
    console.log('📤 正在调用智谱 API...');
    const aiResponse = await callZhipuAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    console.log('📥 AI 响应长度:', aiResponse.length);

    // 解析响应
    const actions = parseAIResponse(aiResponse);
    console.log('📋 解析到的文件:', Object.keys(actions.files));

    if (Object.keys(actions.files).length === 0) {
      await httpsPost(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
        { body: '⚠️ AI 未能识别需要修改的文件，请检查 Issue 内容是否清晰。' }
      );
      return;
    }

    // 创建分支
    const branchName = `ai/issue-${ISSUE_NUMBER}-${Date.now()}`;
    console.log('🌿 创建分支:', branchName);
    execCommand('git', ['config', 'user.name', 'AI Bot']);
    execCommand('git', ['config', 'user.email', 'ai-bot@github.com']);
    execCommand('git', ['checkout', '-b', branchName]);

    // 写入文件
    for (const [filePath, content] of Object.entries(actions.files)) {
      console.log('📝 写入文件:', filePath);
      writeFile(filePath, content);
    }

    // 运行测试
    console.log('🧪 运行测试...');
    try {
      execCommand('node', ['tests/validate-data.js']);
      console.log('✅ 测试通过');
    } catch (error) {
      await httpsPost(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
        { body: `❌ 测试失败：\n\`\`\`\n${error.message}\n\`\`\`` }
      );
      throw error;
    }

    // 提交更改
    const commitMessage = actions.commitMessage || `chore: 处理 Issue #${ISSUE_NUMBER}`;
    console.log('✅ 提交更改:', commitMessage);
    execCommand('git', ['add', '-A']);
    execCommand('git', ['commit', '-m', commitMessage]);

    // 推送分支
    console.log('📤 推送分支...');
    execCommand('git', ['push', '-u', 'origin', branchName]);

    // 创建 PR
    const prTitle = actions.prTitle || `处理 Issue #${ISSUE_NUMBER}`;
    const prBody = actions.prBody || `自动处理 Issue #${ISSUE_NUMBER}\n\nCloses #${ISSUE_NUMBER}`;

    console.log('🔀 创建 PR...');
    const pr = await httpsPost(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        title: prTitle,
        body: prBody,
        head: branchName,
        base: 'main'
      }
    );

    console.log('✅ PR 创建成功:', pr.html_url);

    // 评论 Issue
    await httpsPost(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
      {
        body: `✅ 已收到您的反馈！AI 正在处理中...

**分支**: ${branchName}
**PR**: ${pr.html_url}

请 review 后合并即可自动部署上线。`
      }
    );

    console.log('🎉 处理完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    try {
      await httpsPost(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_NUMBER}/comments`,
        {
          body: `❌ 处理失败：\n\`\`\`\n${error.message}\n\`\`\`\n请查看 Actions 日志了解详情。`
        }
      );
    } catch (e) {
      console.error('评论失败:', e.message);
    }
    process.exit(1);
  }
}

main();
