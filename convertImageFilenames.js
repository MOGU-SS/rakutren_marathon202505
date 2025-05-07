/**
 * 画像ファイル名を小文字に変換するスクリプト
 *
 * このスクリプトは指定されたディレクトリ内のすべての画像ファイルを再帰的に検索し、
 * ファイル名を小文字に変換します。また、変換前後のファイル名のマッピングを生成して保存します。
 * 楽天キャビネット用に、シンプルなファイル名（商品番号+商品名）に変換します。
 */

const fs = require("fs");
const path = require("path");

// 設定
const CONFIG = {
  // 画像ファイルが格納されているルートディレクトリ
  rootDir: path.join(__dirname, "img", "production"),

  // 変換対象の画像ファイル拡張子
  imageExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],

  // 変換をスキップするファイル名（正規表現）
  skipPatterns: [/^thumbs\.db$/i, /^\.DS_Store$/i],

  // マッピングファイルの出力先
  mappingFile: path.join(__dirname, "image_filename_mapping.json"),

  // 実際にファイル名を変更するかどうか
  dryRun: false,

  // 出力ディレクトリ（nullの場合は元のディレクトリに上書き）
  outputDir: path.join(__dirname, "img", "rakuten_cabinet"),

  // 既に変換済みのファイルを再変換するかどうか
  skipConverted: false, // 再変換を許可
};

// 商品IDのパターン（数字+アルファベット+アンダースコア）
const PRODUCT_ID_PATTERN = /^(\d+[a-zA-Z]+(?:_[a-zA-Z]+)*)/i;

// 除外するパターン（img, icon, thum などの接尾辞）
const EXCLUDE_PATTERNS = [
  /_img\d*/,
  /_icon/,
  /_thum/,
  /-thum/,
  /_r\d*/,
  /_rakuten/,
  /_lpa_r/,
  /_lpA_r/,
];

// 商品IDマッピング（特殊なケース）
const SPECIAL_ID_MAPPING = {
  // 特殊なファイル名から正しい商品IDへのマッピング
  "003001DARUMA": "003001daruman",
  "003001kumo_pet_round": "003001kumo_petsofa_r",
  "003001kumo_pet_square": "003001kumo_petsofa",
  "002005mitan": "002005mitan_hw",
  "002005mitan_hw": "002005mitan_hw",
  "002005mitan_halloween": "002005mitan_hw",
  "002005wan": "002005wan_hw",
  "002005wan_hw": "002005wan_hw",
  "002005wan_halloween": "002005wan_hw",
  "002005mogucchi": "002005mogucchiiruka",
  katakaru2: "001001katakaru02",
  osuwarirabura: "002005osuwarirabura",
  "001002KIMOCHI_fuwa": "001002kimochi_fuwa",
  "001002KIMOCHI_pre": "001002kimochi_pre",
  "001002KUMO_daki": "001002kumo_daki",
  "002001HOLE_p": "002001hole_p",
  "002001HOLE_ppre": "002001hole_ppre",
  "002001KUMO_sawa": "002001kumo_sawaru",
  "002001POM": "002001pom",
  "002004BIKOTSU": "002004bikotsu",
  "003003FITCHAIR": "003003fitchair",
  "001001KIMOCHI_karada": "001001kimochi_karada",
  "002006twist": "002006twist",
  "002006twist_long": "002006twist_long",
  "001001KAZOKU_cvrset": "001001kazoku_cvrset",
  "001001KAZOKU_pre_cvrset_BR": "001001kazoku_pre_cvrset_br",
};

// 完全なファイル名マッピング（特殊なケース）
const FULL_FILENAME_MAPPING = {
  "001001KIMOCHI_karada_rakuten.jpg": "001001kimochi_karada.jpg",
  "003001DARUMA_gentei_12_rakuten.jpg": "003001daruman_gentei.jpg",
  "003001kumo_pet_round_r.jpg": "003001kumo_petsofa_r.jpg",
  "003001kumo_pet_square_r.jpg": "003001kumo_petsofa.jpg",
  "012TISSUE_lpA_r.jpg": "012tissue.jpg",
  "002005mitan_halloween.jpg": "002005mitan_hw.jpg",
  "002005mitan_halloween_lpa_r.jpg": "002005mitan_hw.jpg",
  "002005wan_halloween.jpg": "002005wan_hw.jpg",
  "002005wan_halloween_lpa_r.jpg": "002005wan_hw.jpg",
  "001001KATAKARU_cvrset_RE.jpg": "katakaru.jpg",
};

