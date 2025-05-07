const fs = require("fs");
const { minify } = require("html-minifier-terser");

// CSSファイルを読み込む
const css = fs.readFileSync("css/styles.css", "utf8");

// 元のHTMLファイルを読み込む
fs.readFile("index.html", "utf8", async (err, data) => {
  if (err) {
    console.error("ファイルの読み込みエラー:", err);
    return;
  }

  // CSSをインライン化
  const htmlWithInlineCss = data.replace(
    '</head>',
    `<style>${css}</style></head>`
  );

  // 最小化オプションを設定
  const options = {
    collapseWhitespace: true,
    removeComments: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: true,
  };

  try {
    // HTMLを最小化
    const minified = await minify(htmlWithInlineCss, options);

    // 最小化前と後のサイズを計算
    const originalSize = data.length;
    const minifiedSize = minified.length;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(2);

    // 最小化されたHTMLを新しいファイルに書き込む
    fs.writeFile("index.min.html", minified, "utf8", (err) => {
      if (err) {
        console.error("ファイルの書き込みエラー:", err);
        return;
      }
      console.log(`最小化完了！`);
      console.log(`元のサイズ: ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`最小化後のサイズ: ${(minifiedSize / 1024).toFixed(2)} KB`);
      console.log(`削減率: ${savings}%`);
    });
  } catch (error) {
    console.error("最小化エラー:", error);
  }
});
