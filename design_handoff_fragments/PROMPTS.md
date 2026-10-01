# Claude Code への依頼文（順番に使う）

新しい空のリポジトリに `design_handoff_fragments/` をフォルダごと置いてから始める。
各ステップは1回の依頼で1つずつ進める。ステップが終わったら、ブラウザで見本と並べて確認し、OK を出してから次へ進む。

---

## 共通ルール（最初の依頼に必ず含める）

```
このリポジトリで、Web メディア「fragments」を実装します。
design_handoff_fragments/ にデザインの引き継ぎ一式があります。最初に README.md を全部読んでください。

守ってほしいルール：
- 目的は、見本のデザインをピクセル単位で完全に再現することです。デザインの改善や提案はしないでください。
- CSS の値の正は design_handoff_fragments/fragments v2.dc.html のインラインスタイルです。README と食い違う場合は HTML を優先してください。
- 値は丸めない、近い値に置き換えない、勝手に余白を足さない。
- フレームワークは Astro、スタイルは素の CSS（CSS 変数＋コンポーネント単位の <style>）。Tailwind や UI ライブラリ、リセット CSS ライブラリは使わない。
- フォントは Google Fonts の Cormorant Garamond 400、Lora 400（italic も）、Shippori Mincho 400/500、Zen Old Mincho 400 だけを読み込む。
- 見本の HTML にあるテスト用の設定パネル、p1〜p8 のバッジ、画面外の説明文は実装しない。
- 不明な点があれば、推測で埋めずに質問してください。
- 各ステップの最後に、見本と並べて比べた結果（どこが一致し、どこがまだずれているか）を報告してください。
```

---

## Step 0：土台

```
（共通ルールを貼る）

Step 0 として、土台だけ作ってください。
1. Astro のプロジェクトを作成する（TypeScript、テンプレートは minimal）。
2. src/styles/tokens.css に、README の Design Tokens（色・書体）を CSS 変数として定義する。値は fragments v2.dc.html と design_handoff_fragments/styles.css の :root から写す。
   - 差し色は #0000ff。accent-100 は #e8e8ff、accent-900 は #000080、hover は #0000d8。
   - ::selection は背景を差し色、文字を #fff にする。
3. src/styles/base.css で body のリセットを行う（margin 0、背景 --color-bg、文字 --color-text、-webkit-font-smoothing antialiased）。
4. 記事データの型（slug, date, title, subtitle, category, body, notes[]）と、ダミー記事を 45 件作る。タイトルと本文は fragments v2.dc.html の記事一覧から写し、カテゴリも見本と同じにする。記事は Astro の Content Collections（Markdown）で管理する。
まだ画面は作らないでください。
```

## Step 1：PC 記事ページ（p2）の骨組み

```
Step 1：PC の記事ページ（p2）のレイアウトだけを作ってください。参照する画像は screenshots/p2-article.png です。
- 1440×960 で表示したときに、画像と同じになるようにする。
- 画面の高さは 100vh で固定し、ページ全体はスクロールさせない。左の索引の段（幅 360px）と右の記事の段は、それぞれ独立してスクロールさせる。
- ブラウザ標準のスクロールバーは隠す（scrollbar-width:none と ::-webkit-scrollbar{display:none}）。
- ヘッダー（「fragments」30px と下の区切り線）は、左右とも position:sticky で固定する。左右の線は同じ高さにそろえる。
- 区切り線から 56px 下に、索引の説明文と記事タイトルの上端をそろえる。カテゴリ行の文字の上端と、本文1行目の文字の上端もそろえる（数値は HTML から写す）。
- 本文は最大 34em、両端揃え、字下げ 1em、段落間 0。
注・スクロールバー・購読欄はまだ作らないでください。
最後に Playwright で 1440×960 のスクリーンショットを撮り、screenshots/p2-article.png と重ねて差分を報告してください。
```

## Step 2：サイドノート（注）

```
Step 2：p2 の注を実装してください。
- 注は、参照している段落の中に float で置く。値は HTML の id="note-n1" の要素から写す（float:right; clear:right; width:300px; margin-right:-388px など）。
- 注番号は 15×15px の差し色の四角に白い数字（Lora 10px、tabular-nums）。text-indent:0 を必ず指定し、vertical-align や margin も HTML どおりにする。
- 番号か注にホバーすると、両方の四角を accent-900 にし、注の背景を accent-100 にする。
- 本文の番号をクリックすると注へ、注の番号をクリックすると本文へ、記事の段の中でスムーズスクロールし、1.6 秒ハイライトする。
- 注は「番号＋見出し」「書誌（Lora 12px）」「本文」の3段で組む。
- HTML の構造は、本文を <article>、注を <aside>、索引を <nav> にする。番号と注は id で相互にリンクさせ、JavaScript がなくても飛べるようにする。
```

## Step 3：自前のスクロールバーと末尾の区切り線

```
Step 3：スクロールの表示を実装してください。
- 各段の右端に、幅 1px のつまみ（neutral-500）を自前で描く。
- 表示はスクロール中だけ。フェードインは 0.2s、止まってから 700ms 後に 0.6s かけてフェードアウトする。
- つまみが動く範囲は、ヘッダーの区切り線の 10px 下から、段の下端の 10px 手前まで。
- 段を最下部までスクロールしたときだけ、下端の区切り線（1px、neutral-700）を 0.5s でフェードインする。
- 実装は小さな素の JS（Astro の <script>）で行い、ライブラリは使わない。
実装の参考に、fragments v2.dc.html の componentDidMount にあるスクロールの処理を読んでください。
```