// 強制的に設定する商品IDとファイル名のマッピング
const FORCED_ID_MAPPING = {
  "012tissue": "012tissue.jpg",
  "002001kumo_sawaru": "002001kumo_sawaru.jpg",
  "001001katakaru02": "001001katakaru02.jpg",
  "002005osuwarirabura": "002005osuwarirabura.jpg",
  "002005mitan_hw": "002005mitan_hw.jpg",
  "002005wan_hw": "002005wan_hw.jpg",
  "001001katakaru_cvrset_re": "katakaru.jpg",
};

// ファイル名マッピングを保存するオブジェクト
const filenameMapping = {};

// IDから楽天キャビネット用のファイル名を生成するマッピング
const idToFilenameMap = {};

const MAX_FILENAME_LENGTH = 20; // ファイル名の最大長を設定

/**
 * ディレクトリ内のファイルを再帰的に処理する関数
 * @param {string} dirPath - 処理するディレクトリのパス
 */
function processDirectory(dirPath) {
  // ディレクトリ内のファイルとサブディレクトリを取得
  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // サブディレクトリを再帰的に処理
      processDirectory(itemPath);
    } else if (stats.isFile()) {
      // ファイルを処理
      processFile(dirPath, item);
    }
  });
}

/**
 * ファイル名から商品IDを抽出する関数
 * @param {string} filename - ファイル名
 * @returns {string} - 抽出された商品ID
 */
function extractProductId(filename) {
  // 完全なファイル名マッピングがある場合はそれを使用
  if (FULL_FILENAME_MAPPING[filename]) {
    const mappedFilename = FULL_FILENAME_MAPPING[filename];
    return mappedFilename.replace(/\.jpg$/, "");
  }

  const basename = path.basename(filename, path.extname(filename));

  // 商品IDを抽出（数字とアルファベットの組み合わせ）
  const idMatch = basename.match(PRODUCT_ID_PATTERN);

  if (!idMatch || !idMatch[1]) {
    // IDが見つからない場合はファイル名全体を使用
    return basename.toLowerCase();
  }

  let productId = idMatch[1];

  // 特殊なケースの処理
  if (SPECIAL_ID_MAPPING[productId]) {
    return SPECIAL_ID_MAPPING[productId];
  }

  // ファイル名に特定のパターンが含まれる場合の処理
  if (basename.includes("kumo_pet_round")) {
    return "003001kumo_petsofa_r";
  } else if (basename.includes("kumo_pet_square")) {
    return "003001kumo_petsofa";
  } else if (basename.includes("DARUMA_gentei")) {
    return "003001daruman_gentei";
  } else if (basename.includes("KIMOCHI_karada")) {
    return "001001kimochi_karada";
  } else if (basename.includes("KUMO_sawa")) {
    return "002001kumo_sawaru";
  } else if (basename === "katakaru2") {
    return "001001katakaru02";
  } else if (basename === "osuwarirabura") {
    return "002005osuwarirabura";
  }

  // 接尾辞を除去
  for (const pattern of EXCLUDE_PATTERNS) {
    productId = productId.replace(pattern, "");
  }

  return productId.toLowerCase();
}

/**
 * ファイルを処理する関数
 * @param {string} dirPath - ファイルが存在するディレクトリのパス
 * @param {string} filename - ファイル名
 */
function processFile(dirPath, filename) {
  // スキップパターンに一致する場合は処理しない
  if (CONFIG.skipPatterns.some((pattern) => pattern.test(filename))) {
    console.log(`スキップ: ${filename}`);
    return;
  }

  const ext = path.extname(filename).toLowerCase();

  // 対象の画像ファイル拡張子でない場合は処理しない
  if (!CONFIG.imageExtensions.includes(ext)) {
    return;
  }

  // 完全なファイル名マッピングがある場合はそれを使用
  let rakutenFilename = "";
  if (FULL_FILENAME_MAPPING[filename]) {
    rakutenFilename = FULL_FILENAME_MAPPING[filename];
    console.log(`マッピング使用: ${filename} -> ${rakutenFilename}`);
  } else {
    // 商品IDを抽出
    const productId = extractProductId(filename);

    // 楽天キャビネット用のファイル名を生成（シンプルに商品IDのみ）
    rakutenFilename = productId + ext;

    // すべて小文字に変換
    rakutenFilename = rakutenFilename.toLowerCase();

    console.log(`変換: ${filename} -> ${rakutenFilename} (ID: ${productId})`);
  }

  // 出力先ディレクトリを設定
  let outputDirPath = dirPath;
  if (CONFIG.outputDir) {
    // 相対パスを取得して出力先ディレクトリに結合
    const relativePath = path.relative(CONFIG.rootDir, dirPath);
    outputDirPath = path.join(CONFIG.outputDir, relativePath);

    // 出力先ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
  }

  const originalPath = path.join(dirPath, filename);
  const newPath = path.join(outputDirPath, rakutenFilename);

  // 変換前後のファイル名をマッピングに追加
  const relativePath = path.relative(CONFIG.rootDir, dirPath);
  const originalRelativePath = path.join(relativePath, filename);
  const newRelativePath = path.join(
    CONFIG.outputDir ? path.relative(__dirname, outputDirPath) : relativePath,
    rakutenFilename
  );

  filenameMapping[originalRelativePath] = newRelativePath;

  // 商品IDとファイル名のマッピングを追加
  const productId = rakutenFilename.replace(/\.jpg$/, "");
  if (productId) {
    idToFilenameMap[productId] = rakutenFilename;
  }

  // 実際にファイルをコピーまたは変更
  if (!CONFIG.dryRun) {
    if (CONFIG.outputDir) {
      // 新しいディレクトリにコピー
      fs.copyFileSync(originalPath, newPath);
    } else {
      // 元のディレクトリでリネーム
      fs.renameSync(originalPath, newPath);
    }
  }
}

