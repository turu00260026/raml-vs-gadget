(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RVG_SERIES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAVE_KEY = "raml_vs_gadget_full_v1";
  const VERSION = 1;
  const PARAM_KEYS = [
    "freedom_insight",
    "order_insight",
    "trust_exp",
    "ai_mastery",
    "gadget_analysis",
    "raml_morale"
  ];
  const PARAM_LABELS = {
    freedom_insight: "自由理解",
    order_insight: "秩序理解",
    trust_exp: "信頼EXP",
    ai_mastery: "AI活用",
    gadget_analysis: "GADGET解析",
    raml_morale: "RAML士気"
  };
  const ENDING_KEYS = ["ed_c1", "ed_c2", "ed_c3", "ed_final"];

  const NOISE_LOGS = [
    "「——だが、それはまた別の物語。」",
    "「……の、はずだった。」",
    "「いま、誰かが続きを書いている。」",
    "「——その続きが、どんな話になるのかは、まだ誰にも分類できない。」"
  ];

  const NOISE_COMPLETE = "「——だが、それはまた別の物語。……の、はずだった。いま、誰かが続きを書いている。——その続きが、どんな話になるのかは、まだ誰にも分類できない。」";

  const SERIES_TITLES = [
    { id: "TCS-01", name: "一度も殴らなかった者" },
    { id: "TCS-02", name: "すべてを聞いた者" },
    { id: "TCS-03", name: "四つの断片を揃えた者" },
    { id: "TCS-04", name: "Ver.2.0を一緒に考える者" }
  ];

  // 全4章・全12戦の識別子（TCS-01 の「全戦完遂」判定に使用）
  const ALL_BATTLE_IDS = [
    "BT-01", "BT-02", "BT-03",
    "BT-C2-01", "BT-C2-02", "BT-C2-03",
    "BT-C3-01", "BT-C3-02", "BT-C3-03",
    "BT-C4-01", "BT-C4-02", "BT-C4-03"
  ];

  const CHAPTER_BATTLES = {
    1: ["BT-01", "BT-02", "BT-03"],
    2: ["BT-C2-01", "BT-C2-02", "BT-C2-03"],
    3: ["BT-C3-01", "BT-C3-02", "BT-C3-03"],
    4: ["BT-C4-01", "BT-C4-02", "BT-C4-03"]
  };

  // 章内称号26種（各章 03/04 §8-1）。シリーズ通し称号 TCS-01〜04 とは別枠
  const CHAPTER_TITLES = [
    { id: "TTL-01", chapter: 1, name: "壊さぬ制圧者", detail: "全3戦を destroy タグなしで解決" },
    { id: "TTL-02", chapter: 1, name: "市民生活の守護者", detail: "全3戦で、生活側に被害が出る前（進行100の手前）に決着させた" },
    { id: "TTL-03", chapter: 1, name: "傾聴者", detail: "思想ブロードキャスト・口上（D1含む）をすべて最後まで聞く" },
    { id: "TTL-04", chapter: 1, name: "全対処", detail: "解決タグ付き決着3回" },
    { id: "TTL-05", chapter: 1, name: "不撤退", detail: "retreated 0件" },
    { id: "TTL-06", chapter: 1, name: "手綱を握る者", detail: "開放条項を使用" },
    { id: "TTL-07", chapter: 1, name: "読み切り", detail: "全3戦で、守りの固い拍に一度も手を無駄打ちしなかった" },
    { id: "TTL-08", chapter: 1, name: "β愛好家", detail: "GADGETツール図鑑コンプリート" },
    { id: "TTL-09", chapter: 1, name: "現場の人", detail: "サブイベント4本全回収" },
    { id: "TTL-10", chapter: 1, name: "静かな怪力", detail: "完全性削りを「加減」と連携のみで達成" },
    { id: "TC2-01", chapter: 2, name: "不共闘", detail: "BT-C2-03 でケイスケを一度も攻撃対象にしない" },
    { id: "TC2-02", chapter: 2, name: "決断を返す者", detail: "BT-C2-02 の未解消確定被害が0件" },
    { id: "TC2-03", chapter: 2, name: "差分の読み手", detail: "野良フォーク図鑑5点コンプ" },
    { id: "TC2-04", chapter: 2, name: "主語を分ける者", detail: "CH-C2-02-A A1 を選択し章の幕引きに到達" },
    { id: "TC2-05", chapter: 2, name: "全対処・弐", detail: "章内で解決タグ付き決着3回" },
    { id: "TC2-06", chapter: 2, name: "不撤退・弐", detail: "章内 retreated 0件" },
    { id: "TC2-07", chapter: 2, name: "本家の読者", detail: "D1 と思想ブロードキャストをすべて最後まで聞く" },
    { id: "TC2-08", chapter: 2, name: "静かな拒否", detail: "代行提案 全3回で R1（断る）を選ぶ" },
    { id: "TC3-01", chapter: 3, name: "壊さない者", detail: "BT-C3-01 と BT-C3-03 を destroy タグなしで解決" },
    { id: "TC3-02", chapter: 3, name: "半歩降りた者", detail: "BT-C3-02 を制御で解決し、守りの空白0件" },
    { id: "TC3-03", chapter: 3, name: "出口を作る者", detail: "BT-C3-03 を対話で解決（離脱条項の使用）" },
    { id: "TC3-04", chapter: 3, name: "静かな退区", detail: "BT-C3-01 を波及被害0件で解決" },
    { id: "TC3-05", chapter: 3, name: "全対処・参", detail: "章内で解決タグ付き決着3回" },
    { id: "TC3-06", chapter: 3, name: "不撤退・参", detail: "章内 retreated 0件" },
    { id: "TC3-07", chapter: 3, name: "両方を聞く者", detail: "rc側の実感と凍結抗議を聞き、D1 も最後まで聞く" },
    { id: "TC3-08", chapter: 3, name: "いつでも開く出口", detail: "入区勧誘に組織として断る" }
  ];

  // 図鑑（新カテゴリなし。GADGETツール図鑑／野良フォーク／noise_log断片／END回収）
  // requires: "analysis"=解析系行動で回収 ／ "demo"=デモ見学 ／ "diff"=差分解析 ／ "offer"=OFFER R2 の詳細註記
  const DEX_ENTRIES = [
    { id: "DEX-TOOL-01", category: "tools", chapter: 1, name: "AUTONOMY本体", battle: "BT-03", requires: "analysis" },
    { id: "DEX-TOOL-02", category: "tools", chapter: 1, name: "中継ノード・α", battle: "BT-01", requires: "analysis" },
    { id: "DEX-TOOL-03", category: "tools", chapter: 1, name: "中継ノード・β", battle: "BT-02", requires: "analysis" },
    { id: "DEX-TOOL-04", category: "tools", chapter: 1, name: "ケイスケ自作ツール（試作）", battle: "BT-03", requires: "analysis" },
    { id: "DEX-TOOL-05", category: "tools", chapter: 1, name: "ケイスケ自作ツール（常用）", battle: "BT-03", requires: "analysis" },
    { id: "DEX-TOOL-06", category: "tools", chapter: 3, name: "Ver.1.0-rc中枢", battle: "BT-C3-03", requires: "analysis" },
    { id: "DEX-TOOL-07", category: "tools", chapter: 3, name: "rc境界防衛機構", battle: "BT-C3-01", requires: "analysis" },
    // 回収自体は解析系行動。OFFER R2 を選んだ場合のみ「退区項目が存在しない」詳細註記が付く（chapter03/03 §4-2）
    { id: "DEX-TOOL-08", category: "tools", chapter: 3, name: "入区案内システム", battle: "BT-C3-01", requires: "analysis", noteOn: "offer" },
    { id: "DEX-TOOL-09", category: "tools", chapter: 4, name: "Ver.1.0中枢", battle: "BT-C4-03", requires: "analysis" },
    { id: "DEX-TOOL-10", category: "tools", chapter: 4, name: "最終同期先行ノード", battle: "BT-C4-01", requires: "analysis" },
    { id: "DEX-TOOL-11", category: "tools", chapter: 4, name: "無人デモ群の自動化ツール", battle: "BT-C4-02", requires: "analysis" },
    { id: "DEX-FORK-01", category: "forks", chapter: 2, name: "DELEGATE-EX中枢", battle: "BT-C2-03", requires: "analysis" },
    { id: "DEX-FORK-02", category: "forks", chapter: 2, name: "EXノード改変体", battle: "BT-C2-01", requires: "analysis" },
    { id: "DEX-FORK-03", category: "forks", chapter: 2, name: "市街代行機", battle: "BT-C2-02", requires: "analysis" },
    { id: "DEX-FORK-04", category: "forks", chapter: 2, name: "フォークのフォーク（亜種）", battle: "BT-C2-03", requires: "analysis" },
    { id: "DEX-FORK-05", category: "forks", chapter: 2, name: "削られた意思確認コード", battle: "BT-C2-01", requires: "analysis" }
  ];

  const DEX_CATEGORY_LABELS = { tools: "GADGETツール図鑑", forks: "野良フォーク", noise: "noise_log断片", ending: "END回収" };

  function clamp(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function createInitialState() {
    return {
      version: VERSION,
      chapter: 1,
      scene: "SC-01",
      params: {
        freedom_insight: 0,
        order_insight: 0,
        trust_exp: 0,
        ai_mastery: 0,
        gadget_analysis: 0,
        raml_morale: 70
      },
      flags: {
        sub_events: [],
        titles: [],
        dex: [],
        battles_done: [],
        choices: [],
        noise_log_0: false,
        noise_log_1: false,
        noise_log_2: false,
        noise_log_3: false,
        sho_shadow_seen: false
      },
      endings: {
        ed_c1: null,
        ed_c2: null,
        ed_c3: null,
        ed_final: null
      },
      battle_records: [],
      // 選択直後（差分の会話を読んでいる最中）に閉じても選択が消えないよう、
      // 「どの場面で何を選んだか」だけを保存しておく
      pending: null
    };
  }

  function normalizeState(input) {
    const clean = createInitialState();
    if (!input || input.version !== VERSION) return clean;
    clean.chapter = Math.max(1, Math.min(4, Number(input.chapter) || 1));
    clean.scene = typeof input.scene === "string" ? input.scene : clean.scene;
    PARAM_KEYS.forEach(function (key) {
      const source = input.params ? input.params[key] : undefined;
      // null / undefined / 空文字 は「値なし」として扱う（Number(null) は 0 になってしまうため）
      const raw = (source === null || source === undefined || source === "") ? NaN : Number(source);
      // 値が壊れている場合、士気だけは中立値70で復元する（0だと復元直後に強制撤退になる）
      clean.params[key] = Number.isFinite(raw) ? clamp(raw) : (key === "raml_morale" ? 70 : 0);
    });
    ["sub_events", "titles", "dex", "battles_done", "choices"].forEach(function (key) {
      clean.flags[key] = Array.isArray(input.flags && input.flags[key])
        ? Array.from(new Set(input.flags[key].filter(function (value) { return typeof value === "string"; })))
        : [];
    });
    ["noise_log_0", "noise_log_1", "noise_log_2", "noise_log_3", "sho_shadow_seen"].forEach(function (key) {
      clean.flags[key] = Boolean(input.flags && input.flags[key]);
    });
    ENDING_KEYS.forEach(function (key) {
      const value = input.endings && input.endings[key];
      clean.endings[key] = ["bad", "normal", "true"].includes(value) ? value : null;
    });
    if (input.pending && typeof input.pending.scene === "string" && typeof input.pending.choice === "string") {
      clean.pending = { scene: input.pending.scene, choice: input.pending.choice };
    }
    clean.battle_records = Array.isArray(input.battle_records)
      ? input.battle_records.filter(function (record) {
          return record && typeof record.battle_id === "string";
        }).map(function (record) {
          return {
            battle_id: record.battle_id,
            chapter: Math.max(1, Math.min(4, Number(record.chapter) || 1)),
            resolution: ["destroy", "control", "dialogue", "avoid"].includes(record.resolution) ? record.resolution : null,
            retreated: Boolean(record.retreated),
            turns: Math.max(1, Number(record.turns) || 1),
            skills_used: Array.isArray(record.skills_used) ? record.skills_used.slice() : [],
            civilian_damage: Math.max(0, Number(record.civilian_damage) || 0),
            civilian_resolved: Math.max(0, Number(record.civilian_resolved) || 0),
            civilian_events: Math.max(0, Number(record.civilian_events) || 0),
            wasted: Math.max(0, Number(record.wasted) || 0),
            progress_damage: Boolean(record.progress_damage),
            reveal_count: Math.max(0, Number(record.reveal_count) || 0),
            block_count: Math.max(0, Number(record.block_count) || 0),
            offer_count: Math.max(0, Number(record.offer_count) || 0),
            offer_accepted: Boolean(record.offer_accepted),
            heard: Boolean(record.heard),
            dex_found: Boolean(record.dex_found),
            morale_trace: Array.isArray(record.morale_trace) ? record.morale_trace.map(clamp) : [],
            params_gained: Object.assign({}, record.params_gained || {}),
            dialogue: record.dialogue ? {
              d1_completed: Boolean(record.dialogue.d1_completed),
              d2_selected: Boolean(record.dialogue.d2_selected),
              d3_selected: Boolean(record.dialogue.d3_selected)
            } : null
          };
        })
      : [];
    // 旧セーブ（battles_done を持たない）でも、戦闘記録から決着済み戦闘を補完して再戦を防ぐ
    clean.battle_records.forEach(function (record) {
      if (!clean.flags.battles_done.includes(record.battle_id)) {
        clean.flags.battles_done.push(record.battle_id);
      }
    });
    return clean;
  }

  function applyEffects(params, effects) {
    const next = {};
    PARAM_KEYS.forEach(function (key) { next[key] = clamp(params[key]); });
    (effects || []).forEach(function (item) {
      if (!PARAM_KEYS.includes(item.key)) throw new Error("Unknown parameter: " + item.key);
      next[item.key] = clamp(next[item.key] + item.delta);
    });
    return next;
  }

  function latestRecord(records, battleId) {
    for (let i = (records || []).length - 1; i >= 0; i -= 1) {
      if (records[i].battle_id === battleId) return records[i];
    }
    return null;
  }

  function determineEnding(chapter, state) {
    const p = state.params;
    const battleIds = { 1: "BT-03", 2: "BT-C2-03", 3: "BT-C3-03", 4: "BT-C4-03" };
    const record = latestRecord(state.battle_records, battleIds[chapter]);
    const tagOkay = Boolean(record && ["control", "dialogue"].includes(record.resolution));
    const retreated = Boolean(record && record.retreated);

    if (chapter === 1) {
      if (p.freedom_insight >= 30 && p.order_insight >= 30 && p.trust_exp >= 25 &&
          p.ai_mastery >= 25 && tagOkay) return "true";
      if (p.freedom_insight >= p.order_insight + 15 && p.order_insight < 25 && p.trust_exp < 20) return "bad";
      return "normal";
    }
    if (chapter === 2) {
      if (p.freedom_insight >= 45 && p.order_insight >= 45 && p.trust_exp >= 40 &&
          p.ai_mastery >= 40 && tagOkay) return "true";
      if (retreated || (p.freedom_insight >= p.order_insight + 15 && p.order_insight < 38 && p.trust_exp < 32)) return "bad";
      return "normal";
    }
    if (chapter === 3) {
      if (p.freedom_insight >= 60 && p.order_insight >= 60 && p.trust_exp >= 50 &&
          p.ai_mastery >= 50 && tagOkay) return "true";
      if (retreated || (p.freedom_insight >= p.order_insight + 15 && p.order_insight < 48 && p.trust_exp < 40)) return "bad";
      return "normal";
    }
    if (p.freedom_insight >= 70 && p.order_insight >= 70 && p.trust_exp >= 50 &&
        p.ai_mastery >= 55 && tagOkay) return "true";
    if (retreated || (p.freedom_insight >= p.order_insight + 20 && p.order_insight < 50 && p.trust_exp < 45)) return "bad";
    return "normal";
  }

  function recordEndingOnce(state, chapter, ending) {
    const key = ENDING_KEYS[chapter - 1];
    if (!state.endings[key]) state.endings[key] = ending;
    return state.endings[key];
  }

  function recordNoise(state, index) {
    const key = "noise_log_" + index;
    if (Object.prototype.hasOwnProperty.call(state.flags, key)) state.flags[key] = true;
  }

  function allNoiseCollected(flags) {
    return [0, 1, 2, 3].every(function (index) { return Boolean(flags["noise_log_" + index]); });
  }

  function isStoryStructureComplete(state) {
    return state.endings.ed_final === "true" && allNoiseCollected(state.flags);
  }

  function evaluateSeriesTitles(state) {
    const records = state.battle_records || [];
    const dialogueBattles = ["BT-03", "BT-C2-03", "BT-C3-03", "BT-C4-03"];
    return {
      // 全12戦それぞれに記録があり、かつ全件で撤退していないこと（同一戦闘の記録を12件積んでも成立しない）
      "TCS-01": ALL_BATTLE_IDS.every(function (id) {
        const record = latestRecord(records, id);
        return Boolean(record) && record.retreated !== true;
      }) && records.every(function (record) { return record.retreated !== true; }),
      "TCS-02": dialogueBattles.every(function (id) {
        const record = latestRecord(records, id);
        return Boolean(record && record.dialogue && record.dialogue.d1_completed === true);
      }),
      "TCS-03": allNoiseCollected(state.flags),
      "TCS-04": state.endings.ed_final === "true"
    };
  }

  // 章内称号26種の判定（各章 03/04 §8-1）
  function evaluateChapterTitles(state) {
    const records = state.battle_records || [];
    const choices = (state.flags && state.flags.choices) || [];
    const dex = (state.flags && state.flags.dex) || [];
    const subs = (state.flags && state.flags.sub_events) || [];
    const of = function (id) { return latestRecord(records, id); };
    const chapterRecords = function (chapter) {
      return CHAPTER_BATTLES[chapter].map(of).filter(Boolean);
    };
    const noDestroy = function (ids) {
      return ids.every(function (id) {
        const r = of(id);
        return Boolean(r) && r.resolution !== "destroy" && r.retreated !== true;
      });
    };
    const settled = function (chapter) {
      return chapterRecords(chapter).filter(function (r) { return r.resolution && !r.retreated; }).length >= 3;
    };
    const noRetreat = function (chapter) {
      const list = chapterRecords(chapter);
      return list.length === 3 && list.every(function (r) { return r.retreated !== true; });
    };
    const dexOf = function (category, chapter) {
      return DEX_ENTRIES.filter(function (e) {
        return e.category === category && (chapter == null || e.chapter === chapter);
      });
    };
    const dexComplete = function (list) {
      return list.length > 0 && list.every(function (e) { return dex.indexOf(e.id) >= 0; });
    };
    const heardAll = function (ids) {
      return ids.every(function (id) {
        const r = of(id);
        return Boolean(r) && r.heard === true;
      });
    };
    const d1 = function (id) {
      const r = of(id);
      return Boolean(r && r.dialogue && r.dialogue.d1_completed);
    };
    const usedSkill = function (id, skill) {
      const r = of(id);
      return Boolean(r) && r.skills_used.indexOf(skill) >= 0;
    };
    const c1 = chapterRecords(1);

    return {
      "TTL-01": noDestroy(CHAPTER_BATTLES[1]),
      "TTL-02": c1.length === 3 && c1.every(function (r) { return r.progress_damage !== true && r.civilian_damage === 0; }),
      "TTL-03": heardAll(CHAPTER_BATTLES[1]) && d1("BT-03"),
      "TTL-04": settled(1),
      "TTL-05": noRetreat(1),
      "TTL-06": CHAPTER_BATTLES[1].some(function (id) { return usedSkill(id, "SK-FR-07"); }),
      // 守りの拍で空振りしなかった＝周期を読んで手を通し続けた証拠
      "TTL-07": c1.length === 3 && c1.every(function (r) { return r.wasted === 0; }),
      // 第1章時点のGADGETツール図鑑5点（rc系・第4章分は後続章の追加なので対象外）
      "TTL-08": dexComplete(dexOf("tools", 1)),
      "TTL-09": ["SUB-01", "SUB-02", "SUB-03", "SUB-04"].every(function (id) { return subs.indexOf(id) >= 0; }),
      "TTL-10": c1.length === 3 && c1.every(function (r) { return r.skills_used.indexOf("SK-OD-03") < 0; }) &&
        CHAPTER_BATTLES[1].some(function (id) {
          return usedSkill(id, "SK-OD-03-A") || usedSkill(id, "SK-CO-02");
        }),

      // 攻撃対象は常にEX中枢のみ＝共闘コマンドを持たない設計。撤退せず決着すれば成立する
      "TC2-01": Boolean(of("BT-C2-03")) && of("BT-C2-03").retreated !== true,
      "TC2-02": Boolean(of("BT-C2-02")) && of("BT-C2-02").civilian_damage === 0,
      "TC2-03": dexComplete(dexOf("forks")),
      "TC2-04": choices.indexOf("CH-C2-02-A:A1") >= 0 && Boolean(state.endings.ed_c2),
      "TC2-05": settled(2),
      "TC2-06": noRetreat(2),
      "TC2-07": heardAll(CHAPTER_BATTLES[2]) && d1("BT-C2-03"),
      "TC2-08": Boolean(of("BT-C2-02")) && of("BT-C2-02").offer_count >= 3 && of("BT-C2-02").offer_accepted === false,

      "TC3-01": noDestroy(["BT-C3-01", "BT-C3-03"]),
      "TC3-02": Boolean(of("BT-C3-02")) && of("BT-C3-02").resolution === "control" && of("BT-C3-02").civilian_damage === 0,
      "TC3-03": Boolean(of("BT-C3-03")) && of("BT-C3-03").resolution === "dialogue",
      "TC3-04": Boolean(of("BT-C3-01")) && of("BT-C3-01").civilian_damage === 0,
      "TC3-05": settled(3),
      "TC3-06": noRetreat(3),
      "TC3-07": choices.indexOf("CH-C3-03-A:A1") >= 0 && choices.indexOf("CH-C3-05-A:A1") >= 0 && d1("BT-C3-03"),
      "TC3-08": Boolean(of("BT-C3-01")) && of("BT-C3-01").offer_count >= 1 && of("BT-C3-01").offer_accepted === false
    };
  }

  function registerChapterTitles(state, chapter) {
    const checks = evaluateChapterTitles(state);
    CHAPTER_TITLES.forEach(function (title) {
      if (chapter != null && title.chapter !== chapter) return;
      if (checks[title.id] && !state.flags.titles.includes(title.id)) state.flags.titles.push(title.id);
    });
    return checks;
  }

  // 決着した戦闘の記録から、条件を満たす図鑑エントリを登録する
  function collectDex(state, record) {
    if (!record) return [];
    const skills = record.skills_used || [];
    const analysed = skills.indexOf("SK-AN-01") >= 0 || skills.indexOf("SK-AN-02") >= 0;
    const added = [];
    DEX_ENTRIES.forEach(function (entry) {
      if (entry.battle !== record.battle_id) return;
      let ok = false;
      if (entry.requires === "demo") ok = Boolean(record.dex_found);
      else if (entry.requires === "diff") ok = skills.indexOf("SK-AN-02") >= 0;
      else ok = analysed;
      if (!ok) return;
      if (state.flags.dex.indexOf(entry.id) < 0) {
        state.flags.dex.push(entry.id);
        added.push(entry);
      }
      // 手続き画面を最後まで進ませた場合のみ付く詳細註記
      if (entry.noteOn === "offer" && record.offer_accepted && state.flags.dex.indexOf(entry.id + "-NOTE") < 0) {
        state.flags.dex.push(entry.id + "-NOTE");
      }
    });
    return added;
  }

  function registerSeriesTitles(state) {
    const checks = evaluateSeriesTitles(state);
    SERIES_TITLES.forEach(function (title) {
      if (checks[title.id] && !state.flags.titles.includes(title.id)) state.flags.titles.push(title.id);
    });
    return checks;
  }

  function startChapter(state, chapter, firstScene) {
    state.chapter = chapter;
    state.scene = firstScene;
    state.params.raml_morale = 70;
    return state;
  }

  return {
    saveKey: SAVE_KEY,
    version: VERSION,
    paramKeys: PARAM_KEYS,
    paramLabels: PARAM_LABELS,
    endingKeys: ENDING_KEYS,
    noiseLogs: NOISE_LOGS,
    noiseComplete: NOISE_COMPLETE,
    seriesTitles: SERIES_TITLES,
    chapterTitles: CHAPTER_TITLES,
    dexEntries: DEX_ENTRIES,
    dexCategoryLabels: DEX_CATEGORY_LABELS,
    evaluateChapterTitles: evaluateChapterTitles,
    registerChapterTitles: registerChapterTitles,
    collectDex: collectDex,
    clamp: clamp,
    createInitialState: createInitialState,
    normalizeState: normalizeState,
    applyEffects: applyEffects,
    latestRecord: latestRecord,
    determineEnding: determineEnding,
    recordEndingOnce: recordEndingOnce,
    recordNoise: recordNoise,
    allNoiseCollected: allNoiseCollected,
    isStoryStructureComplete: isStoryStructureComplete,
    evaluateSeriesTitles: evaluateSeriesTitles,
    registerSeriesTitles: registerSeriesTitles,
    startChapter: startChapter
  };
});
