# 汉字演化查询

> 探索汉字从甲骨文到楷书的演变历程

一个由 AI 驱动自动演化的静态网站。用户通过 GitHub Issue 提交反馈，Claude Code AI 自动处理并部署更新。

## 项目特点

- 🎨 **纯静态网站**：HTML/CSS/JS，无框架，零构建步骤
- 🤖 **AI 驱动**：GitHub Issue 触发 Claude Code 自动处理
- 🚀 **自动部署**：PR merge 后自动部署到 GitHub Pages
- 📚 **汉字演化**：展示汉字从甲骨文→金文→小篆→楷书的演变

## 快速开始

### 在线访问

网站地址：https://juventusfc.github.io/Hanzi/

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/juventusfc/Hanzi.git
cd Hanzi

# 直接用浏览器打开 index.html
# 或者使用简单的 HTTP 服务器
python3 -m http.server 8000
```

## 如何贡献

### 建议新汉字

1. 点击网站底部的"**建议新汉字 / 反馈问题**"按钮
2. 填写汉字信息和字形描述（如果知道的话）
3. 提交 Issue
4. Claude Code AI 会自动处理并创建 Pull Request

### 反馈问题

发现 bug 或有改进建议？同样通过 Issue 提交，我们会尽快处理！

## 项目结构

```
/
├── index.html          # 主页面
├── style.css           # 样式
├── main.js             # 交互逻辑
├── data.js             # 汉字演化数据（Claude Code 主要修改此文件）
├── CLAUDE.md           # Claude Code 行为规范
├── .github/
│   ├── workflows/
│   │   ├── claude-issue.yml    # Issue 触发 Claude Code
│   │   └── deploy.yml          # merge 后部署到 GitHub Pages
│   └── ISSUE_TEMPLATE/
│       └── feature_request.md  # Issue 模板
└── tests/
    └── validate-data.js        # 数据结构验证脚本
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 纯 HTML / CSS / JavaScript |
| 托管 | GitHub Pages |
| CI/CD | GitHub Actions |
| AI | Claude Code + Anthropic API |

## 当前收录汉字

人、山、水、火、日、月、木、口、手、心

## 许可证

MIT License

---

由 [Claude Code](https://claude.com/claude-code) 驱动自动演化 🤖
