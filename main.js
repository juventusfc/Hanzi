/**
 * 汉字演化查询 - 主交互逻辑
 */

// DOM 元素
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const hanziGrid = document.getElementById('hanziGrid');

// 结果展示元素
const hanziChar = document.getElementById('hanziChar');
const hanziMeaning = document.getElementById('hanziMeaning');
const oracleSvg = document.getElementById('oracleSvg');
const oracleDesc = document.getElementById('oracleDesc');
const bronzeSvg = document.getElementById('bronzeSvg');
const bronzeDesc = document.getElementById('bronzeDesc');
const sealSvg = document.getElementById('sealSvg');
const sealDesc = document.getElementById('sealDesc');
const regularChar = document.getElementById('regularChar');
const regularDesc = document.getElementById('regularDesc');

// 初始化
function init() {
  renderHanziGrid();
  setupEventListeners();

  // 支持 URL 参数预加载
  const urlParams = new URLSearchParams(window.location.search);
  const charParam = urlParams.get('char');
  if (charParam) {
    searchHanzi(charParam);
  }
}

// 设置事件监听
function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // 实时输入时清除错误信息
  searchInput.addEventListener('input', () => {
    clearError();
  });
}

// 渲染快速查询汉字网格
function renderHanziGrid() {
  const hanziList = getHanziList();

  hanziGrid.innerHTML = hanziList.map(char => `
    <div class="hanzi-item" data-char="${char}" role="button" tabindex="0">
      ${char}
    </div>
  `).join('');

  // 为每个汉字添加点击事件
  document.querySelectorAll('.hanzi-item').forEach(item => {
    item.addEventListener('click', () => {
      const char = item.getAttribute('data-char');
      searchHanzi(char);
    });

    item.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const char = item.getAttribute('data-char');
        searchHanzi(char);
      }
    });
  });
}

// 处理搜索
function handleSearch() {
  const input = searchInput.value.trim();

  if (!input) {
    showError('请输入一个汉字');
    return;
  }

  if (!/^[\u4e00-\u9fa5]$/.test(input)) {
    showError('请输入单个汉字');
    return;
  }

  searchHanzi(input);
}

// 查询汉字演化
function searchHanzi(char) {
  clearError();

  if (!hasHanzi(char)) {
    showError(`暂未收录汉字"${char}"，点击下方按钮建议添加！`);
    resultSection.classList.add('hidden');
    return;
  }

  const data = getHanziEvolution(char);
  displayResult(data);

  // 更新搜索框
  searchInput.value = char;
}

// 显示查询结果
function displayResult(data) {
  hanziChar.textContent = data.char;
  hanziMeaning.textContent = data.meaning;

  // 渲染 SVG 字形
  renderSvg(oracleSvg, data.oracle.svg);
  oracleDesc.textContent = data.oracle.desc;

  renderSvg(bronzeSvg, data.bronze.svg);
  bronzeDesc.textContent = data.bronze.desc;

  renderSvg(sealSvg, data.seal.svg);
  sealDesc.textContent = data.seal.desc;

  regularChar.textContent = data.regular.char;
  regularDesc.textContent = data.regular.desc;

  resultSection.classList.remove('hidden');

  // 滚动到结果区域
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 渲染 SVG
function renderSvg(svgElement, pathData) {
  svgElement.innerHTML = `<path d="${pathData}" />`;
}

// 显示错误信息
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// 清除错误信息
function clearError() {
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
