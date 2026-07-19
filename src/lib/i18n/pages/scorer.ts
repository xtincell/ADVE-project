/**
 * i18n — page publique /scorer (hook du funnel de capture, rapport magazine).
 * Fragment par page : spread dans fr/en/zh.ts — les agents/pages n'éditent
 * jamais les dicts centraux directement (zéro conflit).
 *
 * Les clés contenant des `{placeholders}` sont interpolées côté page (helper
 * `tf`) — les valeurs dynamiques (noms de marques, chiffres, données serveur)
 * ne sont JAMAIS traduites, seulement injectées.
 */

export const scorerFr = {
  // ── Nav (en-tête léger, page autonome) ─────────────────────────────────
  "scorer.nav.brand": "La Fusée",
  "scorer.nav.homeAria": "La Fusée — accueil",
  "scorer.nav.leaderboard": "Classement",
  "scorer.nav.os": "L'OS",
  "scorer.nav.login": "Connexion",

  // ── Hero ───────────────────────────────────────────────────────────────
  "scorer.hero.kicker": "La Fusée · score gratuit · sans email",
  "scorer.hero.title": "Scorez votre marque en une minute",
  "scorer.hero.lede.before":
    "Entrez votre marque, votre site et vos réseaux — on scanne votre empreinte digitale en ",
  "scorer.hero.lede.strong": "une minute",
  "scorer.hero.lede.after":
    ", sans inscription. Puis, si vous voulez aller plus loin, votre diagnostic complet (méthode ADVE) vous attend.",

  // ── Formulaire ─────────────────────────────────────────────────────────
  "scorer.form.title": "Votre marque",
  "scorer.form.description": "Rien n'est enregistré à cette étape.",
  "scorer.form.brandPlaceholder": "Nom de la marque *",
  "scorer.form.websitePlaceholder": "Site web (https://…) — recommandé",
  "scorer.form.websiteHint":
    "Votre site débloque 4 signaux de plus (domaine, email, performance…).",
  "scorer.form.socialPlaceholder":
    "Réseaux sociaux (un lien par ligne : Instagram, Facebook, TikTok…)",
  "scorer.form.submit": "Scorer ma marque — gratuit",
  "scorer.form.submitting": "Analyse en cours…",

  // ── Progression du scan ────────────────────────────────────────────────
  "scorer.scan.title": "Scan en cours — environ une minute",
  "scorer.scan.step1": "Lecture de votre site (https, balises, sitemap)…",
  "scorer.scan.step2": "Découverte de vos réseaux sociaux…",
  "scorer.scan.step3":
    "Relevé des audiences (Instagram, Facebook, TikTok) — l'étape la plus longue…",
  "scorer.scan.step4": "Presse, avis Google, domaine, email professionnel…",
  "scorer.scan.step5": "Consolidation de tout ce qu'on a trouvé…",
  "scorer.scan.honesty":
    "On interroge tout en parallèle et on ne garde que le vérifiable — rien n'est inventé.",

  // ── Verdict /100 en langage clair ──────────────────────────────────────
  "scorer.verdict.strong":
    "Votre présence en ligne est forte — une bonne base pour bâtir une marque culte.",
  "scorer.verdict.solid":
    "Votre présence en ligne est solide, mais il reste des leviers à activer.",
  "scorer.verdict.building":
    "Votre présence en ligne est en construction — plusieurs signaux clés manquent encore.",
  "scorer.verdict.fragile":
    "Votre présence en ligne est encore fragile — c'est justement là qu'on intervient.",

  // ── Labels de dimensions (fallback local) ──────────────────────────────
  "scorer.dim.site": "Site web",
  "scorer.dim.social": "Réseaux sociaux",
  "scorer.dim.reviews": "Avis clients",
  "scorer.dim.press": "Presse & mentions",
  "scorer.dim.email": "Infrastructure email",
  "scorer.dim.domain": "Ancienneté du domaine",
  "scorer.dim.perf": "Performance du site",

  // ── Hints signaux non mesurés ──────────────────────────────────────────
  "scorer.hint.site": "Ajoutez votre site web",
  "scorer.hint.email": "Nécessite votre site web",
  "scorer.hint.domain": "Nécessite votre site web",
  "scorer.hint.perf": "Nécessite votre site web",
  "scorer.hint.reviews": "Votre fiche Google (avis)",
  "scorer.hint.press": "Aucune retombée presse trouvée pour l'instant",
  "scorer.hint.social": "Ajoutez vos réseaux sociaux",
  "scorer.hint.pending": "à mesurer",
  "scorer.hint.viaSite": "↑ via votre site",

  // ── Raisons d'audience manquante ───────────────────────────────────────
  "scorer.audienceReason.deferred":
    "relevé d'audience non configuré sur la plateforme",
  "scorer.audienceReason.pending":
    "relevé en cours en arrière-plan — revenez dans une minute et cliquez Actualiser",
  "scorer.audienceReason.degraded": "relevé d'audience en échec — cliquez Actualiser",
  "scorer.audienceReason.none": "audience non relevée",

  // ── Unités (accord singulier/pluriel) ──────────────────────────────────
  "scorer.unit.network": "réseau",
  "scorer.unit.networks": "réseaux",
  "scorer.unit.year": "an",
  "scorer.unit.years": "ans",

  // ── Chapo de couverture (prose déterministe) ───────────────────────────
  "scorer.lead.audience":
    "{brand} parle déjà à {followers} personnes sur {count} {networks} — c'est le premier actif de la marque.",
  "scorer.lead.presence":
    "{brand} est présente sur {count} {networks} — l'audience reste à relever.",
  "scorer.lead.press.one": "La presse en parle : 1 mention récente.",
  "scorer.lead.press.many": "La presse en parle : {count} mentions récentes.",
  "scorer.lead.reviews": "Vos clients vous notent {rating}/5{reviewsPart}.",
  "scorer.lead.reviewsPart": " sur {count} avis",
  "scorer.lead.domain": "Et le socle est installé : votre domaine a {age} ans.",
  "scorer.lead.site": "Votre site répond présent.",

  // ── Prose chapitre audience ────────────────────────────────────────────
  "scorer.audience.measured":
    "{total} abonnés relevés, compte par compte. Votre place forte : {top}{topPart}.",
  "scorer.audience.topPart": " ({count} abonnés)",
  "scorer.audience.detected.one": "1 compte détecté — {reason}.",
  "scorer.audience.detected.many": "{count} comptes détectés — {reason}.",
  "scorer.audience.none":
    "Aucun réseau détecté pour l'instant — ajoutez vos liens pour qu'on relève votre audience.",

  // ── Prose chapitre réputation ──────────────────────────────────────────
  "scorer.reputation.both":
    "On écrit sur vous, et vos clients parlent : {pressPart}, et une note de {rating}/5 sur votre fiche Google.",
  "scorer.reputation.pressCount.one": "1 retombée presse récente",
  "scorer.reputation.pressCount.many": "{count} retombées presse récentes",
  "scorer.reputation.pressOnly":
    "On écrit sur vous : {pressPart}. C'est du capital de preuve — chaque lien ci-dessous est vérifiable.",
  "scorer.reputation.pressOnlyCount.one": "1 retombée récente",
  "scorer.reputation.pressOnlyCount.many": "{count} retombées récentes",
  "scorer.reputation.reviewsOnly": "Vos clients ont la parole : {rating}/5{reviewsPart}.",
  "scorer.reputation.reviewsPart": " sur {count} avis Google",
  "scorer.reputation.none":
    "Pas de trace mesurée dans la presse ni d'avis Google pour l'instant — un espace à conquérir.",

  // ── Phrases par fondation ──────────────────────────────────────────────
  "scorer.foundation.siteUp": "Votre site répond{detailsPart}.",
  "scorer.foundation.siteDown":
    "Un site est déclaré mais il était injoignable pendant le scan.",
  "scorer.foundation.domain":
    "Enregistré il y a {age} {years}{registrarPart} — {ageVerdict}.",
  "scorer.foundation.domainRegistrar": " chez {registrar}",
  "scorer.foundation.domainInstalled": "une présence installée, ça se voit",
  "scorer.foundation.domainYoung": "une marque encore jeune sur le web",
  "scorer.foundation.emailNone":
    "Aucune infrastructure email professionnelle détectée sur votre domaine.",
  "scorer.foundation.email": "Vos emails passent par {provider}{authPart}.",
  "scorer.foundation.emailDedicated": "un serveur dédié",
  "scorer.foundation.emailAuth": ", authentifiés ({auth})",
  "scorer.foundation.emailNoAuth":
    " — sans authentification SPF/DMARC, ils risquent le dossier spam",
  "scorer.foundation.perf": "{score}/100 sur mobile{lcpPart}.",
  "scorer.foundation.perfLcp": ", premier affichage en {seconds} s",

  // ── Couverture du rapport ──────────────────────────────────────────────
  "scorer.cover.kicker": "Le rapport d'empreinte",
  "scorer.cover.today": "aujourd'hui",
  "scorer.cover.stale": "Donnée à rafraîchir",
  "scorer.cover.cached": "Depuis le cache",
  "scorer.cover.yourBrand": "Votre marque",
  "scorer.cover.noSignal":
    "Pas encore assez de signal mesurable — ajoutez votre site et vos réseaux.",
  "scorer.cover.stat.followers": "abonnés mesurés",
  "scorer.cover.stat.press": "mentions presse",
  "scorer.cover.stat.coverage": "du spectre mesuré",
  "scorer.cover.basis.before": "Basé sur",
  "scorer.cover.basis.after":
    "signal(aux) vérifié(s) — on ne note que le vérifiable, rien n'est inventé.",
  "scorer.cover.refresh": "Actualiser",
  "scorer.cover.refreshing": "Actualisation…",

  // ── Chapitres ──────────────────────────────────────────────────────────
  "scorer.ch1.title": "Votre audience",
  "scorer.ch1.detected": "détecté",
  "scorer.ch2.title": "Votre réputation",
  "scorer.ch2.googleCard": "Fiche Google",
  "scorer.ch2.reviewsUnit": "avis",
  "scorer.ch2.pressFallback": "presse",
  "scorer.ch2.quoteOpen": "« ",
  "scorer.ch2.quoteClose": " »",
  "scorer.ch3.title": "Vos fondations",
  "scorer.ch3.lede":
    "Ce qui tient votre présence en ligne debout : le site, le domaine, l'email, la vitesse. C'est invisible pour vos clients — jusqu'au jour où ça manque.",
  "scorer.ch4.title": "Encore à mesurer",
  "scorer.ch4.addSiteTitle": "Ajoutez votre site web pour un score plus complet",
  "scorer.ch4.addSiteHint":
    "Il débloque d'un coup 4 signaux (domaine, email, performance…).",
  "scorer.ch4.sitePlaceholder": "https://votre-site.com",
  "scorer.ch4.rescore": "Re-scorer",
  "scorer.ch4.note":
    "Ces signaux n'ont pas baissé votre score — ils sont juste en attente.",

  // ── CTA final vers l'intake ────────────────────────────────────────────
  "scorer.cta.title": "Ce n'est que votre présence. Et votre marque, elle vaut quoi ?",
  "scorer.cta.body":
    "Le vrai diagnostic (méthode ADVE, votre place dans votre ligue) est offert. On reprend votre marque, votre site et vos réseaux — il ne reste que vos coordonnées.",
  "scorer.cta.diagnostic": "Obtenir mon diagnostic complet — offert",
  "scorer.cta.leaderboard": "Voir le classement des marques",
} as const;

