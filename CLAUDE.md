# 项目规范

## 项目概述

这是一个汉字演化查询静态网站，托管在 GitHub Pages。

**核心目标**：验证一条完整的 AI 驱动开发闭环：
用户提反馈 → 自动创建 GitHub Issue → Claude Code 接任务、写代码、跑测试、提 PR → merge 后 GitHub Pages 自动部署上线

## 技术约束

- **纯 HTML/CSS/JS**，无框架，无构建步骤
- 所有汉字数据在 `data.js` 中，结构清晰
- 托管在 GitHub Pages，公开仓库免费托管

## 数据结构规范

`data.js` 中的每个汉字条目必须包含以下结构：

```javascript
{
  "汉字": {
    char: "汉字",                    // 汉字本身（与键名一致）
    oracle: {                        // 甲骨文
      svg: "SVG path 数据",          // 必需：SVG 路径描述
      desc: "描述文字"               // 必需：1-2句说明
    },
    bronze: {                        // 金文
      svg: "SVG path 数据",
      desc: "描述文字"
    },
    seal: {                          // 小篆
      svg: "SVG path 数据",
      desc: "描述文字"
    },
    regular: {                       // 楷书（现代汉字）
      char: "现代字形",              // 必需：现代汉字
      desc: "描述文字"
    },
    meaning: "本义说明，1–2句"       // 必需：字义说明
  }
}
```

## 处理 Issue 的规则

### 1. 新增汉字

当 Issue 请求添加新汉字时：

1. 在 `data.js` 中添加该字条目
2. 确保四个字形阶段都有完整内容
3. 如果 Issue 中没有提供字形数据，需要根据字源知识创建合理的 SVG 路径和描述
4. 运行 `node tests/validate-data.js` 验证数据结构
5. 提交 PR，标题格式：`feat: 新增汉字「X」`

### 2. UI 改动

当 Issue 请求 UI 改动时：

1. 修改 `index.html`、`style.css` 或 `main.js`
2. 保持响应式设计和无障碍访问
3. 提交 PR，标题格式：`fix: XXX` 或 `feat: XXX`

### 3. Bug 修复

当 Issue 报告问题时：

1. 定位问题代码
2. 修复并测试
3. 提交 PR，标题格式：`fix: XXX`

## SVG 绘图规范

- SVG viewBox 统一使用 `0 0 60 85`
- stroke 颜色由 CSS 控制（`--primary-color`）
- stroke-width 为 2
- 使用 path 元素，d 属性包含路径数据
- 线条闭合处使用 `stroke-linejoin: round`
- 线条端点使用 `stroke-linecap: round`

## 工作流程

处理 Issue 时，按以下步骤操作：

1. **读取 Issue**：理解用户需求
2. **修改代码**：在相应文件中做出修改
3. **运行测试**：执行 `node tests/validate-data.js`
4. **创建分支**：`git checkout -b feat/xxx`
5. **提交更改**：`git commit -m "type: description"`
6. **创建 PR**：使用 `gh pr create` 命令

## 禁止事项

- ❌ 不得引入任何 npm 包或外部构建工具
- ❌ 不得修改 `.github/workflows/` 里的文件
- ❌ 不得删除已有汉字数据
- ❌ 不得修改 CLAUDE.md 文件本身
- ❌ 不得在代码中添加任何敏感信息

## 后续扩展方向

在处理完用户请求后，如果还有余力，可以考虑以下改进方向：

- 添加笔画动画演示
- 支持部首查询
- 添加相关汉字推荐
- 添加字源故事卡片
- 支持繁简对照
- 添加英文释义

但这些必须在完成用户主要请求之后，不能喧宾夺主。

## 提交信息格式

使用语义化提交信息：

- `feat:` - 新功能（如：新增汉字）
- `fix:` - 修复 bug
- `docs:` - 文档更新
- `style:` - 代码格式调整
- `refactor:` - 重构
- `test:` - 测试相关
- `chore:` - 构建/工具相关

示例：
- `feat: 新增汉字「龙」`
- `fix: 修复搜索框在移动端的显示问题`
- `docs: 更新 CLAUDE.md 规范`
