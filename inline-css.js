const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

// ファイルパスの設定
const htmlFile = 'index.html';
const cssFile = path.join('css', 'styles.css');
const outputFile = 'index.inline.html';

// CSSの読み込みと最小化
const css = fs.readFileSync(cssFile, 'utf8');
const minifiedCss = new CleanCSS({
  level: {
    1: {
      specialComments: 0
    },
    2: {
      mergeSemantically: true,
      restructureRules: true
    }
  }
}).minify(css).styles;

// HTMLの読み込み
let html = fs.readFileSync(htmlFile, 'utf8');

// 外部CSSリンクを探して削除
html = html.replace(/<link[^>]*href=['"]css\/styles\.css['"][^>]*>/i, '');

// インラインCSSの挿入
const styleTag = `<style>${minifiedCss}</style>`;
html = html.replace('</head>', `${styleTag}\n</head>`);

// 結果を保存
fs.writeFileSync(outputFile, html);

console.log('CSSのインライン化が完了しました。'); 