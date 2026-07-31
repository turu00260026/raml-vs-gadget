(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RVG_ASSETS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ASSETS = [
    ["bg_gadget_lab_night", "background", "backgrounds/bg_gadget_lab_night.webp"],
    ["bg_raml_command", "background", "backgrounds/bg_raml_command.webp"],
    ["bg_warehouse_node", "background", "backgrounds/bg_warehouse_node.webp"],
    ["bg_hospital_courtyard", "background", "backgrounds/bg_hospital_courtyard.webp"],
    ["bg_old_server_room", "background", "backgrounds/bg_old_server_room.webp"],
    ["node_alpha_active", "enemy", "enemies/node_alpha_active.png"],
    ["node_alpha_stopped", "enemy", "enemies/node_alpha_stopped.png"],
    ["node_beta_active", "enemy", "enemies/node_beta_active.png"],
    ["autonomy_core_active", "enemy", "enemies/autonomy_core_active.png"],
    ["autonomy_core_standby", "enemy", "enemies/autonomy_core_standby.png"],
    ["ryousan_clean", "enemy", "enemies/ryousan_clean.png"],
    ["keisuke_robo_clean", "enemy", "enemies/keisuke_robo_clean.png"],
    ["ev_riko_homecoming_01", "cutin", "cutins/ev_riko_homecoming_01.webp"],
    ["04_nori_tanned", "character", "characters/04_nori_tanned.png"],
    ["nori_tanned_neutral", "expression", "characters/expressions/nori_tanned_neutral.png"],
    ["nori_tanned_analysis", "expression", "characters/expressions/nori_tanned_analysis.png"],
    ["keisuke_serious", "expression", "characters/expressions/keisuke_serious.png"],
    ["keisuke_ears_down", "expression", "characters/expressions/keisuke_ears_down.png"],
    ["ci_keisuke_retreat_01", "cutin", "cutins/ci_keisuke_retreat_01.webp"],
    ["ci_sho_shadow_01", "cutin", "cutins/ci_sho_shadow_01.webp"],
    ["bg_riko_home_night", "background", "backgrounds/bg_riko_home_night.webp"],
    ["bg_cityhall_night", "background", "backgrounds/bg_cityhall_night.webp"],
    ["bg_hospital_corridor", "background", "backgrounds/bg_hospital_corridor.webp"],
    ["bg_return_road_dawn", "background", "backgrounds/bg_return_road_dawn.webp"],
    ["ryousan_suppressed", "enemy", "enemies/ryousan_suppressed.png"],
    ["ci_open_clause_01", "cutin", "cutins/ci_open_clause_01.webp"],
    ["ev_riko_terminal_restored_01", "cutin", "cutins/ev_riko_terminal_restored_01.webp"],
    ["ov_node_space_01", "overlay", "overlays/ov_node_space_01.png"],
    ["ov_noise_glitch_01", "overlay", "overlays/ov_noise_glitch_01.png"],
    ["bg_shopping_street_day", "background", "backgrounds/bg_shopping_street_day.webp"],
    ["bg_city_crossing_dusk", "background", "backgrounds/bg_city_crossing_dusk.webp"],
    ["ev_c4_admin_chair_01", "event_cg", "cutins/ev_c4_admin_chair_01.webp"],
    ["ev_c4_handshake_01", "event_cg", "cutins/ev_c4_handshake_01.webp"],
    ["ev_c4_epilogue_return_01", "event_cg", "cutins/ev_c4_epilogue_return_01.webp"],
    // 各章の幕引きCG（bad / normal / true）。第4章の bad・true は上の ev_c4_* を使う
    ["ed_c1_bad_01", "event_cg", "cutins/ed_c1_bad_01.webp"],
    ["ed_c1_normal_01", "event_cg", "cutins/ed_c1_normal_01.webp"],
    ["ed_c1_true_01", "event_cg", "cutins/ed_c1_true_01.webp"],
    ["ed_c2_bad_01", "event_cg", "cutins/ed_c2_bad_01.webp"],
    ["ed_c2_normal_01", "event_cg", "cutins/ed_c2_normal_01.webp"],
    ["ed_c2_true_01", "event_cg", "cutins/ed_c2_true_01.webp"],
    ["ed_c3_bad_01", "event_cg", "cutins/ed_c3_bad_01.webp"],
    ["ed_c3_normal_01", "event_cg", "cutins/ed_c3_normal_01.webp"],
    ["ed_c3_true_01", "event_cg", "cutins/ed_c3_true_01.webp"],
    ["ed_c4_normal_01", "event_cg", "cutins/ed_c4_normal_01.webp"]
  ].map(function (row) {
    return { id: row[0], type: row[1], file: row[2], status: "approved" };
  });

  const byId = Object.create(null);
  ASSETS.forEach(function (asset) {
    if (byId[asset.id]) throw new Error("Duplicate asset id: " + asset.id);
    byId[asset.id] = asset;
  });

  const PORTRAITS = {
    rico: {
      neutral: "riko_neutral.png", concern: "riko_concern.png",
      analysis: "riko_analysis.png", alert: "riko_alert.png"
    },
    nori: {
      neutral: "nori_neutral.png", concern: "nori_concern.png",
      analysis: "nori_analysis.png", alert: "nori_alert.png"
    },
    renton: {
      neutral: "renton_neutral.png", concern: "renton_concern.png",
      analysis: "renton_analysis.png", alert: "renton_alert.png"
    },
    sho: {
      neutral: "sho_neutral.png", concern: "sho_concern.png",
      analysis: "sho_analysis.png", alert: "sho_alert.png"
    },
    keisuke: {
      neutral: "keisuke_neutral.png", concern: "keisuke_concern.png",
      analysis: "keisuke_analysis.png", alert: "keisuke_alert.png"
    },
    keisuke_robo: {
      neutral: "keisuke_robo_neutral.png", concern: "keisuke_robo_concern.png",
      analysis: "keisuke_robo_analysis.png", alert: "keisuke_robo_alert.png"
    },
    ryousan: {
      neutral: "ryousan_neutral.png", concern: "ryousan_concern.png",
      analysis: "ryousan_analysis.png", alert: "ryousan_alert.png"
    }
  };

  const PORTRAIT_FALLBACKS = {
    keisuke: { serious: "concern", ears_down: "concern" },
    nori: { tanned_concern: "neutral", tanned_alert: "neutral" }
  };
  const ALPHA_PORTRAITS = {
    rico: true, nori: true, renton: true, sho: true, keisuke: true
  };

  function assetPath(id) {
    const asset = byId[id];
    return asset ? "assets/game/" + asset.file : null;
  }

  function portraitPath(character, expression) {
    if (character === "nori" && /^tanned/.test(expression || "")) {
      const file = expression === "tanned_analysis" ? "nori_tanned_analysis.png" : "nori_tanned_neutral.png";
      return "assets/portraits_alpha/" + file;
    }
    if (character === "keisuke" && expression === "serious") return "assets/portraits_alpha/keisuke_serious.png";
    if (character === "keisuke" && expression === "ears_down") return "assets/portraits_alpha/keisuke_ears_down.png";
    const map = PORTRAITS[character];
    if (!map) return null;
    let key = expression || "neutral";
    if (!map[key]) key = (PORTRAIT_FALLBACKS[character] || {})[key] || "neutral";
    return "assets/" + (ALPHA_PORTRAITS[character] ? "portraits_alpha/" : "portraits/") + map[key];
  }

  return {
    schema: "raml-vs-gadget.asset-registry.v1",
    assets: ASSETS,
    byId: byId,
    portraits: PORTRAITS,
    assetPath: assetPath,
    portraitPath: portraitPath
  };
});
