(function () {
  "use strict";

  const Assets = window.RVG_ASSETS;
  const Series = window.RVG_SERIES;
  const Scenario = window.RVG_SCENARIO;
  const Battles = window.RVG_BATTLES;
  const Engine = window.RVG_ENGINE;

  const screen = document.getElementById("screen");
  const toastLayer = document.getElementById("toast-layer");
  const settingsModal = document.getElementById("settings-modal");
  const infoModal = document.getElementById("info-modal");
  const infoTitle = document.getElementById("info-title");
  const infoKicker = document.getElementById("info-kicker");
  const infoContent = document.getElementById("info-content");

  let gameState = null;
  let battleState = null;
  let battleDefinition = null;
  let viewMode = "title";
  let advIndex = 0;
  let pendingLines = null;
  let currentScene = null;
  let settings = loadSettings();

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadSettings() {
    try {
      return Object.assign({ speed: "normal", size: "standard", reduced: false },
        JSON.parse(localStorage.getItem("raml_vs_gadget_settings_v1") || "{}"));
    } catch (error) {
      return { speed: "normal", size: "standard", reduced: false };
    }
  }

  function saveSettings() {
    localStorage.setItem("raml_vs_gadget_settings_v1", JSON.stringify(settings));
    applySettings();
  }

  function applySettings() {
    document.documentElement.classList.toggle("text-large", settings.size === "large");
    document.documentElement.classList.toggle("motion-reduced", Boolean(settings.reduced));
    document.getElementById("text-speed").value = settings.speed;
    document.getElementById("text-size").value = settings.size;
    document.getElementById("reduced-motion").checked = Boolean(settings.reduced);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(Series.saveKey);
      return raw ? Series.normalizeState(JSON.parse(raw)) : null;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    if (!gameState) return;
    localStorage.setItem(Series.saveKey, JSON.stringify(Series.normalizeState(gameState)));
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    toastLayer.appendChild(node);
    window.setTimeout(function () { node.remove(); }, 2600);
  }

  function effectMessage(effects) {
    const positive = (effects || []).filter(function (item) { return item.delta > 0; });
    if (!positive.length) return "選択を記録しました";
    return positive.map(function (item) {
      return Series.paramLabels[item.key] + "が深まった";
    }).join("／");
  }

  function chapterLabel(chapterId) {
    const chapter = Scenario.getChapter(chapterId);
    return chapter ? "第" + chapter.id + "章　" + chapter.title : "";
  }

  function backgroundStyle(assetId) {
    const path = assetId ? Assets.assetPath(assetId) : null;
    return path ? "url('" + path.replace(/'/g, "%27") + "')" : "linear-gradient(135deg,#17363a,#071014 70%)";
  }

  function showTitle() {
    viewMode = "title";
    currentScene = null;
    battleState = null;
    const saved = loadState();
    const progress = saved
      ? chapterLabel(saved.chapter) + " ／ " + saved.scene
      : "記録はまだありません";
    screen.innerHTML =
      '<section class="title-screen" style="--title-art:' + backgroundStyle("bg_gadget_lab_night") + '">' +
        '<div class="title-copy">' +
          '<p class="eyebrow">COMPLETE SERIES / FOUR CHAPTERS</p>' +
          '<h1>RAML <span>vs GADGET</span></h1>' +
          '<p class="title-subtitle">AUTONOMY Ver.0.9β</p>' +
          '<p class="title-progress">' + escapeHTML(progress) + '</p>' +
          '<div class="title-menu">' +
            '<button class="primary-button" id="new-game">はじめから</button>' +
            '<button class="secondary-button" id="continue-game"' + (saved ? "" : " disabled") + '>続きから</button>' +
            '<button class="secondary-button" id="title-records">記録室</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    document.getElementById("new-game").addEventListener("click", function () {
      if (saved && !window.confirm("現在のセーブを初期化して、はじめから進めますか？")) return;
      gameState = Series.createInitialState();
      saveState();
      openCurrentScene();
    });
    document.getElementById("continue-game").addEventListener("click", function () {
      gameState = loadState();
      openCurrentScene();
    });
    document.getElementById("title-records").addEventListener("click", showRecords);
  }

  function openCurrentScene() {
    currentScene = Scenario.getScene(gameState.scene);
    if (!currentScene) {
      gameState.scene = Scenario.getChapter(gameState.chapter).firstScene;
      currentScene = Scenario.getScene(gameState.scene);
    }
    gameState.chapter = currentScene.chapter;
    saveState();
    advIndex = 0;
    pendingLines = null;
    // 決着済みの戦闘シーンへ再入場した場合は次のシーンへ送る（再戦・パラメータ稼ぎの防止）
    if (currentScene.battle && Array.isArray(gameState.flags.battles_done)
      && gameState.flags.battles_done.includes(currentScene.battle)) {
      advanceFromScene(currentScene);
      return;
    }
    if (currentScene.type === "ending") {
      renderEnding(currentScene);
      return;
    }
    if (currentScene.type === "noise") {
      Series.recordNoise(gameState, currentScene.noiseIndex);
      if (currentScene.noiseIndex === 0) gameState.flags.sho_shadow_seen = true;
      const dexId = "noise_log." + currentScene.noiseIndex;
      if (!gameState.flags.dex.includes(dexId)) gameState.flags.dex.push(dexId);
      if (currentScene.noiseIndex === 3) Series.registerSeriesTitles(gameState);
      saveState();
    }
    renderAdv();
  }

  function portraitMarkup(line) {
    if (!line || !line.portrait) return "";
    const path = Assets.portraitPath(line.portrait, line.expression);
    if (!path) return '<div class="portrait-fallback ' + escapeHTML(line.side) + '"></div>';
    return '<img class="portrait ' + escapeHTML(line.side) + '" src="' + escapeHTML(path) +
      '" alt="" data-fallback-side="' + escapeHTML(line.side) + '">';
  }

  function wireImageFallbacks() {
    screen.querySelectorAll("img[data-fallback-side]").forEach(function (image) {
      image.addEventListener("error", function () {
        const fallback = document.createElement("div");
        fallback.className = "portrait-fallback " + image.dataset.fallbackSide;
        image.replaceWith(fallback);
      }, { once: true });
    });
    screen.querySelectorAll("img[data-target]").forEach(function (image) {
      image.addEventListener("error", function () {
        const fallback = document.createElement("div");
        fallback.className = "target-fallback";
        image.replaceWith(fallback);
      }, { once: true });
    });
  }

  // 前章の幕引き種別で出し分ける持ち越し差分（series_plan §117）
  function lineVisible(item) {
    if (!item || !item.requires) return true;
    const need = item.requires;
    if (need.ending) {
      const value = gameState.endings[need.ending];
      if (need.is) return value === need.is;
      if (need.not) return value !== need.not;
    }
    return true;
  }

  // 表示中の行。選択肢を選んだ後は ▼差分＋合流後の行に切り替わる
  function activeLines() { return (pendingLines || currentScene.lines).filter(lineVisible); }

  function renderAdv() {
    viewMode = "adv";
    const scene = currentScene;
    const lines = activeLines();
    const line = lines[Math.min(advIndex, lines.length - 1)];
    let finished = advIndex >= lines.length;
    // 選択肢のないシーンで合流後の行が残っていれば、続けて流す
    if (finished && !pendingLines && !scene.choice && (scene.after || []).length) {
      pendingLines = scene.after.slice();
      advIndex = 0;
      renderAdv();
      return;
    }
    const sceneArt = backgroundStyle(scene.background);

    let interaction = "";
    if (finished && pendingLines) {
      interaction = scene.battle
        ? '<button class="primary-button" id="start-battle">戦闘を開始</button>'
        : '<button class="primary-button" id="next-scene">次へ</button>';
    } else if (finished && scene.choice) {
      interaction = '<div class="choice-list" aria-label="' + escapeHTML(scene.choice.prompt) + '">' +
        scene.choice.options.map(function (item) {
          return '<button class="choice-button" data-choice="' + escapeHTML(item.id) + '">' +
            '<span class="choice-code">' + escapeHTML(item.id) + '</span><span>' + escapeHTML(item.text) + '</span></button>';
        }).join("") + "</div>";
    } else if (finished && scene.battle) {
      interaction = '<button class="primary-button" id="start-battle">戦闘を開始</button>';
    } else if (finished) {
      interaction = '<button class="primary-button" id="next-scene">' +
        (scene.id === "SC-C4-10" ? "記録室へ" : "次へ") + "</button>";
    }

    const isStage = Boolean(line && line.stage);
    const cutin = (!finished && line && line.cutin && Assets.assetPath(line.cutin))
      ? '<img class="scene-cutin" src="' + escapeHTML(Assets.assetPath(line.cutin)) + '" alt="" data-target>'
      : "";
    const speakerText = finished
      ? (pendingLines ? scene.title : (scene.choice ? scene.choice.prompt : scene.title))
      : (isStage ? "" : line.speaker);
    const bodyText = finished
      ? (pendingLines ? scene.title : (scene.choice ? "どう動く？" : scene.title))
      : line.text;
    screen.innerHTML =
      '<section class="adv-screen">' +
        '<div class="scene-stage" style="--scene-art:' + sceneArt + '">' +
          '<div class="scene-meta">' + escapeHTML(chapterLabel(scene.chapter)) + " ／ " + escapeHTML(scene.id) + "</div>" +
          cutin +
          portraitMarkup(line) +
        "</div>" +
        '<div class="dialogue-panel' + (!finished ? " clickable" : "") + '" id="dialogue-panel">' +
          (speakerText ? '<span class="speaker">' + escapeHTML(speakerText) + "</span>" : "") +
          '<p class="dialogue-text' + (isStage && !finished ? " stage-text" : "") + '">' + escapeHTML(bodyText) + "</p>" +
          interaction +
          (!finished ? '<div class="advance-hint">クリック / Enter</div>' : "") +
        "</div>" +
      "</section>";

    wireImageFallbacks();
    if (!finished) {
      document.getElementById("dialogue-panel").addEventListener("click", advanceLine);
    } else if (pendingLines) {
      if (scene.battle) {
        document.getElementById("start-battle").addEventListener("click", function () { startBattle(scene.battle); });
      } else {
        document.getElementById("next-scene").addEventListener("click", function () { advanceFromScene(scene); });
      }
    } else if (scene.choice) {
      screen.querySelectorAll("[data-choice]").forEach(function (button) {
        button.addEventListener("click", function () {
          const selected = scene.choice.options.find(function (item) { return item.id === button.dataset.choice; });
          gameState = Engine.applyChoice(gameState, selected);
          // 章内称号（TC2-04・TC3-07 など）は選んだ選択肢そのものを条件にする
          if (!Array.isArray(gameState.flags.choices)) gameState.flags.choices = [];
          const choiceKey = scene.choice.id + ":" + selected.id;
          if (!gameState.flags.choices.includes(choiceKey)) gameState.flags.choices.push(choiceKey);
          toast(effectMessage(selected.effects));
          // ▼差分 →（あれば）合流後の行を続けて見せてから次へ
          const follow = (selected.diff || []).concat(scene.after || []);
          if (follow.length) {
            pendingLines = follow;
            advIndex = 0;
            renderAdv();
            return;
          }
          advanceFromScene(scene);
        });
      });
    } else if (scene.battle) {
      document.getElementById("start-battle").addEventListener("click", function () { startBattle(scene.battle); });
    } else {
      document.getElementById("next-scene").addEventListener("click", function () { advanceFromScene(scene); });
    }
  }

  function advanceLine() {
    if (advIndex < activeLines().length) {
      advIndex += 1;
      renderAdv();
    }
  }

  function advanceFromScene(scene) {
    const nextId = Scenario.getNextSceneId(scene.id);
    if (!nextId) {
      saveState();
      showRecords();
      return;
    }
    const next = Scenario.getScene(nextId);
    if (next.chapter !== scene.chapter) {
      Series.startChapter(gameState, next.chapter, nextId);
      toast(chapterLabel(next.chapter));
    } else {
      gameState.scene = nextId;
    }
    saveState();
    openCurrentScene();
  }

  function unlockChapterArchives(chapter) {
    Scenario.subEvents.filter(function (item) {
      return item.chapter === chapter && gameState.params.trust_exp >= item.threshold;
    }).forEach(function (item) {
      if (!gameState.flags.sub_events.includes(item.id)) gameState.flags.sub_events.push(item.id);
    });
  }

  function renderEnding(scene) {
    viewMode = "ending";
    const ending = Series.determineEnding(scene.chapter, gameState);
    const stored = Series.recordEndingOnce(gameState, scene.chapter, ending);
    const variant = scene.variants[stored];
    unlockChapterArchives(scene.chapter);
    // 幕引き到達が条件の章内称号（TC2-04 ほか）をここで確定させる
    Series.registerChapterTitles(gameState, scene.chapter);
    const endDex = variant.id;
    if (!gameState.flags.dex.includes(endDex)) gameState.flags.dex.push(endDex);
    saveState();

    let release = "";
    if (Object.prototype.hasOwnProperty.call(variant, "releaseNote")) {
      release = '<div class="release-note"><strong>リリースノート最終行</strong><br>' +
        (variant.releaseNote ? escapeHTML("「" + variant.releaseNote + "」") : "（空欄）") +
        '<br><br><strong>署名</strong><br>' + (variant.signature ? escapeHTML(variant.signature) : "（空欄）") + "</div>";
    }
    screen.innerHTML =
      '<section class="ending-screen">' +
        '<article class="ending-card">' +
          '<p class="eyebrow">' + escapeHTML(variant.id) + " / " + escapeHTML(stored.toUpperCase()) + "</p>" +
          "<h1>" + escapeHTML(variant.title) + "</h1>" +
          (scene.prelude ? '<p class="ending-body stage-text">' + escapeHTML(scene.prelude) + "</p>" : "") +
          '<p class="ending-body">' + escapeHTML(variant.body) + "</p>" +
          release +
          '<button class="primary-button" id="ending-next">次へ</button>' +
        "</article>" +
      "</section>";
    document.getElementById("ending-next").addEventListener("click", function () { advanceFromScene(scene); });
  }

  function showBattleTutorial() {
    const rows = [
      ["この戦闘で決めること", "「どちらが強いか」ではありません。<strong>この機械をどう止めるか</strong>を選びます。選んだ止め方は記録に残り、章の結末に効いてきます。"],
      ["ゲージ4つの意味", "<strong>RAML士気</strong>＝隊の余力。0になるとその場は撤退します（物語は続きます）。<br><strong>完全性</strong>＝機械の頑丈さ。0まで下げると「物理停止」が選べます。<br><strong>制御</strong>＝掌握の度合い。100まで進めると「制御奪取」が選べます。<br><strong>進行</strong>＝相手の最適化の進み具合。100に達すると生活側に被害が出ます（敗北ではありません）。"],
      ["1ターンの流れ", "行動枠は<strong>1ターンに2つ</strong>。2つ使うと相手の手番になり、進行が+10され、防壁の再構成か割り込み処理が起きます。ターン上限を過ぎると規定の決着になります。"],
      ["手順（コマンド）の選び方", "<strong>精密停止</strong>＝完全性を大きく削る。破壊ルートの主軸ですが、相手は防壁を建て直してきます。<br><strong>構造解析</strong>＝制御を進め、GADGET解析を得る。制御ルートの主軸。<br><strong>傾聴</strong>＝相手の発信を遮らずに聞く。進行が+5進むリスクを負う代わりに自由理解と解析を得ます。<br>灰色の手順は、まだ開放条件を満たしていません（条件は手順の説明に出ます）。"],
      ["決着のしかた", "画面下の<strong>物理停止</strong>／<strong>制御奪取</strong>が条件を満たすと押せます。章が進むと<strong>対話</strong>や<strong>抑え込み</strong>も選べるようになります。壊して止めるか、掌握して止めるか、話して止めるか——ここが、この作品の選択です。"]
    ];
    infoKicker.textContent = "TUTORIAL / BT-01";
    infoTitle.textContent = "はじめての対処";
    infoContent.innerHTML =
      '<div class="insight"><strong>ノリ</strong><br>' +
      'β版には、必ず「まだ書かれてない場所」があります。——そこを突けば、壊さずに手綱を取れる。手順、送ります</div>' +
      rows.map(function (row) {
        return '<div class="insight"><strong>' + row[0] + "</strong><br>" + row[1] + "</div>";
      }).join("") +
      '<div class="insight"><strong>リコ</strong><br>壊す手も残しておく。ショウ、いつでも</div>';
    infoModal.showModal();
  }

  function startBattle(battleId) {
    battleDefinition = Battles.getBattle(battleId);
    battleState = Engine.createBattleState(battleDefinition, gameState.params);
    if (battleId === "BT-01") {
      // EV-BT1-TUT: 初戦のみ、操作説明を提示する（誘導台詞は script.open が流す）
      renderBattle();
      showBattleTutorial();
      return;
    }
    renderBattle();
  }

  function gauge(label, value, cssClass) {
    return '<div class="gauge-card"><div class="gauge-label"><span>' + escapeHTML(label) +
      "</span><strong>" + escapeHTML(value) + '</strong></div><div class="gauge-track"><div class="gauge-fill ' +
      escapeHTML(cssClass || "") + '" style="width:' + Math.max(0, Math.min(100, value)) + '%"></div></div></div>';
  }

  function battleActionButtons() {
    // 使える手順は章の解放段階と戦闘定義から決まる（正典スキル23種）
    return Battles.actionIdsForBattle(battleDefinition).map(function (id) {
      const action = Battles.actions[id];
      const availability = Engine.actionAvailable(battleDefinition, battleState, gameState.params, action);
      const name = action.user ? action.name + "（" + action.user + "）" : action.name;
      return '<button class="command-button" data-action="' + escapeHTML(id) + '"' + (availability.ok ? "" : " disabled") +
        ' title="' + escapeHTML(availability.reason) + '"><strong>' + escapeHTML(name) + "</strong><small>" +
        escapeHTML(availability.ok ? action.detail : availability.reason) + "</small></button>";
    }).join("");
  }

  function dialogueButtons() {
    if (!battleDefinition.finalBattle) return "";
    return ["d1", "d2", "d3"].map(function (phase) {
      const availability = Engine.dialogueAvailable(battleDefinition, battleState, phase);
      const names = { d1: "D1 最後まで聞く", d2: "D2 哲学を手渡す", d3: "D3 対話を打ち切る" };
      return '<button class="command-button" data-dialogue="' + phase + '"' + (availability.ok ? "" : " disabled") +
        ' title="' + escapeHTML(availability.reason) + '"><strong>' + escapeHTML(names[phase]) + "</strong><small>" +
        escapeHTML(availability.ok ? battleDefinition.dialogueLines[phase] : availability.reason) + "</small></button>";
    }).join("");
  }

  function offerMarkup() {
    if (!battleState.pendingOffer || !battleDefinition.offer) return "";
    // R2 の文言は戦闘定義側が持つ。第2章＝代行の提案／第3章＝入区勧誘で意味が違う（chapter03/01_plan §7-2）
    const offer = battleDefinition.offer;
    return '<div class="phase-strip"><strong>' + escapeHTML(offer.text) + '</strong><div class="choice-list">' +
      '<button class="choice-button" data-offer="reject"><span class="choice-code">R1</span><span>' +
      escapeHTML(offer.rejectLabel || "断る") + "</span></button>" +
      '<button class="choice-button" data-offer="accept"><span class="choice-code">R2</span><span>' +
      escapeHTML(offer.acceptLabel || "任せてみる") + "</span></button>" +
      "</div></div>";
  }

  function resolutionButtons() {
    return battleDefinition.resolutions.map(function (tag) {
      const status = Engine.canResolve(battleDefinition, battleState, gameState.params, tag);
      return '<button class="resolve-button" data-resolution="' + escapeHTML(tag) + '"' + (status.ok ? "" : " disabled") +
        ' title="' + escapeHTML(status.reason) + '">' + escapeHTML(Battles.resolutionLabels[tag]) +
        (status.ok ? "" : "<br><small>" + escapeHTML(status.reason) + "</small>") + "</button>";
    }).join("");
  }

  function renderBattle() {
    viewMode = "battle";
    const targetPath = battleDefinition.asset ? Assets.assetPath(battleDefinition.asset) : null;
    const targetMarkup = targetPath
      ? '<img class="target-image" src="' + escapeHTML(targetPath) + '" alt="" data-target>'
      : '<div class="target-fallback"></div>';
    screen.innerHTML =
      '<section class="battle-screen">' +
        '<div class="battle-visual" style="--battle-art:' + backgroundStyle(battleDefinition.background) + '">' +
          targetMarkup +
          '<div class="battle-target-label"><strong>' + escapeHTML(battleDefinition.target) +
          '</strong><span>対処対象：機械／システム</span></div>' +
        "</div>" +
        '<div class="battle-console">' +
          '<div class="battle-heading"><div><p class="eyebrow">' + escapeHTML(battleDefinition.id) +
          "</p><h1>" + escapeHTML(battleDefinition.title) + '</h1></div><div class="turn-counter">TURN ' +
          battleState.turn + " / " + battleDefinition.turnLimit + "</div></div>" +
          '<div class="gauges">' +
            gauge("RAML士気", gameState.params.raml_morale, "morale") +
            gauge("完全性", battleState.node_integrity, "integrity") +
            gauge("制御", battleState.node_control, "") +
            gauge("進行", battleState.node_progress, "progress") +
          "</div>" +
          '<div class="phase-strip">行動枠 ' + battleState.slotsUsed + " / 2　｜　GADGET解析 " +
          gameState.params.gadget_analysis + (battleState.collateral ? "　｜　波及 " + battleState.collateral + "件" : "") +
          '　｜　<button class="link-button" id="battle-help">遊び方</button></div>' +
          offerMarkup() +
          (battleState.pendingOffer ? "" : '<div class="command-grid">' + dialogueButtons() + battleActionButtons() + "</div>") +
          '<div class="battle-log">' + battleState.log.map(function (item) { return "<p>› " + escapeHTML(item) + "</p>"; }).join("") + "</div>" +
          '<div class="resolution-bar">' + resolutionButtons() + "</div>" +
        "</div>" +
      "</section>";
    wireImageFallbacks();
    const helpButton = document.getElementById("battle-help");
    if (helpButton) helpButton.addEventListener("click", showBattleTutorial);

    screen.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        const result = Engine.performAction(battleDefinition, battleState, gameState.params, button.dataset.action);
        if (!result.ok) { toast(result.reason); return; }
        battleState = result.local;
        gameState.params = result.params;
        checkBattleState();
      });
    });
    screen.querySelectorAll("[data-dialogue]").forEach(function (button) {
      button.addEventListener("click", function () {
        const result = Engine.performDialogue(battleDefinition, battleState, gameState.params, button.dataset.dialogue);
        if (!result.ok) { toast(result.reason); return; }
        battleState = result.local;
        gameState.params = result.params;
        checkBattleState();
      });
    });
    screen.querySelectorAll("[data-resolution]").forEach(function (button) {
      button.addEventListener("click", function () {
        const tag = button.dataset.resolution;
        const allowed = Engine.canResolve(battleDefinition, battleState, gameState.params, tag);
        if (!allowed.ok) { toast(allowed.reason); return; }
        completeBattle({ resolution: tag, retreated: false, timedOut: false });
      });
    });
    screen.querySelectorAll("[data-offer]").forEach(function (button) {
      button.addEventListener("click", function () {
        const accepted = button.dataset.offer === "accept";
        const result = Engine.performOffer(battleDefinition, battleState, gameState.params, accepted);
        battleState = result.local;
        gameState.params = result.params;
        checkBattleState();
      });
    });
  }

  function checkBattleState() {
    const auto = Engine.automaticOutcome(battleDefinition, battleState, gameState.params);
    if (auto) {
      completeBattle(auto);
      return;
    }
    renderBattle();
  }

  function completeBattle(outcome) {
    const result = Engine.finishBattle(battleDefinition, battleState, gameState.params, outcome);
    gameState.params = result.params;
    gameState.battle_records.push(result.record);
    // 決着済みの戦闘を記録する。再入場（タイトルへ戻って「続きから」等）による再戦・稼ぎを防ぐ
    if (!Array.isArray(gameState.flags.battles_done)) gameState.flags.battles_done = [];
    if (!gameState.flags.battles_done.includes(result.record.battle_id)) {
      gameState.flags.battles_done.push(result.record.battle_id);
    }
    // 図鑑の回収と章内称号の判定（各章 03/04 §8-1・§8-2）
    const found = Series.collectDex(gameState, result.record);
    Series.registerChapterTitles(gameState, result.record.chapter);
    if (found.length) toast("図鑑を回収：" + found.map(function (e) { return e.name; }).join("／"));
    saveState();
    renderResult(result.record, result.timedOut);
  }

  function renderResult(record, timedOut) {
    viewMode = "result";
    const label = record.retreated ? Battles.resolutionLabels.retreated : Battles.resolutionLabels[record.resolution];
    const gains = Object.keys(record.params_gained).map(function (key) {
      const value = record.params_gained[key];
      return (Series.paramLabels[key] || key) + " " + (value > 0 ? "+" : "") + value;
    }).join(" ／ ") || "追加記録なし";
    // 解決差分・撤退演出・戦闘後の台詞（06_script.md の ◇解決差分／◇戦闘後）
    const aftermath = (record.script && record.script.length)
      ? '<div class="battle-aftermath">' + record.script.map(function (text) {
          const spoken = /^[^「]+「/.test(text);
          return '<p class="' + (spoken ? "aftermath-line" : "aftermath-stage") + '">' + escapeHTML(text) + "</p>";
        }).join("") + "</div>"
      : "";
    screen.innerHTML =
      '<section class="result-screen"><article class="result-card">' +
        '<p class="eyebrow">BATTLE RECORD / ' + escapeHTML(record.battle_id) + "</p>" +
        "<h1>" + escapeHTML(label) + "</h1>" +
        (timedOut ? '<p class="phase-strip">ターン上限時の規定により確定</p>' : "") +
        aftermath +
        '<div class="result-grid">' +
          '<div class="result-cell"><span>ターン数</span><strong>' + record.turns + "</strong></div>" +
          '<div class="result-cell"><span>波及した処理</span><strong>' + record.civilian_damage + "件</strong></div>" +
          '<div class="result-cell"><span>使用手順</span><strong>' + record.skills_used.length + "回</strong></div>" +
          '<div class="result-cell"><span>獲得</span><strong>' + escapeHTML(gains) + "</strong></div>" +
        "</div>" +
        '<button class="primary-button" id="result-next">物語を続ける</button>' +
      "</article></section>";
    document.getElementById("result-next").addEventListener("click", function () { advanceFromScene(currentScene); });
  }

  function showAnalysis() {
    if (!gameState) {
      toast("セーブを開始すると解析記録が開きます");
      return;
    }
    const ga = gameState.params.gadget_analysis;
    const rows = [
      [15, "ノード構造", "完全性と制御は別の軸。壊さずに止める経路が存在する。"],
      [30, "制御経路", "中枢の制御奪取に必要な空白が見えてきた。"],
      [45, "思想ログ", "発信を最後まで聞くことで、対話解決の入口が開く。"],
      [60, "差分の輪郭", "本家と派生版の違いを、コメント単位で追跡できる。"],
      [80, "離脱条項", "自由理解と秩序理解が揃えば、出口を実装できる。"],
      [85, "最終解析", "停止・制御・対話。三つの答えを同じ盤面に置ける。"]
    ];
    infoKicker.textContent = "ANALYSIS / " + ga;
    infoTitle.textContent = "解析記録";
    infoContent.innerHTML = rows.map(function (row) {
      return '<div class="insight"><strong>' + (ga >= row[0] ? escapeHTML(row[1]) : "未解析") +
        '</strong><br>' + (ga >= row[0] ? escapeHTML(row[2]) : "解析 " + row[0] + " で開示") + "</div>";
    }).join("");
    infoModal.showModal();
  }

  function showRecords() {
    viewMode = "records";
    const state = gameState || loadState() || Series.createInitialState();
    const titleChecks = Series.evaluateSeriesTitles(state);
    const endings = [
      ["第1章", state.endings.ed_c1], ["第2章", state.endings.ed_c2],
      ["第3章", state.endings.ed_c3], ["最終章", state.endings.ed_final]
    ];
    const resolutionCount = { destroy: 0, control: 0, dialogue: 0, avoid: 0 };
    state.battle_records.forEach(function (record) {
      if (record.resolution) resolutionCount[record.resolution] += 1;
    });
    const titleItems = Series.seriesTitles.map(function (item) {
      const unlocked = titleChecks[item.id] || state.flags.titles.includes(item.id);
      return '<li class="archive-item ' + (unlocked ? "unlocked" : "") + '">' +
        escapeHTML(unlocked ? item.id + "　" + item.name : item.id + "　？？？") + "</li>";
    }).join("");
    // 章内称号26種（TTL / TC2 / TC3）
    const chapterChecks = Series.evaluateChapterTitles(state);
    const chapterTitlePanels = [1, 2, 3].map(function (chapter) {
      const list = Series.chapterTitles.filter(function (item) { return item.chapter === chapter; });
      const got = list.filter(function (item) {
        return chapterChecks[item.id] || state.flags.titles.includes(item.id);
      }).length;
      return '<section class="archive-panel"><h2>第' + chapter + "章の称号　<small>" + got + " / " + list.length + "</small></h2>" +
        '<ul class="archive-list">' + list.map(function (item) {
          const unlocked = chapterChecks[item.id] || state.flags.titles.includes(item.id);
          return '<li class="archive-item ' + (unlocked ? "unlocked" : "") + '" title="' + escapeHTML(item.detail) + '">' +
            escapeHTML(unlocked ? item.id + "　" + item.name : item.id + "　？？？") + "</li>";
        }).join("") + "</ul></section>";
    }).join("");
    // 図鑑（GADGETツール図鑑／野良フォーク）
    const dexPanels = ["tools", "forks"].map(function (category) {
      const list = Series.dexEntries.filter(function (entry) { return entry.category === category; });
      const got = list.filter(function (entry) { return state.flags.dex.includes(entry.id); }).length;
      return '<section class="archive-panel"><h2>' + escapeHTML(Series.dexCategoryLabels[category]) +
        "　<small>" + got + " / " + list.length + "</small></h2>" +
        '<ul class="archive-list">' + list.map(function (entry) {
          const unlocked = state.flags.dex.includes(entry.id);
          return '<li class="archive-item ' + (unlocked ? "unlocked" : "") + '">' +
            escapeHTML(unlocked ? entry.name : "未回収") + "</li>";
        }).join("") + "</ul></section>";
    }).join("");
    const noiseItems = Series.noiseLogs.map(function (text, index) {
      const got = state.flags["noise_log_" + index];
      return '<li class="archive-item ' + (got ? "unlocked" : "") + '">noise_log.' + index + "　" +
        escapeHTML(got ? text : "未収集") + "</li>";
    }).join("");
    const complete = Series.isStoryStructureComplete(state);
    screen.innerHTML =
      '<section class="records-screen">' +
        '<div class="records-heading"><p class="eyebrow">ARCHIVE</p><h1>記録室</h1></div>' +
        '<div class="records-grid">' +
          '<section class="archive-panel"><h2>END回収</h2><ul class="archive-list">' +
            endings.map(function (row) {
              return '<li class="archive-item ' + (row[1] ? "unlocked" : "") + '">' + escapeHTML(row[0]) + "　" +
                escapeHTML(row[1] ? row[1].toUpperCase() : "未到達") + "</li>";
            }).join("") + "</ul></section>" +
          '<section class="archive-panel"><h2>解決傾向</h2><ul class="archive-list">' +
            Object.keys(resolutionCount).map(function (tag) {
              return '<li class="archive-item unlocked">' + escapeHTML(Battles.resolutionLabels[tag]) + "　" + resolutionCount[tag] + "回</li>";
            }).join("") + "</ul></section>" +
          '<section class="archive-panel"><h2>シリーズ通し称号</h2><ul class="archive-list">' + titleItems + "</ul></section>" +
          chapterTitlePanels +
          dexPanels +
          '<section class="archive-panel"><h2>回想</h2><ul class="archive-list">' +
            Scenario.subEvents.map(function (item) {
              const unlocked = state.flags.sub_events.includes(item.id);
              return '<li class="archive-item ' + (unlocked ? "unlocked" : "") + '">' +
                escapeHTML(unlocked ? item.id + "　" + item.title : item.id + "　未解放") + "</li>";
            }).join("") + "</ul></section>" +
          '<section class="archive-panel wide"><h2>noise_log断片</h2><ul class="archive-list">' + noiseItems + "</ul>" +
            '<div class="release-note"><strong>未分類の物語構造</strong><br>' +
              escapeHTML(complete ? Series.noiseComplete : "断片の解析は未完成") + "</div></section>" +
          '<section class="archive-panel wide"><h2>戦闘ログ</h2><ul class="archive-list">' +
            (state.battle_records.length ? state.battle_records.map(function (record) {
              const label = record.retreated ? Battles.resolutionLabels.retreated : Battles.resolutionLabels[record.resolution];
              return '<li class="archive-item unlocked">' + escapeHTML(record.battle_id) + " ／ " +
                escapeHTML(label) + " ／ " + record.turns + "T ／ 波及 " + record.civilian_damage + "件</li>";
            }).join("") : '<li class="archive-item">記録なし</li>') +
          "</ul></section>" +
          '<button class="primary-button" id="records-back">タイトルへ戻る</button>' +
        "</div>" +
      "</section>";
    document.getElementById("records-back").addEventListener("click", showTitle);
  }

  document.getElementById("home-button").addEventListener("click", function () {
    if (viewMode === "battle" && !window.confirm("戦闘の途中です。シーン頭からやり直してタイトルへ戻りますか？")) return;
    if (viewMode === "result" && !window.confirm("戦闘結果を確認中です。タイトルへ戻りますか？（この戦闘は決着済みとして扱われます）")) return;
    showTitle();
  });
  document.getElementById("analysis-button").addEventListener("click", showAnalysis);
  document.getElementById("records-button").addEventListener("click", function () {
    if (viewMode === "battle" && !window.confirm("戦闘の途中です。記録室へ移ると、この戦闘はシーン頭からやり直しになります。移動しますか？")) return;
    showRecords();
  });
  document.getElementById("settings-button").addEventListener("click", function () { settingsModal.showModal(); });
  document.getElementById("info-close").addEventListener("click", function () { infoModal.close(); });
  document.getElementById("text-speed").addEventListener("change", function (event) {
    settings.speed = event.target.value; saveSettings();
  });
  document.getElementById("text-size").addEventListener("change", function (event) {
    settings.size = event.target.value; saveSettings();
  });
  document.getElementById("reduced-motion").addEventListener("change", function (event) {
    settings.reduced = event.target.checked; saveSettings();
  });
  document.getElementById("reset-save").addEventListener("click", function () {
    if (!window.confirm("セーブを初期化しますか？")) return;
    localStorage.removeItem(Series.saveKey);
    gameState = null;
    settingsModal.close();
    showTitle();
    toast("セーブを初期化しました");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (infoModal.open) infoModal.close();
      else if (settingsModal.open) settingsModal.close();
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && viewMode === "adv") {
      const panel = document.getElementById("dialogue-panel");
      if (panel && panel.classList.contains("clickable")) {
        event.preventDefault();
        advanceLine();
      }
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && document.activeElement.matches("button")) {
      const buttons = Array.from(screen.querySelectorAll("button:not([disabled])"));
      const index = buttons.indexOf(document.activeElement);
      if (index >= 0) {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        buttons[(index + delta + buttons.length) % buttons.length].focus();
      }
    }
  });

  applySettings();
  showTitle();
})();
