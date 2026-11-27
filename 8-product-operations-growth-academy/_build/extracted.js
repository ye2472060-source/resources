
(function(){
"use strict";
/* ================= 工具函数 ================= */
var $ = function(s){return document.querySelector(s);};
var $$ = function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function fmt(n,d){if(n===null||n===undefined||!isFinite(n))return "—";return Number(n).toFixed(d===undefined?1:d);}

/* ================= 数据：术语表 ================= */
var GLOSSARY = [
{zh:"产品运营",en:"Product Operations",cat:"growth",def:"对「产品价值被用户稳定获得」负责的职能：通过运营方案、活动、内容与流程优化，提升产品与用户之间的连接效率。",m:"m0"},
{zh:"用户运营",en:"User Operations",cat:"growth",def:"对特定用户群体的状态负责：通过分层体系、社群、会员体系维护用户关系。",m:"m0"},
{zh:"增长运营",en:"Growth Operations",cat:"growth",def:"对增长实验与漏斗转化负责：用假设驱动的实验系统性放大增长。",m:"m0"},
{zh:"产品生命周期",en:"Product Life Cycle",cat:"position",def:"产品经历的引入期（验证）、成长期（放大）、成熟期（深耕）、衰退期（转型）四阶段；阶段决定主要矛盾与方法选择。",m:"m0"},
{zh:"战略/策略/战术",en:"Strategy / Tactics",cat:"org",def:"战略回答「做什么、不做什么、为什么赢」；策略回答「改变哪段杠杆」；战术是具体动作。三者不可互相替代。",m:"m0"},
{zh:"用户细分",en:"Segmentation",cat:"research",def:"按行为、需求或场景把用户分成需求相似的群组；细分的目的是让不同用户获得不同的产品与服务。",m:"m1"},
{zh:"用户画像",en:"Persona",cat:"research",def:"基于真实数据构建的典型用户描述（含动机、场景、行为），用于对齐团队对用户的理解；必须源于研究而非头脑风暴。",m:"m1"},
{zh:"待完成任务",en:"Jobs to Be Done (JTBD)",cat:"research",def:"用户「雇用」产品来完成的特定处境下的任务；由 Christensen 系统化，强调研究真实切换决策而非人口属性。",m:"m1"},
{zh:"切换访谈",en:"Switch Interview",cat:"research",def:"JTBD 的核心方法：还原用户从旧方案切换到新方案的完整时间线，识别推动、吸引、焦虑、习惯四类力量。",m:"m1"},
{zh:"用户旅程地图",en:"User Journey Map",cat:"research",def:"按用户目标（而非产品功能）分阶段描述行为、想法、痛点与机会点的工具；每个痛点应挂可验证的机会点。",m:"m1"},
{zh:"服务蓝图",en:"Service Blueprint",cat:"research",def:"在用户旅程基础上叠加前台触点与后台支撑流程的地图，用于优化跨部门服务（B2B/O2O 常用）。",m:"m1"},
{zh:"选择偏差",en:"Selection Bias",cat:"research",def:"样本获取方式系统性排除某类人群导致的偏差，如只研究活跃用户。",m:"m1"},
{zh:"幸存者偏差",en:"Survivorship Bias",cat:"research",def:"只分析「留下来」的对象而忽略已流失者，导致高估健康度。",m:"m1"},
{zh:"三角验证",en:"Triangulation",cat:"research",def:"用户说（定性）、用户做（行为数据）、市场付钱（商业数据）三类证据互相印证的判断纪律。",m:"m1"},
{zh:"STP",en:"Segmentation, Targeting, Positioning",cat:"position",def:"细分→目标市场选择→定位的三步法；定位发生在用户心智中，相对于替代方案而存在。",m:"m2"},
{zh:"定位语句",en:"Positioning Statement",cat:"position",def:"「对于…他们…产品是一个…它…不同于…」结构的定位陈述（源于 Moore《跨越鸿沟》）。",m:"m2"},
{zh:"价值主张",en:"Value Proposition",cat:"position",def:"产品侧与用户侧（任务、痛点、期望收益）的匹配；必须可转述、可区分、可行动。",m:"m2"},
{zh:"替代方案",en:"Alternatives",cat:"position",def:"用户完成同一任务的替代选择，包括直接竞品、间接方案、「土办法」与非消费；最大竞争常来自土办法。",m:"m2"},
{zh:"竞争优势",en:"Competitive Advantage",cat:"position",def:"难以复制优势的来源：网络效应、转换成本、规模经济、品牌信任、独占资源、组织能力。",m:"m2"},
{zh:"最小可行产品",en:"MVP (Minimum Viable Product)",cat:"position",def:"用最小可交付产品验证核心价值假设；经 Eric Ries《精益创业》普及，实践上应先实验后产品。",m:"m2"},
{zh:"产品与市场匹配",en:"Product-Market Fit (PMF)",cat:"position",def:"产品在一个好的市场中满足真实强烈需求的状态；无统一定义，常用信号：留存走平、Sean Ellis 测试、自然增长占比。",m:"m2"},
{zh:"Sean Ellis 测试",en:"Sean Ellis PMF Survey",cat:"position",def:"问「无法再使用该产品你会多失望」，40%+ 答「非常失望」为经验阈值；低分是可靠警告，高分不是保证。",m:"m2"},
{zh:"RICE",en:"Reach Impact Confidence Effort",cat:"org",def:"优先级评分：(触达×影响×置信)÷工作量；由 Intercom 的 Sean McBride 提出，用于把偏好争论变成结构化对话。",m:"m2"},
{zh:"北极星指标",en:"North Star Metric",cat:"growth",def:"最能捕捉产品向用户交付核心价值的单一指标；由 Sean Ellis 提出概念，Amplitude（John Cutler）发展为框架。",m:"m3"},
{zh:"指标树",en:"Metric Tree",cat:"data",def:"把北极星指标按乘加结构层层拆解到输入指标与日常动作的层级结构。",m:"m3"},
{zh:"AARRR",en:"Acquisition Activation Retention Referral Revenue",cat:"growth",def:"海盗指标：Dave McClure 2007 年提出的五环节增长诊断框架；是诊断工具而非执行清单。",m:"m3"},
{zh:"RARRA",en:"Retention-first variant",cat:"growth",def:"AARRR 的变体，把留存置于获客之前；反映不同产品阶段主要矛盾的差异。",m:"m3"},
{zh:"用户漏斗",en:"Funnel",cat:"growth",def:"把用户完成目标的过程拆成有序步骤并计算相邻转化；适用于线性流程，不适用于路径不唯一的场景。",m:"m3"},
{zh:"转化率",en:"Conversion Rate",cat:"growth",def:"完成目标步骤的用户数 ÷ 进入流程的用户数；分子分母口径必须固定。",m:"m3"},
{zh:"增长飞轮",en:"Growth Flywheel",cat:"growth",def:"自我强化的增长循环；成立需要每环真实因果、初始推动力、放大器与单点启动杠杆。",m:"m3"},
{zh:"增长模型",en:"Growth Model",cat:"growth",def:"对增长结构的数学刻画：线性（投入产出）、复利（产出再投入）、网络效应（用户互相增值）。",m:"m3"},
{zh:"网络效应",en:"Network Effects",cat:"growth",def:"每个新用户提升所有用户价值的效果；冷启动难，是多归属与供给瓶颈的对立面。",m:"m3"},
{zh:"病毒系数",en:"K-factor",cat:"growth",def:"K = 每用户邀请数 × 邀请转化率；转化应用激活而非注册计算。",m:"m3"},
{zh:"产品驱动增长",en:"Product-Led Growth (PLG)",cat:"growth",def:"以产品本身作为获客、转化与扩张主要驱动力的模式；由 OpenView（Blake Bartlett）2016 年提出并推广。",m:"m3"},
{zh:"免费增值",en:"Freemium",cat:"money",def:"免费基础版 + 付费高级版的模式；由 Fred Wilson 2006 年阐述，freemium 一词由其读者 Jarid Lukin 提出。",m:"m6"},
{zh:"付费墙",en:"Paywall",cat:"money",def:"免费用户遇到的功能/用量限制；应卡在价值感知之后，限制维度优先用量而非核心功能阉割。",m:"m6"},
{zh:"假设驱动",en:"Hypothesis-driven",cat:"experiment",def:"把增长想法写成可证伪假设（改动—指标—机制—判定标准）再实验的方法。",m:"m4"},
{zh:"A/B 测试",en:"A/B Test",cat:"experiment",def:"随机对照试验在产品场景的应用：随机分流、单一变量、统计检验归因。",m:"m4"},
{zh:"显著性水平",en:"Significance Level (α)",cat:"experiment",def:"原假设为真时拒绝它的概率上限；行业常用 0.05（双侧）。",m:"m4"},
{zh:"统计功效",en:"Statistical Power (1−β)",cat:"experiment",def:"真实效应存在时检测到它的概率；行业常用 80%。",m:"m4"},
{zh:"最小可检测效应",en:"MDE",cat:"experiment",def:"实验有能力可靠检测到的最小效应；由业务「多大的提升值得做」决定，是样本量的最大杠杆。",m:"m4"},
{zh:"样本量",en:"Sample Size",cat:"experiment",def:"达到目标 α 与功效所需的最小样本；须在实验前计算（双样本比例近似公式见工具箱）。",m:"m4"},
{zh:"过早停止",en:"Peeking Problem",cat:"experiment",def:"持续监控并一显著就停会使假阳性率远超名义值（Evan Miller 模拟约 26%）；对策是事前固定样本量或采用序贯设计。",m:"m4"},
{zh:"护栏指标",en:"Guardrail Metric",cat:"experiment",def:"防止赢了主指标输了整体的指标；跌破阈值即否决实验。",m:"m4"},
{zh:"古德哈特定律",en:"Goodhart's Law",cat:"experiment",def:"「一项测量一旦成为目标，便不再是好的测量」；对策是配对护栏与指标归因到用户价值。",m:"m4"},
{zh:"ICE",en:"Impact Confidence Ease",cat:"experiment",def:"实验优先级评分：影响×信心×易度，适合小团队快速排序。",m:"m4"},
{zh:"用户激活",en:"Activation",cat:"retention",def:"新用户完成首次关键行为、体验到核心价值的状态；注册不等于激活。",m:"m5"},
{zh:"Aha 时刻",en:"Aha Moment",cat:"retention",def:"用户第一次清晰感知产品核心价值的瞬间；识别方法：留存对比、活跃用户访谈、流失回访。",m:"m5"},
{zh:"留存率",en:"Retention Rate",cat:"retention",def:"第 N 日仍活跃用户 ÷ 第 0 日用户；口径（经典/范围/滚动）与活跃定义必须固定。",m:"m5"},
{zh:"同期群分析",en:"Cohort Analysis",cat:"retention",def:"按共同起始时间/特征分组比较留存与行为，用于观察改善、识别异常队列、消除增长掩盖。",m:"m5"},
{zh:"留存曲线",en:"Retention Curve",cat:"retention",def:"同期群留存随时间的曲线；走平=产品价值被持续交付，趋零=漏水，回升=检查口径。",m:"m5"},
{zh:"流失率",en:"Churn Rate",cat:"retention",def:"单位时间流失用户 ÷ 期初用户；须区分显式退订与真实流失。",m:"m5"},
{zh:"复购率",en:"Repurchase Rate",cat:"retention",def:"周期内购买 ≥2 次用户 ÷ 有购买用户；高频不等于高价值，须结合客单价与毛利。",m:"m5"},
{zh:"DAU/MAU",en:"Stickiness",cat:"retention",def:"日活 ÷ 月活，反映使用频次密度；是频次代理而非留存率。",m:"m5"},
{zh:"RFM",en:"Recency Frequency Monetary",cat:"retention",def:"经典客户价值分层：最近一次活跃/频率/金额三维打分，映射到不同运营动作。",m:"m5"},
{zh:"流失预警",en:"Churn Prediction",cat:"retention",def:"基于行为衰减、关键场景缺席、负面信号的提前识别；先诊断原因再触达。",m:"m5"},
{zh:"Hook 模型",en:"Hook Model",cat:"retention",def:"Nir Eyal 2014 年提出的习惯循环：触发→行动→多变酬赏→投入；描述性框架而非因果定律。",m:"m5"},
{zh:"Fogg 行为模型",en:"B=MAP",cat:"retention",def:"行为 = 动机 × 能力 × 提示；提升行为常靠降低难度而非激发动机。",m:"m5"},
{zh:"净收入留存",en:"Net Dollar Retention (NDR)",cat:"money",def:"(期初 MRR−流失−收缩+扩张)÷期初 MRR；可 >100%，须拆解看结构。",m:"m5"},
{zh:"毛收入留存",en:"Gross Retention (GRR)",cat:"money",def:"(期初 MRR−流失−收缩)÷期初 MRR；上限 100%，衡量存量收入防守能力。",m:"m6"},
{zh:"客户成功",en:"Customer Success",cat:"org",def:"让客户通过产品获得可量化业务结果的职能；续约与扩张是自然结果。",m:"m5"},
{zh:"商业模式",en:"Business Model",cat:"money",def:"企业创造、传递与获取价值的完整系统；收入模式是其组成部分。",m:"m6"},
{zh:"ARPU",en:"Average Revenue Per User",cat:"money",def:"总收入 ÷ 平均用户数；分母口径（活跃/注册）必须注明。",m:"m6"},
{zh:"ARPPU",en:"ARPU of Paying Users",cat:"money",def:"总收入 ÷ 付费用户数；ARPU = ARPPU × 付费率。",m:"m6"},
{zh:"MRR / ARR",en:"Monthly/Annual Recurring Revenue",cat:"money",def:"活跃订阅的月度/年度经常性收入；不含一次性收入，年付分摊规则须固定。",m:"m6"},
{zh:"用户生命周期价值",en:"LTV",cat:"money",def:"用户生命周期总贡献利润；简化式 = ARPU×毛利率÷月流失率（未折现），应按同期群分别计算。",m:"m6"},
{zh:"获客成本",en:"CAC",cat:"money",def:"销售与营销总成本 ÷ 新付费客户数；应含人力，且分渠道计算。",m:"m6"},
{zh:"LTV/CAC",en:"LTV to CAC Ratio",cat:"money",def:"单位经济核心比值；≥3 为广泛流传的经验参考而非定律。",m:"m6"},
{zh:"回本周期",en:"Payback Period",cat:"money",def:"CAC ÷（ARPU×毛利率），单位月；决定增长的资金消耗速度。",m:"m6"},
{zh:"Van Westendorp",en:"Price Sensitivity Meter (PSM)",cat:"money",def:"1976 年提出的四问价格敏感度测试，输出可接受区间（PMC–PME）与 OPP/IDP；测态度不测成交。",m:"m6"},
{zh:"事件",en:"Event",cat:"data",def:"埋点中一次可记录的用户行为（带时间戳与属性）；命名须规范且一个事件一个含义。",m:"m7"},
{zh:"会话",en:"Session",cat:"data",def:"一段连续使用（通常 30 分钟无活动为界，各工具口径不同）；不可替代用户做留存统计。",m:"m7"},
{zh:"漏斗分析",en:"Funnel Analysis",cat:"data",def:"有序流程的逐步转化分析；假设路径唯一，实际可跳过时需路径分析补充。",m:"m7"},
{zh:"路径分析",en:"Path Analysis",cat:"data",def:"观察用户实际行为流向，发现非线性路径与意外行为。",m:"m7"},
{zh:"辛普森悖论",en:"Simpson's Paradox",cat:"data",def:"总体相关/差异在每个分群内可能反向；分群是回答「是否真相关」的前提。",m:"m7"},
{zh:"HEART",en:"Happiness Engagement Adoption Retention Task success",cat:"data",def:"Google（Rodden 等，CHI 2010）提出的体验指标五分类，配合 GSM 使用。",m:"m7"},
{zh:"GSM",en:"Goal Signal Metric",cat:"data",def:"目标→信号→指标的翻译链条：把抽象目标变成可度量的数字。",m:"m7"},
{zh:"仪表盘",en:"Dashboard",cat:"data",def:"按决策而非数据表组织的指标视图；必须带对比基准与变更标注。",m:"m7"},
{zh:"渠道归因",en:"Attribution",cat:"data",def:"把转化功劳分配给触点的方法（最后点击/首次点击/线性/数据驱动）；均有结构性局限，关键决策用增量实验。",m:"m8"},
{zh:"增量实验",en:"Incrementality Test",cat:"data",def:"通过停投/地域分组测量渠道真实增量（没有它会怎样），而非归因功劳。",m:"m8"},
{zh:"MQL / SQL",en:"Marketing/Sales Qualified Lead",cat:"org",def:"营销合格线索/销售合格线索；标准须双方共建并带线索评分。",m:"m8"},
{zh:"OKR",en:"Objectives and Key Results",cat:"org",def:"目标与关键结果：定性的 O + 可度量的 KR；源于 Andy Grove（Intel），经 John Doerr 普及。",m:"m9"},
{zh:"暗黑模式",en:"Dark Patterns",cat:"retention",def:"利用界面设计误导用户做出非本意决策的模式（隐藏退订、默认勾选等）；短期指标、长期信任双输。",m:"m5"},
{zh:"单位经济",en:"Unit Economics",cat:"money",def:"每用户/每单的利润结构：贡献利润、LTV/CAC、回本周期；增长决策的财务底线。",m:"m6"}
];

/* ================= 数据：资料库 ================= */
var SOURCES_CORE = [
{t:"Startup Metrics for Pirates（AARRR 原始演讲）",o:"Dave McClure",d:"2007",ty:"official",u:"https://agilemechanics.com/hubs/metrics/aarrr.html",s:"AARRR 五环节框架的提出与背景",c:"第一层：框架提出者演讲；链接为二手整理页，原始幻灯片已不可直达",m:"m3"},
{t:"The Sean Ellis Test（PMF 测试，含 Ellis 2009/2010 原始博客引用与 Superhuman 案例）",o:"Rework Resources 整理",d:"检索于 2026-10-15",ty:"pro",u:"https://resources.rework.com/libraries/startup-fundamentals/sean-ellis-test",s:"Sean Ellis 测试的问题设计、40% 经验阈值、样本量与局限",c:"第二层：引用第一层原始文章（Startup Marketing 博客）与 First Round Review",m:"m2"},
{t:"The Sean Ellis Test: A 40% Survey for Product-Market Fit",o:"Gavel",d:"检索于 2026-10-15",ty:"pro",u:"https://usegavel.com/sean-ellis/pmf-test",s:"PMF 测试执行细节、常见误读、Lenny's Podcast 访谈记录",c:"第二层专业资料",m:"m2"},
{t:"North Star Framework（含 Amplitude North Star Playbook 结构与引用）",o:"Hamster（引 Amplitude）",d:"检索于 2026-10-15",ty:"pro",u:"https://tryhamster.com/methods/north-star-framework",s:"北极星框架三层结构、2019 Playbook、三条指标标准",c:"第二层，引用 Amplitude 官方 Playbook",m:"m3"},
{t:"Northstar Metric（术语条目：Sean Ellis 定义与框架沿革）",o:"Learning Loop",d:"检索于 2026-10-15",ty:"pro",u:"https://learningloop.io/glossary/northstar-metric",s:"North Star 概念起源（Sean Ellis 约 2010）与结构",c:"第二层术语库",m:"m3"},
{t:"North star metric: find the one number your whole team can build toward",o:"Product Management Resources",d:"检索于 2026-10-15",ty:"pro",u:"https://productmanagementresources.com/navigating-success-with-the-north-star-framework/",s:"Airbnb nights booked、Spotify 收听时长、Duolingo DAU 等公开案例与 game types",c:"第二层；案例数据注明为公开报道",m:"m3"},
{t:"The Mattress Interview: A JTBD Switch Interview（完整实录）",o:"Bob Moesta & Chris Spiek（Jobs to Be Done 官方站）",d:"检索于 2026-10-15",ty:"official",u:"https://jobstobedone.org/radio/the-mattress-interview-part-one",s:"JTBD 切换访谈方法、时间线还原、四力模型",c:"第一层：JTBD 实践方法原始研究者的公开材料",m:"m1"},
{t:"Jobs To Be Done（术语与源流：Christensen 2003/2016、Ulwick ODI、Moesta）",o:"Startups.com Lexicon",d:"检索于 2026-10-15",ty:"pro",u:"https://www.startups.com/lexicon/jobs-to-be-done",s:"JTBD 理论源流、milkshake 案例、Job Story 格式与常见误用",c:"第二层术语库",m:"m1"},
{t:"60-Minute JTBD Switch Interview (Script & Canvas)",o:"Innovation-Creativity",d:"检索于 2026-10-15",ty:"pro",u:"https://innovation-creativity.com/60-minute-jtbd-switch-interview-script-canvas",s:"JTBD 访谈脚本、四力模型、原始文献清单",c:"第二层，附第一层文献索引",m:"m1"},
{t:"Marketing Myopia",o:"Theodore Levitt，Harvard Business Review",d:"1960",ty:"paper",u:"https://hbr.org/1960/07/marketing-myopia",s:"以用户任务（而非产品形态）定义业务的思想源头",c:"第一层：经典论文",m:"m0"},
{t:"Competing Against Luck（与运气竞争）",o:"Clayton M. Christensen 等，HarperBusiness",d:"2016",ty:"book",u:"",s:"JTBD 理论的系统阐述",c:"第一层：框架原始著作（未在线核验全文）",m:"m1"},
{t:"The HEART framework for UX metrics（含 CHI 2010 论文索引）",o:"Kerry Rodden（原始作者）",d:"检索于 2026-10-15",ty:"official",u:"https://kerryrodden.com/heart/",s:"HEART 五分类与 GSM 流程的原始出处",c:"第一层：论文作者官方页面",m:"m7"},
{t:"Should You Love the HEART Framework?",o:"MeasuringU（Jeff Sauro）",d:"检索于 2026-10-15",ty:"pro",u:"https://measuringu.com/heart-framework/",s:"HEART 与 GSM 的矩阵用法与批判性评述",c:"第二层专业测评",m:"m7"},
{t:"My Favorite Business Model（Freemium 的原始阐述）",o:"Fred Wilson，AVC 博客",d:"2006-03-23",ty:"official",u:"https://avc.com/2006/03/my_favorite_bus/",s:"Freemium 模式定义与适用条件（原 avc.blogs.com 链接已迁移）",c:"第一层：原作者博客",m:"m6"},
{t:"Freemium 适用条件（数字化、低边际成本、传播潜力）",o:"StatusCake / ProductStride 整理",d:"检索于 2026-10-15",ty:"pro",u:"https://www.productstride.com/?p=1645",s:"Freemium 适用条件与企业软件场景",c:"第二层行业整理",m:"m6"},
{t:"How Not To Run an A/B Test",o:"Evan Miller",d:"2010",ty:"official",u:"https://www.evanmiller.org/how-not-to-run-an-ab-test.html",s:"重复检验问题（26% 假阳性）、样本量经验公式 n=16σ²/δ²、查看次数修正表",c:"第一层：原作者",m:"m4"},
{t:"Stop an A/B Test Early in Four Planned Looks Instead of Peeking Every Morning",o:"Switas（引 Georgi Georgiev 模拟与 Spotify 工程实践）",d:"检索于 2026-10-15",ty:"pro",u:"https://www.switas.com/articles/stop-ab-test-early-four-planned-looks",s:"成组序贯/always-valid 方法的成本与适用；固定周期与两周规则",c:"第二层，引用第三方模拟研究",m:"m4"},
{t:"Your A/B Test Hit 95% Significance. That's the Worst Time to Stop",o:"Notice Me Senpai",d:"检索于 2026-10-15",ty:"pro",u:"https://noticemesenpai.com/learn/how-long-to-run-ab-test-sample-size-duration",s:"样本量四要素、两周完整周期、A/A 测试 77% 显著现象",c:"第二层（含社区数据转述，谨慎引用）",m:"m4"},
{t:"RICE: Simple Prioritization（RICE 评分模型）",o:"Sean McBride / Intercom（经多源整理）",d:"2016（一说 2017）",ty:"pro",u:"https://www.getproductpeople.com/blog/product-prioritization-frameworks-guide",s:"RICE 公式、Impact 5 档、Confidence 三档、局限",c:"第二层；原始出处为 Intercom 产品团队博客",m:"m2"},
{t:"RICE Scoring",o:"Stellae / Framework List 整理",d:"检索于 2026-10-15",ty:"pro",u:"https://www.stellae.design/en/ux/rice-scoring",s:"RICE 打分纪律与常见误用（虚假精确、单人估算）",c:"第二层",m:"m2"},
{t:"Product-Led Growth: What It Is and Why It's Here to Stay",o:"OpenView Venture Partners",d:"检索于 2026-10-15",ty:"official",u:"https://openviewpartners.com/product-led-growth/",s:"PLG 定义（Blake Bartlett 2016  coined）、适用条件、SaaS 演进",c:"第一层：术语提出机构",m:"m3"},
{t:"PLG and Sales – A Powerful, One-Two Punch",o:"OpenView（Brianne Kimmel）",d:"2019 更新",ty:"official",u:"https://openviewpartners.com/blog/plg-and-sales-a-powerful-one-two-punch",s:"PLG 与销售混合、自助用户转化率约 15–20% 的行业调研数据",c:"第一层；调研数据为行业参考",m:"m3"},
{t:"SaaS Marketing: The Complete Guide to PLG, SLG, CAC, and LTV",o:"Growth MK 整理",d:"检索于 2026-10-15",ty:"pro",u:"https://cms.growthmk.com/insight/saas-marketing-guide-plg-slg",s:"PLG/SLG 选择矩阵、试用与 Freemium 对比",c:"第二层",m:"m3"},
{t:"The Hooked Model（及其学术批评）",o:"The Behavioral Scientist",d:"检索于 2026-10-15",ty:"pro",u:"https://www.thebehavioralscientist.com?p=3988/",s:"Hook 模型四步与对其科学基础的批评（争议呈现）",c:"第二层，含批判视角",m:"m5"},
{t:"Hooked Model (Trigger–Action–Variable Reward–Investment)",o:"Umbrex",d:"检索于 2026-10-15",ty:"pro",u:"https://umbrex.com/resources/frameworks/marketing-frameworks/hooked-model-trigger-action-variable-reward-investment/",s:"Hook 模型步骤、适用与不适用场景、伦理边界",c:"第二层",m:"m5"},
{t:"Price Sensitivity Meter（Van Westendorp PSM 量表条目与解读）",o:"Psychometric Scales（引 Van Westendorp 1976 ESOMAR 原文）",d:"1976 原文",ty:"pro",u:"https://psychometricscales.com/scale/price-sensitivity-meter",s:"PSM 四问、PMC/PME/OPP/IDP 定义、样本要求",c:"第二层，附第一层原始引用",m:"m6"},
{t:"Van Westendorp's Price Sensitivity Meter - Wikipedia",o:"Wikipedia（镜像：chped.com）",d:"检索于 2026-10-15",ty:"pro",u:"https://www.chped.com/wiki/Peter_van_Westendorp",s:"PSM 曲线反转方法、四个交点定义、NMS 等扩展",c:"第二层（百科类，注意其自述引用不足）",m:"m6"},
{t:"Price Sensitivity Meter: How to Use It",o:"Quali-Fi",d:"检索于 2026-10-15",ty:"pro",u:"https://quali-fi.com/learn/price-sensitivity-meter",s:"PSM 执行步骤、样本 150–300、数据清洗与分群",c:"第二层实务指南",m:"m6"},
{t:"Google to sunset Optimize at the end of September 2023",o:"Direction Forward / Bounteous / Jaywing（多方印证）",d:"2023-01 起",ty:"official",u:"https://test.bounteous.com/insights/2023/01/24/way-forward-google-sunset-optimize-september-30-2023",s:"Google Optimize 2023-09-30 停止、Universal Analytics 2023-07-01 停止处理数据、GA4 迁移",c:"第一层事实（Google 公告）经多方二手印证",m:"m4"},
{t:"AARRR Pirate Metrics（框架沿革与顺序争议）",o:"Agile Mechanics / Agile Brand Guide 整理",d:"检索于 2026-10-15",ty:"pro",u:"https://agilemechanics.com/hubs/metrics/aarrr.html",s:"AARRR 五阶段定义、顺序争议与 RARRA 变体、常见失败模式",c:"第二层",m:"m3"},
{t:"The 20 Most Useful Product Management Frameworks",o:"Product Management Resources",d:"检索于 2026-10-15",ty:"pro",u:"https://productmanagementresources.com/product-management-frameworks-used-by-top-companies-a-comprehensive-guide/",s:"RICE 出处（Sean McBride/Intercom 2016）、OKR 源流（Grove→Doerr）、Kano 1984",c:"第二层",m:"m2"},
{t:"Jobs-To-Be-Done Framework For User Research",o:"WebSnips",d:"检索于 2026-10-15",ty:"pro",u:"https://www.websnips.in/blog/the-jobs-to-be-done-framework-for-user-research",s:"JTBD 与画像/ICP 的关系、四力应用、10+ 访谈纪律",c:"第二层",m:"m1"},
{t:"Fred Wilson on Free & the Freeconomics of Freemium",o:"The Moderate Voice（引 AVC 原文）",d:"2009（引 2006 原文）",ty:"pro",u:"https://themoderatevoice.com/fred-wilson-on-free-the-freeconomics-of-freemium/",s:"Freemium 与免费经济的边界、Wilson 的原始表述",c:"第二层转述",m:"m6"}
];

var SOURCES_TOOLS = [
{t:"Google Analytics 4 帮助中心",o:"Google",d:"持续更新（检索于 2026-10-15）",ty:"official",u:"https://support.google.com/analytics",s:"GA4 事件模型、指标定义、与 Universal Analytics 的差异",c:"第一层官方文档",m:"m7"},
{t:"Universal Analytics 迁移与 Optimize 停止公告（经行业媒体整理）",o:"Bounteous / Jaywing",d:"2023",ty:"official",u:"https://www.jaywing.com/views/opinion/an-analytics-transition-ga4-and-the-end-of-google-optimise",s:"GA3/GA4 迁移实务、数据留存设置、Optimize 停止影响",c:"第一层事实的二手实务整理",m:"m7"},
{t:"Optimizely 文档（统计引擎/序贯检验说明）",o:"Optimizely",d:"持续更新",ty:"official",u:"https://www.optimizely.com/",s:"商用实验平台的序贯统计方法（stats engine）原理",c:"第一层厂商文档（口径以其文档为准）",m:"m4"},
{t:"Amplitude / Mixpanel 等产品分析平台文档",o:"各厂商",d:"持续更新",ty:"official",u:"https://amplitude.com/",s:"留存/漏斗/同期群分析的产品化实现与口径说明",c:"第一层厂商文档",m:"m7"}
];

/* ================= 模块总览（首页） ================= */
var MODULES = [
{n:"0",t:"产品运营与增长的基础认知",d:"概念坐标、岗位协作、产品生命周期、价值三层、目标到行动的逻辑链、产品类型差异。",p:"m0",h:"6–8 小时",c:"var(--brand)"},
{n:"1",t:"用户研究与需求洞察",d:"细分与画像、JTBD、访谈与问卷、旅程地图、需求排序、研究误区与低成本研究设计。",p:"m1",h:"8–10 小时",c:"var(--teal)"},
{n:"2",t:"定位、价值主张与竞争策略",d:"STP、价值主张、替代方案、定位语句、功能优先级、MVP、PMF 与转型。",p:"m2",h:"8–10 小时",c:"var(--purple)"},
{n:"3",t:"增长模型与增长策略",d:"增长定义、AARRR、漏斗、北极星与指标树、飞轮、病毒系数、PLG、渠道匹配。",p:"m3",h:"8–10 小时",c:"var(--brand)"},
{n:"4",t:"增长实验与科学决策",d:"假设驱动、实验设计、A/B 测试、统计基础、过早停止、护栏指标、三个完整案例。",p:"m4",h:"8–10 小时",c:"var(--purple)"},
{n:"5",t:"激活、留存与生命周期运营",d:"激活定义、Aha 时刻、留存口径、同期群、习惯机制、分层、流失诊断、B2B 续约。",p:"m5",h:"8–10 小时",c:"var(--teal)"},
{n:"6",t:"商业化、定价与收入增长",d:"商业模式、Freemium、付费墙、定价与 PSM、LTV/CAC、续费扩张、伦理边界。",p:"m6",h:"8–10 小时",c:"var(--warn)"},
{n:"7",t:"数据分析与指标体系",d:"GSM/HEART、埋点、四分析方法、口径陷阱、波动拆解、仪表盘、完整教学案例。",p:"m7",h:"7–9 小时",c:"var(--purple)"},
{n:"8",t:"增长渠道与用户获取",d:"六类渠道、匹配框架、归因局限、渠道质量、单位经济、规模化前提、依赖风险。",p:"m8",h:"7–9 小时",c:"var(--teal)"},
{n:"9",t:"增长组织与执行",d:"组织模式、OKR/KPI、优先级、双周节奏、看板知识库、机制化、小团队打法。",p:"m9",h:"5–7 小时",c:"var(--brand)"},
{n:"10",t:"综合案例与实战项目",d:"三个跨模块项目：B2B 新产品 0→1、B2C 订阅诊断、平台商业化与单位经济。",p:"m10",h:"10–12 小时",c:"var(--purple)"}
];

/* ================= 渲染：模块总览 ================= */
function renderModules(){
  var box = $("#moduleOverview"); if(!box) return;
  var html = "";
  MODULES.forEach(function(m){
    html += '<div class="card card-link" onclick="location.hash=\'#/'+m.p+'\';return false">'
      + '<div class="chips" style="margin-bottom:6px"><span class="chip" style="color:'+m.c+';border-color:'+m.c+'">模块 '+m.n+'</span><span class="chip">'+m.h+'</span></div>'
      + '<h3>'+esc(m.t)+'</h3><p class="small">'+esc(m.d)+'</p><div class="go">进入模块 →</div></div>';
  });
  box.innerHTML = html;
}

/* ================= 渲染：术语表 ================= */
var CAT_NAMES = {research:"用户研究",position:"定位与产品",growth:"增长模型",experiment:"实验统计",retention:"留存激活",money:"商业化",data:"数据分析",org:"组织执行"};
function renderGlossary(){
  var list = $("#glossaryList"); if(!list) return;
  var q = ($("#glossarySearch").value||"").trim().toLowerCase();
  var cat = "all";
  $$("#glossaryFilter .filter-btn").forEach(function(b){ if(b.classList.contains("on")) cat = b.dataset.cat; });
  var html = "", count = 0;
  GLOSSARY.forEach(function(g){
    if(cat!=="all" && g.cat!==cat) return;
    var hay = (g.zh+" "+g.en+" "+g.def).toLowerCase();
    if(q && hay.indexOf(q)<0) return;
    count++;
    html += '<div class="g-item"><h4>'+esc(g.zh)+'<span>'+esc(g.en)+'</span></h4>'
      + '<p>'+esc(g.def)+'</p>'
      + '<a class="g-link" href="#/'+g.m+'">跳转：'+esc(CAT_NAMES[g.cat]||"")+' · 模块 '+g.m.replace("m","")+' →</a></div>';
  });
  list.innerHTML = html || '<div class="search-empty">没有匹配的术语，试试其他关键词。</div>';
  $("#glossaryCount").textContent = "共 " + count + " 条";
}

/* ================= 渲染：资料库 ================= */
function srcItem(s){
  var typeName = {official:"官方/原始",paper:"学术",book:"著作",pro:"专业资料",comm:"社区/经验"}[s.ty]||s.ty;
  var link = s.u ? ' <a href="'+esc(s.u)+'" target="_blank" rel="noopener">访问原始链接 ↗</a>' : '（著作，无在线链接）';
  return '<div class="src-item"><div class="s-head"><span class="s-title">'+esc(s.t)+'</span><span class="src-type t-'+s.ty+'">'+typeName+'</span></div>'
    + '<div class="s-meta">'+esc(s.o)+' ｜ 日期：'+esc(s.d)+' ｜ 关联模块：'+esc(s.m.replace("m","模块 "))+'</div>'
    + '<div class="s-desc">支持的知识点：'+esc(s.s)+'。'+link+'</div>'
    + '<div class="s-lim">可信度与限制：'+esc(s.c)+'</div></div>';
}
function renderSources(){
  var c = $("#srcCore"), t = $("#srcTools");
  if(c) c.innerHTML = SOURCES_CORE.map(srcItem).join("");
  if(t) t.innerHTML = SOURCES_TOOLS.map(srcItem).join("");
}

/* ================= 路由 ================= */
var PAGES = ["home","map","m0","m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","toolbox","cases","glossary","sources","assess"];
function currentPage(){
  var h = location.hash.replace(/^#\/?/,"") || "home";
  var parts = h.split("/");
  var page = parts[0] || "home";
  if(PAGES.indexOf(page)<0) page = "home";
  return {page:page, anchor:parts[1]||""};
}
function route(){
  var cur = currentPage();
  $$(".page").forEach(function(p){ p.classList.remove("active"); });
  var el = document.getElementById("page-"+cur.page);
  if(el) el.classList.add("active");
  $$("#mainNav .nav-link").forEach(function(a){
    a.classList.toggle("active", a.dataset.page===cur.page);
  });
  buildTOC(cur.page);
  window.scrollTo(0,0);
  if(cur.anchor){
    setTimeout(function(){
      var t = document.getElementById(cur.anchor);
      if(t) t.scrollIntoView({behavior:"smooth",block:"start"});
    },60);
  }
  closeDrawer();
}

/* ================= 侧边栏 ================= */
function closeDrawer(){
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
}
function bindSidebar(){
  $("#menuBtn").addEventListener("click", function(){
    if(window.innerWidth < 1024){
      $("#sidebar").classList.toggle("open");
      $("#overlay").classList.toggle("show");
    } else {
      $("#sidebar").classList.toggle("collapsed");
    }
  });
  $("#overlay").addEventListener("click", closeDrawer);
  $$("#mainNav .nav-link").forEach(function(a){
    a.addEventListener("click", function(){ closeDrawer(); });
  });
}

/* ================= 主题 ================= */
function bindTheme(){
  var saved = null;
  try{ saved = localStorage.getItem("pog-theme"); }catch(e){}
  if(saved) document.documentElement.setAttribute("data-theme", saved);
  $("#themeBtn").addEventListener("click", function(){
    var now = document.documentElement.getAttribute("data-theme")==="dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", now);
    try{ localStorage.setItem("pog-theme", now); }catch(e){}
    // 主题切换后重绘价格敏感度图（用完整计算函数，避免无参调用 drawVWP）
    try{ if($("#calc-vwp") && typeof calcVWP === "function") calcVWP(); }catch(e){}
  });
}

/* ================= 学习进度 ================= */
var PROG_KEY = "pog-progress-v1";
function getProgress(){
  try{ return JSON.parse(localStorage.getItem(PROG_KEY)||"{}"); }catch(e){ return {}; }
}
function saveProgress(p){
  try{ localStorage.setItem(PROG_KEY, JSON.stringify(p)); }catch(e){}
}
function updateProgressUI(){
  var boxes = $$("input[data-pid]");
  var done = 0;
  boxes.forEach(function(b){ if(b.checked) done++; });
  var total = boxes.length;
  var pct = total ? Math.round(done/total*100) : 0;
  $("#progressText").textContent = pct + "%";
  var ring = $("#progressRing");
  var C = 97.4;
  ring.setAttribute("stroke-dasharray", (C*pct/100).toFixed(1) + " " + C);
  $("#sideProgress").style.width = pct + "%";
  $("#sideProgressText").textContent = "已完成 " + done + " / " + total + " 个知识单元";
}
function bindProgress(){
  var p = getProgress();
  $$("input[data-pid]").forEach(function(b){
    var id = b.dataset.pid;
    if(p[id]){ b.checked = true; b.closest(".unit").classList.add("done"); b.closest(".done-check").classList.add("on"); }
    b.addEventListener("change", function(){
      var prog = getProgress();
      if(b.checked){ prog[id]=true; } else { delete prog[id]; }
      saveProgress(prog);
      b.closest(".unit").classList.toggle("done", b.checked);
      b.closest(".done-check").classList.toggle("on", b.checked);
      updateProgressUI();
    });
  });
  updateProgressUI();
  $("#resetProgress").addEventListener("click", function(){
    if(confirm("确定要清空全部学习进度吗？此操作不可恢复。")){
      try{ localStorage.removeItem(PROG_KEY); }catch(e){}
      $$("input[data-pid]").forEach(function(b){
        b.checked=false; b.closest(".unit").classList.remove("done"); b.closest(".done-check").classList.remove("on");
      });
      updateProgressUI();
    }
  });
}

/* ================= 右侧目录 ================= */
function buildTOC(page){
  var toc = $("#toc"); if(!toc) return;
  var active = document.getElementById("page-"+page);
  if(!active){ toc.innerHTML=""; return; }
  var heads = active.querySelectorAll("h2.sec-title, .unit .unit-head h3");
  if(!heads.length){ toc.innerHTML=""; return; }
  var html = '<div class="toc-title">本页目录</div>';
  heads.forEach(function(h,i){
    if(!h.id){ h.id = "toc-"+page+"-"+i; }
    var lv = h.tagName==="H2" ? "" : "lv3";
    var label = h.textContent.replace(/\s+/g," ").trim();
    if(label.length>26) label = label.slice(0,26)+"…";
    html += '<a href="#javascript:void(0)" data-target="'+h.id+'" class="'+lv+'">'+esc(label)+'</a>';
  });
  toc.innerHTML = html;
  $$("#toc a").forEach(function(a){
    a.addEventListener("click", function(){
      var t = document.getElementById(a.dataset.target);
      if(t) t.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
}
function bindScrollSpy(){
  var links = [];
  window.addEventListener("scroll", function(){
    var toc = $("#toc");
    if(!toc || !toc.querySelector("a")) return;
    if(!links.length) links = $$("#toc a");
    var cur = null;
    links.forEach(function(a){
      var t = document.getElementById(a.dataset.target);
      if(!t) return;
      var r = t.getBoundingClientRect();
      if(r.top < 140) cur = a;
    });
    links.forEach(function(a){ a.classList.toggle("active", a===cur); });
  }, {passive:true});
}

/* ================= 全文搜索 ================= */
var SEARCH_INDEX = [];
function buildSearchIndex(){
  SEARCH_INDEX = [];
  $$(".unit").forEach(function(u){
    var h = u.querySelector(".unit-head h3");
    var pageEl = u.closest(".page");
    var pageName = pageEl ? (pageEl.querySelector(".page-head h1")||{}).textContent || pageEl.id : "";
    SEARCH_INDEX.push({title:h?h.textContent.trim():u.id, module:pageName.replace(/^模块\s*/,"模块 "), target:u.id, text:(u.textContent||"").slice(0,1200)});
  });
  GLOSSARY.forEach(function(g){
    SEARCH_INDEX.push({title:g.zh+"（"+g.en+"）", module:"术语表", target:"", text:g.def, glossary:true});
  });
  $$("#page-toolbox .card").forEach(function(c){
    var h = c.querySelector("h3");
    if(h) SEARCH_INDEX.push({title:h.textContent.trim(), module:"工具箱", target:c.id, text:(c.textContent||"").slice(0,800)});
  });
}
function openSearch(){
  $("#searchModal").classList.add("open");
  $("#searchModalInput").value = "";
  renderSearch("");
  setTimeout(function(){ $("#searchModalInput").focus(); },50);
}
function closeSearch(){ $("#searchModal").classList.remove("open"); }
function renderSearch(q){
  var box = $("#searchResults");
  q = q.trim().toLowerCase();
  if(!q){
    box.innerHTML = '<div class="search-empty">输入关键词开始搜索。支持概念、方法、指标、模板、案例与术语（中英文均可）。</div>';
    return;
  }
  var hits = [];
  SEARCH_INDEX.forEach(function(it){
    var hay = (it.title+" "+it.text).toLowerCase();
    var idx = hay.indexOf(q);
    if(idx>=0){
      var start = Math.max(0, idx-30);
      var snip = it.text.slice(start, start+110).replace(/\s+/g," ");
      hits.push({it:it, idx:idx, snip:snip});
    }
  });
  hits.sort(function(a,b){ return a.idx-b.idx; });
  hits = hits.slice(0,30);
  if(!hits.length){ box.innerHTML = '<div class="search-empty">没有找到「'+esc(q)+'」相关内容。试试更短的关键词。</div>'; return; }
  var html = "";
  hits.forEach(function(h,i){
    var it = h.it;
    var target = it.glossary ? "#/glossary" : "#/"+pageOf(it.target)+"/"+it.target;
    var snip = esc(h.snip).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"), function(m){return "<mark>"+m+"</mark>";});
    html += '<a class="sr-item'+(i===0?" sel":"")+'" href="'+target+'" data-i="'+i+'">'
      + '<div class="sr-mod">'+esc(it.module)+'</div><div class="sr-title">'+esc(it.title)+'</div><div class="sr-snip">'+snip+'</div></a>';
  });
  box.innerHTML = html;
  $$("#searchResults .sr-item").forEach(function(a){
    a.addEventListener("click", function(){ closeSearch(); });
  });
}
function pageOf(unitId){
  if(!unitId) return "home";
  var m = unitId.match(/^u(\d+)-/);
  if(m) return "m"+m[1];
  if(unitId.indexOf("u10-")===0) return "m10";
  if(unitId.indexOf("tool-")===0 || unitId.indexOf("calc-")===0) return "toolbox";
  return "home";
}
function bindSearch(){
  $("#searchBox").addEventListener("click", openSearch);
  $("#searchModal").addEventListener("click", function(e){ if(e.target===this) closeSearch(); });
  $("#searchModalInput").addEventListener("input", function(){ renderSearch(this.value); });
  $("#searchModalInput").addEventListener("keydown", function(e){
    if(e.key==="Enter"){
      var first = $("#searchResults .sr-item");
      if(first){ location.hash = first.getAttribute("href").replace("#",""); closeSearch(); }
    }
  });
  document.addEventListener("keydown", function(e){
    var tag = (document.activeElement||{}).tagName||"";
    var typing = tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";
    if(e.key==="/" && !typing){ e.preventDefault(); openSearch(); }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); openSearch(); }
    if(e.key==="Escape"){ closeSearch(); closeDrawer(); }
  });
}

/* ================= 折叠 / 测验 / 复制 ================= */
function bindToggles(){
  $$(".collapse > .c-head").forEach(function(h){
    h.addEventListener("click", function(){ h.parentElement.classList.toggle("open"); });
  });
  $$(".quiz .ans-toggle").forEach(function(b){
    b.addEventListener("click", function(){ b.closest(".quiz").classList.toggle("open"); });
  });
  $$(".template, .formula").forEach(function(box){
    var btn = box.querySelector(".copy-btn");
    if(!btn) return;
    btn.addEventListener("click", function(){
      var pre = box.querySelector("pre") || box.querySelector(".f-main");
      var text = pre ? pre.innerText : "";
      function ok(){ btn.textContent="已复制"; btn.classList.add("ok"); setTimeout(function(){btn.textContent="复制";btn.classList.remove("ok");},1600); }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(ok).catch(function(){ fallback(); });
      } else { fallback(); }
      function fallback(){
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand("copy"); ok(); }catch(e){ btn.textContent="复制失败"; }
        document.body.removeChild(ta);
      }
    });
  });
  $$(".m-node").forEach(function(n){
    n.addEventListener("click", function(){ location.hash = "#/"+n.dataset.page; });
  });
}

/* ================= 计算器 ================= */
function num(id){ var v = parseFloat($(id).value); return isFinite(v)?v:0; }

/* --- AARRR 漏斗 --- */
function calcAARRR(){
  var acq=num("#aarrr-acq"), act=num("#aarrr-act"), ret=num("#aarrr-ret"), rev=num("#aarrr-rev"), ref=num("#aarrr-ref");
  function pct(a,b){ return b>0 ? (a/b*100) : 0; }
  var s = [
    {n:"获客 → 激活", v:pct(act,acq)},
    {n:"激活 → 留存", v:pct(ret,act)},
    {n:"留存 → 变现", v:pct(rev,ret)},
    {n:"变现 → 推荐", v:pct(ref,rev)}
  ];
  var weakest = s[0];
  s.forEach(function(x){ if(x.v < weakest.v) weakest = x; });
  var html = "";
  [["获客（进入）",acq,"—"],["激活（核心行为）",act,s[0].v],["留存（周期末活跃）",ret,s[1].v],["变现（付费）",rev,s[2].v],["推荐（带来新客）",ref,s[3].v]].forEach(function(r){
    html += '<div class="o-row"><span>'+r[0]+'</span><span><b>'+r[1].toLocaleString()+'</b> 人'+(r[2]==="—"?"":'（上一层转化 '+fmt(r[2])+'%）')+'</span></div>';
  });
  html += '<div class="o-row"><span>整体转化（获客→付费）</span><span><b>'+fmt(pct(rev,acq),2)+'%</b></span></div>';
  html += '<div class="o-row"><span style="color:var(--danger);font-weight:700">最弱环节</span><span><b>'+weakest.n+'</b>（'+fmt(weakest.v,1)+'%）</span></div>';
  html += '<div class="o-note">诊断建议：把资源集中在最弱环节（模块 3.2/3.11）。注意：留存一列建议改用同期群曲线解读；变现→推荐的转化低不等于推荐机制无效（推荐用户可能延迟转化）。</div>';
  $("#aarrr-out").innerHTML = html;
}

/* --- A/B 样本量 --- */
function calcSample(){
  var p1 = num("#ab-p1")/100, rel = num("#ab-mde")/100;
  var alpha = parseFloat($("#ab-alpha").value), power = parseFloat($("#ab-power").value);
  var p2 = p1*(1+rel);
  var za = alpha===0.05 ? 1.959964 : 2.575829;
  var zb = power===0.8 ? 0.841621 : 1.281552;
  var d = p2-p1;
  var out = $("#absize-out");
  if(p1<=0 || d<=0){ out.innerHTML = '<div class="o-note" style="color:var(--danger)">请输入有效的基线转化率与提升幅度。</div>'; return; }
  var n = Math.ceil(Math.pow(za+zb,2) * (p1*(1-p1)+p2*(1-p2)) / (d*d));
  var daily = num("#ab-daily");
  var days = daily>0 ? Math.ceil(n/daily) : null;
  var html = '<div class="o-row"><span>实验组转化率预期 p₂</span><span><b>'+fmt(p2*100,2)+'%</b>（基线 '+fmt(p1*100,2)+'% + 相对 '+fmt(rel*100,1)+'%）</span></div>'
    + '<div class="o-row"><span>每组所需样本量</span><span><b>'+n.toLocaleString()+'</b> 人/组</span></div>'
    + '<div class="o-row"><span>总样本量</span><span><b>'+(2*n).toLocaleString()+'</b> 人</span></div>';
  if(days!==null){
    html += '<div class="o-row"><span>预计运行天数（按日均 '+daily.toLocaleString()+'/组）</span><span><b>'+days+' 天</b></span></div>';
    html += '<div class="o-row"><span>周期检查</span><span>'+(days<14?'<b style="color:var(--warn)">不足 14 天——仍需跑满至少 2 个完整业务周期</b>':'<b style="color:var(--teal)">已超过 14 天</b>')+'</span></div>';
  }
  html += '<div class="o-note">公式：n = (z₁₋α/2 + z₁₋β)² × [p₁(1−p₁) + p₂(1−p₂)] ÷ (p₁−p₂)²。效应减半，样本量约变四倍。此为教学近似（双样本比例检验），正式实验请用专业工具复核；运行期间不要因「显著」而提前停止（模块 4.5）。</div>';
  out.innerHTML = html;
}

/* --- RICE --- */
function calcRICE(){
  var rows = $$("#rice-table tbody tr");
  var data = [];
  rows.forEach(function(tr){
    var inp = tr.querySelectorAll("input");
    var name = inp[0].value || "（未命名）";
    var R = parseFloat(inp[1].value)||0, I = parseFloat(inp[2].value)||0, C = parseFloat(inp[3].value)||0, E = parseFloat(inp[4].value)||0;
    var score = E>0 ? (R*I*(C/100))/E : 0;
    data.push({name:name, score:score});
    var cell = tr.querySelector(".rice-score");
    cell.innerHTML = score>0 ? Math.round(score).toLocaleString() : "—";
  });
  var sorted = data.slice().sort(function(a,b){ return b.score-a.score; });
  var html = "";
  sorted.forEach(function(d,i){
    if(d.score<=0) return;
    html += '<div class="o-row"><span>'+(i+1)+'. '+esc(d.name)+'</span><span><b>'+Math.round(d.score).toLocaleString()+'</b></span></div>';
  });
  html += '<div class="o-note">排序即产出。提醒：分数是对话结构不是真理——低分项若用于验证关键假设仍可能值得做；Confidence 全部填 100% 等于没有评估不确定性。</div>';
  $("#rice-out").innerHTML = html || '<div class="o-note">填写上方表格后自动计算。</div>';
}

/* --- 留存曲线 --- */
function calcRetention(){
  var d1=num("#rc-d1"), d7=num("#rc-d7"), d14=num("#rc-d14"), d30=num("#rc-d30"), d90=num("#rc-d90");
  var pts = [[d1,"D1"],[d7,"D7"],[d14,"D14"],[d30,"D30"],[d90,"D90"]];
  var W=460,H=180,pad=34;
  var xs = [0,1,2,3,4];
  function X(i){ return pad + i*(W-pad*2)/4; }
  function Y(v){ return H-24 - (v/100)*(H-44); }
  var poly = xs.map(function(i){ return X(i)+","+Y(pts[i][0]); }).join(" ");
  var grid = "";
  [25,50,75,100].forEach(function(g){
    grid += '<line x1="'+pad+'" y1="'+Y(g)+'" x2="'+(W-10)+'" y2="'+Y(g)+'" stroke="var(--border)" stroke-width="1"/><text x="6" y="'+(Y(g)+4)+'" font-size="10" fill="var(--text2)">'+g+'%</text>';
  });
  var labels = pts.map(function(p,i){ return '<text x="'+X(i)+'" y="'+(H-6)+'" font-size="10.5" text-anchor="middle" fill="var(--text2)">'+p[1]+'</text>'; }).join("");
  var dots = pts.map(function(p,i){ return '<circle cx="'+X(i)+'" cy="'+Y(p[0])+'" r="3.5" fill="var(--brand)"/><text x="'+X(i)+'" y="'+(Y(p[0])-8)+'" font-size="10" text-anchor="middle" fill="var(--text)">'+p[0]+'</text>'; }).join("");
  var svg = '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;background:var(--card);border:1px solid var(--border);border-radius:8px" role="img" aria-label="留存曲线">'+grid
    + '<polyline points="'+poly+'" fill="none" stroke="var(--brand)" stroke-width="2.5"/>'+dots+labels+'</svg>';
  var ratio = d7>0 ? d90/d7 : 0;
  var verdict, cls;
  if(d90<=5 && d30<=10){ verdict="形态：持续下滑趋零——典型的「漏水」结构，优先诊断激活与核心价值交付（模块 5）。"; cls="v-bad"; }
  else if(ratio>=0.55){ verdict="形态：下滑后走平（D90/D7≈"+fmt(ratio,2)+"）——留存水位约 "+fmt(d90,0)+"%，产品价值被持续交付；接下来看不同 cohort 是否在改善。"; cls="v-ok"; }
  else if(d90>d30){ verdict="形态：后期回升——罕见，先核查口径变化、召回活动或数据异常，再庆祝。"; cls="v-mid"; }
  else { verdict="形态：仍在下滑未走平（D90/D7≈"+fmt(ratio,2)+"）——留存尚未稳定，规模化风险高（模块 2.9 PMF 信号）。"; cls="v-mid"; }
  $("#retcurve-out").innerHTML = '<div class="o-row"><span>形态判断</span><span class="verdict '+cls+'">'+verdict+'</span></div>'
    + '<div class="o-row"><span>D30 / D90 留存</span><span><b>'+fmt(d30,1)+'% / '+fmt(d90,1)+'%</b></span></div>'
    + '<div class="o-row"><span>走平系数（D90 ÷ D7）</span><span><b>'+fmt(ratio,2)+'</b>（≥0.55 视为有走平迹象，经验参考）</span></div>'
    + svg + '<div class="o-note">教学示意：单条曲线不能替代同期群分析——请按注册周/渠道拆成多条曲线对比（模块 5.4）。</div>';
}

/* --- 单位经济 --- */
function calcUnit(){
  var arpu=num("#u-arpu"), margin=num("#u-margin")/100, churn=num("#u-churn")/100, cac=num("#u-cac"), newU=num("#u-new");
  var out = $("#unit-out");
  if(arpu<=0||churn<=0){ out.innerHTML='<div class="o-note" style="color:var(--danger)">请输入有效的 ARPU 与月流失率。</div>'; return; }
  var contrib = arpu*margin;
  var ltv = contrib/churn;
  var life = 1/churn;
  var ratio = cac>0 ? ltv/cac : null;
  var payback = contrib>0 ? cac/contrib : null;
  var verdict, cls;
  if(ratio===null){ verdict="未输入 CAC"; cls="v-mid"; }
  else if(ratio>=3){ verdict="LTV/CAC = "+fmt(ratio,2)+"：高于常见经验线 3，单位经济健康（经验参考，非定律）"; cls="v-ok"; }
  else if(ratio>=1){ verdict="LTV/CAC = "+fmt(ratio,2)+"：低于经验线 3——每用户利润薄，需降 CAC 或提留存/客单"; cls="v-mid"; }
  else { verdict="LTV/CAC = "+fmt(ratio,2)+"：低于 1——每用户亏损，当前增长不可持续"; cls="v-bad"; }
  var html = '<div class="o-row"><span>每用户月贡献利润（ARPU×毛利率）</span><span><b>¥'+fmt(contrib,1)+'</b></span></div>'
    + '<div class="o-row"><span>平均用户生命周期</span><span><b>'+fmt(life,1)+' 个月</b>（1 ÷ 月流失率）</span></div>'
    + '<div class="o-row"><span>LTV（简化模型，未折现）</span><span><b>¥'+fmt(ltv,0)+'</b></span></div>'
    + '<div class="o-row"><span>LTV / CAC</span><span><b>'+(ratio===null?"—":fmt(ratio,2))+'</b> <span class="verdict '+cls+'">'+verdict+'</span></span></div>'
    + '<div class="o-row"><span>回本周期</span><span><b>'+(payback===null?"—":fmt(payback,1)+' 个月')+'</b>（≤12 个月为常见经验参考）</span></div>';
  if(newU>0){
    var m0 = newU*(contrib) - (cac>0?newU*cac:0);
    html += '<div class="o-row"><span>本月新增用户的当月净贡献</span><span><b>¥'+fmt(m0,0)+'</b>（月贡献 − CAC，回本前为负属正常）</span></div>';
  }
  html += '<div class="o-note">口径提醒：LTV 为简化模型（恒定流失率、未折现）——精细测算应按同期群与折现率；CAC 应含人力与工具成本并分渠道计算（模块 6.6/6.7）。此计算器结果为教学估算。</div>';
  out.innerHTML = html;
}

/* --- Van Westendorp --- */
function normalCdf(x){
  // Abramowitz-Stegun 7.1.26 近似
  var a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  var sign = x<0?-1:1; x = Math.abs(x)/Math.SQRT2;
  var t = 1/(1+p*x);
  var y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t)*Math.exp(-x*x);
  return 0.5*(1+sign*y);
}
function calcVWP(){
  var tc=num("#vwp-tc"), ch=num("#vwp-ch"), ex=num("#vwp-ex"), te=num("#vwp-te"), sd=num("#vwp-sd")/100;
  var out = $("#vwp-out");
  if(tc<=0||ch<=0||ex<=0||te<=0){ out.innerHTML='<div class="o-note" style="color:var(--danger)">请输入四个有效的价格中位数。</div>'; return; }
  if(!(tc<ch && ch<ex && ex<te)){
    var warn = '<div class="o-note" style="color:var(--warn)">注意：通常应满足 太便宜 < 便宜 < 贵 < 太贵 的逻辑顺序，请检查输入。</div>';
    $("#vwp-out").innerHTML = warn + $("#vwp-out").innerHTML;
  }
  function sig(m){ return Math.max(0.01, m*sd); }
  var sTc=sig(tc), sCh=sig(ch), sEx=sig(ex), sTe=sig(te);
  function ln(p){ return Math.log(p); }
  function cum(m,s,p){ return normalCdf((ln(p)-ln(m))/s); }        // 累积（越贵越多）
  function rev(m,s,p){ return normalCdf((ln(m)-ln(p))/s); }        // 反向（越贵越少）
  var lo = Math.max(0.5, Math.min(tc,ch,ex,te)/4), hi = Math.max(tc,ch,ex,te)*4;
  var N=400, i, ps=[];
  for(i=0;i<=N;i++){ ps.push(lo*Math.pow(hi/lo, i/N)); }
  function curves(p){
    return {tc:rev(tc,sTc,p), ch:rev(ch,sCh,p), ex:cum(ex,sEx,p), te:cum(te,sTe,p)};
  }
  function findInter(fa, fb){ // 在两函数差值符号变化处插值
    var prev = null;
    for(i=0;i<=N;i++){
      var d = fa(ps[i]) - fb(ps[i]);
      if(prev!==null && ((prev.d<=0&&d>0)||(prev.d>=0&&d<0))){
        var p0=prev.p, p1=ps[i], d0=prev.d, d1=d;
        var r = d0/(d0-d1);
        return p0*Math.pow(p1/p0, r);
      }
      prev = {p:ps[i], d:d};
    }
    return null;
  }
  var PMC = findInter(function(p){return curves(p).tc;}, function(p){return curves(p).ex;});
  var PME = findInter(function(p){return curves(p).te;}, function(p){return curves(p).ch;});
  var OPP = findInter(function(p){return curves(p).tc;}, function(p){return curves(p).te;});
  var IDP = findInter(function(p){return curves(p).ch;}, function(p){return curves(p).ex;});
  var html = '<div class="o-row"><span>可接受价格区间（PMC – PME）</span><span><b>¥'+(PMC?fmt(PMC,1):"—")+' – ¥'+(PME?fmt(PME,1):"—")+'</b></span></div>'
    + '<div class="o-row"><span>边际便宜点 PMC（价格下限）</span><span><b>¥'+(PMC?fmt(PMC,1):"—")+'</b> 低于此价越多用户怀疑质量</span></div>'
    + '<div class="o-row"><span>边际贵点 PME（价格上限）</span><span><b>¥'+(PME?fmt(PME,1):"—")+'</b> 高于此价越多用户放弃</span></div>'
    + '<div class="o-row"><span>最优价格点 OPP</span><span><b>¥'+(OPP?fmt(OPP,1):"—")+'</b> 两端极端抵触最少</span></div>'
    + '<div class="o-row"><span>无差异点 IDP</span><span><b>¥'+(IDP?fmt(IDP,1):"—")+'</b> 觉得便宜与贵的人数相等</span></div>'
    + '<div class="o-note">简化模型：假设四题回答围绕各自中位数呈对数正态分布（σ 可调），仅用于教学演示；正式研究需 100+ 样本、先展示产品概念、按人群细分，并用真实购买行为验证（模块 6.4）。</div>';
  out.innerHTML = html;
  drawVWP(ps, curves, PMC, PME, OPP, IDP);
}
function drawVWP(ps, curves, PMC, PME, OPP, IDP){
  var svg = document.getElementById("vwp-chart");
  if(!svg) return;
  var W=680,H=220,padL=44,padR=16,padT=14,padB=26;
  var lo = ps[0], hi = ps[ps.length-1];
  function X(p){ return padL + (Math.log(p)-Math.log(lo))/(Math.log(hi)-Math.log(lo))*(W-padL-padR); }
  function Y(v){ return H-padB - v*(H-padT-padB); }
  function path(f){ return ps.map(function(p,i){ return (i?"L":"M")+X(p).toFixed(1)+","+Y(f(p)).toFixed(1); }).join(" "); }
  var grid="";
  [0,0.25,0.5,0.75,1].forEach(function(g){
    grid += '<line x1="'+padL+'" y1="'+Y(g)+'" x2="'+(W-padR)+'" y2="'+Y(g)+'" stroke="var(--border)" stroke-width="1"/>'
      + '<text x="6" y="'+(Y(g)+4)+'" font-size="10" fill="var(--text2)">'+g*100+'%</text>';
  });
  var marks = [{p:PMC,c:"var(--warn)",n:"PMC"},{p:PME,c:"var(--danger)",n:"PME"},{p:OPP,c:"var(--brand)",n:"OPP"},{p:IDP,c:"var(--purple)",n:"IDP"}];
  var mhtml="";
  marks.forEach(function(m){
    if(!m.p) return;
    mhtml += '<line x1="'+X(m.p)+'" y1="'+padT+'" x2="'+X(m.p)+'" y2="'+(H-padB)+'" stroke="'+m.c+'" stroke-width="1.4" stroke-dasharray="4 4"/>'
      + '<text x="'+X(m.p)+'" y="'+(padT+11)+'" font-size="10.5" font-weight="700" text-anchor="middle" fill="'+m.c+'">'+m.n+' ¥'+m.p.toFixed(0)+'</text>';
  });
  var legend = '<text x="'+(W-padR-170)+'" y="'+(H-8)+'" font-size="10" fill="var(--warn)">— 太便宜</text>'
    + '<text x="'+(W-padR-100)+'" y="'+(H-8)+'" font-size="10" fill="var(--teal)">— 便宜</text>'
    + '<text x="'+(W-padR-40)+'" y="'+(H-8)+'" font-size="10" fill="var(--purple)">— 贵</text>'
    + '<text x="'+(W-padR-10)+'" y="'+(H-8)+'" font-size="10" fill="var(--danger)">— 太贵</text>';
  svg.innerHTML = grid
    + '<path d="'+path(function(p){return curves(p).tc;})+'" fill="none" stroke="var(--warn)" stroke-width="2"/>'
    + '<path d="'+path(function(p){return curves(p).ch;})+'" fill="none" stroke="var(--teal)" stroke-width="2"/>'
    + '<path d="'+path(function(p){return curves(p).ex;})+'" fill="none" stroke="var(--purple)" stroke-width="2"/>'
    + '<path d="'+path(function(p){return curves(p).te;})+'" fill="none" stroke="var(--danger)" stroke-width="2"/>'
    + mhtml + legend
    + '<text x="'+(W/2)+'" y="'+(H-8)+'" font-size="10" text-anchor="middle" fill="var(--text2)">价格（对数刻度）</text>';
  svg.dataset.drawn = "1";
}
function bindCalcs(){
  ["#aarrr-acq","#aarrr-act","#aarrr-ret","#aarrr-rev","#aarrr-ref"].forEach(function(id){
    $(id).addEventListener("input", calcAARRR);
  });
  ["#ab-p1","#ab-mde","#ab-alpha","#ab-power","#ab-daily"].forEach(function(id){
    $(id).addEventListener("input", calcSample); $(id).addEventListener("change", calcSample);
  });
  $$("#rice-table input").forEach(function(i){ i.addEventListener("input", calcRICE); });
  ["#rc-d1","#rc-d7","#rc-d14","#rc-d30","#rc-d90"].forEach(function(id){
    $(id).addEventListener("input", calcRetention);
  });
  ["#u-arpu","#u-margin","#u-churn","#u-cac","#u-new"].forEach(function(id){
    $(id).addEventListener("input", calcUnit);
  });
  ["#vwp-tc","#vwp-ch","#vwp-ex","#vwp-te","#vwp-sd"].forEach(function(id){
    $(id).addEventListener("input", calcVWP);
  });
  calcAARRR(); calcSample(); calcRICE(); calcRetention(); calcUnit(); calcVWP();
}

/* ================= 回到顶部 ================= */
function bindToTop(){
  var btn = $("#toTop");
  window.addEventListener("scroll", function(){
    btn.classList.toggle("show", window.scrollY>600);
  }, {passive:true});
  btn.addEventListener("click", function(){ window.scrollTo({top:0,behavior:"smooth"}); });
}

/* ================= 术语表筛选 ================= */
function bindGlossary(){
  $$("#glossaryFilter .filter-btn").forEach(function(b){
    b.addEventListener("click", function(){
      $$("#glossaryFilter .filter-btn").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on"); renderGlossary();
    });
  });
  $("#glossarySearch").addEventListener("input", renderGlossary);
}

/* ================= 初始化 ================= */
function init(){
  renderModules();
  renderSources();
  renderGlossary();
  buildSearchIndex();
  bindSidebar();
  bindTheme();
  bindProgress();
  bindSearch();
  bindToggles();
  bindCalcs();
  bindToTop();
  bindGlossary();
  bindScrollSpy();
  window.addEventListener("hashchange", route);
  route();
}
if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
