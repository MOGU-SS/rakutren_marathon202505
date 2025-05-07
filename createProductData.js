/**
 * 商品データ構造化スクリプト
 *
 * このスクリプトはproduct_links.jsonを読み込み、商品情報を追加して構造化されたJSONデータを生成します。
 */

const fs = require("fs");

// 環境設定
const ENV = process.env.NODE_ENV || "development"; // 'development' または 'production'

// 画像パスの設定
const IMAGE_PATHS = {
  development: {
    baseUrl: "/img/rakuten_cabinet/", // ローカル開発環境のベースパス
    sections: {
      pockiri: "01_1000円ポッキリ/",
      popular: "02_今売れている人気アイテム/",
      new: "03_新商品/",
      bargain: "04_セット販売お買い得品/",
      other: "other/",
    },
  },
  production: {
    baseUrl:
      "https://image.rakuten.co.jp/mogustore/cabinet/splp/11558925/11558926/", // 楽天キャビネットのベースURL
    sections: {
      pockiri: "",
      popular: "",
      new: "",
      bargain: "",
      other: "",
    },
  },
};

// 商品IDから画像ファイル名へのマッピングを読み込む
let idToFilenameMap = {};
try {
  const imageIdMappingFile = "image_id_mapping.json";
  idToFilenameMap = JSON.parse(fs.readFileSync(imageIdMappingFile, "utf-8"));
  console.log(
    `画像IDマッピングを読み込みました: ${
      Object.keys(idToFilenameMap).length
    } 件`
  );
} catch (error) {
  console.warn(
    `警告: 画像IDマッピングの読み込みに失敗しました: ${error.message}`
  );
}

// 商品リンクデータを読み込む
const productLinksFile = "product_links.json";
const productLinks = JSON.parse(fs.readFileSync(productLinksFile, "utf-8"));

console.log(`${productLinks.length} 件の商品リンクを読み込みました。`);

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

  // その他の商品
  other: [],
};

// 商品リンクから商品データを生成
productLinks.forEach((productLink) => {
  const { id, link, section } = productLink;

  // 特別な処理が必要な商品ID
  const specialProducts = {
    "003001kumo_petsofa": {
      isPriceRange: true,
      minPrice: 13200,
      maxPrice: 16500,
    },
  };

  // 商品画像のパスを取得
  const imagePath = getImagePath(id, section);

  // 商品データを作成
  const product = {
    id,
    title: getTitleFromId(id),
    imageUrl: imagePath,
    originalPrice: getOriginalPriceFromId(id),
    currentPrice: getCurrentPriceFromId(id),
    discountRate: 0, // 後で計算
    link,
    description: getDescriptionFromId(id),
  };

  // 特別な商品の場合、価格帯情報を追加
  if (specialProducts[id]) {
    if (specialProducts[id].isPriceRange) {
      product.isPriceRange = true;
      product.minPrice = specialProducts[id].minPrice;
      product.maxPrice = specialProducts[id].maxPrice;
      // 価格帯の場合は割引率は計算しない
      product.discountRate = null;
    }
  } else {
    // 通常の商品の場合は割引率を計算
    if (product.originalPrice > product.currentPrice) {
      product.discountRate = Math.round(
        ((product.originalPrice - product.currentPrice) /
          product.originalPrice) *
          100
      );
    }
  }

  // セクションに商品を追加
  productData[section].push(product);
});

// 結果を表示
console.log("\n商品データを生成しました。");

// セクションごとの商品数を表示
Object.keys(productData).forEach((section) => {
  console.log(`${section}: ${productData[section].length}件`);
});

// JSONファイルに保存
const outputFile = "product_data.json";
fs.writeFileSync(outputFile, JSON.stringify(productData, null, 2), "utf-8");
console.log(`\n商品データを ${outputFile} に保存しました。`);

/**
 * 商品IDとセクションから画像パスを生成する関数
 * @param {string} id - 商品ID
 * @param {string} section - 商品のセクション
 * @returns {string} - 画像パス
 */
function getImagePath(id, section) {
  const envConfig = IMAGE_PATHS[ENV];

  // 画像IDマッピングから画像ファイル名を取得
  let filename = "";
  if (idToFilenameMap[id]) {
    filename = idToFilenameMap[id];
  } else {
    // マッピングがない場合はデフォルトのファイル名を使用
    filename = `${id.toLowerCase()}.jpg`;
    console.warn(
      `警告: 商品ID "${id}" の画像マッピングが見つかりません。デフォルトのファイル名を使用します。`
    );
  }

  if (ENV === "development") {
    // ローカル開発環境では、セクションごとのフォルダを使用
    return `${envConfig.baseUrl}${envConfig.sections[section]}${filename}`;
  } else {
    // 本番環境（楽天キャビネット）では、フラットな構造
    return `${envConfig.baseUrl}${filename}`;
  }
}

