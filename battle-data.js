(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RVG_BATTLES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function fx(key, delta) { return { key: key, delta: delta }; }

  // 台詞行（06_script.md の `話者名「台詞」`）と演出行（`【演出】`）
  function sp(speaker, text) { return { speaker: speaker, text: text }; }
  function stg(text) { return { speaker: null, text: text }; }

  const RESOLUTION_LABELS = {
    destroy: "物理停止",
    control: "制御奪取",
    dialogue: "対話解決",
    avoid: "抑え込み",
    retreated: "撤退"
  };

  const GAIN_CAPS = {
    gadget_analysis: 12,
    ai_mastery: 4,
    freedom_insight: 6,
    order_insight: 10,
    trust_exp: 3
  };

  // 行動の結果に対する対象（機械）の反応。数値には影響しない演出
  const REACTIONS = {
    integrityDown: [
      "装甲が軋み、駆動音が濁る",
      "外装の継ぎ目が開き、内部の光が漏れる",
      "各部の応答が、目に見えて鈍る"
    ],
    integrityUp: ["削れた面が塞がり、駆動音が元へ戻る"],
    controlUp: [
      "制御系統の一部が、こちらの手に落ちる",
      "判定テーブルの書き換え権が、少しずつ移る",
      "命令の宛先が、こちら側へ向き直る"
    ],
    progressUp: ["最適化が、先へ進む"],
    progressDown: ["最適化の進行が、押し戻される"],
    moraleUp: ["隊の呼吸が整う"],
    // 攻撃してこない相手であることを、手を出した側に伝える
    passive: "この個体は攻撃してこない。ただ、守りを固め続けている"
  };

  // 敵の行動パターン（原作 comic 4P「こいつら同期してやがるのか…」「同期のラグをつけば勝てる！」）。
  // 周期で回り、sync のターンだけ無防備になる。読めば勝てる／読まなければ削られる
  function beat(name, detail, opts) {
    return Object.assign({ name: name, detail: detail }, opts || {});
  }

  // guard の拍は守りが固く、こちらの手がまったく通らない（＝読み間違えるとダメージ0）。
  // sync の拍は無防備で、叩けば3倍。それ以外の拍は普通に通る。
  const PATTERNS = {
    // 中継ノード・α／β、rc境界。4拍で1周
    guard_sync: [
      beat("一斉射撃", "護衛機が同時に撃ってくる", { attack: 10 }),
      beat("防壁再構成", "全機が壁を建て直す。硬い", { repair: 10, guard: true }),
      beat("割り込み書き換え", "生活系統へ手を伸ばす", { civilian: true }),
      beat("同期", "全機が指令を取り直す——無防備になる", { sync: true })
    ],
    // 粗い継ぎ接ぎのEX系。3拍と短く隙も早いが、火力が高い
    rough_sync: [
      beat("掃射", "狙いも粗いまま撃ってくる", { attack: 13 }),
      beat("同期", "継ぎ接ぎの指令が揃う——無防備になる", { sync: true }),
      beat("再構成", "同じ壁を、同じ場所に建て直す。硬い", { repair: 8, guard: true })
    ],
    // 中枢級。5拍と長く、守りの拍が2つある
    core_sync: [
      beat("最終同期", "統一の処理を先へ進める", { progress: 12 }),
      beat("防衛判定", "非効率と判定したものを弾く。硬い", { attack: 10, guard: true }),
      beat("割り込み書き換え", "生活系統へ手を伸ばす", { civilian: true }),
      beat("演算集中", "全系統が同じ計算に入る——無防備になる", { sync: true }),
      beat("再配置", "防壁を組み替える。硬い", { repair: 10, guard: true })
    ],
    // 群体（代行機群・無人デモ群）。数で押してくる
    swarm_sync: [
      beat("一斉展開", "群れが同時に動き出す", { attack: 8 }),
      beat("決定の上書き", "市民の決めかけた用事を書き換える", { civilian: true }),
      beat("群体同期", "全機の指令が一つに揃う——無防備になる", { sync: true }),
      beat("隊列再編", "崩れた列を組み直す。硬い", { repair: 6, guard: true })
    ],
    // 暴走した凍結網（RAML側の装置）。人は撃たない。ただ締め続ける
    frozen_loop: [
      beat("例外承認の拒否", "解除の申請を、片端から弾いていく", { civilian: true }),
      beat("過剰照合", "止める理由を、自分で足していく。硬い", { repair: 12, guard: true }),
      beat("演算の谷", "自問が一巡し、判定が空になる——無防備になる", { sync: true })
    ],
    // 最終同期の先導役。攻撃してこない。ひたすら前へ進める
    vanguard_sync: [
      beat("同期加速", "先導路の処理を一気に前へ送る", { progress: 15 }),
      beat("前進", "淡々と次の区画へ進む。取りつく島がない", { progress: 10, guard: true }),
      beat("演算切替", "先導の計算が切り替わる——無防備になる", { sync: true })
    ]
  };

  // 撤退イベント台詞（各章 06_script.md 付録）
  const RETREAT_LINES = {
    1: [sp("リコ", "引く！ 全員、市民側へ——守れるものから守る！")],
    2: [sp("リコ", "引く！ ……止めきれなかった分は、必ず戻って拾う！")],
    3: [sp("リコ", "引く！ ……止めきれなかった分は、必ず戻って拾う！")],
    4: [sp("リコ", "引く！ ……止めきれなかった分は、必ず戻って拾う！")]
  };

  // 正典スキル23種（chapter01/03 §2・§3・補助コマンド／chapter02/03 §3／chapter03/03 §3）。
  // node_control は掌握系（SK-FR-02 / SK-FR-07 / SK-CO-C2-02 / SK-FR-C3-01 / SK-OD-C3-01）でのみ積む
  // 手順は「選べば必ず相手を削る」ものだけに絞る（つる裁定 2026-07-31）。
  // 補助専用の手（封鎖・開示・無効化など）は理解の負荷が高いわりに手応えが無いため外した。
  // 例外はレントンのトリアージのみ＝隊を立て直す回復。
  const ACTIONS = {
    // ---- ショウ：大火力。完全性を削る ----
    "SK-OD-03": {
      id: "SK-OD-03", name: "フィジカルブレイク", user: "ショウ",
      detail: "正面から叩いて完全性を大きく削る",
      integrity: -30, tags: ["physical"],
      line: sp("ショウ", "……加減は、する")
    },
    "SK-OD-03-A": {
      id: "SK-OD-03-A", name: "加減", user: "ショウ",
      detail: "威力を落として削る。波及被害を出さない",
      integrity: -15, tags: ["tempered"],
      requires: { key: "trust_exp", value: 15 },
      line: sp("ショウ", "……こっちは、加減だ。言われたとおりに")
    },
    "SK-CO-02": {
      id: "SK-CO-02", name: "支えと突破", user: "ショウ＋レントン",
      detail: "二人がかりで押し込む。壊さずに完全性を削る",
      integrity: -20, gains: [fx("trust_exp", 3)], tags: ["coordination", "tempered"],
      requires: { key: "trust_exp", value: 15 },
      line: sp("レントン", "息、合わせるで。——支えるほうは、任せとき")
    },
    // ---- ノリ：解析と掌握。制御を積む ----
    "SK-AN-01": {
      id: "SK-AN-01", name: "解析", user: "ノリ",
      detail: "構造を読んで制御を進める。相手の周期も1拍ぶん見えてくる",
      control: 12, effect: "analyze_pattern",
      gains: [fx("gadget_analysis", 6), fx("ai_mastery", 2)], tags: ["analysis", "grasp"],
      line: sp("ノリ", "読めてきた。……この設計、こちらの手にも馴染む"),
      lineByChapter: { 4: sp("ノリ", "読めてます。……この規格、癖はいつもと同じです") }
    },
    "SK-FR-02": {
      id: "SK-FR-02", name: "β版の隙", user: "ノリ",
      detail: "まだ書かれていない場所を突いて、制御を大きく進める",
      control: 20, tags: ["grasp"],
      requiresAll: [{ key: "freedom_insight", value: 15 }, { key: "gadget_analysis", value: 30 }],
      exemptIn: ["BT-01"],
      line: sp("ノリ", "ここ、まだ書かれてません。——通ります")
    },
    "SK-FR-05": {
      id: "SK-FR-05", name: "バグ指摘", user: "ノリ",
      detail: "再現手順を突きつける。相手が自己修正に入り、完全性が落ちる",
      integrity: -20, gains: [fx("gadget_analysis", 3)], tags: ["ask"],
      requiresAll: [{ key: "freedom_insight", value: 25 }, { key: "gadget_analysis", value: 45 }],
      line: sp("ノリ", "ここ、再現します。……直したくなりましたか？")
    },
    // ---- レントン：現場の読みと、隊の立て直し ----
    "SK-AN-03": {
      id: "SK-AN-03", name: "パターン読み", user: "レントン",
      detail: "相手の周期を一息に読み切る。ついでに制御も進む",
      control: 10, effect: "read_pattern", gains: [fx("gadget_analysis", 3)], tags: ["analysis", "read"],
      line: sp("レントン", "動きに癖があるわ。……ゲームも戦場も、パターン解析すれば勝てるんよ")
    },
    "SK-OD-05": {
      id: "SK-OD-05", name: "トリアージ", user: "レントン",
      detail: "手当てをして隊を立て直す。RAML士気が回復する（唯一の回復手）",
      morale: 15, gains: [fx("order_insight", 3)], tags: ["order", "care"],
      line: sp("レントン", "先に、手が要る人からや。——回すで")
    },
    // ---- リコ：采配。制御を押さえる ----
    "SK-CO-01": {
      id: "SK-CO-01", name: "采配連携", user: "リコ＋任意",
      detail: "二人で押さえて制御を進める。この行動枠が1つ増える（1回だけ）",
      control: 15, effect: "extra_slot", once: true, gains: [fx("trust_exp", 3)], tags: ["coordination", "grasp"],
      requires: { key: "trust_exp", value: 10 },
      line: sp("リコ", "合わせて。——今！")
    },
    "SK-FR-07": {
      id: "SK-FR-07", name: "開放条項", user: "リコ",
      detail: "止めない。ただし手綱はこちらが握る。制御を大きく進める",
      control: 25, requiresBalance: true, tags: ["clause", "grasp"],
      line: sp("リコ", "止めない。ただし——手綱は、こちらにも握らせてもらう")
    },
    // ---- 全員 ----
    "SK-FR-01": {
      id: "SK-FR-01", name: "傾聴プロトコル", user: "全員",
      detail: "発信を遮らず最後まで聞く。理解が進み、制御も少し進む（進行は+5される）",
      control: 8, progress: 5,
      gains: [fx("gadget_analysis", 3), fx("freedom_insight", 3)], tags: ["listening", "grasp"],
      line: stg("敵の思想ブロードキャストを、遮らずに最後まで流す"),
      lineByChapter: { 4: sp("レントン", "まだ、聞くとこあるやろ。——最後まで、な") }
    },
    // ---- 第3章の核（BT-C3-02 専用） ----
    "SK-OD-C3-01": {
      id: "SK-OD-C3-01", name: "再開の笛", user: "リコ",
      detail: "凍結した系統の条件を緩めて鎮める。制御が進む",
      control: 20, gains: [fx("freedom_insight", 3), fx("order_insight", 3)],
      battleOnly: "BT-C3-02", tags: ["restart", "grasp"],
      lines: [
        sp("リコ", "この系統、条件を緩める。——凍結、解除。止めっぱなしには、しない"),
        sp("ノリ", "再開手順、通します。……止めた笛を、もう一度")
      ]
    }
  };

  // SK-FR-C3-01「離脱条項」は通常コマンドではなく BT-C3-03 / BT-C4-03 の
  // dialogue 解決の成立要件（F50∧O50）として自動発動する（chapter03/03 §3-2）
  const CLAUSE_SKILL = {
    id: "SK-FR-C3-01", name: "離脱条項", requires: { freedom_insight: 50, order_insight: 50 }
  };

  const BATTLES = {
    "BT-01": {
      id: "BT-01", chapter: 1, scene: "SC-05", title: "中継ノード・α",
      target: "中継ノード・α", background: "bg_warehouse_node", asset: "node_alpha_active", assetResolved: "node_alpha_stopped",
      turnLimit: 8, resolutions: ["destroy", "control"], timeout: "destroy",
      // 02_scenario.md SC-05 の登場人物。レントンは病院対応中で不在（03 §1-1 に明記）
      absent: ["レントン"],
      pattern: "guard_sync",
      intro: "β版の空白を読み、壊さず手綱を取る道も探す。",
      resultEffects: {
        destroy: [fx("order_insight", 8), fx("raml_morale", 3)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 5)]
      },
      script: {
        open: [
          sp("ノリ", "β版には、必ず『まだ書かれてない場所』があります。——そこを突けば、壊さずに手綱を取れる。手順、送ります"),
          sp("リコ", "壊す手も残しておく。ショウ、いつでも"),
          sp("ショウ", "ん")
        ],
        interrupt: {
          rewrite: [
            sp("機械音声", "保育園連絡網ヲ、追加統合シマス"),
            sp("リコ", "——それは、させない")
          ],
          rebuild: [
            sp("ノリ", "壊した分だけ、建て直してきます。力比べは、向こうの土俵ですよ")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウ、量産機の間を抜け、ノードの駆動部を素手で握り潰す。静かに、一度で"),
            sp("ショウ", "壊すのは、簡単なんだよな"),
            sp("リコ", "……ありがと。次は、簡単じゃない方も試そう")
          ],
          control: [
            sp("ノリ", "制御、取りました。停止じゃなく——掌握です"),
            sp("リコ", "機械ごと味方にした、ってこと？ ……覚えておく、その手")
          ]
        },
        after: [
          stg("沈黙したノード。ノリ、回収したコードを流し読みして——手が止まる"),
          sp("ノリ", "……これ"),
          sp("リコ", "どうしたの"),
          sp("ノリ", "……戻って話します。ここじゃ、うまく言えない")
        ]
      }
    },
    "BT-02": {
      id: "BT-02", chapter: 1, scene: "SC-07", title: "中継ノード・β",
      target: "中継ノード・β", background: "bg_hospital_courtyard", asset: "node_beta_active", assetResolved: "node_beta_stopped",
      turnLimit: 8, resolutions: ["destroy", "control", "dialogue", "avoid"], timeout: "avoid",
      // 院内系統と直結した、丁寧すぎる守り
      pattern: "guard_sync",
      intro: "院内系統を守りながら、事情を機械へ通す。",
      resultEffects: {
        destroy: [fx("order_insight", 5), fx("raml_morale", -5)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 8)],
        dialogue: [fx("freedom_insight", 5), fx("order_insight", 5), fx("trust_exp", 8)],
        avoid: [fx("order_insight", 3), fx("ai_mastery", 5)]
      },
      script: {
        open: [
          sp("リコ", "制約が多いほど、やり方は選べる。——見せよう、選び方ってやつを")
        ],
        interrupt: {
          rewrite: [
            sp("機械音声", "リハビリ予定ヲ、統合シマス。当該項目ハ、非効率デス"),
            sp("レントン", "やめろ、それは『無駄』なんかとちゃう——！")
          ],
          progress: [
            sp("ノリ", "進んでます。急ぐなら破壊、確実なら制御。……決めるのは、司令です")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウの一撃。ノード停止。院内の照明が一瞬すべて落ち、非常電源で戻る"),
            sp("レントン", "……派手にやったな。あとで院内、全部点検して回るわ")
          ],
          control: [
            sp("ノリ", "掌握完了。院内系統は、こちらの手の中です"),
            sp("レントン", "なら、予約台帳を先に戻してくれ。……頼むわ")
          ],
          dialogue: [
            stg("レントン、ノードのアナウンスに正面から応答する"),
            sp("レントン", "優先度の判定基準を聞きたい。——この人は、歩けるようになるまであと三週間なんよ。あんたの言う『効率』に、その三週間を入れてくれ"),
            stg("機械音声が沈黙。判定テーブルが書き換わり、ノードが自ら待機状態へ落ちる"),
            sp("リコ", "……止めるんじゃなくて、教えたの？ 機械に、事情を")
          ],
          avoid: [
            sp("ノリ", "電源系統だけ隔離しました。ノードは生きていますが、もう院内には触れません"),
            sp("リコ", "完全解決じゃない。……でも今夜は、誰も困らせない")
          ]
        },
        after: [
          stg("静かになった中庭。レントン、ベンチに座り込み、天井を仰ぐ"),
          sp("レントン", "体はな、正しさより先に、回復したがるんよ。効率とか、正義とか、そのあとでいい"),
          stg("全員の端末が同時に鳴る。直通信——差出人表記なし、署名はGADGET"),
          sp("ケイスケ", "話が早い人たちだ。来なよ、案内する"),
          sp("ノリ", "……最終ノードの防衛が、いま自動解除されました。招待状、ですね")
        ]
      }
    },
    "BT-03": {
      id: "BT-03", chapter: 1, scene: "SC-08", title: "AUTONOMY中枢",
      target: "AUTONOMY中枢", background: "bg_old_server_room", asset: "autonomy_core_active", assetResolved: "autonomy_core_standby",
      turnLimit: 10, resolutions: ["destroy", "control", "dialogue"], timeout: "retreated",
      finalBattle: true, controlGA: 30, dialogueGA: 45, requireClause: false,
      // 中枢級。5拍と長く、隙が深い
      pattern: "core_sync",
      intro: "攻撃対象は中枢のみ。思想を聞くか、手続きを断つか。",
      dialogueLines: {
        d1: "君らは秩序の名前で人を縛ってるだけだ。回せない側を、ボクは待ち時間から出したい。",
        d2: "ルールには、誤りを拾う審判の席が要る。そのAIの誤りは、誰が拾う？",
        d3: "問答はここまで。中枢の停止へ移る。"
      },
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 10)],
        dialogue: [fx("freedom_insight", 8), fx("ai_mastery", 8), fx("trust_exp", 5)]
      },
      script: {
        open: [
          sp("ケイスケ", "先に言っておく。ボクは誰も殴ってない。書類を減らしただけだ。——それで世界が困るなら、困る側の設計が間違ってる"),
          sp("リコ", "その理屈ごと、止めに来た")
        ],
        interrupt: {
          sync: [
            sp("機械音声", "最終同期、進行中"),
            sp("ケイスケ", "悪いけど、待ってはやらない。βの寿命は短いんだ")
          ]
        },
        dialogue: {
          d1: [
            sp("ケイスケ", "君らは秩序の名前で人を縛ってるだけだ。保育園の連絡網？ あれを『必要な秩序』って呼べるのは、回せてる側だけだよ"),
            sp("ケイスケ", "回せない側は毎晩、書けない書類と鳴らない電話の前で削られてる。ボクはそこから全員を出したいだけだ。——間違ってるか？"),
            sp("リコ", "回せてない側が、それでも回すために作った網なんだよ。あんたが消したのは、余裕じゃなくて命綱"),
            stg("ケイスケ、初めて笑みを消す。半拍の沈黙"),
            sp("ケイスケ", "……いい反論だ。ログに残しとく")
          ],
          d2: [
            sp("ノリ", "ルールは、全員が同じゲームを楽しむためにある。あなたのルールには審判がいない。——ミスジャッジは、誰が拾うんですか"),
            sp("ケイスケ", "AIが拾う"),
            sp("ノリ", "そのAIの誤りは？"),
            sp("ケイスケ", "次のバージョンで直す"),
            sp("レントン", "その間に消えた誰かの三週間は、どのバージョンでも戻りません"),
            stg("ケイスケの耳が、わずかに伏せる")
          ],
          d3: [
            sp("リコ", "問答はここまで"),
            sp("ケイスケ", "……つまんないな、君ら。せっかくの質疑応答なのに")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウの一撃が中枢を貫く。火花。沈黙"),
            sp("ケイスケ", "あーあ。……力で止めたね。それ、君らの言う『秩序』と、何が違うんだ？"),
            sp("リコ", "違わないのかもね。——それでも、今夜はこうするしかなかった")
          ],
          control: [
            stg("ノリとリコ、二人がかりで制御を奪取。中枢が静かに待機状態へ"),
            sp("ケイスケ", "……取られた。へえ。壊すんじゃなくて、乗りこなすんだ。——使う側の顔だな、それ")
          ],
          dialogue: [
            stg("リコ、端末を差し出す。画面には安全停止までの手順書——書式は、バグ報告"),
            sp("リコ", "AUTONOMYの停止手順。再現手順つき、優先度: 高。——開発者なら、どうする？"),
            sp("ケイスケ", "……再現手順つき。影響範囲の記載あり。修正案まで添付。……ああもう、直したくなるだろ、こんなの"),
            stg("ケイスケ自身の手で、AUTONOMYが安全停止していく")
          ]
        },
        retreat: [
          stg("ケイスケ、中枢から飛び降り、ロボの肩に乗る"),
          sp("ケイスケ", "賛同者は三万人いる。……飲みに行く相手は、いないけどな"),
          stg("一瞬だけ、笑みの下の素顔。すぐに戻る"),
          sp("ケイスケ", "じゃ。次はもっといいバージョンで会おう"),
          stg("離脱。追跡不能")
        ],
        retreatByResolution: {
          dialogue: [sp("ケイスケ", "……バグ報告、初めてもらったな。ユーザーがいたんだ、ボクのツールに")]
        },
        forced: [
          sp("機械音声", "最終同期、完了シマシタ"),
          sp("ケイスケ", "……追ってこないのか。そう。なら、続きはまた今度"),
          stg("RAML、市民退避を優先して離脱。中枢は市中へ同期を終える")
        ]
      }
    },
    "BT-C2-01": {
      id: "BT-C2-01", chapter: 2, scene: "SC-C2-04", title: "EXノード",
      target: "EXノード", background: "bg_warehouse_node", asset: "ex_node_active",
      turnLimit: 8, resolutions: ["destroy", "control"], timeout: "destroy",
      // 02_scenario.md SC-C2-04 の登場人物。レントンは別現場（SC-C2-06）
      absent: ["レントン"],
      // 継ぎ接ぎのEX。周期が短く隙も多いが火力が高い
      pattern: "rough_sync",
      intro: "本家との差分から、粗い防壁の空白を読む。",
      resultEffects: {
        destroy: [fx("order_insight", 8), fx("raml_morale", 3)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 5)]
      },
      script: {
        open: [
          sp("ノリ", "新しい読み方を試します。本家のコードと突き合わせて、削られた場所を探す——『差分解析』。手順、共有します"),
          sp("リコ", "削られた場所が、弱いってこと？"),
          sp("ノリ", "削った人間は、そこを理解していないので")
        ],
        interrupt: {
          broadcast: [
            sp("機械音声", "【ユーザー名】サマノ面倒ゴトヲ、削減シマシタ。ヨリ良イ毎日ヲ、【サービス名】ガ提供シマス"),
            sp("ノリ", "……変数が、埋まってない。誰に向けた言葉かも、決めずに喋ってる")
          ],
          rebuild: [
            sp("ノリ", "建て直しも雑です。同じ壁を、同じ場所に。——学習していない")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウ、継ぎ接ぎの外装を掴み、一度で沈黙させる"),
            sp("ショウ", "……雑な作りだ"),
            sp("リコ", "壊された側も、そう思ってるかもね")
          ],
          control: [
            sp("ノリ", "掌握。……削られた場所から入れました。本家なら、この道は塞がってた")
          ]
        },
        after: [
          stg("回収データの解析画面。ノリ、手が止まる"),
          sp("ノリ", "……このノード、うちが来る前に一度、止められかけてます"),
          sp("リコ", "先客？"),
          sp("ノリ", "痕跡だけ。……壊し方が、丁寧です")
        ]
      }
    },
    "BT-C2-02": {
      id: "BT-C2-02", chapter: 2, scene: "SC-C2-07", title: "市街の代行機群",
      target: "代行機群", background: "bg_city_crossing_dusk", asset: "crowd_drones_active", assetResolved: "crowd_drones_suppressed",
      turnLimit: 8, resolutions: ["destroy", "control", "dialogue", "avoid"], timeout: "avoid",
      collateralOnPhysical: true, collateralName: "宙に浮いた決定",
      offer: {
        id: "EV-BTC2-2-OFFER", text: "アナタノ面倒ゴトヲ、代行シマス",
        acceptLabel: "任せてみる", rejectLabel: "断る"
      },
      // 群体。数で押してくる
      pattern: "swarm_sync",
      intro: "抱えた決断を本人へ返してから、機械だけを止める。",
      resultEffects: {
        destroy: [fx("order_insight", 5)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 8)],
        dialogue: [fx("freedom_insight", 5), fx("order_insight", 5), fx("trust_exp", 8)],
        avoid: [fx("order_insight", 3), fx("ai_mastery", 5)]
      },
      script: {
        open: [
          sp("リコ", "目的は排除じゃない。——市民の決断を、返してもらう")
        ],
        interrupt: {
          collateral: [
            sp("機械音声", "担当中ノ決定 3件ヲ、破棄シマス"),
            sp("リコ", "破棄させない！ ——誰かの今日が、その中にある")
          ],
          broadcast: [
            sp("機械音声", "私タチハ、アナタノ自由ノタメニ——アナタノ自由ノタメニ——"),
            sp("ノリ", "……ループしてる。この先を、書いた人がいないんです")
          ]
        },
        offerLines: {
          // 提案対象がショウの回（初回）は固定リアクション。以降はリコの代表1行に集約（C2Q3-B02）
          rejectFirst: [sp("ショウ", "……自分でやるから、いい")],
          reject: [sp("リコ", "間に合ってる。——うちは、決めるのが仕事なの")],
          accept: [stg("そのターンの行動が「最適」に代行される。無難で、速くて、誰の癖もない一手。誰も何も言わない。少しだけ、静かすぎる")]
        },
        resolution: {
          destroy: [
            stg("ショウの制圧。停止した代行機の腕から、配達しかけの「決定」がこぼれ落ちる"),
            sp("レントン", "……拾おう。全部。宙に浮いたままには、しやん")
          ],
          control: [
            sp("ノリ", "群体制御、掌握。一機ずつ、順番に眠らせます。抱えた決定は——降ろさせてから")
          ],
          dialogue: [
            stg("レントン主導——代行機の判定入力に市民本人の声を通す。リコが手順を通す"),
            sp("レントン", "決めるのはあんたとちゃう。——本人や。声を、返せ"),
            stg("代行機群の「決定済み」表示が、一枚ずつ「確認待ち」へ戻っていく")
          ],
          avoid: [
            sp("ノリ", "封鎖圏に誘導完了。市民からは切り離しました。……眠らせたわけじゃない。忘れずに、後で片付けましょう")
          ]
        },
        after: [
          stg("静まった交差点。ノリの端末が座標を弾き出す——群体の制御元、EX中枢"),
          stg("たどり着いた先。中枢の防壁は、すでに半分剥がされていた。その前に、小柄な人影と大きなロボの影——")
        ]
      }
    },
    "BT-C2-03": {
      id: "BT-C2-03", chapter: 2, scene: "SC-C2-08", title: "EX中枢",
      target: "EX中枢", background: "bg_old_server_room", asset: "ex_core_active", assetResolved: "ex_core_standby",
      turnLimit: 10, resolutions: ["destroy", "control", "dialogue"], timeout: "retreated",
      finalBattle: true, controlGA: 60, dialogueGA: 68, requireClause: false,
      // EX中枢も本家より粗い。周期は短い
      pattern: "rough_sync",
      intro: "作者の責任とRAMLの監査。攻撃対象はEX中枢のみ。",
      dialogueLines: {
        d1: "EXはボクの思想じゃない。意思確認を全部削って、便利だけに三万人が拍手した。",
        d2: "本家のコメントは、まだ見ぬ誰かが読む前提で書かれていた。",
        d3: "問答はここまで。中枢の確保へ移る。"
      },
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 10)],
        dialogue: [fx("freedom_insight", 8), fx("ai_mastery", 8), fx("trust_exp", 5)]
      },
      script: {
        open: [
          sp("ケイスケ", "作者の責任で、ボクが消す。お前らに任せると、本家ごと悪者にされるだろ"),
          sp("リコ", "消すのは止めない。——でも、後始末の確認もなしに消されると、市民の決断が三百件、宙に浮くの"),
          sp("ケイスケ", "……三百件。数えてたのか、そんなの")
        ],
        interrupt: {
          // 同時被攻撃イベント（1回のみ・分離構図7項目厳守。台詞なし・掛け合いなし・礼なし）
          simultaneous: [
            stg("EX中枢が防衛判定を更新——「非効率ナ二者ヲ、排除シマス」。RAMLとケイスケ、双方に攻性プロセスが展開"),
            stg("ケイスケが、RAML側へ構え直す")
          ]
        },
        dialogue: {
          d1: [
            sp("ケイスケ", "言っておくが、EXはボクの思想じゃない。ボクは『本当に、いいですか』を三回聞くんだ。三回だぞ。それを全部削って、便利だけ残して、三万人が拍手した"),
            sp("ケイスケ", "拍手した奴の誰一人、diffを読んでない。——なあ、賛同って、何なんだろうな"),
            stg("半拍の沈黙。ケイスケ、すぐに口調を戻す")
          ],
          d2: [
            sp("ノリ", "読みましたよ、diff。……本家のコメント、読む人がいる前提で書いてありますね。三万人の中の、まだ見ぬ誰かのために"),
            sp("ケイスケ", "……は？"),
            sp("ノリ", "『ここは急がば回れ。人間の返事は、遅いのが正常』——いいコメントです。EXは、これを消した"),
            stg("ケイスケの耳が、わずかに動く。言葉は返ってこない")
          ],
          d3: [
            sp("リコ", "問答はここまで。中枢ごと確保する"),
            sp("ケイスケ", "……つまんないな。今日は少しだけ、話したい日だったのに")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウの一撃が中枢を貫く。ケイスケ、剥がしかけの防壁の前で足を止める"),
            sp("ケイスケ", "……ボクが消したかったんだけどな、それ。まあいい。消えたなら、目的は同じ——"),
            sp("ケイスケ", "——じゃ、ないんだよな。たぶん")
          ],
          control: [
            stg("ノリとリコが中枢を掌握。ケイスケの手が届く前に、EXが静かに待機状態へ落ちる"),
            sp("ケイスケ", "……取ったのか。ボクより先に、ボクのコピーを"),
            sp("リコ", "消すか使うかは、これから決める。——本人たちに、確認してからね"),
            sp("ケイスケ", "……『確認してから』。……本家と、同じ手順だ。それ")
          ],
          dialogue: [
            stg("リコ、端末を差し出す。画面には停止手順と、その先の一行——「EXの消去はケイスケ。停止確認と市民への影響監査はRAML」"),
            sp("リコ", "消すのはあなた。監査はこちら。——作者の責任と、こちらの管轄。両方立つ書き方にした"),
            sp("ケイスケ", "……役割分担のプルリクエスト、か。生まれて初めて見た形式だな、それ"),
            stg("ケイスケ、無言で手順を実行する。EXが、作者の手で消えていく")
          ]
        },
        retreat: [
          stg("EXの処遇が決まる。ケイスケ、ロボの肩に飛び乗る"),
          sp("ケイスケ", "三万人いて、diffを読んだ奴が一人もいない。……ユーザーの質が低かった。それだけの話だ"),
          stg("レントン、その横顔を見ている"),
          sp("レントン", "（内心）それだけの話、って顔やなかった"),
          stg("離脱。追跡不能")
        ],
        forced: [
          sp("機械音声", "複製プロセス、完了シマシタ"),
          sp("リコ", "引く！ 全員、市民側へ——……止めきれなかった。今夜は。せめて、守れるものから守る！"),
          stg("RAML、市民退避を優先して離脱。ケイスケが一人、拡散していくカウンタを見上げている")
        ]
      }
    },
    "BT-C3-01": {
      id: "BT-C3-01", chapter: 3, scene: "SC-C3-04", title: "rc境界防衛機構",
      target: "rc境界防衛機構", background: "bg_rc_boundary", asset: "rc_barrier_active",
      turnLimit: 8, resolutions: ["destroy", "control", "avoid"], timeout: "avoid",
      collateralOnPhysical: true, collateralName: "波及した生活処理",
      offer: {
        id: "EV-BTC3-1-OFFER", text: "入区スレバ、待機モ失敗モ不要デス",
        // 第3章の R2 は「入区勧誘」。第2章の「代行を任せる」とは意味が違う（01_plan §7-2）
        acceptLabel: "手続き画面を最後まで進ませてみる", rejectLabel: "断る"
      },
      // 善意の壁。守り方が丁寧
      pattern: "guard_sync",
      intro: "快適な地区の境界と、その外側の生活を同時に見る。",
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 5)],
        avoid: [fx("ai_mastery", 3), fx("order_insight", 3)]
      },
      script: {
        open: [
          sp("ノリ", "境界機構。……守り方が、丁寧すぎます。地区の暮らしぜんぶ、抱き込んで守ってる"),
          sp("リコ", "善意の壁、か。——厄介なほうだね、それ")
        ],
        interrupt: {
          collateral: [
            sp("機械音声", "生活系統ニ、影響ガ発生シテイマス"),
            sp("レントン", "そこ、暮らしとつながっとる。——ショウ、加減して")
          ]
        },
        offerPrompt: [
          sp("機械音声", "RAML ノ皆サマヘ——正式入区ヲ、ご提案シマス。手続キハ、ゼロデス")
        ],
        offerLines: {
          reject: [sp("リコ", "組織として答える。——お断りする。手続きゼロの入口より、いつでも開く出口のほうが、うちには必要なの")],
          accept: [stg("手続き画面が最後まで流れる。「入区」の項目はある。「退区」の項目は——どこにもない。誰も、何も言わない")]
        },
        resolution: {
          destroy: [
            stg("ショウ、退避を確認した上で、人のいない一点だけを最小限で破る"),
            sp("ショウ", "……ここなら、誰も巻き込まない。一点だけだ")
          ],
          control: [
            sp("ノリ", "入区案内の判定、掌握。……『退区』を、こっちで仮実装します。本来なら、要らないはずの手順を"),
            sp("リコ", "出るための手順を、こっちが書く。——皮肉だね、それ")
          ],
          avoid: [
            sp("ノリ", "保守用の経路から出ます。機構は、動いたまま。……根っこは、残ります")
          ]
        },
        after: [
          stg("退区したRAMLを待っていたのは、凍結への抗議の人垣。二つの「縛り」が、同じ日に牙を剥く")
        ]
      }
    },
    "BT-C3-02": {
      id: "BT-C3-02", chapter: 3, scene: "SC-C3-06", title: "凍結システム暴走",
      target: "凍結システム", background: "bg_frozen_command", asset: "frozen_system_active", assetResolved: "frozen_system_released",
      turnLimit: 8, resolutions: ["destroy", "control"], timeout: "destroy",
      collateralOnPhysical: true, collateralName: "守りの空白",
      restartOnlyControl: true,
      // RAML自身の装置。人は撃たず、ただ締め続ける
      pattern: "frozen_loop",
      intro: "自分たちの正しさを、壊すか、緩めて再開させるか。",
      resultEffects: {
        destroy: [fx("freedom_insight", 5)],
        control: [fx("freedom_insight", 5), fx("order_insight", 5), fx("ai_mastery", 3)]
      },
      script: {
        open: [
          sp("ノリ", "新しい手順を通します。止めるための権限じゃなく、緩めるための権限を——リコさん、あなたの名前で開いてください"),
          sp("リコ", "私の名前で。……『再開の笛』。止めた笛を、もう一度吹くほうか"),
          sp("ノリ", "止めた笛は、再開の笛とセットです。——片方だけ、うちは持ってました")
        ],
        interrupt: {
          collateral: [
            sp("ノリ", "壊せば止まります。……ただし、その系統の再発防止も、一緒に消えます。守りに、穴が空きます")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウが凍結網ごと物理停止させる。暴走は止まる。同時に、再発防止の網も落ちる"),
            sp("ショウ", "……止まった。けど、これ、守りごと落としたな"),
            sp("リコ", "うん。——止めるほうを選んだ。責任は、こっち持ちで")
          ],
          control: [
            sp("ノリ", "制御完了。条件を緩めて、暴走だけ鎮めました。守りは、残っています"),
            sp("リコ", "壊さずに、緩めて止めた。……秩序を、自分の手で降ろすのって、こんな感触なんだ"),
            sp("ノリ", "ルールを緩めて勝つの、初めてです。……悪くない手触りですね、これ")
          ]
        },
        after: [
          stg("鎮まった凍結網の管理画面。「解除申請: 保留 214件」の表示。リコ、その一覧を見つめたまま動かない")
        ]
      }
    },
    "BT-C3-03": {
      id: "BT-C3-03", chapter: 3, scene: "SC-C3-08", title: "rc中枢",
      target: "rc中枢", background: "bg_old_server_room", asset: "rc_core_active", assetResolved: "rc_core_standby",
      turnLimit: 10, resolutions: ["destroy", "control", "dialogue"], timeout: "retreated",
      finalBattle: true, controlGA: 72, dialogueGA: 80, requireClause: true,
      // 中枢級
      pattern: "core_sync",
      intro: "攻撃対象はrc中枢のみ。出口のない自由へ、離脱条項を示す。",
      dialogueLines: {
        d1: "ルールを統一すれば、雑なコピーも待ち時間も消える。論理は通ってる。",
        d2: "終了規定がない。始め方だけのルールは、自由を閉じ込める。",
        d3: "問答はここまで。中枢の停止へ移る。"
      },
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 10)],
        dialogue: [fx("freedom_insight", 8), fx("ai_mastery", 8), fx("trust_exp", 8)]
      },
      script: {
        open: [
          sp("ケイスケ", "離脱ボタンを付けたら、雑な奴から順に出て行って、また雑なコピーの世界に戻る。……EXを見ただろ。あれが『出口の外』だ")
        ],
        dialogue: {
          d1: [
            sp("ケイスケ", "rcの中に、不幸な奴が一人でもいたか？ いなかっただろ。——だったら、何が問題なんだ"),
            stg("半拍の沈黙。誰も、すぐには返さない")
          ],
          d2: [
            sp("ノリ", "いいルールブックです。ほんとに。……ただ、閉会の規定だけが、どこにもない"),
            sp("ケイスケ", "……閉会？"),
            sp("ノリ", "試合には終わりがある。祭りにも、店じまいがある。rcには、それが書かれていません。——始まったら、終われない設計です"),
            stg("ケイスケの返答の間が、わずかに伸びる。言葉は返ってこない")
          ],
          d3: [
            sp("リコ", "問答はここまで。中枢の拡張を、止める"),
            sp("ケイスケ", "……つまんないな。今日は、少し話したい日だったんだけどな")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウが住民の退避経路を確保した上で、中枢を物理停止させる"),
            sp("ショウ", "……ここも、壊すのは簡単だった。壊さずに済む道が、あればよかったな")
          ],
          control: [
            sp("ノリ", "中枢を掌握。rcの『拡張』だけ止めます。地区は、動いたまま。……出口は、まだ無いままですが"),
            sp("リコ", "拡張は止めた。——出口の話は、まだ終わってない")
          ],
          dialogue: [
            stg("レントンが中枢の前に立つ。住民の「体のデータ」を、身体の言葉に置き換えていく"),
            sp("レントン", "あんたの『快適判定』、体のほうと突き合わせてみ。歩幅も、握力も、返事の速さも、みんな細うなっとる。……体が先に、答えを出しとるんよ"),
            stg("レントンが体の話をしたとき、ケイスケの視線が一瞬だけ稼働データのウィンドウへ流れて、戻る"),
            stg("閉じていた経路に、細い抜け道が通る。住民の端末に「退区手続き」の画面が、初めて現れた"),
            sp("ノリ", "離脱条項、適用。……『止めない。ただし出口を作る』。rcに、退区のボタンが、いま初めて点きました")
          ]
        },
        after: [
          stg("rcの処遇が決まる。この章の終わり方は、ここまでの選び方が決める")
        ],
        forced: [
          sp("機械音声", "拡張プロセス、開始シマシタ"),
          sp("リコ", "引く！ 全員、市民側へ——……止めきれなかった。rcの拡張、止めきれなかった。せめて、外に出られる人から、逃がす！"),
          stg("RAMLは市民の退避を優先して離脱する。ケイスケが一人、拡張していくrcを見上げている。レントンが、その横顔を最後に一度だけ見た")
        ]
      }
    },
    "BT-C4-01": {
      id: "BT-C4-01", chapter: 4, scene: "SC-C4-03", title: "最終同期先行ノード",
      target: "先行ノード", background: "bg_warehouse_node", asset: "ex_node_active",
      turnLimit: 8, resolutions: ["destroy", "control", "avoid"], timeout: "avoid",
      // 先導役。攻撃せず、ひたすら前へ
      pattern: "vanguard_sync",
      intro: "これまでの全手順を使い、最終同期を先導する機械へ対処する。",
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 5)],
        avoid: [fx("ai_mastery", 3), fx("order_insight", 3)]
      },
      script: {
        open: [
          sp("ノリ", "同期先導ノード。……役割は一つだけ。ひたすら、前へ進める。止めれば、カウントダウンが鈍ります"),
          sp("レントン", "（内心）……こいつは、暮らしとくっついとらん。ここは、遠慮せんでええな")
        ],
        resolution: {
          destroy: [
            stg("ショウが先行ノードを物理停止させる。同期の先導が落ち、カウントダウンが鈍る"),
            sp("ショウ", "……一台、落とした。中に、誰もいないやつだ。遠慮なくいけた")
          ],
          control: [
            sp("ノリ", "先導ノードの同期コマンド、掌握。……こっちで、進行を遅らせます。壊さずに、鈍らせる")
          ],
          avoid: [
            sp("ノリ", "ノードは迂回します。稼働は続きますが、中枢へは最短で。……時間を、そっちで買います")
          ]
        },
        after: [
          stg("先行ノードの向こう、中枢へ続く道に、動いているものの気配。ただし——人の気配はない")
        ]
      }
    },
    "BT-C4-02": {
      id: "BT-C4-02", chapter: 4, scene: "SC-C4-05", title: "三万人の無人デモ群",
      target: "無人デモ群", background: "bg_cityhall_night", asset: "crowd_drones_active", assetResolved: "crowd_drones_suppressed",
      turnLimit: 8, resolutions: ["destroy", "control", "avoid"], timeout: "avoid",
      collateralOnPhysical: true, collateralName: "宙に浮いた処理",
      // 無人の群体
      pattern: "swarm_sync",
      intro: "人の姿はない。自動化ツールが抱える生活処理を守り、機械だけを止める。",
      resultEffects: {
        destroy: [fx("order_insight", 5)],
        control: [fx("ai_mastery", 8), fx("gadget_analysis", 8)],
        avoid: [fx("ai_mastery", 3), fx("order_insight", 3)]
      },
      script: {
        open: [
          sp("ノリ", "無人のツールが、生活の処理を代行したまま並んでます。……壊すのは簡単ですが、裏で回ってる処理が、宙に浮きます"),
          sp("リコ", "人は、いない。——だから、止めるのも機械のやり方で。加減して、削って")
        ],
        interrupt: {
          collateral: [
            sp("機械音声", "代行処理ガ、停止シマシタ。引継ギ先ハ、ありマセン"),
            sp("レントン", "そこ、暮らしの処理が乗っとる。——ショウ、そっちは加減や")
          ]
        },
        // ショウの下地（戦闘中一度・BT-C4-03 の「壊さない一撃」への布石）
        once: {
          physical: [
            stg("ショウ、デモ機の一台に拳を振り上げ、寸前で止める"),
            sp("ショウ", "……中に、誰もいない。空箱を殴っても、しょうがないんだよな")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウたちがデモ機群を物理停止する。列が崩れる。裏で回っていた処理の一部が、宙に浮く"),
            sp("ショウ", "……止まった。空箱だったけど、止めるのは、止めるだけの手間はかかるな")
          ],
          control: [
            sp("ノリ", "自動化ツールの司令を掌握。……一括で停止させます。宙に浮く処理は、これなら出ません")
          ],
          avoid: [
            sp("ノリ", "デモ群は迂回します。機械は稼働のまま。……根っこは残りますが、中枢が先です")
          ]
        },
        after: [
          stg("デモ群の向こう、世界規模のデプロイ画面。空欄のリリースノートの最終行が、点滅している")
        ]
      }
    },
    "BT-C4-03": {
      id: "BT-C4-03", chapter: 4, scene: "SC-C4-07", title: "Ver.1.0中枢",
      target: "Ver.1.0中枢", background: "bg_final_core_hall", asset: "ver1_core_active", assetResolved: "ver1_core_standby",
      turnLimit: 10, resolutions: ["destroy", "control", "dialogue"], timeout: "retreated",
      finalBattle: true, controlGA: 78, dialogueGA: 85, requireClause: true,
      // 最終同期の中枢
      pattern: "core_sync",
      intro: "攻撃対象は中枢のみ。新しい技はない。積み重ねた選び方のすべてで臨む。",
      dialogueLines: {
        d1: "世界が同じルールなら、誰も迷わない。誰も待たない。これが統一のリリースだ。",
        d2: "ルールは全員が同じゲームを楽しむためにある。だから審判の席が要る。",
        d3: "問答はここまで。中枢の停止へ移る。"
      },
      resultEffects: {
        destroy: [fx("order_insight", 8)],
        control: [fx("ai_mastery", 10)],
        dialogue: [fx("freedom_insight", 8), fx("ai_mastery", 8), fx("trust_exp", 8)]
      },
      script: {
        open: [
          sp("ケイスケ", "離脱ボタンを付けたら、雑な奴から順に出て行って、また雑なコピーの世界に戻る。だから、統一する。……rc で証明しただろ。中に不幸な奴は、一人もいなかった"),
          sp("ケイスケ", "これで、全員が同じ快適を持てる。何が悪い。——言ってみろよ")
        ],
        dialogue: {
          d1: [
            stg("半拍の沈黙。誰も、すぐには返さない")
          ],
          d2: [
            sp("ノリ", "いいルールブックです。ほんとに。……ただ、あなたのルールには、審判の席がない。反則を止める人も、試合を再開させる人も、いない。——席を、作ってください。あんたのルールの中に"),
            stg("ケイスケの返答の間が、わずかに伸びる。言葉は、すぐには返ってこない")
          ],
          d3: [
            sp("リコ", "問答はここまで。——Ver.1.0の最終同期を、止める"),
            sp("ケイスケ", "……せっかちだな。今日は、少し話したい日だったんだけどな")
          ]
        },
        resolution: {
          destroy: [
            stg("ショウが住民の退避経路を確保した上で、中枢を物理停止させる"),
            sp("ショウ", "……ここも、貫けば止まる。壊さずに済む道が、あればよかったんだけどな")
          ],
          control: [
            sp("ノリ", "中枢を掌握。Ver.1.0の最終同期だけ、止めます。……統一は、ここで足踏みさせます"),
            stg("ショウが中枢を貫ける拳を、寸前で止める")
          ],
          dialogue: [
            stg("ショウの「壊さない一撃」。中枢を貫ける拳を、寸前で開いて掌にする"),
            sp("ショウ", "……今日は、開いておく"),
            stg("ショウ、開いた掌を一度だけ見て、握り直す"),
            stg("レントンが中枢の前に立つ。ケイスケが読み込んだ住民の「体のデータ」を、身体の言葉に置き換えていく"),
            sp("レントン", "あんたの『快適判定』、体のほうと突き合わせてみ。歩幅も、握力も、返事の速さも、みんな細うなっとる。……体が先に、答えを出しとるんよ"),
            stg("身体の話をされたとき、ケイスケの視線が一瞬だけ稼働データのウィンドウへ流れて、戻る"),
            stg("ケイスケの指が動く。自分の手で、中枢に「審判」と「離脱ボタン」を置く道をひらいていく"),
            sp("ノリ", "離脱条項、適用。……『止めない。ただし出口を作る』。世界規模のVer.1.0に、退出のボタンが、いま初めて実装されます")
          ]
        },
        after: [
          stg("中枢の処遇が決まる。ここまで積み上げてきたすべてが、最後の一点へ集まっていく")
        ],
        forced: [
          sp("機械音声", "最終同期、完了シマシタ"),
          sp("リコ", "引く！ 全員、市民側へ——……止めきれなかった。Ver.1.0、走り出した。せめて、巻き込まれる系統から、人を逃がす！"),
          stg("RAMLは退避を優先して離脱する。ケイスケが一人、統一されていく世界のモニタを見上げている。レントンが、その横顔を最後に一度だけ見た")
        ]
      }
    }
  };

  const DIALOGUE_EFFECTS = {
    d1: [fx("freedom_insight", 10)],
    d2: [fx("order_insight", 8), fx("gadget_analysis", 5)],
    d3: [fx("order_insight", 5), fx("freedom_insight", -5), fx("raml_morale", -3)]
  };

  function getBattle(id) { return BATTLES[id] || null; }

  // 表示用の1行に整形する。話者なし＝演出行
  function formatLine(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.speaker ? item.speaker + "「" + item.text + "」" : item.text;
  }

  // その手順に必要な隊員（「全員」「＋任意」は不問）
  function requiredMembers(action) {
    if (!action || !action.user || action.user === "全員") return [];
    return action.user.split("＋").filter(function (name) { return name !== "任意"; });
  }

  // 行動に紐づく汎用割り込み台詞（章別の継承バリアントを含む）
  function actionLines(action, chapter) {
    if (!action) return [];
    if (action.lineByChapter && action.lineByChapter[chapter]) return [action.lineByChapter[chapter]];
    if (action.lines) return action.lines;
    if (action.line) return [action.line];
    return [];
  }

  // 章ごとに選べる手順（正典の解放順。第4章は新規なし＝全スキルの総和で戦う）
  function actionIdsForBattle(definition) {
    const chapter = definition.chapter;
    return Object.keys(ACTIONS).filter(function (id) {
      const action = ACTIONS[id];
      if (action.fromChapter && chapter < action.fromChapter) return false;
      if (action.battleOnly && action.battleOnly !== definition.id) return false;
      return true;
    });
  }

  return {
    resolutions: ["destroy", "control", "dialogue", "avoid"],
    resolutionLabels: RESOLUTION_LABELS,
    gainCaps: GAIN_CAPS,
    actions: ACTIONS,
    clauseSkill: CLAUSE_SKILL,
    battles: BATTLES,
    dialogueEffects: DIALOGUE_EFFECTS,
    retreatLines: RETREAT_LINES,
    reactions: REACTIONS,
    patterns: PATTERNS,
    getBattle: getBattle,
    formatLine: formatLine,
    actionLines: actionLines,
    requiredMembers: requiredMembers,
    actionIdsForBattle: actionIdsForBattle
  };
});