export const scorerEn: Record<keyof typeof scorerFr, string> = {
  "scorer.nav.brand": "La Fusée",
  "scorer.nav.homeAria": "La Fusée — home",
  "scorer.nav.leaderboard": "Leaderboard",
  "scorer.nav.os": "The OS",
  "scorer.nav.login": "Log in",

  "scorer.hero.kicker": "La Fusée · free score · no email",
  "scorer.hero.title": "Score your brand in one minute",
  "scorer.hero.lede.before":
    "Enter your brand, your website and your social accounts — we scan your digital footprint in ",
  "scorer.hero.lede.strong": "one minute",
  "scorer.hero.lede.after":
    ", no sign-up required. Then, if you want to go further, your full diagnostic (ADVE method) is waiting.",

  "scorer.form.title": "Your brand",
  "scorer.form.description": "Nothing is saved at this step.",
  "scorer.form.brandPlaceholder": "Brand name *",
  "scorer.form.websitePlaceholder": "Website (https://…) — recommended",
  "scorer.form.websiteHint":
    "Your website unlocks 4 more signals (domain, email, performance…).",
  "scorer.form.socialPlaceholder":
    "Social accounts (one link per line: Instagram, Facebook, TikTok…)",
  "scorer.form.submit": "Score my brand — free",
  "scorer.form.submitting": "Analyzing…",

  "scorer.scan.title": "Scan in progress — about one minute",
  "scorer.scan.step1": "Reading your website (https, tags, sitemap)…",
  "scorer.scan.step2": "Discovering your social accounts…",
  "scorer.scan.step3":
    "Counting audiences (Instagram, Facebook, TikTok) — the longest step…",
  "scorer.scan.step4": "Press, Google reviews, domain, professional email…",
  "scorer.scan.step5": "Consolidating everything we found…",
  "scorer.scan.honesty":
    "We query everything in parallel and keep only what's verifiable — nothing is invented.",

  "scorer.verdict.strong":
    "Your online presence is strong — a solid base for building a cult brand.",
  "scorer.verdict.solid":
    "Your online presence is solid, but there are still levers left to pull.",
  "scorer.verdict.building":
    "Your online presence is under construction — several key signals are still missing.",
  "scorer.verdict.fragile":
    "Your online presence is still fragile — that's exactly where we come in.",

  "scorer.dim.site": "Website",
  "scorer.dim.social": "Social media",
  "scorer.dim.reviews": "Customer reviews",
  "scorer.dim.press": "Press & mentions",
  "scorer.dim.email": "Email infrastructure",
  "scorer.dim.domain": "Domain age",
  "scorer.dim.perf": "Website performance",

  "scorer.hint.site": "Add your website",
  "scorer.hint.email": "Requires your website",
  "scorer.hint.domain": "Requires your website",
  "scorer.hint.perf": "Requires your website",
  "scorer.hint.reviews": "Your Google listing (reviews)",
  "scorer.hint.press": "No press coverage found yet",
  "scorer.hint.social": "Add your social accounts",
  "scorer.hint.pending": "to measure",
  "scorer.hint.viaSite": "↑ via your website",

  "scorer.audienceReason.deferred": "audience count not configured on the platform",
  "scorer.audienceReason.pending":
    "count running in the background — come back in a minute and click Refresh",
  "scorer.audienceReason.degraded": "audience count failed — click Refresh",
  "scorer.audienceReason.none": "audience not measured",

  "scorer.unit.network": "network",
  "scorer.unit.networks": "networks",
  "scorer.unit.year": "year",
  "scorer.unit.years": "years",

  "scorer.lead.audience":
    "{brand} already speaks to {followers} people across {count} {networks} — that's the brand's first asset.",
  "scorer.lead.presence":
    "{brand} is present on {count} {networks} — the audience is still to be measured.",
  "scorer.lead.press.one": "The press is talking: 1 recent mention.",
  "scorer.lead.press.many": "The press is talking: {count} recent mentions.",
  "scorer.lead.reviews": "Your customers rate you {rating}/5{reviewsPart}.",
  "scorer.lead.reviewsPart": " across {count} reviews",
  "scorer.lead.domain":
    "And the foundation is in place: your domain is {age} years old.",
  "scorer.lead.site": "Your website is up and answering.",

  "scorer.audience.measured":
    "{total} followers counted, account by account. Your stronghold: {top}{topPart}.",
  "scorer.audience.topPart": " ({count} followers)",
  "scorer.audience.detected.one": "1 account detected — {reason}.",
  "scorer.audience.detected.many": "{count} accounts detected — {reason}.",
  "scorer.audience.none":
    "No social account detected yet — add your links so we can measure your audience.",

  "scorer.reputation.both":
    "The press writes about you, and your customers speak up: {pressPart}, and a {rating}/5 rating on your Google listing.",
  "scorer.reputation.pressCount.one": "1 recent press mention",
  "scorer.reputation.pressCount.many": "{count} recent press mentions",
  "scorer.reputation.pressOnly":
    "The press writes about you: {pressPart}. That's proof capital — every link below is verifiable.",
  "scorer.reputation.pressOnlyCount.one": "1 recent mention",
  "scorer.reputation.pressOnlyCount.many": "{count} recent mentions",
  "scorer.reputation.reviewsOnly":
    "Your customers have spoken: {rating}/5{reviewsPart}.",
  "scorer.reputation.reviewsPart": " across {count} Google reviews",
  "scorer.reputation.none":
    "No measured press coverage or Google reviews yet — territory left to conquer.",

  "scorer.foundation.siteUp": "Your website responds{detailsPart}.",
  "scorer.foundation.siteDown":
    "A website is declared but it was unreachable during the scan.",
  "scorer.foundation.domain":
    "Registered {age} {years} ago{registrarPart} — {ageVerdict}.",
  "scorer.foundation.domainRegistrar": " with {registrar}",
  "scorer.foundation.domainInstalled": "an established presence, and it shows",
  "scorer.foundation.domainYoung": "a brand still young on the web",
  "scorer.foundation.emailNone":
    "No professional email infrastructure detected on your domain.",
  "scorer.foundation.email": "Your emails run through {provider}{authPart}.",
  "scorer.foundation.emailDedicated": "a dedicated server",
  "scorer.foundation.emailAuth": ", authenticated ({auth})",
  "scorer.foundation.emailNoAuth":
    " — without SPF/DMARC authentication, they risk the spam folder",
  "scorer.foundation.perf": "{score}/100 on mobile{lcpPart}.",
  "scorer.foundation.perfLcp": ", first paint in {seconds}s",

  "scorer.cover.kicker": "The footprint report",
  "scorer.cover.today": "today",
  "scorer.cover.stale": "Data needs a refresh",
  "scorer.cover.cached": "From cache",
  "scorer.cover.yourBrand": "Your brand",
  "scorer.cover.noSignal":
    "Not enough measurable signal yet — add your website and your social accounts.",
  "scorer.cover.stat.followers": "followers measured",
  "scorer.cover.stat.press": "press mentions",
  "scorer.cover.stat.coverage": "of the spectrum measured",
  "scorer.cover.basis.before": "Based on",
  "scorer.cover.basis.after":
    "verified signal(s) — we only score what's verifiable, nothing is invented.",
  "scorer.cover.refresh": "Refresh",
  "scorer.cover.refreshing": "Refreshing…",

  "scorer.ch1.title": "Your audience",
  "scorer.ch1.detected": "detected",
  "scorer.ch2.title": "Your reputation",
  "scorer.ch2.googleCard": "Google listing",
  "scorer.ch2.reviewsUnit": "reviews",
  "scorer.ch2.pressFallback": "press",
  "scorer.ch2.quoteOpen": "“",
  "scorer.ch2.quoteClose": "”",
  "scorer.ch3.title": "Your foundations",
  "scorer.ch3.lede":
    "What keeps your online presence standing: the website, the domain, the email, the speed. It's invisible to your customers — until the day it's missing.",
  "scorer.ch4.title": "Still to measure",
  "scorer.ch4.addSiteTitle": "Add your website for a more complete score",
  "scorer.ch4.addSiteHint":
    "It unlocks 4 signals at once (domain, email, performance…).",
  "scorer.ch4.sitePlaceholder": "https://your-site.com",
  "scorer.ch4.rescore": "Re-score",
  "scorer.ch4.note":
    "These signals didn't lower your score — they're simply pending.",

  "scorer.cta.title":
    "That's only your presence. But what is your brand actually worth?",
  "scorer.cta.body":
    "The real diagnostic (ADVE method, your place in your league) is on us. We keep your brand, your website and your social accounts — only your contact details are left.",
  "scorer.cta.diagnostic": "Get my full diagnostic — free",
  "scorer.cta.leaderboard": "See the brand leaderboard",
};

