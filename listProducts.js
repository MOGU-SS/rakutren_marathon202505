/**
 * 商品リンク抽出スクリプト
 *
 * このスクリプトはHTMLファイルから商品リンクを抽出し、一覧表示します。
 */

const fs = require("fs");

// HTMLファイルを読み込む
const htmlFile = "1920w-light.html";
const htmlContent = fs.readFileSync(htmlFile, "utf-8");

console.log(`HTMLファイルのサイズ: ${htmlContent.length} バイト`);

// 商品リンクを格納する配列
const productLinks = [];

// 単純な方法で商品リンクを抽出
const matches =
  htmlContent.match(
    /<a href="https:\/\/item\.rakuten\.co\.jp\/mogustore\/[^"]*"/g
  ) || [];
console.log(`正規表現で ${matches.length} 件のリンクを見つけました。`);

// 最初の5件のマッチを表示
console.log("\n最初の5件のマッチ:");
for (let i = 0; i < Math.min(5, matches.length); i++) {
  console.log(`${i + 1}: ${matches[i]}`);
}

matches.forEach((match, index) => {
  // href属性から商品URLを抽出
  const urlMatch = match.match(/href="([^"]*)"/);
  if (!urlMatch) {
    console.log(`マッチ ${index + 1} からURLを抽出できませんでした: ${match}`);
    return;
  }

  const link = urlMatch[1];
  console.log(`リンク ${index + 1}: ${link}`);

  // 商品IDを抽出（URLの最後のパス部分）
  const urlParts = link.split("/");
  // 最後の要素が空文字列の場合は、その前の要素を取得
  const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

  if (!id) {
    console.log(
      `リンク ${index + 1} から商品IDを抽出できませんでした: ${link}`
    );
    return;
  }

  console.log(`商品ID ${index + 1}: ${id}`);

  // 重複を避けるため、まだリストにない商品のみ追加
  if (!productLinks.some((item) => item.id === id)) {
    // 商品のセクションを順番に基づいて決定
    let section = "other";

    // 指定された振り分けに基づいてセクションを決定
    if (index === 0) {
      section = "pockiri"; // 1件目は1000円ポッキリ
    } else if (index >= 1 && index <= 10) {
      section = "popular"; // 2-11件目は人気商品
    } else if (index >= 11 && index <= 20) {
      section = "new"; // 12-21件目は新商品
    } else if (index >= 21) {
      section = "bargain"; // 22件目以降はお買い得品
    }

    productLinks.push({
      id,
      link,
      section,
    });

    console.log(`商品 ${index + 1} をセクション ${section} に追加しました。`);
  } else {
    console.log(`商品ID ${id} は既に追加されています。`);
  }
});

// 結果を表示
console.log(`\n合計 ${productLinks.length} 件の商品リンクを抽出しました。`);

// セクションごとに商品数を集計
const sectionCounts = {
  pockiri: 0,
  popular: 0,
  new: 0,
  bargain: 0,
  other: 0,
};

productLinks.forEach((product) => {
  sectionCounts[product.section]++;
});

console.log("\nセクションごとの商品数:");
Object.keys(sectionCounts).forEach((section) => {
  console.log(`${section}: ${sectionCounts[section]}件`);
});

// 商品リストを表示
console.log("\n商品リスト:");
productLinks.forEach((product, index) => {
  console.log(`${index + 1}. ID: ${product.id} (${product.section})`);
  console.log(`   URL: ${product.link}`);
});

// JSONファイルに保存
fs.writeFileSync(
  "product_links.json",
  JSON.stringify(productLinks, null, 2),
  "utf-8"
);
console.log(`\n商品データを product_links.json に保存しました。`);
