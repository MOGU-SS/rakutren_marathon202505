/**
 * 商品データ抽出スクリプト
 *
 * このスクリプトはHTMLファイルから商品情報を抽出し、構造化されたJSONデータに変換します。
 * 使用方法: Node.jsで実行し、HTMLファイルを引数として渡します。
 * 例: node extractProductData.js 1920w-light.html
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// コマンドライン引数からHTMLファイル名を取得
const htmlFile = process.argv[2] || "1920w-light.html";
if (!fs.existsSync(htmlFile)) {
  console.error(`HTMLファイル "${htmlFile}" が見つかりません。`);
  process.exit(1);
}

// HTMLファイルを読み込む
const htmlContent = fs.readFileSync(htmlFile, "utf-8");
const $ = cheerio.load(htmlContent);

// 商品データを格納するオブジェクト
const productData = {
  // 1000円ポッキリセクション商品
  pockiri: [],

  // 人気アイテムセクション商品
  popular: [],

  // 新商品セクション
  new: [],

  // お買い得品セクション
  bargain: [],
};

// 商品情報を直接抽出する関数
function extractProductsDirectly() {
  // 「商品ページ」リンクを持つすべての要素を検索
  $('a[href*="item.rakuten.co.jp/mogustore/"]').each((index, element) => {
    // 商品リンクを取得
    const link = $(element).attr("href");
    if (!link) return;

    // 商品IDを抽出
    const id = link.split("/").pop().replace(/\/$/, "");
    if (!id) return;

    console.log(`商品ID: ${id} を処理中...`);

    // 商品ブロックを特定（リンク要素の親要素をたどる）
    let productBlock = $(element).closest(
      ".overlap-group, .overlap-group-1, .overlap-group-2, .overlap-group-3, .overlap-group-4, .overlap-group-5, .overlap-group-6, .overlap-group-7, .overlap-group-8, .overlap-group-9, .overlap-group-10, .overlap-group-11, .overlap-group-12"
    );

    if (productBlock.length === 0) {
      // 別の方法で商品ブロックを特定
      productBlock = $(element).parent().parent().parent().parent();
    }

    if (productBlock.length === 0) {
      console.log(`  商品ブロックが見つかりませんでした: ${id}`);
      return;
    }

    // 商品名を取得
    let title = "";
    productBlock
      .find(
        '[class*="text-"][class*="valign-text-middle"], [class*="mogu"][class*="valign-text-middle"], [class*="ver"][class*="valign-text-middle"]'
      )
      .each((i, el) => {
        const text = $(el).text().trim();
        // 商品名の特徴: 長さが適切で、価格情報を含まない
        if (
          text &&
          text.length > 5 &&
          text.length < 100 &&
          !text.includes("￥") &&
          !text.includes("税込") &&
          !text.includes("商品ページ")
        ) {
          title = text;
          return false; // eachループを抜ける
        }
      });

    // 価格情報を取得
    let currentPrice = 0;
    productBlock
      .find(
        '[class*="valign-text-middle"][class*="inter-bold-red"], [class*="valign-text-middle"][class*="bold-red"]'
      )
      .each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes("￥") && text.includes("税込")) {
          currentPrice = parseInt(text.replace(/[^\d]/g, "")) || 0;
          return false;
        }
      });

    // 元の価格を取得
    let originalPrice = currentPrice;
    productBlock
      .find('[class*="valign-text-middle"]:contains("税込")')
      .each((i, el) => {
        const text = $(el).text().trim();
        if (
          text.includes("￥") &&
          text.includes("税込") &&
          !$(el).hasClass("inter-bold-red") &&
          !$(el).hasClass("bold-red")
        ) {
          const extractedPrice = parseInt(text.replace(/[^\d]/g, "")) || 0;
          if (extractedPrice > 0 && extractedPrice !== currentPrice) {
            originalPrice = extractedPrice;
            return false;
          }
        }
      });

    // 割引率を計算
    const discountRate =
      originalPrice > currentPrice
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;

    // 商品説明を取得
    let description = "";
    productBlock
      .find(
        '[class*="valign-text-middle"][class*="inter-normal-black-14"], [class*="text_label"][class*="valign-text-middle"], [class*="mogu"][class*="valign-text-middle"][class*="inter-normal-black-14"]'
      )
      .each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          description = text;
          return false;
        }
      });

    // 画像URLを設定
    const imageUrl = `img/product_${id}.jpg`;

    // セクションを特定
    let sectionKey = "other";

    // 商品の特徴からセクションを推測
    if (title.includes("1000円") || currentPrice === 1000) {
      sectionKey = "pockiri";
    } else if (
      id.includes("twist") ||
      id.includes("mitan") ||
      id.includes("wan_halloween") ||
      id.includes("mogucchiiruka")
    ) {
      sectionKey = "new";
    } else if (
      id.includes("bikotsu") ||
      id.includes("hole_p") ||
      id.includes("kumo_sawaru") ||
      id.includes("kimochi_pre")
    ) {
      sectionKey = "popular";
    } else if (
      id.includes("kazoku") ||
      id.includes("kimochi_karada") ||
      id.includes("daruman_gentei")
    ) {
      sectionKey = "bargain";
    }

    // 商品データを追加
    if (title && link && currentPrice > 0) {
      productData[sectionKey].push({
        id,
        title,
        imageUrl,
        originalPrice,
        discountRate,
        currentPrice,
        link,
        description,
      });

      console.log(
        `  商品「${title}」をセクション「${sectionKey}」に追加しました。`
      );
    } else {
      console.log(
        `  商品情報が不完全です: ${id}, タイトル: ${title}, 価格: ${currentPrice}`
      );
    }
  });

  return productData;
}

// 商品データを抽出
const extractedData = extractProductsDirectly();

// 各セクションの商品数を表示
Object.keys(extractedData).forEach((section) => {
  console.log(
    `セクション「${section}」: ${extractedData[section].length}件の商品を抽出しました。`
  );
});

// JSONファイルに保存
const outputFile = "product_data.json";
fs.writeFileSync(outputFile, JSON.stringify(extractedData, null, 2), "utf-8");
console.log(`商品データを ${outputFile} に保存しました。`);
