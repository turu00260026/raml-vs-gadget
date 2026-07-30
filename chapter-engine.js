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

  // ログ1行の種別。画面側がこれを見て見た目を変える
  function classify(message) {
    if (/^▶/.test(message)) return "act";
    if (/^──/.test(message)) return "turn";
    if (/^★/.test(message)) return "good";
    if (/^◆/.test(message)) return "ready";
    if (/^［/.test(message)) return "enemy";
    if (/→/.test(message) && /(完全性|制御|進行|RAML士気)/.test(message)) return "num";
    if (/(RAML士気 -|市民被害|波及|被害イベント)/.test(message)) return "bad";
    if (/^[^「：]+「/.test(message)) return "line";
    if (/(受け止め|通らない|届かない|動かない|噛み合った気配)/.test(message)) return "guard";
    if (/(封鎖|停止|無効|開示|半減|解消|再代行|周期|読み切|次は［|枠 \+)/.test(message)) return "effect";
    if (/：/.test(message)) return "react";
    return "info";
  }

  function pushLog(local, message, kind) {
    local.log.push({ t: message, k: kind || classify(message) });
    // 1手ごとに行動・数値・反応の3行が出るため、遡れる分を確保する
    if (local.log.length > 30) local.log.shift();
  }

  // 06_script.md の台詞行・演出行を戦闘ログへ流す
  function pushLines(local, lines) {
    (lines || []).forEach(function (item) {
      const text = BATTLES.formatLine(item);
      if (!text) return;
      const spoken = item && typeof item === "object" && item.speaker;
      pushLog(local, text, spoken ? "line" : "stage");
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
    const lines = [{ t: definition.intro, k: "stage" }];
    (script(definition).open || []).forEach(function (item) {
      const text = BATTLES.formatLine(item);
      if (text) lines.push({ t: text, k: item.speaker ? "line" : "stage" });
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
      // 敵の行動パターン（原作 comic 4P の「同期のラグ」）
      patternIndex: 0,
      patternKnown: 0,     // 何拍目まで解析できたか
      nextConfirmed: false, // レントンの現場読みで次の一手が確定しているか
      vulnerable: false,    // 同期直後＝無防備
      syncHit: 0,           // 隙を突いた回数
      counterReady: null,   // 次の一手に対して構えたタグ
      counterHit: 0,        // 読み勝って封じた回数
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

  function pick(list, seed) { return list[seed % list.length]; }

  function patternOf(definition) { return BATTLES.patterns[definition.pattern] || null; }

  // いま見えている範囲での「次の一手」。読めていなければ null
  function nextBeat(definition, local) {
    const pattern = patternOf(definition);
    if (!pattern) return null;
    return pattern[local.patternIndex % pattern.length];
  }

  function beatVisible(definition, local, offset) {
    const pattern = patternOf(definition);
    if (!pattern) return false;
    // 現場読み（レントン）が通っていれば次の1手だけは確定で見える
    if (offset === 0 && local.nextConfirmed) return true;
    return offset < local.patternKnown;
  }

  // 1手ごとに「何が起きたか」を数値と対象の反応で返す（数値そのものは変えない）
  function pushOutcome(definition, local, before, after) {
    const R = BATTLES.reactions;
    const seed = local.skills_used.length;
    const changes = [];
    if (after.integrity !== before.integrity) changes.push("完全性 " + before.integrity + " → " + after.integrity);
    if (after.control !== before.control) changes.push("制御 " + before.control + " → " + after.control);
    if (after.progress !== before.progress) changes.push("進行 " + before.progress + " → " + after.progress);
    if (after.morale !== before.morale) changes.push("RAML士気 " + before.morale + " → " + after.morale);
    if (changes.length) pushLog(local, changes.join("　／　"));

    let reaction = "";
    if (after.integrity < before.integrity) reaction = pick(R.integrityDown, seed);
    else if (after.control > before.control) reaction = pick(R.controlUp, seed);
    else if (after.progress < before.progress) reaction = pick(R.progressDown, seed);
    else if (after.morale > before.morale) reaction = pick(R.moraleUp, seed);
    if (reaction) pushLog(local, definition.target + "：" + reaction);
  }

  function snapshot(local, params) {
    return {
      integrity: local.node_integrity,
      control: local.node_control,
      progress: local.node_progress,
      morale: params.raml_morale
    };
  }

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
    // その場にいない隊員の手順は選べない（02_scenario.md の登場人物に従う）
    if (definition.absent && definition.absent.length) {
      const missing = BATTLES.requiredMembers(action).filter(function (name) {
        return definition.absent.indexOf(name) >= 0;
      });
      if (missing.length) return { ok: false, reason: missing.join("・") + "はこの場にいません" };
    }
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
      // ノリの大局分析：次の一手を確実に読み、周期の理解も1拍ぶん進める
      case "analyze_pattern": {
        const p = patternOf(definition);
        if (!p) { pushLog(local, "この相手に決まった周期はない"); break; }
        local.nextConfirmed = true;
        if (local.patternKnown < p.length) local.patternKnown += 1;
        const nb0 = nextBeat(definition, local);
        pushLog(local, "次は［" + nb0.name + "］" + (nb0.sync ? "——隙が来る" : "") +
          "（周期 " + local.patternKnown + "/" + p.length + "）");
        break;
      }
      // レントンの現場読み：ゲーマーの目で周期を一息に見抜く（原作 comic 4P）
      case "read_pattern": {
        const p2 = patternOf(definition);
        if (!p2) { pushLog(local, "読むほどの型がない"); break; }
        local.patternKnown = p2.length;
        local.nextConfirmed = true;
        const nb = nextBeat(definition, local);
        pushLog(local, "周期を読み切った（" + p2.length + "拍）。次は［" + nb.name + "］" + (nb.sync ? "——ここが隙だ" : ""));
        break;
      }
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
    pushLog(local, "── " + definition.target + " の手番 ──", "turn-foe");
    // 隙は1ターン限り。突かなければ閉じる
    local.vulnerable = false;
    if (!definition.pattern) pushOnce(local, "passive", [BATTLES.reactions.passive]);

    // 前の割り込み書き換えに対処しなかった場合の被害（chapter01/03 §1-4）
    if (local.pendingCivilian) {
      local.pendingCivilian = false;
      local.civilianEvents += 1;
      applyMorale(local, params, -10);
      pushLog(local, "割り込み書き換えに未対処。市民被害が発生。RAML士気 -10");
    }

    const pattern = patternOf(definition);
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
      if (pattern) {
        const step = pattern[local.patternIndex % pattern.length];
        // その一手を読めていたか（現場読みが通っている／周期を読み切っている）
        const wasRead = local.nextConfirmed || local.patternKnown >= pattern.length;
        local.patternIndex += 1;
        local.nextConfirmed = false;
        pushLog(local, "［" + step.name + "］" + step.detail);
        // 読んで構えていた手が刺さると、その拍は丸ごと不発になる
        const countered = Boolean(step.counter) && local.counterReady === step.counter;
        local.counterReady = null;
        if (countered) {
          local.counterHit += 1;
          pushLog(local, "★ 読み勝ち。" + step.counterName + "が間に合った——不発");
          // applyEnemyPhase は params を直接書き換える契約なので、獲得は書き戻す
          Object.assign(params, applyCappedGain(params, local, "order_insight", 3));
          Object.assign(params, applyCappedGain(params, local, "gadget_analysis", 2));
        }
        if (step.attack && !countered) {
          applyMorale(local, params, -step.attack);
          pushLog(local, "RAML士気 -" + step.attack);
        }
        if (step.repair && !countered) {
          local.node_integrity = SERIES.clamp(local.node_integrity + step.repair);
          pushOnce(local, "rebuild", interrupt.rebuild);
        }
        if (step.progress && !countered) local.node_progress = SERIES.clamp(local.node_progress + step.progress);
        if (step.civilian && !countered) {
          if (local.blockRewrite > 0) {
            local.blockRewrite -= 1;
            local.blockCount += 1;
            pushLog(local, "割り込み書き換えを笛で止めた");
          } else if (local.shieldCivilian) {
            local.blockCount += 1;
            pushLog(local, "ラインキープで生活側へは通さない");
          } else {
            local.pendingCivilian = !local.civilianHalved || local.turn % 4 === 0;
            if (local.pendingCivilian) {
              pushLog(local, "このターン中に対処しないと市民被害");
              pushOnce(local, "rewrite", interrupt.rewrite);
            } else {
              pushLog(local, "先回りの退避が効いている");
            }
          }
        }
        if (step.sync) {
          // 隙は「読めていた者」にだけ見える。原作 comic 4P のパターン解析
          if (wasRead) {
            local.vulnerable = true;
            pushLog(local, "★ 同期のラグ——読みどおり。いま叩けば大きく通る");
          } else {
            pushLog(local, "……何かが噛み合った気配がした。読めていれば、ここが隙だった");
          }
        }
      } else if (local.turn % 2 === 0) {
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
      pushLog(local, "── TURN " + local.turn + " / " + definition.turnLimit + "　RAMLの手番 ──", "turn-own");
    }
  }

  function performAction(definition, localInput, paramsInput, actionId) {
    const local = clone(localInput);
    let params = clone(paramsInput);
    const action = BATTLES.actions[actionId];
    const availability = actionAvailable(definition, local, params, action);
    if (!availability.ok) return { ok: false, reason: availability.reason, local: local, params: params };

    const before = snapshot(local, params);
    // 先に「誰が何をしたか」を出してから、結果を続ける
    local.skills_used.push(action.id);
    local.slotsUsed += 1;
    pushLog(local, "▶ " + (action.user ? action.user + "：" : "") + action.name);

    let controlDelta = action.control || 0;
    let integrityDelta = action.integrity || 0;
    if (definition.restartOnlyControl && action.id !== "SK-OD-C3-01") controlDelta = 0;
    // 原作 comic 4P「同期のラグをつけば勝てる！」——同期している間は硬く、ラグの一瞬だけ通る
    if (local.vulnerable && (integrityDelta < 0 || controlDelta > 0)) {
      integrityDelta *= 3;
      controlDelta *= 3;
      local.vulnerable = false;
      local.syncHit += 1;
      pushLog(local, "★ 同期のラグを突いた！ 効果3倍");
    } else if (patternOf(definition) && (integrityDelta < 0 || controlDelta > 0)) {
      // 同期中は指令系統も装甲も硬い。力任せ・手数任せでは抜けない
      const guarded = [];
      if (integrityDelta < 0) {
        integrityDelta = Math.ceil(integrityDelta * 0.15);
        guarded.push("装甲は同期した守りが受け止める");
      }
      if (controlDelta > 0) {
        controlDelta = Math.floor(controlDelta * 0.3);
        guarded.push("指令系統が揃っていて掌握しきれない");
      }
      pushLog(local, guarded.join("。") + "。ほとんど通らない");
    }
    local.node_integrity = SERIES.clamp(local.node_integrity + integrityDelta);
    local.node_control = SERIES.clamp(local.node_control + controlDelta);

    // 次の一手を読めているなら、それに合わせた手が「構え」になる（拍ごとに正解が変わる）
    const upcoming = nextBeat(definition, local);
    const patternRead = patternOf(definition) &&
      (local.nextConfirmed || local.patternKnown >= patternOf(definition).length);
    if (upcoming && upcoming.counter && patternRead && action.tags.indexOf(upcoming.counter) >= 0) {
      local.counterReady = upcoming.counter;
      pushLog(local, "◆ " + upcoming.counterName + "——［" + upcoming.name + "］に備えた");
    }
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
    pushOutcome(definition, local, before, snapshot(local, params));
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

  // 完全性0・制御100 は「積み切った」状態なので、その場で決着とみなす。
  // avoid（ターン経過で開く）や dialogue（聞いたうえで選ぶ）は受け身の条件なので自動確定しない
  function settledResolution(definition, local, params) {
    const tags = ["destroy", "control"];
    for (let i = 0; i < tags.length; i += 1) {
      const tag = tags[i];
      if (!definition.resolutions.includes(tag)) continue;
      if (tag === "destroy" && local.node_integrity > 0) continue;
      if (tag === "control" && local.node_control < 100) continue;
      if (canResolve(definition, local, params, tag).ok) return tag;
    }
    return null;
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
    patternOf: patternOf,
    nextBeat: nextBeat,
    beatVisible: beatVisible,
    actionAvailable: actionAvailable,
    performAction: performAction,
    performOffer: performOffer,
    dialogueAvailable: dialogueAvailable,
    performDialogue: performDialogue,
    canResolve: canResolve,
    clauseUnlocked: clauseUnlocked,
    settledResolution: settledResolution,
    automaticOutcome: automaticOutcome,
    finishBattle: finishBattle,
    applyChoice: applyChoice
  };
});
