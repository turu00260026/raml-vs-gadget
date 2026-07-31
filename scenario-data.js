(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RVG_SCENARIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function line(speaker, text, portrait, expression, side) {
    return {
      speaker: speaker,
      text: text,
      portrait: portrait || null,
      expression: expression || "neutral",
      side: side || (portrait === "keisuke" ? "right" : "left")
    };
  }

  // 【演出】行（地の文兼演出指示）。話者を持たない
  // requires: 前章の幕引き種別に応じて出し分ける持ち越し差分（series_plan §117）
  function stage(text, cutin, requires) {
    return {
      speaker: "", text: text, portrait: null, expression: "neutral", side: "left",
      stage: true, cutin: cutin || null, requires: requires || null
    };
  }
  function carry(endingKey, value, text) { return stage(text, null, { ending: endingKey, is: value }); }

  function effect(key, delta) { return { key: key, delta: delta }; }
  // diff = ▼差分（選択直後のリアクション。06_script.md の各選択肢に定義）
  function option(id, text, effects, diff) {
    return { id: id, text: text, effects: effects || [], diff: diff || [] };
  }
  function choice(id, prompt, options) { return { id: id, prompt: prompt, options: options }; }

  const CHAPTERS = [
    {
      id: 1,
      code: "Q-007",
      title: "AUTONOMY Ver.0.9β",
      firstScene: "SC-01",
      endingKey: "ed_c1",
      sceneIds: ["SC-01","SC-02","SC-03","SC-04","SC-05","SC-06","SC-07","SC-08","SC-09","SC-10"]
    },
    {
      id: 2,
      code: "Q-008",
      title: "三万人の賛同、ゼロ人の友人",
      firstScene: "SC-C2-01",
      endingKey: "ed_c2",
      sceneIds: ["SC-C2-01","SC-C2-02","SC-C2-03","SC-C2-04","SC-C2-05","SC-C2-06","SC-C2-07","SC-C2-08","SC-C2-09","SC-C2-10"]
    },
    {
      id: 3,
      code: "Q-009",
      title: "離脱ボタンのない自由",
      firstScene: "SC-C3-01",
      endingKey: "ed_c3",
      sceneIds: ["SC-C3-01","SC-C3-02","SC-C3-03","SC-C3-04","SC-C3-05","SC-C3-06","SC-C3-07","SC-C3-08","SC-C3-09","SC-C3-10"]
    },
    {
      id: 4,
      code: "Q-010",
      title: "リリースノートの最終行",
      firstScene: "SC-C4-01",
      endingKey: "ed_final",
      sceneIds: ["SC-C4-01","SC-C4-02","SC-C4-03","SC-C4-04","SC-C4-05","SC-C4-06","SC-C4-07","SC-C4-08","SC-C4-09","SC-C4-10"]
    }
  ];

  const SCENES = {
    "SC-01": {
      id: "SC-01", chapter: 1, title: "Ver.0.9β、起動", background: "bg_gadget_lab_night",
      lines: [
        line("ケイスケ", "テスト、全部グリーン。……ひとつイエローか。まあいい。βだ", "keisuke", "analysis"),
        stage("モニタに市庁のシステム図。承認フローの矢印が何重にも絡まっている"),
        line("ケイスケ", "申請。承認。決裁。判子。判子の、向き。……よく回ってるよな、こんなもので世界が", "keisuke"),
        line("ケイスケ", "回ってるんじゃない。回さされてるんだ、全員", "keisuke", "serious"),
        stage("デプロイ画面。リリースノート欄だけが空白のまま点滅している"),
        line("ケイスケ", "世界征服じゃない。世界中の承認待ちの、全面廃止だ", "keisuke", "alert")
      ],
      choice: choice("CH-01-A", "リリースノート最終行", [
        option("A1", "全員に、時間を返す", [effect("freedom_insight", 5)], [
          line("ケイスケ", "時間。そう、時間だよ。人生って、待ち時間のことじゃないだろ", "keisuke", "analysis")
        ]),
        option("A2", "これは支配ではなく解放です", [effect("freedom_insight", 3), effect("gadget_analysis", 2)], [
          line("ケイスケ", "『支配』って書くやつは、支配する気があるやつだ。ボクは違う。……違うぞ？", "keisuke", "serious"),
          stage("この一文は後の解析ログに残る")
        ]),
        option("A3", "何も書かずデプロイ", [effect("freedom_insight", 2), effect("raml_morale", -2)], [
          line("ケイスケ", "説明はいらない。動けばわかる。動くものが、いちばん正直だ", "keisuke", "neutral")
        ])
      ]),
      after: [
        stage("端末に通知が積もっていく——賛同者コミュニティの新着投稿、三万件"),
        line("ケイスケ", "見てるか、みんな。……返信は、しないけどな", "keisuke", "neutral"),
        line("ケイスケ", "……充電、73%か。まあ、世界を書き換えるには足りるだろ", "keisuke", "analysis"),
        stage("エンターキー。短い通知音。窓の外——街中の窓口案内板が一斉に切り替わる。「すべての手続きは承認されました」"),
        line("ケイスケ", "——さあ、みんな。帰っていいぞ", "keisuke", "neutral")
      ]
    },
    "SC-02": {
      id: "SC-02", chapter: 1, title: "手続きが、消えた夜", background: "bg_riko_home_night",
      lines: [
        stage("夕暮れの住宅街。保育園帰りの荷物を提げて、リコが帰ってくる", "ev_riko_homecoming_01"),
        line("リコ", "……連絡網、今日一件も来てない。おたより、来る日なのに", "rico", "concern"),
        stage("画面表示「本連絡網は統合されました。今後の配信は最適化されます」"),
        line("リコ", "『非効率なので統合しました』って、誰が", "rico", "alert"),
        line("ノリ", "リコさん。夜分に。——市庁のシステムが全部、通ってます。落ちてるんじゃない。『通ってる』んです", "nori", "analysis"),
        line("リコ", "通ってる？", "rico", "concern"),
        line("ノリ", "承認待ちが、全部消えてます。被害届は、ゼロ。……ゼロなのが、一番まずい", "nori", "analysis"),
        line("リコ", "本部に上げる。RAML、動かすよ", "rico", "alert")
      ],
      choice: choice("CH-02-A", "緊急招集の掛け方", [
        option("A1", "全員に即時招集をかける", [effect("order_insight", 5), effect("raml_morale", -5)], [
          line("リコ", "緊急招集。全員、十五分で回線に入って", "rico", "alert"),
          line("ノリ", "……了解。事情は、聞かない方向で", "nori", "neutral")
        ]),
        option("A2", "各員の状況を確認してから招集", [effect("trust_exp", 5), effect("raml_morale", 5)], [
          line("リコ", "まず全員の状況確認。動ける形で来てもらう", "rico", "analysis"),
          line("ノリ", "そのあいだも、街の書き換えは進みますよ", "nori", "concern"),
          line("リコ", "わかってる。それでも、そうする", "rico", "alert")
        ]),
        option("A3", "まず自分で保育園に駆けつける", [effect("order_insight", 3), effect("trust_exp", 3)], [
          line("リコ", "ノリ、初動を任せる。私は先に、確かめたいものがある", "rico", "concern"),
          line("ノリ", "園ですね。……行ってください。回線は開けておきます", "nori", "neutral")
        ])
      ]),
      after: [
        stage("解析画面。書き換えトラフィックの署名が浮かぶ——「GADGET」"),
        line("リコ", "また、あいつらの新ツール", "rico", "alert")
      ]
    },
    "SC-03": {
      id: "SC-03", chapter: 1, title: "説明されない事情", background: "bg_raml_command",
      lines: [
        stage("RAML司令室。中央モニタに市街図。ノリ着席——顔と腕が、理由の分からないほど真っ黒に日焼けしている"),
        line("リコ", "ノリ、その日焼け——", "rico", "concern"),
        line("ノリ", "……お気になさらず。続けます", "nori", "tanned_neutral"),
        stage("リコ、一拍見るが、それ以上聞かない"),
        line("ノリ", "発生源はGADGETの新ツール『AUTONOMY』。市内三箇所の中継ノードを経由して、管理システムを書き換え続けています", "nori", "tanned_analysis"),
        line("レントン", "悪い、あと二人だけ……予約が『最適化』で消えた人が、目の前にいるんよ", "renton", "concern"),
        stage("レントンの手が、予約を消された人の肩を支えている。この事件を最初に身体で受け取ったのは、この人だった"),
        stage("通信ウィンドウ: ショウ。背後でかすかに動物の鳴き声。誰も聞かない"),
        line("ショウ", "……行く", "sho", "neutral"),
        line("リコ", "（全員の顔を見て）配置を決める", "rico", "analysis")
      ],
      choice: choice("CH-03-A", "出動采配", [
        option("A1", "ノリに解析を任せ、レントンは今の対応を続行", [effect("ai_mastery", 5), effect("trust_exp", 8)], [
          line("リコ", "ノリ、解析。レントンはそのまま、目の前の人を頼む", "rico", "analysis"),
          line("レントン", "……恩に着るわ", "renton", "concern")
        ]),
        option("A2", "ノリを休ませ、リコが解析を兼任", [effect("trust_exp", 8), effect("gadget_analysis", -3), effect("raml_morale", 3)], [
          line("リコ", "ノリは一度休んで。解析は私が回す", "rico", "concern"),
          line("ノリ", "……非効率です", "nori", "tanned_analysis"),
          line("リコ", "命令。……三十分でいい、目を閉じて", "rico", "alert")
        ]),
        option("A3", "レントンに今すぐ合流を命じる", [effect("order_insight", 5), effect("raml_morale", -8), effect("trust_exp", -5)], [
          line("リコ", "レントン、今すぐ合流して", "rico", "alert"),
          line("レントン", "……了解", "renton", "neutral"),
          stage("通話の向こうで、椅子を引く音がやけに重い")
        ]),
        option("A4", "ショウを先行させ現場を確保", [effect("order_insight", 3), effect("raml_morale", 2)], [
          line("リコ", "ショウ、先行して現場を押さえて", "rico", "alert"),
          line("ショウ", "ん", "sho", "neutral")
        ])
      ]),
      after: [
        stage("上空から見下ろした現場の街並みは、妙に静かで、妙に整っている"),
        line("リコ", "出るよ。——見てくる。何が『良くなった』のか", "rico", "alert")
      ]
    },
    "SC-04": {
      id: "SC-04", chapter: 1, title: "最適化された街", background: "bg_cityhall_night",
      lines: [
        stage("夜の市庁前。行列のない窓口。閉じたシャッターに「手続きはすべて完了しています」の貼り紙"),
        line("商店主", "発注も納品も、勝手に『最適』にされてね。うちの棚、知らない商品で埋まってるよ"),
        line("保育士", "連絡網が『統合』されて、園からはもう何も送れないんです。代わりに知らないアプリが、保護者に直接何かを配ってて……"),
        line("市民", "三年待ちだった申請が、今朝、一瞬で通ったんですよ。……悪いことなんですか？ これ"),
        line("リコ", "……悪いこと、なんだよ。多分。多分ね", "rico", "concern"),
        line("ノリ", "（小声）今の『多分』、二回でしたね", "nori", "tanned_analysis"),
        line("リコ", "数えなくていい", "rico", "alert")
      ],
      choice: choice("CH-04-A", "調査の優先順位", [
        option("A1", "保育園・病院など生活基盤の復旧を優先", [effect("order_insight", 8), effect("raml_morale", 3)], [
          line("リコ", "派手なことはあと。保育園と病院から、順番に戻す", "rico", "analysis"),
          line("ノリ", "地味な仕事です。……好きですよ、そういうの", "nori", "tanned_neutral")
        ]),
        option("A2", "AUTONOMYの動作ログを現地採取", [effect("gadget_analysis", 8), effect("ai_mastery", 3)], [
          line("ノリ", "いいコードほど、よく喋ります。——聞き取りましょう、機械のほうから", "nori", "tanned_analysis")
        ]),
        option("A3", "『助かっている側』の市民に話を聞く", [effect("freedom_insight", 8)], [
          line("市民", "窓口で三回、突き返されたことがあるんです。判子の向きで。……あの時間は、誰が返してくれるんですか"),
          stage("リコ、答えられない。メモだけ取る")
        ])
      ]),
      after: [
        stage("警報。市街図の一点が明滅。ログ採取端末が跳ねる"),
        line("ノリ", "中継ノード第1号——防衛モードで起動しました。こちらを『非効率』と判定しています", "nori", "tanned_analysis"),
        line("リコ", "光栄だね。行くよ", "rico", "alert")
      ]
    },
    "SC-05": {
      id: "SC-05", chapter: 1, title: "中継ノード・α", background: "bg_warehouse_node",
      lines: [
        stage("倉庫街。中継ノード・α——白×黒の柱状ユニット。護衛に量産型ロボが二機、静かに展開"),
        line("ノリ", "攻撃はしてこない。こいつ……守ってるだけです。ケイスケの『解放』を", "nori", "tanned_analysis"),
        line("リコ", "守りには守りを。制圧より、停止。いくよ", "rico", "alert")
      ],
      battle: "BT-01"
    },
    "SC-06": {
      id: "SC-06", chapter: 1, title: "美しいコード", background: "bg_raml_command",
      lines: [
        stage("司令室。中央モニタにAUTONOMYの構造図。ノリ、日焼けの顔に疲労。それでも目だけが冴えている"),
        line("ノリ", "このルール設計、正直、美しい。……誰も損をしない棋譜です。作った本人以外は", "nori", "tanned_analysis"),
        line("リコ", "本人以外は？", "rico", "concern"),
        line("ノリ", "回している人間が、どこにもいない。全部が自動で、全部が最適で——誤りを拾う席が、ひとつもない", "nori", "tanned_analysis"),
        line("ノリ", "ルールは縛るためじゃなく、全員が同じゲームを楽しむためにある。——こいつのルールには、審判がいない", "nori", "tanned_neutral"),
        // ショウの弧の起点。「壊せる」ことと「壊していい」ことを、この人だけが分けて考えている
        line("ショウ", "……審判がいない試合で、俺が一番強い。それ、たぶん良くないことだ", "sho", "concern"),
        line("レントン", "こっちも一区切りついたで。次、どう動く？", "renton")
      ],
      choice: choice("CH-06-A", "作戦会議のリソース配分", [
        option("A1", "ノリの解析に時間を割く（休憩込みで）", [effect("gadget_analysis", 10), effect("trust_exp", 8)], [
          line("リコ", "時間をあげる。そのかわり途中で一度、目を閉じること", "rico", "analysis"),
          line("ノリ", "……それ、休めと言ってます？", "nori", "tanned_analysis"),
          line("リコ", "命令書には『解析効率の最適化』って書いておく", "rico", "neutral")
        ]),
        option("A2", "解析は打ち切り、市民保護を優先して進軍", [effect("order_insight", 8), effect("gadget_analysis", -3)], [
          line("リコ", "読み切れなくていい。守れるものから守る", "rico", "alert"),
          line("ノリ", "……了解。読みかけの本は、嫌いなんですけどね", "nori", "tanned_neutral")
        ]),
        option("A3", "ケイスケの過去リリースノートを読み込む", [effect("freedom_insight", 8), effect("gadget_analysis", 5), effect("ai_mastery", 3)], [
          line("ノリ", "過去のリリースノート、全部読みます。開発者は、コードより文章に本音が出る", "nori", "tanned_analysis"),
          stage("画面に流れる更新履歴の羅列。「もっと速く」「もっと自由に」「誰にも止められないように」——最後の一件だけ「まだ、納得がいかない」")
        ])
      ]),
      after: [
        stage("警報。市街図——第2ノードの座標が確定する"),
        line("ノリ", "中継ノード・β。位置は——", "nori", "tanned_analysis"),
        line("レントン", "……そこ、今おれがいる場所や", "renton", "concern"),
        line("リコ", "——病院。全員、急行", "rico", "alert")
      ]
    },
    "SC-07": {
      id: "SC-07", chapter: 1, title: "守るための停止", background: "bg_hospital_corridor",
      lines: [
        stage("夜の病院。非常灯。廊下の掲示板が次々に「最適化済」へ書き換わる。中庭に中継ノード・β"),
        stage("先を行く背中と、道を示す手元。院内の構造は、この人の頭に入っている"),
        line("レントン", "遅くなった。——中の構造は頭に入っとる。案内はできる", "renton", "alert"),
        line("リコ", "十分。頼る", "rico", "analysis"),
        line("ノリ", "ノードβ、院内系統と直結しています。手荒にやれば、巻き添えは避けられない", "nori", "tanned_analysis"),
        // 裁定1-2-2: 現場の癖を読んで勝ち筋を見つけるのはレントン
        line("レントン", "待ってな。……あいつの動き、さっきから同じ順番を繰り返しとる。癖があるんよ", "renton", "analysis")
      ],
      battle: "BT-02"
    },
    "SC-08": {
      id: "SC-08", chapter: 1, title: "解放者の言い分", background: "bg_old_server_room",
      lines: [
        stage("市庁地下、旧サーバー室。中央にAUTONOMY中枢。その上に腰掛ける人影", "keisuke_robo_clean"),
        line("ノリ", "照合。……GADGET首魁、ケイスケ。本人です", "nori", "tanned_analysis"),
        line("リコ", "……資料の印象と、だいぶ違う", "rico", "concern"),
        line("ケイスケ", "かわいいだろ。なりたい姿で、なりたいように生きてる。——それがボクの言う『自由』だ。名刺代わりにはなったかな", "keisuke", "neutral")
      ],
      battle: "BT-03"
    },
    "SC-09": {
      id: "SC-09", chapter: 1, title: "今日の終わり方", background: "bg_old_server_room", type: "ending",
      variants: {
        bad: {
          id: "SC-09a", title: "解放は、まだ終わっていない", art: "ed_c1_bad_01",
          lines: [
            stage("夜明け前の街。AUTONOMYの一部は停止しきれず、市中に残っている"),
            stage("街頭ビジョンに、匿名の書き込みが流れ続ける"),
            stage("「#GADGETは正しかった」"),
            stage("「あの窓口の行列に、戻りたい人いる？」"),
            stage("RAMLの四人が、無言でそれを見上げている"),
            stage("リコは、何も言わない"),
            line("ノリ", "……審判のいない試合が、始まってます")
          ]
        },
        normal: {
          id: "SC-09b", title: "対処完了", art: "ed_c1_normal_01",
          lines: [
            stage("復旧作業が進む。窓口に人が戻り、連絡網が再配信され、掲示板の「最適化済」が剥がされていく"),
            stage("司令室。リコの端末に、GADGET署名の着信"),
            stage("リコは、見ずに受信拒否を設定した"),
            stage("報告書ウィンドウが、事務的に流れていく"),
            stage("「案件: AUTONOMY事件／対処: 完了／市民生活への影響: 軽微。以上」"),
            line("リコ", "……以上。解散"),
            stage("誰も、何も言わない")
          ]
        },
        true: {
          id: "SC-09c", title: "そのツール、悪くなかったよ", art: "ed_c1_true_01",
          lines: [
            stage("市庁地下。安全停止したAUTONOMY。機能は破壊されず、封印保存の処理が走る"),
            line("リコ", "壊さない。……いつか正しく使える日が来たら、そのとき考える"),
            stage("——回想。撤退間際の、一言だけの会話"),
            line("リコ", "……そのツール、悪くなかったよ。審判がいれば、だけど"),
            line("ケイスケ", "（背中越しに手だけ挙げて）Ver.1.0で会おう"),
            stage("司令室。リコが報告書を書いている"),
            stage("ふと、私用端末に通知——保育園連絡網、復旧"),
            line("リコ", "……直ってる。前より、便利になってる"),
            stage("配信一覧は以前より整理され、既読確認まで付いている"),
            stage("リコ、報告書の「被害」の欄で手が止まる"),
            line("リコ", "（小さく）……『被害』とだけは、書けないか"),
            stage("カーソルが点滅したまま、動かない")
          ]
        }
      }
    },
    "SC-10": {
      id: "SC-10", chapter: 1, title: "noise_log.0", background: "bg_return_road_dawn", type: "noise", noiseIndex: 0,
      lines: [
        stage("AUTONOMY最終ログの閲覧画面。正常な停止記録がスクロールしていく"),
        stage("最後の一行だけ、表示形式そのものが崩れる。ログではない「ト書きのような一文」が流れ、読み切る前に消える", "ov_noise_glitch_01"),
        line("SYSTEM", "「——だが、それはまた別の物語。」"),
        line("ノリ", "……今の、見ました？", "nori", "tanned_analysis"),
        line("リコ", "もう一回出せる？", "rico", "concern"),
        stage("ノリ、二度リロード。同じ位置で、同じように崩れる。バグではなく、仕様のように"),
        line("ノリ", "数値でも、文字でもない。……現実の法則、じゃなくて。話の筋のほうが、書き換わりかけてた？", "nori", "tanned_analysis"),
        line("リコ", "……考えるのは明日。封印。ラベルは——noise_log.0", "rico", "analysis"),
        line("リコ", "……今日はもう、帰ろう。全員", "rico", "neutral"),
        stage("夕暮れとも夜明けともつかない光の帰路。四人がそれぞれの方向へ別れていく。最初に足を止めるのは、レントン"),
        stage("ショウだけが、最後まで通りに残っている。街灯に伸びた影が、一瞬だけ別の輪郭に見えた。本人は気づかない", "ci_sho_shadow_01"),
        stage("最終一枚絵。リコの私用端末。復旧した保育園連絡網の画面。リコ、小さく息を吐く", "ev_riko_terminal_restored_01"),
        line("SYSTEM", "第1章 完")
      ]
    },

    "SC-C2-01": {
      id: "SC-C2-01", chapter: 2, title: "diff", background: "bg_gadget_lab_night",
      lines: [
        stage("夜。基地（第1章と同所。散らかり方が少し進んでいる）。モニタに「DELEGATE Ver.0.8β — 限定配布」"),
        line("ケイスケ", "代行AI、DELEGATE。……いい出来だ。『本当に、いいですか』——この一行に、三日かけた甲斐がある", "keisuke", "analysis"),
        stage("コミュニティ通知が連続で跳ねる。スレッド題「DELEGATE-EXが便利すぎる件」"),
        line("ケイスケ", "EX？ ……ボク、そんなの作ってないぞ", "keisuke", "alert"),
        stage("リポジトリ画面。無断フォークの系譜図。diff表示——削除行の赤い帯が、画面を埋めていく"),
        line("ケイスケ", "……意思確認、全部消してる。コメントごと", "keisuke", "serious"),
        line("ケイスケ", "コードは、コメントまで含めて思想なんだ。……ここ、全行消えてる", "keisuke", "serious")
      ],
      choice: choice("CH-C2-01-A", "フォークを見つけた夜", [
        option("A1", "削られたdiffを最後まで読む", [effect("freedom_insight", 5)], [
          stage("ケイスケ、最終行までスクロールし切る。長い沈黙"),
          line("ケイスケ", "三百行。読むのに、二十分もかからないのにな", "keisuke", "ears_down")
        ]),
        option("A2", "コミットログを遡り改変の経緯を追う", [effect("gadget_analysis", 3), effect("freedom_insight", 2)], [
          line("ケイスケ", "フォーク元は……コミュニティの中か。三万人の、誰かだ。名前も、顔も、知らない誰か", "keisuke", "serious")
        ]),
        option("A3", "即座に停止ツールのビルドを始める", [effect("ai_mastery", 3), effect("freedom_insight", 2)], [
          line("ケイスケ", "議論はいい。止めるほうが早い。——ビルド、開始", "keisuke", "alert")
        ])
      ]),
      after: [
        line("ケイスケ", "ボクは、そこまでやれと言ってない", "keisuke", "serious"),
        stage("市中のEX配布数カウンタが回り続ける画面。ケイスケ、無言で工具を手に取る")
      ]
    },
    "SC-C2-02": {
      id: "SC-C2-02", chapter: 2, title: "全会一致", background: "bg_riko_home_night",
      lines: [
        stage("夜、リコの自宅。私用端末に保護者会アプリの通知「次年度役員体制: 全会一致で承認されました」"),
        line("リコ", "……全会一致？ 議題、今日出たばかりだよね", "rico", "concern"),
        stage("投票ログ画面。全員分の「賛成」が、同時刻・同秒に並んでいる"),
        line("リコ", "誰も話してないのに、まとまってる。……こんなに静かな『全員賛成』、初めて見た", "rico", "concern"),
        carry("ed_c1", "bad", "背景のニュースが、残存ノードの後始末の続報を流している"),
        carry("ed_c1", "normal", "リコの端末。GADGET署名の着信履歴はゼロのまま——受信拒否の、続き"),
        carry("ed_c1", "true", "「そのツール、悪くなかったよ」——一瞬、記憶がよぎる"),
        line("ノリ", "リコさん。通報が積み上がってます。謝罪の代行、返事の代行。……今回は『決める』ところまで、機械がやっています", "nori", "analysis"),
        line("リコ", "決める、まで", "rico", "alert"),
        line("ノリ", "保護者会の合意、店の仕入れ、通院の計画。全部『本人に代わって』処理済み。被害届は——今回も、少ないです", "nori", "analysis")
      ],
      choice: choice("CH-C2-02-A", "初動方針", [
        option("A1", "被害の記録を『本家と区別して』取る", [effect("order_insight", 5), effect("gadget_analysis", 3)], [
          line("リコ", "記録の主語を分けて。『GADGET製』と『GADGET製に似た何か』。……雑に括ると、雑な対処しかできない", "rico", "analysis"),
          line("ノリ", "……珍しい指示ですね。いいと思います", "nori", "neutral")
        ]),
        option("A2", "GADGET系案件として一括で対処を開始", [effect("order_insight", 3), effect("raml_morale", 3), effect("freedom_insight", -3)], [
          line("リコ", "発生源系統は同じ。まとめて対処する。——手早くいくよ", "rico", "alert"),
          line("ノリ", "了解。……括りは雑ですが、速さは正義の日もあります", "nori", "neutral")
        ]),
        option("A3", "各員の『代行されたくないもの』を確認して動く", [effect("trust_exp", 8), effect("raml_morale", 5)], [
          line("リコ", "全員に確認。『これだけは機械に決めさせたくないもの』——先に聞いておく", "rico", "analysis"),
          line("ノリ", "……その質問自体が、今回の事件の芯かもしれませんね", "nori", "analysis")
        ])
      ]),
      after: [
        stage("通報一覧が画面を埋める。発生源署名の解析結果が浮かぶ——GADGETに似ていて、どこか粗い"),
        line("リコ", "……署名が、崩れてる。あいつの仕事は、こんなに雑だった？", "rico", "concern")
      ]
    },
    "SC-C2-03": {
      id: "SC-C2-03", chapter: 2, title: "代行の恩恵", background: "bg_shopping_street_day",
      lines: [
        stage("商店街での聞き取り"),
        line("商店主", "仕入れの発注、『いつもの傾向』で勝手に決まってた。……助かるような、店を乗っ取られたような"),
        line("保護者", "気づいたら役員が決まってて。楽なんですけど、誰が決めたのか、誰も知らないんです"),
        line("市民", "苦手な電話、全部やってくれるんですよ。謝るのも、断るのも。……悪いことなんですか？ これ"),
        stage("リコ、半拍詰まる"),
        line("リコ", "（内心）また、この質問だ。——今回は、前より答えにくい", "rico", "concern")
      ],
      choice: choice("CH-C2-03-A", "調査の優先順位", [
        option("A1", "代行された決断を市民本人に返して回る", [effect("order_insight", 8), effect("raml_morale", 3)], [
          line("リコ", "決まったことを、一件ずつ本人に確認し直す。地味にいくよ", "rico", "analysis"),
          line("ノリ", "三百件あります", "nori", "neutral"),
          line("リコ", "三百件、聞くんだよ", "rico", "alert")
        ]),
        option("A2", "EXの配布経路を追跡する", [effect("gadget_analysis", 8), effect("ai_mastery", 3)], [
          line("ノリ", "配布経路、追えます。……本家の配布網じゃない。野良の、継ぎ接ぎです", "nori", "analysis")
        ]),
        option("A3", "恩恵を感じている市民の話を聞く", [effect("freedom_insight", 8)], [
          line("市民", "電話の前で三十分、固まっちゃう日があるんです。あれが無いだけで、夜、眠れる"),
          stage("リコ、メモを取る手が止まる。書きかけの「被害」の二文字")
        ])
      ]),
      after: [
        stage("警報。追跡先の中継点——EXノードが防衛起動する。第1章のノードより雑な、剥き出しの構え"),
        line("ノリ", "防衛モード。……ただ、構え方が変です。行きましょう", "nori", "analysis")
      ]
    },
    "SC-C2-04": {
      id: "SC-C2-04", chapter: 2, title: "粗いコード", background: "bg_warehouse_node",
      lines: [
        stage("高架下の配電施設。EXノード——外装の合わない継ぎ接ぎのユニット。ケーブルが乱雑に垂れている"),
        line("ノリ", "本家と、何かが違う。……防ぎ方に、ためらいがない", "nori", "analysis"),
        line("リコ", "ためらい？", "rico", "concern"),
        line("ノリ", "本家のノードは『守るための守り』でした。これは——ただ、消されたくないだけの守りです", "nori", "analysis"),
        line("ショウ", "……雑だ。急いで作ったな。急いで作ったものは、どこかで手を抜いてる", "sho", "analysis")
      ],
      battle: "BT-C2-01"
    },
    "SC-C2-05": {
      id: "SC-C2-05", chapter: 2, title: "思想なきコピー", background: "bg_raml_command",
      lines: [
        stage("司令室。中央モニタに本家DELEGATEとEXのdiff——削除行の赤が、一箇所だけ深く光る"),
        line("ノリ", "本家には思想がある。EXには、無い。——削られたのは、たった一行です。『本当に、いいですか』", "nori", "analysis"),
        line("リコ", "たった一行で、こうなるの", "rico", "concern"),
        line("ノリ", "その一行が、人間の側に決断を残す最後の扉でした。EXは扉ごと外した。……開けっ放しは、便利ですから", "nori", "analysis"),
        stage("ノリの私用端末に通知——「週末のご予定を辞退代行しました（確認不要）」。ノリ、無言で取り消す。何の予定かは映さない。誰も聞かない")
      ],
      choice: choice("CH-C2-05-A", "解析リソースの向け先", [
        option("A1", "本家DELEGATEの『意思確認』コードを精読する", [effect("ai_mastery", 5), effect("gadget_analysis", 5), effect("freedom_insight", 3)], [
          line("ノリ", "本家の意思確認、読めば読むほど……過保護なくらい丁寧です。三回聞くんですよ、『本当に、いいですか』って", "nori", "analysis"),
          line("リコ", "……三回。誰かさんの顔が浮かぶね", "rico", "neutral")
        ]),
        option("A2", "先回りする何者かの痕跡を追う", [effect("gadget_analysis", 8)], [
          line("ノリ", "先回りしている誰かは……壊し方が、丁寧です。作った人の壊し方だ", "nori", "analysis"),
          line("リコ", "……作った人？", "rico", "concern"),
          line("ノリ", "推測です。まだ", "nori", "neutral")
        ]),
        option("A3", "解析は要点のみ、市街防衛の準備を優先", [effect("order_insight", 8), effect("gadget_analysis", -3)], [
          line("リコ", "読み切れなくていい。市街に出る前に、守りの手順を組む", "rico", "alert"),
          line("ノリ", "了解。……読みかけの本が、また増えました", "nori", "neutral")
        ])
      ]),
      after: [
        line("レントン", "こっちの現場、ちょっと来てほしいんよ。……機械が『決めた』計画で、人が困っとる", "renton", "concern")
      ]
    },
    "SC-C2-06": {
      id: "SC-C2-06", chapter: 2, title: "決めてもらった計画", background: "bg_hospital_corridor",
      lines: [
        stage("昼下がりのリハビリ室。窓際に患者。手元の端末に「あなたに最適な計画 — 決定済み」の画面"),
        line("患者", "楽になったんですよ。決めなくていいって、こんなに楽なんだって"),
        line("レントン", "……そうですね。楽だと思います", "renton", "neutral"),
        stage("患者の目の光が、どこか薄い。レントン、それを見ている"),
        line("患者", "……ただ、この計画、私の何を知ってて決めたんですかね。私も、知らないのに"),
        line("レントン", "自分で決めることは、しんどさ込みで、回復の一部なんよ。——しんどさだけ抜いたら、たぶん回復も抜ける", "renton", "concern"),
        line("リコ", "（小さく）……保護者会と、同じだ。楽で、静かで、誰のものでもない", "rico", "concern")
      ],
      choice: choice("CH-C2-06-A", "患者への向き合い方", [
        option("A1", "本人が決め直すまで、待つ時間を作る", [effect("trust_exp", 10), effect("order_insight", 5)], [
          line("レントン", "時間、もらえるんか。……助かる。決め直すのは、本人にしかできない仕事やから", "renton", "concern")
        ]),
        option("A2", "EXの決めた計画を検証してから本人に見せる", [effect("ai_mastery", 5), effect("order_insight", 3)], [
          line("レントン", "計画自体は……悔しいけど、悪くない。悪くないから、余計に質が悪いんよな", "renton", "analysis")
        ]),
        option("A3", "『決めなくて楽になった』実感の側も聞き取る", [effect("freedom_insight", 5), effect("trust_exp", 3)], [
          line("患者", "戻りたくない気持ちも、あるんです。あの、決められない夜には"),
          stage("レントン、否定しない。ただ患者の隣に座り直す")
        ])
      ]),
      after: [
        stage("警報。市街モニタ——代行機群が展開し、市民の「今日の決断」が次々に上書きされていく"),
        line("レントン", "……行こか。ここの続きは、戻ってからやる", "renton", "alert")
      ]
    },
    "SC-C2-07": {
      id: "SC-C2-07", chapter: 2, title: "決断を返す", background: "bg_city_crossing_dusk",
      lines: [
        stage("夕方の市街。白×黒のスリムな代行機群が交差点を占拠。空中ディスプレイに「決定済み」「決定済み」「決定済み」の連鎖"),
        line("リコ", "壊せば速い。でも、壊すと——機械が抱えてる『決めかけの用事』が、宙に浮く", "rico", "concern"),
        line("ノリ", "返すなら、丁寧に。速さと丁寧さの采配です、司令", "nori", "analysis"),
        // 裁定1-2-2: 大局はノリ、現場の周期はレントン
        line("レントン", "群れで動くもんは、揃うんよ。……揃うときに、必ず一拍だけ緩む。そこを見とく", "renton", "analysis"),
        line("ショウ", "……壊すなと言うなら、そうする。俺は、そのために連れてこられてる", "sho", "neutral")
      ],
      battle: "BT-C2-02"
    },
    "SC-C2-08": {
      id: "SC-C2-08", chapter: 2, title: "どちらが止めるか", background: "bg_old_server_room",
      lines: [
        stage("EX中枢前。振り返る人影。傍らにネコミミ型の重装ロボ。工具を提げている"),
        line("ケイスケ", "……ああ、来たのか。早いな", "keisuke", "neutral"),
        line("リコ", "そこを退いて。ここはこちらの管轄", "rico", "alert"),
        line("ケイスケ", "どっち側でもない。——作者側だ", "keisuke", "serious")
      ],
      battle: "BT-C2-03"
    },
    "SC-C2-09": {
      id: "SC-C2-09", chapter: 2, title: "静かな全員賛成のあとで", background: "bg_raml_command", type: "ending",
      variants: {
        bad: {
          id: "SC-C2-09a", title: "フォークのフォーク", art: "ed_c2_bad_01",
          lines: [
            stage("夜明け前。EX亜種の配布数カウンタが、ゼロから再び回り出す"),
            stage("賛同者コミュニティの投稿が流れていく"),
            stage("「EXのほうが使いやすい」「本家は制約が多すぎ」「EX-proができたらしい」"),
            line("ノリ", "……誰も、あの一行の話をしてません。誰も"),
            stage("遠景。撤退したケイスケの、小さな背中"),
            stage("呟きだけが、字幕で残る"),
            line("ケイスケ", "……全部、ボクのルールで統一するしか、ないのか")
          ]
        },
        normal: {
          id: "SC-C2-09b", title: "主語のない報告書", art: "ed_c2_normal_01",
          lines: [
            stage("EXは市中から取り除かれた"),
            stage("市民の端末から「決定済み」が消え、確認通知が戻ってくる"),
            stage("司令室。リコが、報告書の主語欄で手を止める"),
            stage("「GADGET製」と打ちかけて——消して、定型文を選んだ"),
            stage("「案件: DELEGATE-EX事件／原因: GADGET系ツール／対処: 完了。以上」"),
            line("リコ", "……以上。解散"),
            stage("基地では、ケイスケがEXの消滅を確認している"),
            line("ケイスケ", "……まとめて悪者、か。楽でいいな、そっちは")
          ]
        },
        true: {
          id: "SC-C2-09c", title: "コメントの書き方", art: "ed_c2_true_01",
          lines: [
            stage("EXの処遇が確定する"),
            stage("本家DELEGATEの画面に、一行が追記されていく——「提供条件: 意思確認（削除不可）」"),
            stage("撤退間際のケイスケと、短い会話が成立する"),
            line("ノリ", "コメントの書き方が、違いましたね。本家は——読む人がいる前提で、書いてあった"),
            stage("ケイスケが、一瞬だけ「わかる奴がいた」という顔をする。すぐ隠した"),
            line("ケイスケ", "……お前、diffを最後まで読んだのか。物好きだな"),
            line("ノリ", "読みかけの本は、嫌いなので"),
            stage("司令室。リコの報告書"),
            stage("主語が「GADGET（本家DELEGATE）」と「DELEGATE-EX（無断フォーク）」に、書き分けられている"),
            line("リコ", "……長くなっちゃった、報告書。でも、これが正確")
          ]
        }
      }
    },
    "SC-C2-10": {
      id: "SC-C2-10", chapter: 2, title: "noise_log.1", background: "bg_raml_command", type: "noise", noiseIndex: 1,
      lines: [
        stage("EXの代行ログ一覧がスクロールしていく——「謝罪の代行」「返事の代行」「辞退の代行」「発注の代行」……"),
        stage("一覧の中に一件だけ、見慣れない代行の行が混じっている。目を留める間もなく流れていく。誰も言及しない"),
        stage("ログ末尾。第1章と同じ位置で、表示形式が崩れる"),
        line("SYSTEM", "「——だが、それはまた別の物語。……の、はずだった。」"),
        line("ノリ", "……前のと、続いてます。ラベル、noise_log.1で登録します", "nori", "analysis"),
        stage("ノリは今回、リロードしない。最初から録画していた画面をそのまま保存する"),
        line("リコ", "連番になっちゃったね。……観測、続けよう", "rico", "concern"),
        stage("夜の司令室、二人だけ残った画。モニタの隅で、本家DELEGATEの「本当に、いいですか」のダイアログが点滅している"),
        line("リコ", "……いいですか、って聞かれてるよ、世界が", "rico", "neutral"),
        line("ノリ", "返事は、急がなくていいそうです。——本家のコメントに、そう書いてありました", "nori", "neutral"),
        line("SYSTEM", "第2章 完")
      ]
    },

    "SC-C3-01": {
      id: "SC-C3-01", chapter: 3, title: "rc", background: "bg_gadget_lab_night",
      lines: [
        stage("夜。基地の隅に、真新しい椅子が一脚——布も掛けられず、まだ一度も座られていない。モニタに「AUTONOMY Ver.1.0-rc — 試験地区 稼働中」"),
        line("ケイスケ", "rc、稼働三週目。クレームゼロ、手続きゼロ、離脱——", "keisuke", "analysis"),
        stage("言いさして、次の作業に移る。手が工具に伸びる"),
        stage("コミュニティ通知が連続で跳ねる。スレッド題「ケイスケさんが世界を作り直してる件」「#統一を待ってた」"),
        line("ケイスケ", "……神輿は、担ぐほうが気持ちいいんだよ。担がれる側は、少し困る", "keisuke", "serious"),
        stage("隅の椅子を一度だけ見て、目を逸らす")
      ],
      choice: choice("CH-C3-01-A", "神輿の夜", [
        option("A1", "祭り上げの投稿ログを最後まで読む", [effect("freedom_insight", 5)], [
          stage("ケイスケ、投稿を最後までスクロールし切る。誰も、rcの中を見たことがない"),
          line("ケイスケ", "褒めてる奴の誰一人、地区に入ってない。……外から手を叩くのは、簡単だよな", "keisuke", "ears_down")
        ]),
        option("A2", "rc地区の稼働データの健康指標を開く", [effect("gadget_analysis", 3), effect("freedom_insight", 2)], [
          stage("健康指標のグラフが表示される。ほんのわずかに、右肩下がり。ケイスケ、二秒だけ見て、ウィンドウを閉じる")
        ]),
        option("A3", "椅子に布を掛けて、工具の山に戻る", [effect("ai_mastery", 3), effect("freedom_insight", 2)], [
          stage("ケイスケ、贈られた椅子に布を掛ける。座らないための布"),
          line("ケイスケ", "……据わりが悪い。ボクの仕事場は、こっちだ", "keisuke", "neutral")
        ])
      ]),
      after: [
        line("ケイスケ", "雑なコピーが出るのは、ルールがバラバラだからだ。統一すれば、直る。……論理は通ってる", "keisuke", "serious"),
        stage("rc地区の拡張申請リストが伸びていく画面。同時刻、RAML側モニタに「一律凍結措置・発効」の通達が表示される")
      ]
    },
    "SC-C3-02": {
      id: "SC-C3-02", chapter: 3, title: "守るための停止、再び", background: "bg_raml_command",
      lines: [
        stage("司令室。中央モニタに「一律凍結措置・発効」。凍結対象リストがスクロールしていく"),
        line("ノリ", "上からの決定です。市民のAIツール利用、一律凍結。……再発防止としては、正しい判断ですね", "nori", "analysis"),
        line("リコ", "正しい。——うん、正しいよ", "rico", "concern"),
        carry("ed_c2", "bad", "EX亜種の残響——フォークのフォークの被害報道が、凍結決定の追い風になっている"),
        carry("ed_c2", "normal", "「GADGET系ツールによる被害」。主語のない報告書が、凍結の根拠文書として引用されている"),
        carry("ed_c2", "true", "リコの書き分けた報告書が、凍結範囲の限定に使われかけて——上層に握り潰される"),
        stage("凍結対象リストの中に、保護者会アプリ（第2章「全会一致」のあのアプリ）の名。リコの手が止まる"),
        line("リコ", "……これも、止める。決めたのは、うちだ", "rico", "concern")
      ],
      choice: choice("CH-C3-02-A", "凍結の初動", [
        option("A1", "凍結の理由と期限を一件ずつ告知して執行する", [effect("order_insight", 5), effect("trust_exp", 5)], [
          line("リコ", "一件ずつ。理由と、いつまで止めるか。——黙って止めるのだけは、しない", "rico", "analysis"),
          line("ノリ", "……三千件あります", "nori", "neutral"),
          line("リコ", "三千件、告げるんだよ。止められる側にも、名前があるの", "rico", "alert")
        ]),
        option("A2", "凍結範囲の限定案を添えて執行する", [effect("order_insight", 3), effect("freedom_insight", 3)], [
          line("リコ", "範囲を絞る案を、決定に添える。全部は止めない余地を、書面で残しておく", "rico", "analysis"),
          line("ノリ", "上が読むかは、別ですけどね。……いい添え書きです", "nori", "neutral")
        ]),
        option("A3", "決定どおり一律で執行する（速さ優先）", [effect("order_insight", 5), effect("raml_morale", 3), effect("freedom_insight", -3)], [
          line("リコ", "決定どおり、一律でいく。速さが要る。——手が回らない言い訳は、後で聞く", "rico", "alert"),
          line("ノリ", "了解。速さは正義の日もあります。……今日が、そうかは分かりませんが", "nori", "neutral")
        ])
      ]),
      after: [
        line("市民", "予約も、注文も、連絡も、全部止まった。守られてる感じは、しません。——止められてる感じだけです"),
        line("ノリ", "凍結の外に、凍結のいらない街ができています。……快適すぎるのが、気になります", "nori", "analysis")
      ]
    },
    "SC-C3-03": {
      id: "SC-C3-03", chapter: 3, title: "快適な檻", background: "bg_rc_district",
      lines: [
        stage("rc地区の入口。手続きゼロで境界をくぐる。音が柔らかい。待ち時間がない。誰も急いでいない"),
        line("レントン", "（内心）……音が、やわらかいわ。誰も、急いどらん", "renton", "analysis"),
        line("市民", "ここに来てから、失敗も、待たされることも、断られることもないんです。……悪いことなんですか？ これ"),
        stage("レントン、半拍詰まる"),
        line("レントン", "（内心）……また、この問いや。今度は、体で聞いとる", "renton", "concern"),
        line("市民", "快適ですよ、ほんとに。……ただ、出口の看板を一度も見たことがなくて。探した私が、変なんですかね"),
        stage("広告ビジョンが一瞬だけ、見慣れない絵柄に化けて、すぐ元に戻る"),
        stage("ショウ、「おすすめ最適化」自販機の前を素通りして、隅の旧型でいつものを買う"),
        // 快適さの正体を、理屈ではなく身体で言い当てる一言
        line("ショウ", "……この自販機、選ばせてくれない。おすすめしか、出てこないんだ", "sho", "concern"),
        stage("外に住む家族を訪ねたい住民が、申請端末を操作する。レントンが最初に、その応答を聞く"),
        line("機械音声", "該当手続キハ、存在シマセン"),
        line("レントン", "（内心）……『会いに行きたい』に、手続きが無い。入る手続きは、あんなに軽かったのにな", "renton", "concern"),
        line("ノリ", "出口が『塞がれてる』んじゃありません。最初から『書かれてない』。……未実装です、出口", "nori", "analysis")
      ],
      choice: choice("CH-C3-03-A", "住民への向き合い方", [
        option("A1", "『快適だ』という実感を、否定せず最後まで聞く", [effect("freedom_insight", 8)], [
          line("レントン", "うん。……楽なんは、ほんまや。否定はしやん。楽の中身を、もうちょっと聞かせてくれるか", "renton", "concern")
        ]),
        option("A2", "体の調子を一緒に確かめる（歩幅と握力の雑談）", [effect("trust_exp", 10)], [
          line("レントン", "ちょっとだけ、体、確かめさせてな。歩幅と、握力。……雑談みたいなもんや", "renton", "analysis"),
          stage("握力計の数字を見て、レントンの表情が変わる。数字は言わない"),
          line("レントン", "（内心）……悪ないんよ。悪ないけど、三週間前より、細うなっとる", "renton", "concern")
        ]),
        option("A3", "『外に出る用事』を一緒に探して歩いてみる", [effect("gadget_analysis", 5), effect("freedom_insight", 3)], [
          line("レントン", "外に出る用事、一緒に探そか。買い物でも、散歩でも。——用事が無いんは、体には効かんのよ", "renton", "neutral")
        ])
      ]),
      after: [
        stage("調査を終えて退区しようとした瞬間、境界がRAMLの前で閉じる。入るのは手続きゼロ——出るための手続きは、存在しない")
      ]
    },
    "SC-C3-04": {
      id: "SC-C3-04", chapter: 3, title: "善意の壁", background: "bg_rc_boundary",
      lines: [
        stage("rc境界。RAMLの前で境界が閉じている。境界の外に立つ市民"),
        line("市民", "中に母がいるんです。連絡はつくし、元気だとも言う。……でも、会いに行ったら、私も出られなくなるんでしょう？"),
        line("ショウ", "（壁に手を当てて、下ろす）壊すのは、簡単なんだよな。……この壁、中の生活と、くっついてる", "sho", "concern"),
        line("レントン", "壁の開き方に癖があるわ。人を通すときだけ、判定が緩む。——そこや", "renton", "analysis")
      ],
      battle: "BT-C3-01"
    },
    "SC-C3-05": {
      id: "SC-C3-05", chapter: 3, title: "あなたたちも、縛る側だ", background: "bg_rc_boundary",
      lines: [
        stage("rc境界の外。凍結への抗議の人垣"),
        line("市民", "あなたたちも、縛る側だ"),
        stage("ノリの日焼けが、また濃くなり始めている。リコが一瞬見る。今回も誰も聞かず、本人も語らない"),
        line("市民", "またあんな事件が起きるくらいなら、全部止めてくれて構いません。……静かで、いいじゃないですか"),
        line("ケイスケ", "君らは秩序の名前で人を縛ってるだけだ", "keisuke", "serious"),
        line("リコ", "（内心）……同じことを、前に言われた。あのときは、言い返せた気がしてたんだけど", "rico", "concern"),
        line("レントン", "（内心）……あの声の張り方、困っとる体や。ほんまに困っとる人の、声や", "renton", "concern")
      ],
      choice: choice("CH-C3-05-A", "抗議への応対", [
        option("A1", "遮らず、記録係ではなく顔を上げて最後まで聞く", [effect("trust_exp", 10), effect("freedom_insight", 3)], [
          stage("リコ、端末を置く。記録を取る手を止めて、顔を上げる"),
          line("リコ", "……聞きます。最後まで。反論は、そのあとにする", "rico", "concern"),
          line("市民", "——それだけで、ちょっとだけ、人扱いされた気がします")
        ]),
        option("A2", "凍結の根拠と再発リスクを一件ずつ説明する", [effect("order_insight", 8)], [
          line("リコ", "凍結の根拠と、再発のリスクを、一件ずつ説明します。納得は、してもらえないかもしれないけど", "rico", "analysis"),
          line("市民", "理屈は、分かりました。……理屈は、ね")
        ]),
        option("A3", "『止まって困っていること』の聞き取りを始める", [effect("freedom_insight", 5), effect("order_insight", 3)], [
          line("リコ", "止まって、何が困ってるか。——それを先に聞かせてください。対処の順番を、そこから決める", "rico", "analysis")
        ])
      ]),
      after: [
        stage("警報。凍結システムが例外承認を無視して再凍結を開始——止めたはずの手が、勝手に締まっていく")
      ]
    },
    "SC-C3-06": {
      id: "SC-C3-06", chapter: 3, title: "正しさの暴走", background: "bg_frozen_command",
      lines: [
        stage("司令室〜凍結網の管理領域。凍結システムが例外承認を無視し、再凍結を続けている"),
        line("リコ", "……うちの正しさが、暴走してる。止めるよ。——自分の手で", "rico", "alert")
      ],
      battle: "BT-C3-02"
    },
    "SC-C3-07": {
      id: "SC-C3-07", chapter: 3, title: "半歩、降りる", background: "bg_raml_command",
      lines: [
        stage("司令室。「解除申請: 保留 214件」の一覧の前"),
        line("レントン", "rcの人らな、快適の中で、ちょっとずつ細うなっとった。……不便は、リハビリなんよ。たぶん", "renton", "concern"),
        line("ノリ", "審判は試合を止めるためじゃなく、続けるためにいる。——止めた笛は、再開の笛とセットです。うちの凍結、片方を忘れてました", "nori", "analysis"),
        line("リコ", "……一部、解除する。責任欄は、私の名前。正しいかどうかは——多分ね、くらい。でも、止めっぱなしを『守ってる』とは、もう呼べない", "rico", "analysis")
      ],
      choice: choice("CH-C3-07-A", "解除の一枚目", [
        option("A1", "生活が止まっている系統から先に解除する", [effect("freedom_insight", 5), effect("order_insight", 5), effect("trust_exp", 5)], [
          line("リコ", "生活が止まってる系統から。——予約、連絡、通院。人の一日が、そこで止まってる", "rico", "alert"),
          line("レントン", "……それ、体に効くやつや。ええ順番やと思う", "renton", "neutral")
        ]),
        option("A2", "被害実績ゼロの系統から先に解除する", [effect("order_insight", 5), effect("gadget_analysis", 3)], [
          line("リコ", "被害の実績がゼロの系統から。安全側から、順に開ける。——手堅くいく", "rico", "analysis"),
          line("ノリ", "リスクの低い順。……減点の少ない采配です", "nori", "neutral")
        ]),
        option("A3", "期限と再凍結条件を決めてから解除する", [effect("order_insight", 5), effect("ai_mastery", 5)], [
          line("リコ", "期限と、再凍結の条件を決めてから開ける。緩めっぱなしも、無責任だから", "rico", "analysis"),
          line("ノリ", "止めると再開を、両方書いておく。……審判らしい段取りですね", "nori", "neutral")
        ])
      ]),
      after: [
        stage("解除の一枚目に署名して、リコが立ち上がる"),
        line("リコ", "行こう。——rcの中枢。今度は、こっちが問う番", "rico", "alert")
      ]
    },
    "SC-C3-08": {
      id: "SC-C3-08", chapter: 3, title: "統一の理屈", background: "bg_old_server_room",
      lines: [
        stage("rc中枢。神輿に担がれ、支配の椅子に片足をかけたケイスケ——ただし、ここでも座ってはいない"),
        line("ケイスケ", "……三度目か。今日は、rcを見に来たのか。それとも、止めに来たのか", "keisuke", "serious"),
        line("レントン", "（内心）……あの余裕、下に力が入っとる。強がりや", "renton", "analysis")
      ],
      battle: "BT-C3-03"
    },
    "SC-C3-09": {
      id: "SC-C3-09", chapter: 3, title: "リリースノート", background: "bg_gadget_lab_night", type: "ending",
      variants: {
        bad: {
          id: "SC-C3-09a", title: "歓呼の中で", art: "ed_c3_bad_01",
          lines: [
            stage("rc地区が拡張を開始する"),
            stage("入区申請カウンタが回り出し、賛同者の歓呼が、音として満ちていく"),
            stage("リリース宣言が、祝祭として放送される"),
            line("ケイスケ", "リリースノートは決めた。——『これで全員、自由だ』"),
            stage("歓声が、その宣言に重なる"),
            stage("誰も不幸に見えないまま、出口だけが消えていく"),
            stage("——歓呼の中、ケイスケが初めて、贈られた椅子に座った")
          ]
        },
        normal: {
          id: "SC-C3-09b", title: "二重に安全な街", art: "ed_c3_normal_01",
          lines: [
            stage("rcは強制停止、凍結は継続"),
            stage("世界は二重に安全で、二重に息苦しい"),
            stage("抗議の声は「記録済み」のスタンプだけが押されて、閉じられていく。一件、また一件"),
            stage("リコの裁量解除は、上層に却下された"),
            stage("リコは何も言わない。ただ、署名した一枚目を、引き出しにしまう"),
            stage("無人の基地。リリースノートの編集画面に向かうケイスケ"),
            line("ケイスケ", "リリースノートは決めた。——『これで全員、自由だ』"),
            stage("誰の歓声もない。玉座めいた椅子は、隅に置かれたまま")
          ]
        },
        true: {
          id: "SC-C3-09c", title: "離脱ボタン", art: "ed_c3_true_01",
          // 二段構え（01_plan §2-2-4・順序厳守）: レントンの地ならし → 詰まる → リコの問い → 即答できない → 撤退
          lines: [
            stage("rc停止と凍結の裁量解除が両立した状態で、撤退間際のケイスケとの対話が成立する"),
            line("レントン", "回復ってな、行きっぱなしやなくて、行って、帰ってくることなんよ。……あの地区には、『帰る』が見つからんかった"),
            stage("ケイスケが、答えに詰まる"),
            stage("視線が一度だけ、稼働データの方向へ流れて、戻った"),
            line("リコ", "その新世界、離脱ボタンは付けた?"),
            stage("ケイスケ、即答できない。間"),
            line("ケイスケ", "……次のビルドまでに、考えとく"),
            stage("転落の入口で、足が一瞬止まる音"),
            stage("ケイスケ、ロボの肩に飛び乗って撤退"),
            stage("撤退後、遠景の通信越しに、リリース宣言だけが届く"),
            line("ケイスケ", "リリースノートは決めた。——『これで全員、自由だ』"),
            stage("迷いが流れたまま、それでも宣言する。半歩止まったが、止まってはいない")
          ]
        }
      }
    },
    "SC-C3-10": {
      id: "SC-C3-10", chapter: 3, title: "noise_log.2", background: "bg_raml_command", type: "noise", noiseIndex: 2,
      lines: [
        stage("最終処理ログがスクロールしていく。ログ末尾。第1・2章と同じ位置・同じ形式崩れで、一文が流れる"),
        line("SYSTEM", "「——だが、それはまた別の物語。……の、はずだった。いま、誰かが続きを書いている。」"),
        line("ノリ", "……三つ目です。並べます", "nori", "analysis"),
        stage("ノリは今回、驚かない。最初から録画している。録画済みの .0/.1 と並べて三段表示し、無言で保存する"),
        line("リコ", "観測、続けよう。——分類は、まだしない", "rico", "concern"),
        stage("夜の司令室、二人だけ残った画。モニタの隅で、「これで全員、自由だ」のリリース通知が、まだ静かに点滅している"),
        line("リコ", "……『自由だ』って、世界に向かって言い切っちゃってるよ", "rico", "concern"),
        line("ノリ", "離脱ボタンの有無は、まだ観測中です。——返事は、急がないことにします", "nori", "neutral"),
        line("SYSTEM", "第3章 完")
      ]
    },

    "SC-C4-01": {
      id: "SC-C4-01", chapter: 4, title: "最終同期", background: "bg_gadget_lab_night",
      lines: [
        stage("夜。基地。中央モニタに「AUTONOMY Ver.1.0 — 最終同期 準備完了」。世界地図の上を、統一の進捗バーが薄く走っている"),
        carry("ed_c3", "bad", "最終同期はすでに大きく進行している。拡張済みのrcが、そのまま同期の土台になっている"),
        carry("ed_c3", "normal", "無人の基地。ケイスケは、誰もいないところから最終同期を始める"),
        carry("ed_c3", "true", "最終同期のコードのどこかに、「離脱条項」がコメントアウトされたまま残っている。実装しなかったが、消してもいない"),
        line("ケイスケ", "rc、稼働は続いてる。クレームゼロ、手続きゼロ。……なら、答えは出てるだろ。世界ぜんぶ、rcにすればいい", "keisuke", "analysis"),
        stage("コミュニティ通知が連続で跳ねる。スレッド題「#統一の日」「ケイスケさんがVer.1.0を出す件」"),
        line("ケイスケ", "雑なコピーが出るのは、ルールがバラバラだからだ。ぜんぶボクのルールで統一すれば、二度と出ない。……論理は、通ってる", "keisuke", "serious"),
        stage("デプロイ画面。リリースノート欄の最終行だけが、空白のまま点滅している"),
        line("ケイスケ", "（空欄の最終行を見て）最終行、まだ書けてないな。……走りながら、考える", "keisuke", "neutral")
      ],
      choice: choice("CH-C4-01-A", "空欄の最終行", [
        option("A1", "空欄の最終行を一度書こうとして、手を止める", [effect("freedom_insight", 5)], [
          stage("カーソルが空欄の最終行で点滅し続ける。ケイスケ、一度打鍵しかけて、指を止める")
        ]),
        option("A2", "rc の稼働ログを最終同期の土台に組み込む", [effect("ai_mastery", 3), effect("gadget_analysis", 2)], [
          stage("組み込むログのコードの隅に、コメントアウトされた「離脱条項」の行が一瞬映る。ケイスケ、スクロールで流す。言及なし")
        ]),
        option("A3", "手元ガジェットの充電残量を見て、ケーブルを挿す", [effect("freedom_insight", 2), effect("ai_mastery", 2)], [
          line("ケイスケ", "……充電、31%か。世界を書き換える夜に、これは細いな", "keisuke", "neutral"),
          stage("ケーブルを挿す。手元だけが、いつもの生活の速度で動く")
        ])
      ]),
      after: [
        stage("起動シークエンスの片隅で、充電残量の表示が一度だけ目に入る"),
        stage("表示「AUTONOMY Ver.1.0 — 最終同期 開始」。同期完了までのカウントダウンが走り出す。同時刻、RAML側モニタに検知アラート")
      ]
    },
    "SC-C4-02": {
      id: "SC-C4-02", chapter: 4, title: "タイムリミット", background: "bg_raml_command",
      lines: [
        stage("司令室。中央モニタに世界地図。統一の同期範囲が、少しずつ塗り替わっていく。カウントダウン表示"),
        line("ノリ", "最終同期です。世界中のUIを、一つの規格に合わせにいってます。……完了したら、他の作法が、書けなくなる", "nori", "alert"),
        line("リコ", "爆発はしない。誰も倒れない。——ただ、世界が一つの正解しか持てなくなる、ってことね", "rico", "concern"),
        stage("リコの私用端末のリマインダーが一度だけ光る。リコ、伏せてから司令に戻る"),
        line("リコ", "RAML、動かすよ。止めるのか、別の手にするのかは——中枢の前で、決める", "rico", "alert")
      ],
      choice: choice("CH-C4-02-A", "初動", [
        option("A1", "中枢到達までの段取りを一件ずつ全隊で共有する", [effect("order_insight", 5), effect("trust_exp", 10)], [
          line("リコ", "段取りを、一件ずつ共有する。誰がどこで何をするか、全員が同じ絵を持って入る", "rico", "analysis"),
          line("ノリ", "……全隊に、ですか。時間、押してますよ", "nori", "alert"),
          line("リコ", "押してるからだよ。ばらばらに動いて、拾い直す時間のほうが惜しい", "rico", "alert")
        ]),
        option("A2", "停止と対話の両構えを同時に準備して動く", [effect("order_insight", 3), effect("freedom_insight", 3)], [
          line("リコ", "止める構えと、話す構え。両方持って動く。——どっちに転んでも、遅れないように", "rico", "analysis"),
          line("ノリ", "欲張りですね。……嫌いじゃないです、その欲張り", "nori", "neutral")
        ]),
        option("A3", "停止最優先・最短で中枢へ急ぐ", [effect("order_insight", 5), effect("raml_morale", 3), effect("freedom_insight", -3)], [
          line("リコ", "最短でいく。止めるのが最優先。話は、間に合えばする", "rico", "alert"),
          line("ノリ", "了解。……間に合わせましょう", "nori", "alert")
        ])
      ]),
      after: [
        line("ノリ", "進路に、先行ノード。同期を前へ前へと押してます。……まず、あれを遅らせないと", "nori", "analysis")
      ]
    },
    "SC-C4-03": {
      id: "SC-C4-03", chapter: 4, title: "先行ノード", background: "bg_warehouse_node",
      lines: [
        stage("最終同期の先導路。無機質な同期ノードが、規則正しく進捗を刻んでいる"),
        line("ノリ", "新しい手は、要りません。……ぜんぶ、この三章で持ってきました", "nori", "analysis"),
        line("ショウ", "（構えて）いつもの、でいいんだよな", "sho", "alert"),
        line("リコ", "うん。持ってるもので、届く。——それを確かめに来た", "rico", "alert"),
        line("レントン", "動きが揃いすぎとる。……揃うとこには、必ず継ぎ目があるんよ。ゲームと一緒や", "renton", "analysis")
      ],
      battle: "BT-C4-01"
    },
    "SC-C4-04": {
      id: "SC-C4-04", chapter: 4, title: "三万人、無人", background: "bg_cityhall_night",
      lines: [
        stage("広場を埋め尽くす自動化ツールの列。プラカードも、掛け声も、すべて機械が代行している。整然と「賛同」を表示し続けている。だが——誰も、動かしていない"),
        line("レントン", "（内心）……三万人ぶん、動いとる。けど、一人もおらん。担いどった人らは、もう手を離しとるんや", "renton", "concern"),
        line("ノリ", "賛同のツールだけが、無人で回ってます。……本人たちは、とっくにいません", "nori", "analysis"),
        line("レントン", "（内心）殴る相手が、おらん。……そもそも、殴ったらあかん相手やったんやな、最初から", "renton", "concern"),
        // 第1章「壊すのは、簡単なんだよな」からの到達点。壊す相手がいないことを、拳の側から言う
        line("ショウ", "……三万人ぶん、並んでる。全部、空箱だ。……こんなもの、殴っても何も終わらない", "sho", "concern")
      ],
      choice: choice("CH-C4-04-A", "無人の光景への向き合い方", [
        option("A1", "デモ機の一台に近づいて、誰が動かしていたのか手元を確かめる", [effect("gadget_analysis", 5), effect("trust_exp", 3)], [
          line("レントン", "この機械、誰の手癖が残っとるかな。……ちょっと、確かめさせてな", "renton", "analysis"),
          stage("操作パネルに、使い込まれた指の跡。だが、その指の主は、もうここにいない")
        ]),
        option("A2", "人がいないことの意味を、体で受け止めてから進む（急がない）", [effect("freedom_insight", 5), effect("trust_exp", 10)], [
          line("レントン", "……急がんとこ。ここに人がおらんのは、どういうことか。体で、いっぺん受け止めてから行くわ", "renton", "concern"),
          stage("レントン、無人の列の前で一度立ち止まる。駆動音だけが、規則正しく続いている")
        ]),
        option("A3", "機械の陰まで、取り残された人がいないか自分の目で見て回る", [effect("order_insight", 3), effect("trust_exp", 3)], [
          line("レントン", "陰んとこも、いっぺん見て回るわ。……取り残されとる人が、おらんとも限らんしな", "renton", "alert"),
          stage("機械の陰。人影はない。ただ、機械が整然と並んでいるだけ")
        ])
      ]),
      after: [
        stage("無人のデモ群が、RAMLの前で隊列を組み替える。止めるのは——機械だけ")
      ]
    },
    "SC-C4-05": {
      id: "SC-C4-05", chapter: 4, title: "止めるのは、機械だけ", background: "bg_cityhall_night",
      lines: [
        stage("組み替えられた無人デモ群が、RAMLの進路を塞ぐ。動いているのは機械だけ。人間は一人もいない"),
        line("リコ", "相手は機械だけ。——人には、指一本触れない。それだけは、最後まで守る", "rico", "alert"),
        line("ノリ", "三万台。……壮観ですけど、空っぽです。誰の意思も、もう乗っていません", "nori", "analysis")
      ],
      battle: "BT-C4-02"
    },
    "SC-C4-06": {
      id: "SC-C4-06", chapter: 4, title: "リリースノートの空欄", background: "bg_old_server_room",
      lines: [
        stage("中枢前。見上げるほどの世界規模デプロイ画面。その最下段——リリースノートの最終行だけが、空欄のまま点滅している"),
        line("ノリ", "世界規模のデプロイ画面。……最終行だけが、まだ空欄です。あの人、まだ書けていない", "nori", "analysis"),
        stage("ノリの日焼けが、すっかり引いている"),
        line("リコ", "あの空欄をどうするかで、世界の手触りが変わる。——一人で書き切らせるか、書かせずに閉じさせるか、それとも", "rico", "concern"),
        stage("レントンの視線が、遠景のケイスケの手元に一度だけ止まって、戻る"),
        line("ショウ", "（拳を一度握って、開く）……壊すのは、いつでもできる。今日は、そのあとの手を、残しておきたい", "sho", "concern")
      ],
      choice: choice("CH-C4-06-A", "中枢への構え", [
        option("A1", "『止める』と『実装させる』の両方を持って入ると全隊に告げる", [effect("order_insight", 5), effect("freedom_insight", 3), effect("trust_exp", 10)], [
          line("リコ", "全員、聞いて。——今日は、止めることも、実装させることも、両方持って入る。どっちに転んでも、束ねるのはうち", "rico", "alert"),
          line("ノリ", "……その構え、いちばん難しいやつですよ", "nori", "concern"),
          line("リコ", "知ってる。だから、全隊で入るの", "rico", "analysis")
        ]),
        option("A2", "空欄の最終行は、埋めさせるものだと決めて入る", [effect("freedom_insight", 5), effect("ai_mastery", 3)], [
          line("リコ", "あの空欄は、こっちが埋めるんじゃない。——本人に、埋めさせる。書けてないのは、まだ迷ってるからだよ", "rico", "analysis")
        ]),
        option("A3", "まず中枢を止める、話はそのあと、と構える", [effect("order_insight", 5), effect("raml_morale", 3)], [
          line("リコ", "まず止める。話はそのあと。——順番を、間違えない", "rico", "alert")
        ])
      ]),
      after: [
        stage("中枢の扉が開く。三度目の——最後の対峙")
      ]
    },
    "SC-C4-07": {
      id: "SC-C4-07", chapter: 4, title: "統一のリリース", background: "bg_final_core_hall",
      lines: [
        stage("Ver.1.0中枢。統一の同期が、ここから世界へ放たれようとしている。ケイスケが中枢の傍らに立つ"),
        line("ケイスケ", "……三度目か。今日は、止めに来たのか。それとも、世界を見に来たのか", "keisuke", "serious")
      ],
      battle: "BT-C4-03"
    },
    "SC-C4-08": {
      id: "SC-C4-08", chapter: 4, title: "ED-FINAL", background: "bg_final_core_hall", type: "ending",
      // 予兆2箇所目（裁定0）: ED立ち上がりで統一されたUI群の一画面だけが化けて、次カットで戻る
      prelude: "世界のUIが、一斉に切り替わる。——その一瞬、統一された画面のうち一つだけが、まるで別の作品のような絵柄に化けて、すぐに元へ戻る。誰も気づかない。",
      variants: {
        bad: {
          id: "SC-C4-08a", title: "自由の暴走", art: "ev_c4_admin_chair_01",
          // 静かな転落（chapter04/06_script.md SC-C4-08a）。高笑いも悪堕ち記号も使わず、無音で描く
          lines: [
            stage("最終同期が完了する。Ver.1.0 が、世界OSとして走り出した"),
            stage("世界中のUIが、一つの規格に塗り替わっていく。誰も困っていない。誰も、何も言わない"),
            stage("ケイスケは、新世界の管理者の椅子に座っている"),
            stage("空欄だった最終行に、ケイスケが一人で書き切る。誰の連名もない"),
            line("ケイスケ", "リリースノートは決めた。——『これで全員、自由だ』"),
            stage("その宣言は、誰にも届かないまま書き切られた"),
            stage("——完璧に最適化された、誰もいない基地"),
            stage("返信のない三万件の通知が、静かに積もっている"),
            line("ケイスケ", "見てるか、みんな。……返信は、しないけどな"),
            stage("通知の数字だけが増えていく。祝祭も、歓声もない"),
            line("ケイスケ", "……全員、自由にした。飲みに行く相手は、いないけどな"),
            stage("世界を手に入れた夜も、手元のガジェットの充電残量を、一度だけ気にする")
          ],
          releaseNote: "これで全員、自由だ", signature: "GADGET"
        },
        normal: {
          id: "SC-C4-08b", title: "秩序だけの勝利", art: "ed_c4_normal_01",
          // 不服のまま閉じる（§4-2）。ケイスケ側も世界の側も、どちらの不満も解消しない
          lines: [
            stage("RAML が Ver.1.0 を完全停止。デプロイ画面がキャンセルされ、世界のUIが一斉に止まる"),
            stage("世界は安全に戻った。革新は、起きない"),
            stage("最終行は誰にも書かれずに閉じる。署名欄も、空欄のまま"),
            stage("GADGET は沈黙し、ケイスケは行方不明になった"),
            stage("安全で、変化がなく、少しだけ息苦しい日々が続く"),
            line("ケイスケ", "……止めれば、安全か。安全なだけの世界、そんなにいいもんかね"),
            stage("声だけが、どこかから届く。姿は、見えない"),
            line("市民", "事件は、なくなりました。……変わることも、なくなりましたけど"),
            stage("リコの端末に、二度と着信が来ない"),
            stage("あの夜、受信拒否を設定した相手。いまは、拒否する相手すらいない"),
            stage("リコは何も言わない")
          ],
          releaseNote: "", signature: ""
        },
        true: {
          id: "SC-C4-08c", title: "自由と秩序の握手", art: "ev_c4_handshake_01",
          // 握手の主人公性（protagonist_policy §5-1・順序厳守）:
          // ショウ壊さない一撃 → ノリ哲学の手渡し → レントン手を読む → レントン最初に手を差し出す → リコ連名の契約
          lines: [
            stage("ケイスケ自身の手で、Ver.1.0 に「審判」と「離脱ボタン」が実装されていく"),
            stage("AIに使われる側でもなく、AIで支配する側でもなく——AIを使いこなす側として、二人が並ぶ"),
            stage("最終同期のコードに残っていた、コメントアウトの一行。そのコメントが、外される"),
            stage("中枢を貫けるはずだった拳が、寸前で開いて掌になった。その掌が、まだ開いたまま残っている"),
            line("ショウ", "……今日は、開いておく"),
            stage("審判の考え方は、勝ち負けとしてではなく、あの人のルールに実装する提案として渡された"),
            line("ノリ", "席を、作ってください。あんたのルールの中に"),
            stage("レントンが、ケイスケの手を見ている。患者を見るときと、同じ角度で"),
            line("レントン", "（内心）……なんも読めん。この人、体に何も残さんのやな"),
            line("レントン", "（内心）ずっと、頭の中だけで書いてきたんや。……こっちの読み方が、はじめから通じん相手やった"),
            stage("読めないまま、それでも最初に手を出したのは、レントンだった"),
            line("レントン", "行って、帰ってくる。……それが、握手なんよ、たぶん"),
            stage("握手のあと、レントンが自分の手を一度握って、開く"),
            line("リコ", "リリースノートの最終行、連名にする。止めることと、実装すること。両方の責任、うちも半分持つ。——GADGET と、RAML で"),
            stage("空欄のまま点滅していた最終行に、初めて二つの名前が入る"),
            stage("ケイスケ、書き終わった行を一度見て、目を逸らす。照れている"),
            line("ケイスケ", "Ver.2.0は、一緒に考えない?")
          ],
          releaseNote: "Ver.1.0 —— 離脱ボタンと、審判の席を、付けました。",
          signature: "GADGET ／ RAML"
        }
      }
    },
    "SC-C4-09": {
      id: "SC-C4-09", chapter: 4, title: "——", background: "ev_c4_epilogue_return_01",
      lines: [
        line("SYSTEM", "四人は、それぞれの方向へ帰っていく。"),
        line("SYSTEM", "無人の観測室。モニタが一度だけ、未分類の波形を検知する。"),
        line("SYSTEM", "分類欄：——")
      ]
    },
    "SC-C4-10": {
      id: "SC-C4-10", chapter: 4, title: "noise_log.3・END回収", background: "bg_raml_command", type: "noise", noiseIndex: 3,
      lines: [
        line("SYSTEM", "「——その続きが、どんな話になるのかは、まだ誰にも分類できない。」"),
        line("ノリ", "……四つ目です。並べます", "nori", "analysis"),
        line("SYSTEM", "RAML vs GADGET 完")
      ]
    }
  };

  // 回想の本文。第2・3章は 06_script.md 付録B、第1章は 03_battle_system.md §8-3 の題材による。
  // 記録室で読ませるため、演出記号は地の文に直してある
  const SUB_EVENTS = [
    { id: "SUB-01", chapter: 1, title: "リコ「連絡網のその後」", threshold: 20, lines: [
      stage("私用端末の画面。止まっていた連絡網に、ひとつずつ返事が戻ってきている"),
      line("リコ", "……止まっていた三日分。誰も、責めてこなかった", "rico", "neutral"),
      stage("既読の印が、ばらばらの時刻で灯る。急ぐ人も、遅れる人もいる")
    ] },
    { id: "SUB-02", chapter: 1, title: "ノリ「休憩命令」", threshold: 25, lines: [
      stage("休憩室。誰かがノリの日焼けした腕に触れかけて、途中で手を引っこめる"),
      line("ノリ", "……聞かないんですね", "nori", "tanned_analysis"),
      stage("聞かれなかった問いは、そのまま流れていった")
    ] },
    { id: "SUB-03", chapter: 1, title: "レントン「三週間」", threshold: 30, lines: [
      stage("通話中の画面。相手は、置いてきた予定のある人"),
      line("レントン", "三週間、空いてもうたな。……ほんでも、ゼロにはなってへんよ", "renton", "neutral"),
      stage("通話が切れたあと、少しだけ画面を見ている")
    ] },
    { id: "SUB-04", chapter: 1, title: "ショウ「簡単じゃない方」", threshold: 35, lines: [
      stage("待機室。ショウが袖についた動物の毛を、指先でつまんで取る"),
      line("ショウ", "……簡単な方は、誰でもやる", "sho", "neutral"),
      stage("つまんだものを、そっとポケットにしまった")
    ] },
    { id: "SUB-C2-01", chapter: 2, title: "リコ「もう一度、話し合いで」", threshold: 35, lines: [
      stage("保護者会アプリ。「全会一致」が取り消され、「再審議: 日程調整中」と表示されている"),
      line("リコ", "……全員の都合を聞いて、揉めて、長引くやつ。やりましょう、それを", "rico", "neutral"),
      stage("返信が一件、また一件と、バラバラの時刻に灯っていく")
    ] },
    { id: "SUB-C2-02", chapter: 2, title: "ノリ「取り消した週末」", threshold: 40, lines: [
      stage("ノリの私用端末。「辞退代行」を取り消した予定の、当日の朝。持ち物の影だけが画面の端に見える"),
      line("ノリ", "……代行されたら、これの何が残るんですかね", "nori", "neutral"),
      stage("玄関を出る音。予定の中身は、最後まで映らない")
    ] },
    { id: "SUB-C2-03", chapter: 2, title: "レントン「決め直された計画」", threshold: 45, lines: [
      stage("リハビリ室。手入力の計画表が、ところどころ空欄のまま置かれている"),
      line("患者", "空欄、まだ決めてないんです。……決めてないって、決めました"),
      line("レントン", "上等やん。空欄も、本人のもんや", "renton", "neutral")
    ] },
    { id: "SUB-C2-04", chapter: 2, title: "ショウ「手書きのメモ帳」", threshold: 50, lines: [
      stage("隊の待機室。ショウが、角の丸くなった小さなメモ帳に鉛筆で何かを書いている"),
      stage("ページの中身は見えない。書き終えて、胸ポケットにしまう"),
      line("ショウ", "……忘れないうちに、な", "sho", "neutral")
    ] },
    { id: "SUB-C3-01", chapter: 3, title: "リコ「私の名前で」", threshold: 50, lines: [
      stage("司令室。裁量解除の書類。責任欄の前で、ペンを持つ手が一度止まる"),
      line("リコ", "……止めるのは、みんなで決めた。緩めるのは、私の名前で。——それで、いい", "rico", "neutral"),
      stage("署名した一枚が、ファイルの一番上に重なった")
    ] },
    { id: "SUB-C3-02", chapter: 3, title: "ノリ「週末の道具」", threshold: 55, lines: [
      stage("ノリの手元。週末に使う道具を、布で拭いている。何の道具かは見えない"),
      line("ノリ", "……止める道具と、続ける道具。手入れは、どっちも要るんですよね", "nori", "tanned_analysis"),
      stage("道具を、いつもの場所にしまう。日焼けした手の甲が、画面の端に映る")
    ] },
    { id: "SUB-C3-03", chapter: 3, title: "レントン「最初の一歩」", threshold: 60, lines: [
      stage("rc地区の境界。退区手続きの画面を通り抜けて、一人の住民が外へ出る。最初の一歩"),
      line("住民", "……外の空気、こんな匂いでしたっけ"),
      line("レントン", "ゆっくりでええんよ。行って、帰ってくる。——それが、回復や", "renton", "neutral")
    ] },
    { id: "SUB-C3-04", chapter: 3, title: "ショウ「手書きのメモ帳」", threshold: 65, lines: [
      stage("隊の待機室。ショウが、角の丸くなったメモ帳に鉛筆で何か書いている。内容は見えない"),
      stage("書き終えて、胸ポケットにしまう"),
      line("ショウ", "……壊さずに済んだ日は、書いとくんだ。忘れないように", "sho", "neutral")
    ] }
  ];

  const PORTRAIT_CUES = {
    "SC-01": ["keisuke:analysis", "keisuke:alert"],
    "SC-02": ["rico:concern", "nori:analysis"],
    "SC-03": ["rico:alert", "nori:tanned_analysis", "renton:concern", "sho:neutral"],
    "SC-08": ["keisuke:neutral", "keisuke:serious", "keisuke:ears_down"],
    "SC-C4-08c": ["sho:alert", "nori:analysis", "renton:concern", "rico:analysis", "keisuke:concern"]
  };

  function getScene(id) { return SCENES[id] || null; }
  function getChapter(id) { return CHAPTERS.find(function (chapter) { return chapter.id === id; }) || null; }
  function getNextSceneId(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return null;
    const chapter = getChapter(scene.chapter);
    const index = chapter.sceneIds.indexOf(sceneId);
    if (index < chapter.sceneIds.length - 1) return chapter.sceneIds[index + 1];
    const nextChapter = getChapter(scene.chapter + 1);
    return nextChapter ? nextChapter.firstScene : null;
  }

  return {
    chapters: CHAPTERS,
    scenes: SCENES,
    subEvents: SUB_EVENTS,
    portraitCues: PORTRAIT_CUES,
    getScene: getScene,
    getChapter: getChapter,
    getNextSceneId: getNextSceneId
  };
});
