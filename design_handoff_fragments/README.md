# Handoff: fragments（Web メディア）

## Overview
「fragments」は建築・空間・デザインをめぐる長文（批評・エッセイ・論考）中心の個人メディア。
キャッチ：「建築・空間・デザインをめぐる思索、試論 / Explorations and Abductive Speculations on Architecture, Space, and Design.」
特徴は **左に記事索引・中央に本文・本文の横に注（サイドノート）** という紙面的な組版と、Substack を使ったメール購読。

## About the Design Files
同梱の HTML は **デザインの参照用プロトタイプ** であり、そのまま本番に使うコードではない。
目的は、これらの見た目と挙動を **実装先の環境で作り直すこと**。既存のコードベースがなければ、静的サイト向けのフレームワーク（例：Astro / Next.js の SSG）を推奨する。記事は Markdown/MDX、または Substack の RSS から取り込む想定。

- `fragments v2.dc.html` … **メイン（明朝版）**。全画面（p1〜p8）と、画面外にあるテスト用の設定パネル（色・書体）を含む。
- `fragments v2 gothic.dc.html` … 全体をゴシックにした比較用。※モバイル・タブレット画面の追加より前の状態。参考程度に。
- `fragments substack.dc.html` … Substack 連携の検討（s1〜s6）。
- `styles.css` … ベースのデザインシステム（Classical）。トークンの元。
- `.dc.html` はブラウザで直接開ける（同じフォルダに `support.js` が必要）。

## Fidelity
**High-fidelity、ピクセル単位で完全に再現する。** 色・書体・寸法・余白・挙動は確定値として扱う。
例外として、記事タイトル・本文の一部・注・画像・カード・SNS リンク先は仮のもの。

### 再現の手順（Claude Code へ）
1. **数値の正は `fragments v2.dc.html` のインラインスタイル**とする。README と食い違う場合は HTML を優先する。値を丸めたり、近い値の Tailwind クラスに置き換えたりしない（例：`gap:56px` を `gap-14` にするのは可。ただし 13px を `text-sm`（14px）にするのは不可）。
2. 各画面は `screenshots/` の画像と同じサイズで表示し、並べて比べる（PC 1440×960、タブレット 834×1112、モバイル 390×844）。ずれが 1px でもあれば直す。
3. 動きのある部分（スクロールバーのフェード、注のホバーとジャンプ、カテゴリの絞り込み、さらに読み込む、購読の送信）は、プロトタイプをブラウザで開き、実際に操作して比べる。
4. 書体は Google Fonts の同じウェイトだけを読み込む。代わりの書体にしない。
5. テスト用の設定パネルと、画面の外にある説明文・ラベル（p1〜p8 のバッジ、「この画面について」）は、表示用なので実装しない。

### スクリーンショット（`screenshots/`）
- `p1-top.png`・`p2-article.png`・`p8-article-elements.png`・`p3-about.png`：PC 1440×960
- `p7-tablet-top.png`・`p6-tablet-article.png`：タブレット 834×1112
- `p4-mobile-top.png`・`p5-mobile-article.png`：モバイル 390×844（2倍）

---

## Design Tokens

### Color
| Token | Value | 用途 |
|---|---|---|
| bg | `#f3f2f2` | 紙面の地 |
| text | `#201f1d` | 本文 |
| accent | `#0000ff`（RGB 0,0,255） | 注番号の四角・リンク・選択中の項目・Subscribe |
| accent-hover | `#0000d8` | ボタンのホバー |
| accent-100 | `#e8e8ff` | 注のハイライト、Subscribed の帯 |
| accent-900 | `#000080` | 注番号の四角（ホバーまたは連動中） |
| neutral-700 | `#605d5d` | サブタイトル・日付・キャプション |
| neutral-800 | `#444141` | 注の本文・説明文 |
| neutral-500 | `#9b9797` | プレースホルダ、「さらに読み込む」 |
| neutral-400 | `#bab6b6` | カテゴリで絞り込んだときの対象外の記事 |
| rule（強） | neutral-700 | ヘッダー下・フッター（記事の最下部）の区切り線 |
| divider（弱） | text 16%（`color-mix(in srgb,#201f1d 16%,transparent)`） | 薄い区切り線 |
| selection | 背景 accent、文字 `#fff` | テキストを選択したとき |

