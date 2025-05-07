const fs = require("fs");

// JSONファイルを読み込む
fs.readFile("product_data.json", "utf8", (err, data) => {
  if (err) {
    console.error("JSONファイルの読み込みエラー:", err);
    return;
  }

  try {
    // JSONをパースして再び文字列化（スペースなし）
    const jsonObj = JSON.parse(data);
    const minified = JSON.stringify(jsonObj);

    // 最小化前と後のサイズを計算
    const originalSize = data.length;
    const minifiedSize = minified.length;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(2);

    // 最小化されたJSONを新しいファイルに書き込む
    fs.writeFile("product_data.min.json", minified, "utf8", (err) => {
      if (err) {
        console.error("ファイルの書き込みエラー:", err);
        return;
      }
      console.log(`JSONの最小化完了！`);
      console.log(`元のサイズ: ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`最小化後のサイズ: ${(minifiedSize / 1024).toFixed(2)} KB`);
      console.log(`削減率: ${savings}%`);
    });
  } catch (error) {
    console.error("JSONの最小化エラー:", error);
  }
});