export const scorerZh: Record<keyof typeof scorerFr, string> = {
  "scorer.nav.brand": "La Fusée",
  "scorer.nav.homeAria": "La Fusée — 首页",
  "scorer.nav.leaderboard": "排行榜",
  "scorer.nav.os": "操作系统",
  "scorer.nav.login": "登录",

  "scorer.hero.kicker": "La Fusée · 免费评分 · 无需邮箱",
  "scorer.hero.title": "一分钟为您的品牌评分",
  "scorer.hero.lede.before": "输入您的品牌、网站和社交账号——我们将在",
  "scorer.hero.lede.strong": "一分钟",
  "scorer.hero.lede.after":
    "内扫描您的数字足迹，无需注册。之后若想更进一步，您的完整诊断（ADVE 方法）已在等您。",

  "scorer.form.title": "您的品牌",
  "scorer.form.description": "此步骤不会保存任何信息。",
  "scorer.form.brandPlaceholder": "品牌名称 *",
  "scorer.form.websitePlaceholder": "网站（https://…）——推荐填写",
  "scorer.form.websiteHint": "填写网站可解锁另外 4 项信号（域名、邮件、性能……）。",
  "scorer.form.socialPlaceholder":
    "社交账号（每行一个链接：Instagram、Facebook、TikTok……）",
  "scorer.form.submit": "为我的品牌评分——免费",
  "scorer.form.submitting": "分析中……",

  "scorer.scan.title": "扫描进行中——约需一分钟",
  "scorer.scan.step1": "正在读取您的网站（https、标签、站点地图）……",
  "scorer.scan.step2": "正在发现您的社交账号……",
  "scorer.scan.step3": "正在统计受众（Instagram、Facebook、TikTok）——耗时最长的一步……",
  "scorer.scan.step4": "媒体报道、Google 评价、域名、企业邮箱……",
  "scorer.scan.step5": "正在汇总所有发现……",
  "scorer.scan.honesty": "我们并行查询所有来源，只保留可验证的内容——绝不虚构。",

  "scorer.verdict.strong": "您的线上影响力强劲——是打造狂热品牌的良好基础。",
  "scorer.verdict.solid": "您的线上影响力扎实，但仍有可挖掘的增长杠杆。",
  "scorer.verdict.building": "您的线上影响力仍在搭建中——多项关键信号尚缺。",
  "scorer.verdict.fragile": "您的线上影响力还很脆弱——而这正是我们的用武之地。",

  "scorer.dim.site": "网站",
  "scorer.dim.social": "社交媒体",
  "scorer.dim.reviews": "客户评价",
  "scorer.dim.press": "媒体与提及",
  "scorer.dim.email": "邮件设施",
  "scorer.dim.domain": "域名年限",
  "scorer.dim.perf": "网站性能",

  "scorer.hint.site": "请添加您的网站",
  "scorer.hint.email": "需要先提供网站",
  "scorer.hint.domain": "需要先提供网站",
  "scorer.hint.perf": "需要先提供网站",
  "scorer.hint.reviews": "您的 Google 商家页（评价）",
  "scorer.hint.press": "暂未发现媒体报道",
  "scorer.hint.social": "请添加您的社交账号",
  "scorer.hint.pending": "待测量",
  "scorer.hint.viaSite": "↑ 通过您的网站解锁",

  "scorer.audienceReason.deferred": "平台尚未配置受众统计",
  "scorer.audienceReason.pending": "后台统计中——请一分钟后回来点击「刷新」",
  "scorer.audienceReason.degraded": "受众统计失败——请点击「刷新」",
  "scorer.audienceReason.none": "受众未统计",

  "scorer.unit.network": "个平台",
  "scorer.unit.networks": "个平台",
  "scorer.unit.year": "年",
  "scorer.unit.years": "年",

  "scorer.lead.audience":
    "{brand} 已在 {count} {networks}上与 {followers} 人对话——这是品牌的第一笔资产。",
  "scorer.lead.presence": "{brand} 已入驻 {count} {networks}——受众规模尚待统计。",
  "scorer.lead.press.one": "媒体有报道：1 条近期提及。",
  "scorer.lead.press.many": "媒体有报道：{count} 条近期提及。",
  "scorer.lead.reviews": "客户为您打出 {rating}/5{reviewsPart}。",
  "scorer.lead.reviewsPart": "（基于 {count} 条评价）",
  "scorer.lead.domain": "根基也已扎稳：您的域名已有 {age} 年历史。",
  "scorer.lead.site": "您的网站在线响应。",

  "scorer.audience.measured":
    "逐个账号统计，共 {total} 位粉丝。您的主阵地：{top}{topPart}。",
  "scorer.audience.topPart": "（{count} 位粉丝）",
  "scorer.audience.detected.one": "检测到 1 个账号——{reason}。",
  "scorer.audience.detected.many": "检测到 {count} 个账号——{reason}。",
  "scorer.audience.none": "暂未检测到社交账号——请添加链接，让我们统计您的受众。",

  "scorer.reputation.both":
    "媒体在报道您，客户也在发声：{pressPart}，Google 商家页评分 {rating}/5。",
  "scorer.reputation.pressCount.one": "1 条近期媒体报道",
  "scorer.reputation.pressCount.many": "{count} 条近期媒体报道",
  "scorer.reputation.pressOnly":
    "媒体在报道您：{pressPart}。这是可验证的信任资产——下方每条链接都可核实。",
  "scorer.reputation.pressOnlyCount.one": "1 条近期报道",
  "scorer.reputation.pressOnlyCount.many": "{count} 条近期报道",
  "scorer.reputation.reviewsOnly": "客户已给出评价：{rating}/5{reviewsPart}。",
  "scorer.reputation.reviewsPart": "（{count} 条 Google 评价）",
  "scorer.reputation.none":
    "暂无媒体报道或 Google 评价的可测记录——一片待开拓的空间。",

  "scorer.foundation.siteUp": "您的网站正常响应{detailsPart}。",
  "scorer.foundation.siteDown": "已提供网站地址，但扫描期间无法访问。",
  "scorer.foundation.domain": "域名注册于 {age} {years}前{registrarPart}——{ageVerdict}。",
  "scorer.foundation.domainRegistrar": "，注册商为 {registrar}",
  "scorer.foundation.domainInstalled": "根基稳固，一目了然",
  "scorer.foundation.domainYoung": "在网络上仍属年轻的品牌",
  "scorer.foundation.emailNone": "未在您的域名上检测到企业级邮件设施。",
  "scorer.foundation.email": "您的邮件经由 {provider} 发送{authPart}。",
  "scorer.foundation.emailDedicated": "专用服务器",
  "scorer.foundation.emailAuth": "，已通过认证（{auth}）",
  "scorer.foundation.emailNoAuth": "——缺少 SPF/DMARC 认证，可能被判入垃圾邮件",
  "scorer.foundation.perf": "移动端 {score}/100{lcpPart}。",
  "scorer.foundation.perfLcp": "，首屏渲染 {seconds} 秒",

  "scorer.cover.kicker": "数字足迹报告",
  "scorer.cover.today": "今天",
  "scorer.cover.stale": "数据待刷新",
  "scorer.cover.cached": "来自缓存",
  "scorer.cover.yourBrand": "您的品牌",
  "scorer.cover.noSignal": "可测信号还不够——请添加您的网站和社交账号。",
  "scorer.cover.stat.followers": "已统计粉丝",
  "scorer.cover.stat.press": "媒体提及",
  "scorer.cover.stat.coverage": "信号覆盖率",
  "scorer.cover.basis.before": "基于",
  "scorer.cover.basis.after": "项已验证信号评分——只对可验证的内容打分，绝不虚构。",
  "scorer.cover.refresh": "刷新",
  "scorer.cover.refreshing": "刷新中……",

  "scorer.ch1.title": "您的受众",
  "scorer.ch1.detected": "已检测到",
  "scorer.ch2.title": "您的声誉",
  "scorer.ch2.googleCard": "Google 商家页",
  "scorer.ch2.reviewsUnit": "条评价",
  "scorer.ch2.pressFallback": "媒体",
  "scorer.ch2.quoteOpen": "《",
  "scorer.ch2.quoteClose": "》",
  "scorer.ch3.title": "您的根基",
  "scorer.ch3.lede":
    "支撑您线上形象的一切：网站、域名、邮件、速度。客户平时看不见它——直到缺失的那一天。",
  "scorer.ch4.title": "尚待测量",
  "scorer.ch4.addSiteTitle": "添加您的网站，获得更完整的评分",
  "scorer.ch4.addSiteHint": "一次解锁 4 项信号（域名、邮件、性能……）。",
  "scorer.ch4.sitePlaceholder": "https://your-site.com",
  "scorer.ch4.rescore": "重新评分",
  "scorer.ch4.note": "这些信号并未拉低您的评分——它们只是尚未测量。",

  "scorer.cta.title": "这只是您的线上足迹。您的品牌本身价值几何？",
  "scorer.cta.body":
    "真正的诊断（ADVE 方法，您在同级联赛中的位置）免费奉上。品牌、网站和社交账号我们已备好——只差您的联系方式。",
  "scorer.cta.diagnostic": "获取我的完整诊断——免费",
  "scorer.cta.leaderboard": "查看品牌排行榜",
};