### Typography
- 和文（本文・注・索引）：**Zen Old Mincho** 400
- 和文（見出し・サブタイトル）：**Shippori Mincho** 500 / 400
- 欧文（サイト名「fragments」）：**Cormorant Garamond** 400
- 欧文（日付・カテゴリ・about/subscribe・注番号）：**Lora** 400。数字は `font-variant-numeric: tabular-nums`
- 太字は使わない（見出しも 500 まで）

| 要素 | PC | タブレット | モバイル |
|---|---|---|---|
| サイト名 | 30px / lh1.2 | 28px | 26px（トップ）／22px（記事） |
| 記事タイトル h1 | clamp(26px, 1.4rem+0.6vw, 32px) / lh1.4 / ls0.02em | 28px | 24px |
| サブタイトル | 17px / lh1.6 | 15px | 15px |
| 記事の日付 | Lora 12px（タイトル下 margin-top 10px） | 同 | 同 |
| 本文 | clamp(15px, 0.8rem+0.2vw, 16px) / lh1.9 / ls0.02em / 両端揃え / 字下げ 1em / 段落間 0 | 15.5px | 15.5px |
| 本文の行長 | 最大 34em（全角約34字） | 30em | 段の幅 |
| 注 | 13px / lh1.8 / neutral-800 | 13px | 13px |
| 注の書誌行 | Lora 12px / lh1.6 / neutral-700 | 同 | 同 |
| 索引の説明文 | 13px / lh1.75 | 同 | 同 |
| 記事一覧 | 13px（タイトル・サブタイトル・日付とも同じ大きさで色だけ変える） | 14px | 14px |
| 一覧の日付（2行目） | Lora 10.5px | 11px | 11px |
| h2（記事内） | Shippori 22px / 上 2.2em・下 0.8em | | |
| h3（記事内） | Shippori 17px / 上 1.8em・下 0.4em | | |

### Spacing / その他
- 角丸：基本 0（購読欄・カードは直角）。注番号の四角だけ 1px。
- 影：使わない（プロトタイプのアートボードの影は表示用）。

---

## Layout

### ブレークポイント
| 幅 | 構成 |
|---|---|
| ≥1200px | 3段。索引（360px）／gap 56px／右の段（本文＋注）。外側の余白は上48・左右32・下32px |
| 760–1199px | トップ＝索引のみ（340px）。記事＝索引なしで本文（30em）＋注（210px、本文から40px） |
| ≤759px | 1段。トップ＝記事一覧。記事＝注は本文の最後にまとめる |

### スクロール（全デバイス共通）
- 画面の高さは 100vh で固定。**各段（索引／本文）がそれぞれ独立してスクロール**する（`overflow-y:auto`）。ページ全体はスクロールしない。
- ブラウザ標準のスクロールバーは隠す（`scrollbar-width:none` と `::-webkit-scrollbar{display:none}`）。
- 代わりに **幅1pxのつまみ**（neutral-500）を自前で描く。表示はスクロール中だけで、フェードインは 0.2s、止まってから 700ms 後に 0.6s かけてフェードアウトする。つまみが動く範囲は、ヘッダーの区切り線の 10px 下から、段の下端の 10px 手前まで。
- ヘッダー（サイト名と区切り線）は `position:sticky; top:0` で固定する。
- 段を最下部までスクロールしたときだけ、**下端の区切り線**（1px、neutral-700）を 0.5s でフェードインする（索引の段・記事の段とも）。about ページの段は常に表示する。

### 揃え（PC）
- 左右の区切り線は同じ高さにそろえる（サイト名 30px×lh1.2 ＋ 下余白 6px ＋ 線 1px）。
- 区切り線から **56px** 下に、索引の説明文と記事タイトルの上端をそろえる。
- 区切り線から **約 222px** 下に、カテゴリ行の文字の上端と本文1行目の文字の上端をそろえる（どちらも文字の上端で合わせ、行の上の余白の差は補正する）。

---

## Screens