function convertFilename(originalFilename) {
  // 拡張子を取得
  const ext = path.extname(originalFilename).toLowerCase();
  // 拡張子を除いたベース名を取得
  let baseName = path.basename(originalFilename, ext).toLowerCase();

  // ファイル名が長すぎる場合は短縮
  if (baseName.length > MAX_FILENAME_LENGTH) {
    // 商品ID部分（先頭の数字）を保持
    const idMatch = baseName.match(/^(\d+)/);
    const idPart = idMatch ? idMatch[1] : "";

    // 残りの部分を短縮
    const remainingPart = baseName.slice(idPart.length);
    const shortenedPart = remainingPart.slice(
      0,
      MAX_FILENAME_LENGTH - idPart.length - 1
    );

    baseName = idPart + shortenedPart;
  }

  return baseName + ext;
}

/**
 * メイン処理
 */
function main() {
  console.log("画像ファイル名の変換を開始します...");

  // ルートディレクトリが存在するか確認
  if (!fs.existsSync(CONFIG.rootDir)) {
    console.error(`エラー: ディレクトリ ${CONFIG.rootDir} が見つかりません。`);
    process.exit(1);
  }

  // 出力ディレクトリが指定されている場合は作成
  if (CONFIG.outputDir && !fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 必要なセクションディレクトリを作成
  const sectionDirs = [
    "01_1000円ポッキリ",
    "02_今売れている人気アイテム",
    "03_新商品",
    "04_セット販売お買い得品",
    "other",
  ];

  if (CONFIG.outputDir) {
    sectionDirs.forEach((dir) => {
      const sectionPath = path.join(CONFIG.outputDir, dir);
      if (!fs.existsSync(sectionPath)) {
        fs.mkdirSync(sectionPath, { recursive: true });
        console.log(`ディレクトリを作成しました: ${sectionPath}`);
      }
    });
  }

  // ディレクトリを再帰的に処理
  processDirectory(CONFIG.rootDir);

  // 強制的に設定するマッピングを追加
  Object.keys(FORCED_ID_MAPPING).forEach((id) => {
    idToFilenameMap[id] = FORCED_ID_MAPPING[id];
    console.log(`強制マッピング追加: ${id} -> ${FORCED_ID_MAPPING[id]}`);
  });

  // マッピングをJSONファイルに保存
  fs.writeFileSync(
    CONFIG.mappingFile,
    JSON.stringify(filenameMapping, null, 2),
    "utf-8"
  );

  // 商品IDとファイル名のマッピングを保存
  fs.writeFileSync(
    path.join(__dirname, "image_id_mapping.json"),
    JSON.stringify(idToFilenameMap, null, 2),
    "utf-8"
  );

  console.log(
    `\n変換完了！ ${
      Object.keys(filenameMapping).length
    } 件のファイルを処理しました。`
  );
  console.log(`マッピングを ${CONFIG.mappingFile} に保存しました。`);
  console.log(
    `商品IDマッピングを ${path.join(
      __dirname,
      "image_id_mapping.json"
    )} に保存しました。`
  );

  if (CONFIG.dryRun) {
    console.log(
      "\n注意: これはドライランです。実際のファイルは変更/コピーされていません。"
    );
    console.log(
      "実際にファイルを変換するには、CONFIG.dryRun を false に設定してください。"
    );
  }
}

// スクリプトを実行
main();