## Step 4：索引の段（カテゴリ・一覧・さらに読み込む）

```
Step 4：左の索引の段を仕上げてください。
- カテゴリ all / essay / days / books / spaces（Lora 13px）。選択中は差し色の文字に 1px の下線。選ぶと、対象外の記事のタイトル・サブタイトル・日付を neutral-400 に薄くする（記事は非表示にしない）。
- 記事一覧の各項目は2行で、1行目がタイトル＋サブタイトル（間隔 8px）。収まらない分は1行で … に省略する。2行目は日付（Lora 10.5px）。読んでいる記事は差し色。項目間に線は引かない。
- 「さらに読み込む」：最初は 20 件を表示し、押すたびに 20 件を末尾に追加する。押すと 600ms ほど「読み込み中…」と出し、全件出たら消す。色は neutral-500 で、上に薄い線。
- 一覧の下に about（文字色）と subscribe（差し色）を置く。すべて小文字。
- 文字の大きさや行間は HTML の値を写す。
```

## Step 5：記事末尾（購読欄・前後の記事・関連する記事）

```
Step 5：記事の末尾を作ってください。
- 本文の終わりから 96px 下に購読欄を置く。上に薄い線を引く。
- 購読欄：1本の枠（1px の差し色、高さ 34px、角は直角）。左が入力欄、右が「Subscribe」ボタン（背景は差し色、文字は白で Lora 13px）。
  - プレースホルダは「email@example.com　新着記事をメールで受け取る」で、12px、neutral-500（モバイルは 10.5px）。入力した文字は 14px（モバイルは 16px）。
  - フォーカス時は inset 0.5px の差し色。ブラウザ標準のフォーカスリングは出さない。
  - ボタンのクリックまたは Enter で送信する。送信中は 800ms ほど「Sending…」と出し、完了すると「✓ Subscribed」の帯（accent-100）と確認メールの案内文に切り替える。
  - 送信先はまだ決まっていないので、src/lib/subscribe.ts に関数だけを用意し、中身はダミーにしておく。
- 購読欄から 40px 下に、前の記事と次の記事を2列で並べる（線なし）。その下に「関連する記事」を3件（同じカテゴリの新しい順）。
```

## Step 6：トップ（p1）・about（p3）・記事要素（p8）

```
Step 6：残りの PC の画面を作ってください。
- p1 トップ：索引の段だけを表示し、右側は空ける（screenshots/p1-top.png）。
- p3 about：見出しは「about」（小文字）。本文の位置にキャッチと説明文、右に Contact（mail・Twitter・Instagram・Facebook・Website）。下端の区切り線は常に表示する（screenshots/p3-about.png）。
- p8：記事の要素（h2・h3・画像・キャプション・引用・書籍カード・リンクカード・箇条書き）を、Markdown/MDX から使えるコンポーネントにする。見た目は screenshots/p8-article-elements.png と HTML を写す。書籍カードは <BookCard title author publisher year url cover /> のように使えるようにする。
```

## Step 7：タブレット・モバイル

```
Step 7：レスポンシブ対応を行ってください。
- 760〜1199px（タブレット）：トップは索引のみ（幅 340px、ヘッダーの線も 340px）。記事は索引なしで、本文 30em ＋注 210px（本文から 40px、margin-right:-250px）。ヘッダーは「fragments」（トップへのリンク）だけ。参照は screenshots/p7-tablet-top.png と p6-tablet-article.png（834×1112）。
- 759px 以下（モバイル）：1段。注は本文の最後にまとめ、番号は 18×18px。注の部分は「薄い線 → 注（線なし、padding 10px 0）→ 24px 空けて濃い線 → 48px 空けて購読欄 → 32px 空けて前の記事・次の記事 → 関連する記事」の順。参照は p4-mobile-top.png と p5-mobile-article.png（390×844）。
- スクロールの挙動（独立スクロール、自前のスクロールバー、末尾の区切り線）は全デバイスで同じにする。
- 各ブレークポイントの値は、HTML の p4〜p7 から写す。
最後に 1440 / 834 / 390 の3つの幅でスクリーンショットを撮り、見本と比べてください。
```

## Step 8：仕上げ（SEO・AI 向けの情報構造）

```
Step 8：公開に向けた仕上げをしてください。
- 記事ごとに JSON-LD（Article：headline, alternativeHeadline, author, datePublished, dateModified, articleSection, keywords）を入れる。サイト全体には WebSite と Person。
- sitemap.xml、RSS（/rss.xml）、robots.txt（AI の収集ボットを拒否しない）、/llms.txt（メディアの説明と主要な記事の一覧）を出力する。
- OGP と Twitter カードを設定する。
- 本文がすべて静的な HTML として出力されていることを確認する（JavaScript を切っても読めること）。
- Lighthouse を実行して結果を報告する（見た目は変えないこと）。
```

---

## ずれを直してもらうときの言い方

```
p2 の [どこ] が見本と [何px / どう] 違います。
fragments v2.dc.html の [該当する要素や文言] のインラインスタイルを確認し、同じ値にしてください。ほかの場所は変えないでください。
```

例：「本文の1行目が、見本より 4px 下にあります。fragments v2.dc.html の本文の先頭の div の padding-top を確認して、同じ値にしてください。」
