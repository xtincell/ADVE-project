/**
 * i18n — page publique /paris (façade unique V3b). Fragment par page :
 * spread dans fr/en/zh.ts — les agents/pages n'éditent jamais les dicts
 * centraux directement (zéro conflit).
 */

export const parisFr = {
  "paris.brand": "La Fusée",
  "paris.nav.scorer": "Scorer",
  "paris.nav.championnat": "Championnat",
  "paris.nav.diagnostic": "Diagnostic gratuit",
  "paris.title": "Le registre des paris",
  "paris.lede":
    "Ici, des marques s'engagent en public : une prédiction datée, enregistrée avant l'échéance, résolue devant tous. Les paris tenus restent. Les paris ratés aussi — c'est ce qui rend les premiers crédibles.",
  "paris.empty.title": "Aucun pari public pour l'instant.",
  "paris.empty.before": "Le premier pari s'écrit bientôt — chaque marque du",
  "paris.empty.link": "championnat",
  "paris.empty.after": "peut s'engager.",
  "paris.section.open": "En cours — échéance devant tous",
  "paris.section.settled": "Résolus — le verdict est resté",
  "paris.status.open": "En cours",
  "paris.status.hit": "Tenu",
  "paris.status.miss": "Raté",
  "paris.status.unresolved": "Non tranché",
  "paris.card.declared": "déclaré le",
  "paris.card.horizon": "échéance",
  "paris.card.resolved": "résolu le",
  "paris.card.confidence": "confiance déclarée",
  "paris.footer.rule":
    "Chaque pari est enregistré AVANT son échéance et ne peut plus être réécrit. Un pari n'engage jamais que la marque qui le fait — jamais des tiers.",
  "paris.footer.leaderboard": "Le championnat des marques",
  "paris.footer.scorer": "Scorer ma marque",
} as const;

export const parisEn: Record<keyof typeof parisFr, string> = {
  "paris.brand": "La Fusée",
  "paris.nav.scorer": "Score",
  "paris.nav.championnat": "Championship",
  "paris.nav.diagnostic": "Free diagnostic",
  "paris.title": "The pledge registry",
  "paris.lede":
    "Here, brands commit in public: a dated prediction, recorded before its deadline, settled in front of everyone. Kept pledges stay. Missed ones too — that's what makes the kept ones credible.",
  "paris.empty.title": "No public pledge yet.",
  "paris.empty.before": "The first pledge is coming — any brand in the",
  "paris.empty.link": "championship",
  "paris.empty.after": "can commit.",
  "paris.section.open": "Open — deadline in front of everyone",
  "paris.section.settled": "Settled — the verdict stayed",
  "paris.status.open": "Open",
  "paris.status.hit": "Kept",
  "paris.status.miss": "Missed",
  "paris.status.unresolved": "Unsettled",
  "paris.card.declared": "declared on",
  "paris.card.horizon": "deadline",
  "paris.card.resolved": "settled on",
  "paris.card.confidence": "declared confidence",
  "paris.footer.rule":
    "Every pledge is recorded BEFORE its deadline and can never be rewritten. A pledge only ever binds the brand that makes it — never third parties.",
  "paris.footer.leaderboard": "The brand championship",
  "paris.footer.scorer": "Score my brand",
};

export const parisZh: Record<keyof typeof parisFr, string> = {
  "paris.brand": "La Fusée",
  "paris.nav.scorer": "评分",
  "paris.nav.championnat": "锦标赛",
  "paris.nav.diagnostic": "免费诊断",
  "paris.title": "公开承诺登记册",
  "paris.lede":
    "在这里，品牌公开承诺：一个有日期的预测，在到期前登记，当众结算。兑现的承诺留下，未兑现的也留下——这正是兑现者可信的原因。",
  "paris.empty.title": "暂无公开承诺。",
  "paris.empty.before": "第一个承诺即将写下——",
  "paris.empty.link": "锦标赛",
  "paris.empty.after": "中的每个品牌都可以承诺。",
  "paris.section.open": "进行中——期限当众可见",
  "paris.section.settled": "已结算——裁决永存",
  "paris.status.open": "进行中",
  "paris.status.hit": "兑现",
  "paris.status.miss": "未兑现",
  "paris.status.unresolved": "未裁决",
  "paris.card.declared": "声明于",
  "paris.card.horizon": "期限",
  "paris.card.resolved": "结算于",
  "paris.card.confidence": "声明信心",
  "paris.footer.rule": "每个承诺都在到期前登记，永不改写。承诺只约束做出它的品牌——绝不涉及第三方。",
  "paris.footer.leaderboard": "品牌锦标赛",
  "paris.footer.scorer": "为我的品牌评分",
};