// 商品IDから商品名を取得する関数
function getTitleFromId(id) {
  const titles = {
    "012tissue": "ティッシュケース パープル",
    "002004bikotsu": "尾骨を浮かすシートクッション（カバー付き）",
    "002001hole_p": "ホールピロー",
    "002001kumo_sawaru": "雲にさわる夢クッション",
    "001002kimochi_pre": "プレミアム 気持ちいい抱きまくら（カバー付き）",
    "003003fitchair": "フィットチェア（カバー付き）",
    "002001pom": "ポムポムクッション",
    "001002kimochi_fuwa": "フワフワパイルの気持ちいい抱きまくら（カバー付き）",
    "002001hole_ppre": "プレミアムホールピロー",
    "001002kumo_daki": "雲に抱きつく夢枕（カバー付き）",
    "001001katakaru02":
      "肩が軽くなるまくら（本体・カバー付き）リニューアル.ver",
    "002006twist": "ツイストマシュマロ",
    "002006twist_long": "ツイストマシュマロ〈ロング〉",
    "002005osuwarirabura": "おすわりラブラ",
    "001001kimochi_karada": "気持ちいい身体まくら（カバー付き）MOGUストア限定",
    "003001daruman_gentei":
      "ダルマンソファ（本体・カバーセット） MOGUストア限定色",
    "003001kumo_petsofa_r": "雲にのるペットソファ ラウンド（カバー付き）",
    "003001kumo_petsofa": "雲にのるペットソファ スクエア（カバー付き）",
    "002005mitan_hw": "もぐっちみ~たん ハロウィンver.",
    "002005wan_hw": "もぐっちわんわん ハロウィンver.",
    "002005mogucchiiruka": "もぐっちいるか",
    "001001kazoku_cvrset":
      "家族の健康まくら（本体・カバー付き）カバー1枚増量セット",
    "001001kazoku_pre_cvrset_br":
      "プレミアム家族の健康まくら（本体・カバー付き）カバー1枚増量セット",
  };

  return titles[id] || `商品 ${id}`;
}

// 商品IDから元の価格を取得する関数
function getOriginalPriceFromId(id) {
  const prices = {
    "012tissue": 1000,
    "002004bikotsu": 4180,
    "002001hole_p": 2090,
    "002001kumo_sawaru": 3300,
    "001002kimochi_pre": 9680,
    "003003fitchair": 8800,
    "002001pom": 1760,
    "001002kimochi_fuwa": 9900,
    "002001hole_ppre": 2420,
    "001002kumo_daki": 12100,
    "001001katakaru02": 9680,
    "002006twist": 3300,
    "002006twist_long": 4950,
    "002005osuwarirabura": 4950,
    "001001kimochi_karada": 9900,
    "003001daruman_gentei": 18700,
    "003001kumo_petsofa_r": 11000,
    "003001kumo_petsofa": 16500, // 最大価格を元の価格として設定
    "002005mitan_hw": 3080,
    "002005wan_hw": 3080,
    "002005mogucchiiruka": 3300,
    "001001kazoku_cvrset": 7150,
    "001001kazoku_pre_cvrset_br": 9350,
  };

  return prices[id] || 0;
}

// 商品IDから現在の価格を取得する関数
function getCurrentPriceFromId(id) {
  const prices = {
    "012tissue": 1000,
    "002004bikotsu": 4180,
    "002001hole_p": 2090,
    "002001kumo_sawaru": 3300,
    "001002kimochi_pre": 9680,
    "003003fitchair": 8800,
    "002001pom": 1760,
    "001002kimochi_fuwa": 9900,
    "002001hole_ppre": 2420,
    "001002kumo_daki": 12100,
    "001001katakaru02": 9680,
    "002006twist": 3300,
    "002006twist_long": 4950,
    "002005osuwarirabura": 4950,
    "001001kimochi_karada": 8910,
    "003001daruman_gentei": 14960,
    "003001kumo_petsofa_r": 11000,
    "003001kumo_petsofa": 13200, // 最小価格を現在価格として設定
    "002005mitan_hw": 3080,
    "002005wan_hw": 3080,
    "002005mogucchiiruka": 3300,
    "001001kazoku_cvrset": 7150,
    "001001kazoku_pre_cvrset_br": 9350,
  };

  return prices[id] || 0;
}