### p1 トップ（PC）
索引の段だけを表示し、右側は空ける。

### 索引の段（PC・タブレット共通の部品）
上から順に次を並べる。
1. 「fragments」（sticky）＋下の区切り線
2. 説明文（和文 Zen Old Mincho、英文 Lora italic）
3. カテゴリ：`all / essay / days / books / spaces`（Lora 13px）。選択中は accent の文字＋1px の下線。選ぶと、対象外の記事のタイトル・サブタイトル・日付を neutral-400 に薄くする（記事は非表示にしない）。
4. 記事一覧。各項目は2行で、1行目がタイトル＋サブタイトル（neutral-700、間隔 8px）。収まらない分は1行で `…` に省略する。2行目は日付。読んでいる記事は accent。項目間に線は引かない。
5. 「さらに読み込む」（neutral-500、上に薄い線）。最初は **20件** を表示し、押すたびに20件を末尾に追加する。押すと 600ms ほど「読み込み中…」と出す。全件出たら消す。
6. `about`（text 色）／`subscribe`（accent）。すべて小文字。

### p2 記事（PC）
- 右の段：ヘッダー線 → タイトル・サブタイトル・日付 → 本文（34em）。
- **注（サイドノート）**：参照している段落の中に float で置く（`float:right; clear:right; width:300px; margin-right:-388px`。本文と注のあいだは 88px）。注は「番号の四角＋見出し」「書誌（Lora 12px）」「本文」の3段で組む。
- **注番号**：本文中も注の側も 15×15px の accent の四角に白い数字（Lora 10px）。`text-indent:0` を必ず指定する。番号か注にホバーすると、両方の四角を accent-900 にし、注の背景を accent-100 にする。本文の番号をクリックすると注へ、注の番号をクリックすると本文へスムーズスクロールし、1.6s ハイライトする。スクロールは各段の中で行う。
- 本文の最後から順に次を置く。
  1. 購読欄（下記）。上に薄い線。本文の終わりから 96px 下。
  2. 前の記事／次の記事（2列、次の記事は右寄せ）。購読欄から 40px 下で、線は引かない。
  3. 「関連する記事」（Lora 11px のラベル＋3件。各記事はタイトル＋サブタイトル／日付の2行で、項目間に線は引かない）。

### 購読欄（全デバイス共通）
- 1本の枠：`border:1px solid accent; height:34px; 角は直角`
- 左に入力欄。プレースホルダは「email@example.com　新着記事をメールで受け取る」で、書体は Lora と Zen Old Mincho、12px（モバイルは 10.5px）、neutral-500。入力した文字は 14px（モバイルは iOS で画面が拡大されないよう 16px）。フォーカス時は inset 0.5px の accent。標準のフォーカスリングは出さない。
- 右に「Subscribe」ボタン。背景 accent、文字は白で Lora 13px、左右の余白 14px。ホバー時は `#0000d8`。
- 送信：ボタンのクリックまたは Enter で送る。「@」を含まない入力では何もしない。送信中は 800ms ほど「Sending…」と出す。完了すると、欄を同じ高さの accent-100 の帯（「✓」の四角＋「Subscribed」）に置き換え、その下に 11.5px で「{email} に確認メールを送りました。メール内のリンクを押すと登録が完了します。」を出す。
- **バックエンドは未定**。候補は (a) 自前のフォームから Substack に送る（Substack が公式に公開している API ではない）、(b) Supascribe などの外部サービス、(c) Substack の公式埋め込み（iframe）に切り替える。`fragments substack.dc.html` を参照。

### p8 記事の要素見本（PC）
h2・h3、画像（3:2、`border:6px solid #eae9e9` ＋ 1px の divider の outline、キャプション 12px）、引用（左に 1px accent の線、`padding-left:1.5em`、出典 12px）、書籍カード（72×104 の表紙＋書名・著者・出版社＋右下に「Amazon ↗」。1px の divider の枠で、ホバー時は accent）、外部リンクのカード（ドメイン・タイトル・説明）、箇条書き。

### p3 about（PC）
見出しは「about」（小文字）。本文の位置にキャッチと説明文、右に Contact（mail・Twitter・Instagram・Facebook・Website）。下端の区切り線は常に表示する。

