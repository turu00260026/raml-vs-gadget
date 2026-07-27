(function (root, factory) {
  const deps = {
    series: root.RVG_SERIES || (typeof require === "function" ? require("./series-data.js") : null),
    battles: root.RVG_BATTLES || (typeof require === "function" ? require("./battle-data.js") : null)
  };
  const api = factory(deps.series, deps.battles);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RVG_ENGINE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (SERIES, BATTLES) {
  "use strict";

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function emptyGains() {
    const gains = {};
    SERIES.paramKeys.forEach(function (key) { gains[key] = 0; });
    return gains;
  }

  function script(definition) { return definition.script || {}; }

  function pushLog(local, message) {
    local.log.push(message);
    if (local.log.length > 12) local.log.shift();
  }

  // 06_script.md の台詞行・演出行を戦闘ログへ流す
  function pushLines(local, lines) {
    (lines || []).forEach(function (item) {
      const text = BATTLES.formatLine(item);
      if (text) pushLog(local, text);
    });
  }

  // 同じ割り込みを何度も出さない（正典が「初回」「1回のみ」と定めるもの）
  function pushOnce(local, key, lines) {
    if (!lines || !lines.length) return false;
    if (!local.shown) local.shown = {};
    if (local.shown[key]) return false;
    local.shown[key] = true;
    pushLines(local, lines);
    return true;
  }

  function openingLog(definition) {
    const lines = [definition.intro];
    (script(definition).open || []).forEach(function (item) {
      const text = BATTLES.formatLine(item);
      if (text) lines.push(text);
    });
    return lines;
  }

  function createBattleState(definition, params) {
    return {
      id: definition.id,
      turn: 1,
      slotsUsed: 0,
      extraSlots: 0,
      node_integrity: 100,
      node_control: 0,
      node_progress: 0,
      collateral: 0,
      collateral_resolved: 0,
      heard: false,
      timedOut: false,
      progressDamage: false,
      weak_exposed: false,
      freezeTurns: 0,
      enemyStopTurns: 0,
      shieldCivilian: false,
      blockRewrite: 0,
      moraleHalfTurns: 0,
      civilianHalved: false,
      pendingCivilian: false,
      revealed: null,
      revealCount: 0,
      blockCount: 0,
      civilianEvents: 0,
      dexFound: false,
      once_used: {},
      skills_used: [],
      morale_trace: [params.raml_morale],
      params_gained: emptyGains(),
      caps_used: emptyGains(),
      dialogue: definition.finalBattle ? {
        d1_completed: false,
        d2_selected: false,
        d3_selected: false
      } : null,
      log: openingLog(definition),
      shown: {},
      offerCount: 0,
      offerAccepted: false,
      pendingOffer: false
    };
  }

  function slotLimit(local) { return 2 + (local.extraSlots || 0); }

  function applyDirectEffects(params, local, effects) {
    let next = clone(params);
    (effects || []).forEach(function (item) {
      const before = next[item.key];
      next[item.key] = SERIES.clamp(before + item.delta);
      local.params_gained[item.key] += next[item.key] - before;
    });
    return next;
  }

  function applyCappedGain(params, local, key, delta) {
    const cap = BATTLES.gainCaps[key];
    if (cap == null) return params;
    const remaining = Math.max(0, cap - local.caps_used[key]);
    const awarded = Math.max(0, Math.min(delta, remaining));
    if (!awarded) return params;
    const next = clone(params);
    const before = next[key];
    next[key] = SERIES.clamp(before + awarded);
    const actual = next[key] - before;
    local.caps_used[key] += actual;
    local.params_gained[key] += actual;
    return next;
  }

  // 士気の減少分だけ「秩序規範」の半減を適用する（回復には掛けない）
  function applyMorale(local, params, delta) {
    let amount = delta;
    if (amount < 0 && local.moraleHalfTurns > 0) amount = Math.ceil(amount / 2);
    params.raml_morale = SERIES.clamp(params.raml_morale + amount);
    return amount;
  }

  function requirementLabel(req) {
    return SERIES.paramLabels[req.key] + " " + req.value + "で開放";
  }

  function actionAvailable(definition, local, params, action) {
    if (!action) return { ok: false, reason: "未登録の行動です" };
    if (action.fromChapter && definition.chapter < action.fromChapter) {
      return { ok: false, reason: "この章ではまだ使えません" };
    }
    if (action.battleOnly && action.battleOnly !== definition.id) return { ok: false, reason: "この戦闘では使用できません" };
    // EV-BT1-TUT のように、特定の戦闘でのみ解放条件を免除するもの
    const exempt = Array.isArray(action.exemptIn) && action.exemptIn.indexOf(definition.id) >= 0;
    if (!exempt) {
      if (action.requiresBalance && (params.freedom_insight < 30 || params.order_insight < 30)) {
        return { ok: false, reason: "自由理解30・秩序理解30で開放" };
      }
      if (action.requires && params[action.requires.key] < action.requires.value) {
        return { ok: false, reason: requirementLabel(action.requires) };
      }
      if (action.requiresAll) {
        for (let i = 0; i < action.requiresAll.length; i += 1) {
          const req = action.requiresAll[i];
          if (params[req.key] < req.value) return { ok: false, reason: requirementLabel(req) };
        }
      }
    }
    if (action.requiresWeak && !local.weak_exposed) return { ok: false, reason: "差分解析で急所を開示する" };
    if (action.once && local.once_used && local.once_used[action.id]) return { ok: false, reason: "各戦1回まで" };
    if (local.slotsUsed >= slotLimit(local)) return { ok: false, reason: "敵フェイズへ移行中" };
    return { ok: true, reason: "" };
  }

  // 敵の次の一手（ルールリーディング／読みと笛の開示内容）
  function nextEnemyAction(definition, local) {
    if (local.enemyStopTurns > 0) return "相手は自己修正に入っている（行動なし）";
    return local.turn % 2 === 0 ? "割り込み書き換え（市民被害イベント）" : "防壁再構成（完全性 +10）";
  }

  function applyActionEffect(definition, local, params, action) {
    const strongOk = action.effectStrong ? params[action.effectStrong.key] >= action.effectStrong.value : false;
    switch (action.effect) {
      case "freeze_progress":
        local.freezeTurns = Math.max(local.freezeTurns, strongOk ? 2 : 1);
        pushLog(local, "進行を封鎖。" + (strongOk ? "2ターン" : "1ターン") + "停止");
        if (local.pendingCivilian) {
          local.pendingCivilian = false;
          local.blockCount += 1;
          params = applyCappedGain(params, local, "order_insight", 5);
          pushLog(local, "割り込み書き換えを封鎖で防いだ。市民保護扱い");
        }
        break;
      case "shield_civilian":
        local.shieldCivilian = true;
        if (local.pendingCivilian) {
          local.pendingCivilian = false;
          local.blockCount += 1;
          pushLog(local, "市民被害イベントを無効化した");
        }
        if (strongOk) {
          applyMorale(local, params, 5);
          pushLog(local, "生活側の線を保った。RAML士気 +5");
        }
        break;
      case "reveal":
        local.revealed = nextEnemyAction(definition, local) + (strongOk ? "／2ターン先まで開示" : "");
        local.revealCount += 1;
        pushLog(local, "次の一手を開示：" + local.revealed);
        break;
      case "morale_cost_half":
        local.moraleHalfTurns = 2;
        pushLog(local, "秩序規範。2ターンのあいだ士気コスト半減");
        break;
      case "block_rewrite":
        local.blockRewrite += 1;
        if (local.pendingCivilian) {
          local.pendingCivilian = false;
          local.blockCount += 1;
          pushLog(local, "割り込み書き換えを無効化した");
        }
        break;
      case "read_and_block":
        local.revealed = nextEnemyAction(definition, local);
        local.revealCount += 1;
        local.blockRewrite += 1;
        if (local.pendingCivilian) {
          local.pendingCivilian = false;
          local.blockCount += 1;
        }
        pushLog(local, "次の一手を開示し、割り込みを1回封じた");
        break;
      case "enemy_stop":
        local.enemyStopTurns += action.effectTurns || 1;
        pushLog(local, "相手の行動を" + (action.effectTurns || 1) + "ターン停止させた");
        break;
      case "explain":
        local.enemyStopTurns += 1;
        pushLog(local, "相手の一手が「解説」に変わった");
        break;
      case "expose_weak":
        local.weak_exposed = true;
        pushLog(local, "急所を開示（差分解析）");
        break;
      case "extra_slot":
        local.extraSlots += 1;
        pushLog(local, "采配連携。この戦闘の行動枠 +1");
        break;
      case "resolve_collateral":
        if (local.collateral > 0) {
          local.collateral -= 1;
          local.collateral_resolved += 1;
          pushLog(local, definition.collateralName + "を1件、本人へ返して解消した");
        } else {
          pushLog(local, "返す決定は、いまはない");
        }
        break;
      case "halve_civilian":
        local.civilianHalved = true;
        pushLog(local, "先回りの退避完了。以降の市民被害イベントは半減");
        break;
      case "dex":
        local.dexFound = true;
        pushLog(local, "GADGETツール図鑑を回収した");
        break;
      default:
        break;
    }
    return params;
  }

  function applyEnemyPhase(definition, local, params) {
    const sc = script(definition);
    const interrupt = sc.interrupt || {};

    // 前の割り込み書き換えに対処しなかった場合の被害（chapter01/03 §1-4）
    if (local.pendingCivilian) {
      local.pendingCivilian = false;
      local.civilianEvents += 1;
      applyMorale(local, params, -10);
      pushLog(local, "割り込み書き換えに未対処。市民被害が発生。RAML士気 -10");
    }

    if (local.enemyStopTurns > 0) {
      local.enemyStopTurns -= 1;
      pushLog(local, "相手は動かない");
    } else {
      if (local.freezeTurns > 0) {
        local.freezeTurns -= 1;
        pushLog(local, "進行は封鎖されている");
      } else {
        local.node_progress = SERIES.clamp(local.node_progress + 10);
      }
      if (local.turn % 2 === 0) {
        if (local.blockRewrite > 0) {
          local.blockRewrite -= 1;
          local.blockCount += 1;
          pushLog(local, "割り込み書き換えを笛で止めた");
        } else if (local.shieldCivilian) {
          local.blockCount += 1;
          pushLog(local, "割り込み書き換え。ラインキープで生活側へは通さない");
        } else {
          local.pendingCivilian = !local.civilianHalved || local.turn % 4 === 0;
          if (local.pendingCivilian) {
            pushLog(local, "割り込み書き換え。このターン中に対処しないと市民被害");
            pushOnce(local, "rewrite", interrupt.rewrite);
          } else {
            pushLog(local, "割り込み書き換え。先回りの退避が効いている");
          }
        }
      } else {
        local.node_integrity = SERIES.clamp(local.node_integrity + 10);
        pushLog(local, "防壁再構成。完全性 +10");
        pushOnce(local, "rebuild", interrupt.rebuild);
      }
    }
    local.shieldCivilian = false;
    if (local.moraleHalfTurns > 0) local.moraleHalfTurns -= 1;
    local.revealed = null;

    // 最終戦のターン経過（最終同期の進行）と、進行が伸びたときの采配の促し
    pushOnce(local, "sync", interrupt.sync);
    if (local.node_progress >= 50) pushOnce(local, "progress", interrupt.progress);
    // BT-C2-03 の同時被攻撃イベント（1回のみ・分離構図）
    if (local.turn >= 3) pushOnce(local, "simultaneous", interrupt.simultaneous);

    // 進行100は敗北ではなく被害イベント（1回のみ・士気 -10）。戦闘は継続する
    if (local.node_progress >= 100 && !local.progressDamage) {
      local.progressDamage = true;
      applyMorale(local, params, -10);
      pushLog(local, "生活系統へ最適化が到達。被害イベント発生。RAML士気 -10");
    }
    if (definition.offer && local.offerCount < (definition.id === "BT-C2-02" ? 3 : 1)) {
      local.offerCount += 1;
      local.pendingOffer = true;
      pushLog(local, "提案受信：" + definition.offer.text);
      if (local.offerCount === 1) pushLines(local, sc.offerPrompt);
    }
    local.morale_trace.push(params.raml_morale);
    local.slotsUsed = 0;
    if (local.turn >= definition.turnLimit) {
      local.timedOut = true;
    } else {
      local.turn += 1;
    }
  }

  function performAction(definition, localInput, paramsInput, actionId) {
    const local = clone(localInput);
    let params = clone(paramsInput);
    const action = BATTLES.actions[actionId];
    const availability = actionAvailable(definition, local, params, action);
    if (!availability.ok) return { ok: false, reason: availability.reason, local: local, params: params };

    let controlDelta = action.control || 0;
    if (definition.restartOnlyControl && action.id !== "SK-OD-C3-01") controlDelta = 0;
    local.node_integrity = SERIES.clamp(local.node_integrity + (action.integrity || 0));
    local.node_control = SERIES.clamp(local.node_control + controlDelta);
    local.node_progress = SERIES.clamp(local.node_progress + (action.progress || 0));
    if (action.morale) applyMorale(local, params, action.morale);

    const sc = script(definition);
    const interrupt = sc.interrupt || {};
    if (action.tags.indexOf("physical") >= 0 && definition.collateralOnPhysical && local.collateral < 3) {
      local.collateral += 1;
      applyMorale(local, params, -5);
      pushLog(local, definition.collateralName + " " + local.collateral + "件。RAML士気 -5");
      pushOnce(local, "collateral", interrupt.collateral);
    }
    if (action.tags.indexOf("listening") >= 0) local.heard = true;
    (action.gains || []).forEach(function (item) {
      params = applyCappedGain(params, local, item.key, item.delta);
    });
    params = applyActionEffect(definition, local, params, action);
    if (action.once) local.once_used[action.id] = true;
    local.skills_used.push(action.id);
    local.slotsUsed += 1;
    pushLog(local, action.name + "を実行");
    // 手順に紐づく汎用割り込み台詞は、その戦闘での初使用時のみ流す
    pushOnce(local, "action_" + action.id, BATTLES.actionLines(action, definition.chapter));
    // 傾聴で流れる思想ブロードキャスト（初回のみ）
    if (action.tags.indexOf("listening") >= 0) pushOnce(local, "broadcast", interrupt.broadcast);
    // 戦闘中一度だけの下地演出（BT-C4-02 ショウの「壊さない一撃」への布石）
    if (sc.once) {
      Object.keys(sc.once).forEach(function (tag) {
        if (action.tags.indexOf(tag) >= 0) pushOnce(local, "once_" + tag, sc.once[tag]);
      });
    }

    if (local.slotsUsed >= slotLimit(local) && params.raml_morale > 0) applyEnemyPhase(definition, local, params);
    return { ok: true, local: local, params: params };
  }

  // 代行提案／入区勧誘への応答（chapter02/03 §4-2・chapter03/03 §4-2）
  function performOffer(definition, localInput, paramsInput, accepted) {
    const local = clone(localInput);
    const params = clone(paramsInput);
    const sc = script(definition);
    const offerLines = sc.offerLines || {};
    local.pendingOffer = false;
    if (!accepted) {
      pushLog(local, "提案を断った");
      // 初回の拒否はショウの固定行。以降はリコの代表1行に集約（C2Q3-B02）
      const reaction = (local.offerCount === 1 && offerLines.rejectFirst) ? offerLines.rejectFirst : offerLines.reject;
      pushLines(local, reaction);
      return { ok: true, local: local, params: params };
    }
    local.offerAccepted = true;
    local.slotsUsed += 1;
    pushLog(local, "提案を任せた。行動枠を1つ使用（パラメータ獲得なし）");
    if (local.collateral > 0) {
      // EXが再代行して沈静化する。ただし本人へ返していないので「未解消」のまま（TC2-02 に寄与しない）
      pushLog(local, definition.collateralName + "はEXが再代行した。……本人には、返っていない");
    } else {
      local.freezeTurns = Math.max(local.freezeTurns, 1);
      pushLog(local, "そのターンの処理を代行された。進行が1ターン止まる");
    }
    pushLines(local, offerLines.accept);
    if (local.slotsUsed >= slotLimit(local) && params.raml_morale > 0) applyEnemyPhase(definition, local, params);
    return { ok: true, local: local, params: params };
  }

  function dialogueAvailable(definition, local, phase) {
    if (!definition.finalBattle || !local.dialogue) return { ok: false, reason: "対話フェーズはありません" };
    if (local.dialogue.d3_selected) return { ok: false, reason: "対話は打ち切られました" };
    if (phase === "d1" && local.dialogue.d1_completed) return { ok: false, reason: "D1は完遂済み" };
    if (phase === "d2" && !local.dialogue.d1_completed) return { ok: false, reason: "D1完遂後に選べます" };
    if (phase === "d2" && local.dialogue.d2_selected) return { ok: false, reason: "D2は選択済み" };
    if (local.slotsUsed >= slotLimit(local)) return { ok: false, reason: "敵フェイズへ移行中" };
    return { ok: true, reason: "" };
  }

  function performDialogue(definition, localInput, paramsInput, phase) {
    const local = clone(localInput);
    let params = clone(paramsInput);
    const availability = dialogueAvailable(definition, local, phase);
    if (!availability.ok) return { ok: false, reason: availability.reason, local: local, params: params };

    if (phase === "d1") {
      local.dialogue.d1_completed = true;
      local.heard = true;
    }
    if (phase === "d2") local.dialogue.d2_selected = true;
    if (phase === "d3") local.dialogue.d3_selected = true;
    params = applyDirectEffects(params, local, BATTLES.dialogueEffects[phase]);
    local.skills_used.push(phase.toUpperCase());
    local.slotsUsed += 1;
    pushLog(local, phase.toUpperCase() + "：" + definition.dialogueLines[phase]);
    pushLines(local, (script(definition).dialogue || {})[phase]);
    if (local.slotsUsed >= slotLimit(local) && params.raml_morale > 0) applyEnemyPhase(definition, local, params);
    return { ok: true, local: local, params: params };
  }

  function clauseUnlocked(params) {
    const req = BATTLES.clauseSkill.requires;
    return params.freedom_insight >= req.freedom_insight && params.order_insight >= req.order_insight;
  }

  function canResolve(definition, local, params, resolution) {
    if (!definition.resolutions.includes(resolution)) return { ok: false, reason: "この方式は選べません" };
    if (resolution === "destroy") {
      return local.node_integrity <= 0
        ? { ok: true, reason: "" }
        : { ok: false, reason: "完全性を0まで下げる" };
    }
    if (resolution === "control") {
      if (local.node_control < 100) return { ok: false, reason: "制御を100まで進める" };
      if (definition.controlGA && params.gadget_analysis < definition.controlGA) {
        return { ok: false, reason: "GADGET解析 " + definition.controlGA + " が必要" };
      }
      return { ok: true, reason: "" };
    }
    if (resolution === "dialogue") {
      if (definition.finalBattle) {
        if (local.dialogue.d3_selected) return { ok: false, reason: "対話を打ち切ったため選べません" };
        if (!local.dialogue.d1_completed) return { ok: false, reason: "D1の完遂が必要" };
        if (params.gadget_analysis < definition.dialogueGA) {
          return { ok: false, reason: "GADGET解析 " + definition.dialogueGA + " が必要" };
        }
        if (definition.requireClause && !clauseUnlocked(params)) {
          return { ok: false, reason: "離脱条項：自由理解50・秩序理解50" };
        }
        return { ok: true, reason: "" };
      }
      return local.heard ? { ok: true, reason: "" } : { ok: false, reason: "傾聴を1回行う" };
    }
    if (resolution === "avoid") {
      return local.turn >= 2 ? { ok: true, reason: "" } : { ok: false, reason: "2ターン目から選択可能" };
    }
    return { ok: false, reason: "未登録の方式です" };
  }

  function automaticOutcome(definition, local, params) {
    if (params.raml_morale <= 0) return { resolution: null, retreated: true, timedOut: false };
    if (!local.timedOut) return null;
    if (definition.timeout === "retreated") return { resolution: null, retreated: true, timedOut: true };
    return { resolution: definition.timeout, retreated: false, timedOut: true };
  }

  // 決着後に見せる台詞（解決差分・撤退演出・戦闘後）を 06_script.md の順で組み立てる
  function outcomeScript(definition, outcome) {
    const sc = script(definition);
    const lines = [];
    const add = function (list) {
      (list || []).forEach(function (item) {
        const text = BATTLES.formatLine(item);
        if (text) lines.push(text);
      });
    };
    if (outcome.retreated) {
      // 意図せぬ撤退。章別の撤退イベント台詞 → 強制撤退演出
      if (!sc.forced) add(BATTLES.retreatLines[definition.chapter]);
      add(sc.forced);
      return lines;
    }
    add((sc.resolution || {})[outcome.resolution]);
    add((sc.retreatByResolution || {})[outcome.resolution]);
    add(sc.retreat);
    add(sc.after);
    return lines;
  }

  function finishBattle(definition, localInput, paramsInput, outcome) {
    const local = clone(localInput);
    let params = clone(paramsInput);
    const timedOut = Boolean(outcome.timedOut);
    if (!outcome.retreated && !timedOut) {
      params = applyDirectEffects(params, local, definition.resultEffects[outcome.resolution] || []);
    }
    if (outcome.retreated) params.raml_morale = 40;
    local.morale_trace.push(params.raml_morale);

    const compactGains = {};
    Object.keys(local.params_gained).forEach(function (key) {
      if (local.params_gained[key]) compactGains[key] = local.params_gained[key];
    });
    const record = {
      battle_id: definition.id,
      chapter: definition.chapter,
      resolution: outcome.retreated ? null : outcome.resolution,
      retreated: Boolean(outcome.retreated),
      turns: local.turn,
      skills_used: local.skills_used.slice(),
      civilian_damage: local.collateral,
      civilian_resolved: local.collateral_resolved,
      civilian_events: local.civilianEvents,
      reveal_count: local.revealCount,
      block_count: local.blockCount,
      offer_count: local.offerCount,
      offer_accepted: Boolean(local.offerAccepted),
      heard: Boolean(local.heard),
      dex_found: Boolean(local.dexFound),
      morale_trace: local.morale_trace.slice(),
      params_gained: compactGains,
      dialogue: local.dialogue ? clone(local.dialogue) : null,
      script: outcomeScript(definition, outcome)
    };
    return { params: params, record: record, timedOut: timedOut };
  }

  function applyChoice(stateInput, option) {
    const state = clone(stateInput);
    state.params = SERIES.applyEffects(state.params, option.effects);
    return state;
  }

  return {
    createBattleState: createBattleState,
    slotLimit: slotLimit,
    actionAvailable: actionAvailable,
    performAction: performAction,
    performOffer: performOffer,
    dialogueAvailable: dialogueAvailable,
    performDialogue: performDialogue,
    canResolve: canResolve,
    clauseUnlocked: clauseUnlocked,
    automaticOutcome: automaticOutcome,
    finishBattle: finishBattle,
    applyChoice: applyChoice
  };
});