// 商品IDから商品説明を取得する関数
function getDescriptionFromId(id) {
  const descriptions = {
    "012tissue":
      "花粉症や鼻炎症状のある方に！軽くてやわらか、コンパクト！リビングでもベッドでも外でも、いつでもどこでも必要な量のティッシュを持ち歩けます♪",
    "002004bikotsu":
      "座るときに尾骨を完全に浮かしたいというお客様の声から生まれたクッション。産前や産後、尾てい骨、坐骨神経痛などお尻の悩みをサポート！",
    "002001hole_p":
      "このカタチが優秀！中央部に向かったゆるやかな傾斜が体の曲線にフィットしやすいフォルムに。穴が空いているからヘッドフォンやピアスをしたままでも横になれます♪",
    "002001kumo_sawaru":
      "ずっとハグしていたい、しあわせ触感。直径40cmのたっぷりサイズで、枕やクッションなど、さまざまなシーンに気持ち良さをプラス！※クッション本体にカバーは付属しておりません。",
    "001002kimochi_pre":
      "肉厚でよりモッチリとした触感に！ハグすると独特な形が不思議と体にフィットする「気持ちいい抱きまくら」のプレミアムバージョン。いびきや睡眠時無呼吸症候群などの対策にもおすすめ♪",
    "003003fitchair":
      "パウダービーズ®がやさしく体にフィットしていろんな体勢を気持ちよく支えてくれる一人用ビーズチェアクッション！コンパクトで持ち手があるから持ち運びもラクラク♪",
    "002001pom":
      "枕や腰当て、肘、膝に！使い勝手のいいシンプルな筒型クッション。別売りの専用カバーをつければ汚れても安心♪",
    "001002kimochi_fuwa":
      "この形であなたの眠りが変わる。MOGUロングセラー「気持ちいい抱きまくら」のフワフワとしたタオル生地（パイル地）バージョン。いびきや睡眠時無呼吸症候群などの対策にもおすすめ♪",
    "002001hole_ppre":
      "肉厚でよりやわらかくて気持ちいいプレミアムシリーズ。穴があるからうつ伏せ寝でも呼吸ラクラク♪耳にピアスやイヤホン、ヘッドホンをつけたままでも痛くなりにくい！",
    "001002kumo_daki":
      "やわらかな雲をハグするようにつかまれば、体がゆるんでリラックス。毎日眠るのが楽しみになる癒しの抱き枕。いびきや睡眠時無呼吸症候群などの対策におすすめ！",
    "001001katakaru02":
      "朝起きると肩が・・・という方に！横になった時にできる寝具と首や肩の隙間をパウダービーズが埋めて負担を軽減！寝返りをうっても隙間は埋まったままで安心♪",
    "002006twist":
      'ポップなビジュアルともちもち食感が人気なツイストマシュマロの触感をビーズクッションで再現！？"食感"じゃなく、"触感"を楽しんで。リラックスタイムに便利な通常サイズ。',
    "002006twist_long":
      'ポップなビジュアルともちもち食感が人気なツイストマシュマロの触感をビーズクッションで再現！？"食感"じゃなく、"触感"を楽しんで。いろんな用途で使えるロングサイズ。',
    "002005osuwarirabura":
      "ラブラの愛おしさがたまらないっ！ 多くのユーザーからのリクエストにこたえて復刻しました！",
    "001001kimochi_karada":
      "枕とマットレス性能が一体化？ 頭からお尻にかけて全てを包み込むように支えることで上体を最適に体圧分散させる身体枕です。",
    "003001daruman_gentei":
      "コンパクトな部屋でもスペースを有効活用して快適に過ごせるよう設計したダルマ型のビーズクッションソファ。落ち着いた色合いがインテリアになじむMOGUストア限定のアースカラー。",
    "003001kumo_petsofa_r":
      "雲にのるシリーズにペットソファが登場！未体験の心地よさを体感させてくれるビーズソファに包み込まれるようなフィット感。もちろん人も使用可能です。",
    "003001kumo_petsofa":
      "雲にのるシリーズにペットソファが登場！未体験の心地よさを体感させてくれるビーズソファに包み込まれるようなフィット感。もちろん人も使用可能です。サイズによって価格が異なります。",
    "002005mitan_hw":
      "大人気もぐっちみーたんへのライバル意識でハロウィンver.の黒猫に変身！のつもりが失敗してこんなオレンジ色に。チョコっとマヌケで可愛いキャラクターが新登場！",
    "002005wan_hw":
      "み～たんについられてわんわんもライバル意識でハロウィンver.に変身！のはずがやさしい性格が隠せずにただのハロウィンコスプレに♪そんな自分がまんざらでもない可愛いキャラが新登場！",
    "002005mogucchiiruka":
      "いるかのコロンとしたまんまるフォルムは見た目もかわいく、体にもフィットするので癒し効果抜群！子ども用抱き枕や背当てとしても使えます♪",
    "001001kazoku_cvrset":
      "＼カバー1枚増量／枕中央の凹凸が首や肩のくぼみにフィット！隙間を埋めてくれるから睡眠時の負担を軽減。付属のウレタンシートを使えばお好みの高さ・硬さに調整ができます♪",
    "001001kazoku_pre_cvrset_br":
      "＼カバー1枚増量／寝返りをしても余裕があるプレミアムサイズ。鼓型と中央の凸凹がスムーズな寝返りをサポート！付属のウレタンシートでお好みの高さ・硬さに調節できます♪",
  };

  return descriptions[id] || "";
}