### p4 モバイル：トップ
「fragments」（26px、sticky）＋線 → 説明文（上に 20px）→ カテゴリ（横並び、はみ出す分は横スクロール、押せる範囲を確保）→ 記事一覧（各行 padding 9px 0、線なし）→ さらに読み込む → about / subscribe。

### p5 モバイル：記事
- 「fragments」（22px、トップへのリンク、sticky）→ タイトル・サブタイトル・日付 → 本文。
- 注番号は 18×18px の四角。押すと本文の最後にまとめた注へスクロールし、注の頭の番号を押すと本文に戻る。
- 本文と注のあいだの線は薄く（divider）、注どうしのあいだに線は引かない（padding 10px 0）。
- 注の最後から 24px 下に濃い線（text 色）を引き、その 48px 下に購読欄 → 32px 空けて前の記事・次の記事（線なし）→ 関連する記事。

### p7 タブレット：トップ／p6 タブレット：記事
- p7：PC の索引と同じ構成（幅 340px、ヘッダー線も 340px）。
- p6：「fragments」（トップへのリンク）だけのヘッダーで、目次はない。本文は 30em、注は 210px で本文から 40px（`margin-right:-250px`）。末尾の構成は PC と同じ。

---

## State
- `category`：`'all' | 'essay' | 'days' | 'books' | 'spaces'`
- `listLimit`：20 から始めて 20 ずつ増やす。`loadingMore`
- `activeNote`：ホバー中またはジャンプ直後の注の ID
- `subscribe`：`{ email, sending, done }`
- 記事データ：`{ slug, date, title, subtitle, category, body(MDX), notes[] }`。関連する記事の選び方（同じカテゴリから選ぶ、など）は未定。

## テスト用の設定パネル（本番には含めない）
`fragments v2.dc.html` の上部にあるパネルで、背景・文字・差し色・選択時の色と、場所ごとの書体（サイト名・見出し・サブタイトル・本文・注・索引）を切り替えられる。CSS 変数を上書きして試すためのもの。最終値は上の Tokens を正とする。

## Assets
画像・書影・ロゴはすべて仮。アイコンは使っていない（矢印 ↗ → は文字）。
フォントは Google Fonts（Cormorant Garamond、Lora、Shippori Mincho、Zen Old Mincho）。

## 完全に再現するための進め方
デザインを寸分違わず再現することが目的。次の順で進める。
1. **値の正は HTML の inline style。** 各要素の寸法・色・余白は `fragments v2.dc.html` の `style="…"` にすべて直書きしてある。README と食い違うときは HTML を優先する。
2. **画面ごとに見比べる。** `screenshots/` の PNG（PC は 1440×960、タブレットは 834×1112、モバイルは 390×844 を2倍で書き出したもの）と、実装した画面を同じサイズで並べ、ずれがなくなるまで直す。
3. **挙動は HTML を開いて確かめる。** 注のホバーとジャンプ、カテゴリの絞り込み、「さらに読み込む」、Subscribe の送信中から完了までの表示、スクロール中だけ出るつまみ、最下部の区切り線は、ブラウザで `fragments v2.dc.html` を開いて実際に触って確かめる。ロジックはファイル末尾の `class Component` にある。
4. **テスト用の設定パネルはリセットした状態で見る。** パネルで色や書体を変えたままだと、見本の見た目が変わってしまう。

## Screenshots
- `screenshots/p1-top-pc.png` … トップ（PC）
- `screenshots/p2-article-pc.png` … 記事（PC）
- `screenshots/p8-article-elements-pc.png` … 記事の要素見本（PC）
- `screenshots/p3-about-pc.png` … about（PC）
- `screenshots/p7-top-tablet.png`、`p6-article-tablet.png` … タブレット
- `screenshots/p4-top-mobile.png`、`p5-article-mobile.png` … モバイル（2倍）
※ スクロールする段は、いちばん上の状態で撮っている。

## Files
- `fragments v2.dc.html`（メイン）
- `fragments v2 gothic.dc.html`（比較用）
- `fragments substack.dc.html`（購読の検討）
- `styles.css`（Classical デザインシステム）
