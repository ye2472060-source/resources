/* 模块 4：平台选择、分发机制与运营策略 */
COURSE.modules.push({
  id:"m4", num:4, title:"平台选择、分发机制与运营策略",
  sub:"理解不同平台如何帮助专业人士被发现、被理解、被记住，并选择合适的运营方式。",
  stage:3, hours:"10–12 小时",
  goals:[
    "区分五种内容分发机制及其对策略的影响",
    "基于官方文档理解主要平台的推荐/排序机制",
    "用决策矩阵完成平台选择，设计主页与代表作",
    "建立发布节奏、测试与复盘机制",
    "识别平台依赖风险并设计资产沉淀策略",
    "理解国内主流平台的机制差异与合规红线"
  ],
  questions:[
    "我的受众在哪里？平台机制如何决定内容形态？",
    "各平台的「算法」到底在奖励什么？官方怎么说？",
    "应该全平台分发还是聚焦一个？",
    "平台规则变化、账号风险如何对冲？"
  ],
  related:["m3","m5","m6","m8"],
  terms:[
    {t:"分发机制", d:"内容到达受众的方式：搜索发现、算法推荐、社交图谱、订阅推送、直接访问（邮件/网址）。五种机制的运营逻辑完全不同。"},
    {t:"For You / 推荐页", d:"TikTok、Instagram Reels、YouTube 首页等以兴趣推荐为主的 feed；对未关注账号也开放分发。"},
    {t:"订阅分发", d:"关注者/订阅者主动选择接收的分发（YouTube 订阅、邮件列表、Substack 订阅）；不依赖算法，但依赖订阅基数。"},
    {t:"直接访问", d:"受众主动输入网址、打开邮件、点击书签——自有渠道，不受平台规则影响。"},
    {t:"冷启动流量池", d:"新内容先在小范围人群测试表现，再逐级放大的分发模式（TikTok、Instagram Reels 官方描述）。"},
    {t:"Account Status", d:"Instagram 提供的账号状态工具，可查看内容是否具备被推荐资格（官方功能）。"},
    {t:"报备 / 商单报备", d:"通过平台官方合作通道（小红书蒲公英、B站花火、抖音巨量星图、知乎品牌任务）下单并标注商业合作的行为；未报备的商业内容通常被限流或处罚。"},
    {t:"蒲公英（小红书）", d:"小红书官方唯一品牌方—博主内容合作平台；商业笔记须经其报备并带「广告/合作」标识。"},
    {t:"花火平台（B站）", d:"哔哩哔哩官方品牌合作平台，为 UP 主提供报价参考、订单管理与安全结算；接入有粉丝与信用分门槛。"},
    {t:"巨量星图（抖音）", d:"字节跳动官方内容营销平台，连接抖音达人与品牌方；商单须经其任务入口发布。"},
    {t:"CES 评分（小红书）", d:"Community Engagement Score 社区互动评分的简称，运营圈广泛引述的流量分配指标（点赞1+收藏1+评论4+转发4+关注8）；小红书官方从未公开完整公式，属第三方共识而非官方规则。"},
    {t:"私域 / 公域", d:"私域指可反复免费触达的自有受众（订阅号粉丝、邮件列表、社群）；公域指依赖平台分发、每次需重新争取的流量（推荐流、搜索）。国内平台近年普遍把流量从私域导向公域。"}
  ],
  sources:["S18","S19","S20","S21","S22","S23","S24","S25","S26","S40","S41","S44","S43","S17","S35","S45","S46","S47","S48","S49","S50","S51"],
  sections:[
    { id:"m4-1", title:"五种分发机制：先懂机制再选平台", html:`
<p>所有平台的内容分发都可以归入五种机制。它们的运营逻辑、内容形态、风险特征完全不同——选错机制比选错平台更致命。</p>
<div class="diagram">
<svg viewBox="0 0 680 210" role="img" aria-label="分发机制光谱">
<g font-family="sans-serif">
<defs><marker id="ar4" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#4263EB"/></marker></defs>
<line x1="40" y1="30" x2="640" y2="30" stroke="#DEE4EC" stroke-width="2"/>
<text x="40" y="20" font-size="10.5" fill="#526174">自主性高 / 可控</text>
<text x="640" y="20" font-size="10.5" fill="#526174" text-anchor="end">平台依赖高 / 不可控</text>
<g>
<circle cx="80" cy="80" r="26" fill="#EDF1FD" stroke="#CBD9F8"/><text x="80" y="84" font-size="10.5" font-weight="700" fill="#3350C9" text-anchor="middle">直接</text>
<text x="80" y="128" font-size="9.5" fill="#526174" text-anchor="middle">邮件/个人网站</text>
<circle cx="215" cy="80" r="26" fill="#EDF1FD" stroke="#CBD9F8"/><text x="215" y="84" font-size="10.5" font-weight="700" fill="#3350C9" text-anchor="middle">订阅</text>
<text x="215" y="128" font-size="9.5" fill="#526174" text-anchor="middle">Substack/YouTube关注</text>
<circle cx="350" cy="80" r="26" fill="#E7F5F3" stroke="#BFE3DE"/><text x="350" y="84" font-size="10.5" font-weight="700" fill="#0F7A6E" text-anchor="middle">社交图谱</text>
<text x="350" y="128" font-size="9.5" fill="#526174" text-anchor="middle">LinkedIn/X/IG关注</text>
<circle cx="485" cy="80" r="26" fill="#E7F5F3" stroke="#BFE3DE"/><text x="485" y="84" font-size="10.5" font-weight="700" fill="#0F7A6E" text-anchor="middle">兴趣推荐</text>
<text x="485" y="128" font-size="9.5" fill="#526174" text-anchor="middle">TikTok/Reels/推荐页</text>
<circle cx="610" cy="80" r="26" fill="#FBF3E4" stroke="#EBD9B4"/><text x="610" y="84" font-size="10.5" font-weight="700" fill="#A05E1A" text-anchor="middle">搜索</text>
<text x="610" y="128" font-size="9.5" fill="#526174" text-anchor="middle">Google/YouTube/站内</text>
<text x="340" y="170" font-size="10.5" fill="#7A8699" text-anchor="middle">越往右：爆发力强但归属感弱；越往左：增长慢但资产归自己</text>
<text x="340" y="188" font-size="10.5" fill="#7A8699" text-anchor="middle">成熟策略 = 用右侧获客，向左侧沉淀</text>
</g>
</svg>
<div class="cap">图 4 · 分发机制光谱。该图为机制归纳，非平台官方分类；各平台实际是多种机制的混合。</div>
</div>
<h3>五种机制对照</h3>
<table class="tb">
<tr><th style="width:90px">机制</th><th>增长逻辑</th><th>内容特征</th><th>风险</th></tr>
<tr><td><b>搜索</b></td><td>长青内容+关键词匹配，慢但持续</td><td>问题导向、结构化、常青</td><td>竞争固化、见效慢</td></tr>
<tr><td><b>兴趣推荐</b></td><td>单条内容可爆发，冷启动池逐级放大</td><td>前 3 秒钩子、完播率导向</td><td>波动极大、不可积累</td></tr>
<tr><td><b>社交图谱</b></td><td>关注关系+互动数据决定触达</td><td>观点、讨论、专业叙事</td><td>依赖粉丝基数</td></tr>
<tr><td><b>订阅</b></td><td>订阅者主动接收，转化路径最短</td><td>固定节奏、系列化</td><td>增长依赖导流</td></tr>
<tr><td><b>直接</b></td><td>完全自有，无算法干预</td><td>任意形态</td><td>需从其他渠道导流</td></tr>
</table>
<div class="callout c-official"><div class="ct">官方机制说明（示例）</div><p>TikTok 官方明确：推荐基于用户互动、内容信息、用户信息加权，<b>粉丝数不是推荐直接因素</b>，系统会主动打散同作者内容以保证多样性<sup class="ref" data-src="S21">[S21]</sup>。Instagram 官方：Reels 以娱乐与发现为主、多数推荐来自未关注账号，被推荐内容须原创、无水印且 ≤3 分钟<sup class="ref" data-src="S22">[S22]</sup>。</p></div>`,
    },
    { id:"m4-2", title:"主要平台机制详解（基于官方文档）", html:`
<p>以下机制说明均来自平台官方文档（核查日期 2026-10-15）。平台规则会变化，请以官方页面为准。</p>
<h3>LinkedIn —— 职业社交与专业内容</h3>
<div class="callout c-official"><div class="ct">官方规则</div><p>① 创作者模式开关已于 2024 年 3 月移除，相关工具（创作者数据分析、Live、Newsletter、自定义按钮）默认开放；② 资料页主题标签(hashtags)已于 2024 年 2 月移除；③ Follow 成为资料默认主操作，「关于」区移至资料页顶部<sup class="ref" data-src="S18">[S18]</sup>。规模：2025 财年全球会员 12 亿（注册口径，非月活）<sup class="ref" data-src="S40">[S40]</sup>。</p></div>
<p>适用：B2B 专业形象、行业观点、招聘与合作机会。机制以社交图谱为主，专业人群集中，适合模块 1 定位中的 B2B 受众。</p>
<h3>YouTube —— 搜索+推荐双引擎</h3>
<div class="callout c-official"><div class="ct">官方规则</div><p>官方帮助明确：视频排名取决于「表现 + 观众个性化」；系统依据<b>平均观看时长与平均观看百分比</b>评估表现；观看人数受主题兴趣、竞争程度、季节性三类外部因素影响<sup class="ref" data-src="S19">[S19]</sup>。搜索排名三要素：相关性、互动、质量（质量含专业度/权威/可信判断）<sup class="ref" data-src="S20">[S20]</sup>。</p></div>
<p>适用：深度教学、案例演示、可搜索的长青内容。双引擎意味着优质视频同时吃到搜索长尾与推荐爆发。</p>
<h3>TikTok / Instagram Reels —— 兴趣推荐主导</h3>
<div class="callout c-official"><div class="ct">官方规则</div><p>TikTok：三类因素加权（用户互动/内容信息/用户信息），强信号（如长视频完播）权重更高；系统主动保证多样性，不连续推同一作者<sup class="ref" data-src="S21">[S21]</sup>。Instagram：Reels 与 Explore 是发现场，多数来自未关注账号；账号状态(Account Status)决定推荐资格；原创、无水印、≤3 分钟是基本门槛<sup class="ref" data-src="S22">[S22]</sup><sup class="ref" data-src="S23">[S23]</sup>。</p></div>
<p>适用：可视化技能、快速技巧、人格化表达。风险：与专业深度场景错配，粉丝质量参差。</p>
<h3>X —— 公共讨论与开源算法</h3>
<div class="callout c-official"><div class="ct">官方规则</div><p>X 于 2023 年开源排序代码（xai-org/x-algorithm）：Phoenix 模型预测互动/点击/注意力/关注/负向反馈五组行为并加权求和。<b>转发与对话的权重远高于点赞；举报、屏蔽等负向信号权重极高</b>。注意：仓库参数是默认值，线上配置可能不同<sup class="ref" data-src="S24">[S24]</sup>。第三方跟踪显示「分享链接」权重约为点赞的 30 倍、「回复」约为 7.6 倍（2026-10 读取的默认参数）<sup class="ref" data-src="S44">[S44]</sup>。</p></div>
<p>适用：行业观点、实时讨论、专业人脉。机制鼓励「可转发、可讨论」的内容，而非求赞。</p>
<h3>Medium / Substack / 邮件列表 —— 长文与自有受众</h3>
<div class="callout c-official"><div class="ct">官方规则</div><p>Medium：文章分 Network(关注者)/General(兴趣匹配)/Boost(人工策展)三级分发；Boost 看重一手经验、原创性、尊重读者、写作工艺，并明确排斥疑似 AI 生成内容<sup class="ref" data-src="S25">[S25]</sup>。Substack：以邮件订阅为核心，作者互推(Recommendations)是其主要发现机制，订阅确认页是转化黄金位<sup class="ref" data-src="S26">[S26]</sup>。</p></div>
<p>适用：深度长文、系列专栏、读者关系。邮件列表是「直接访问」资产——模块 8 会讨论其战略价值。</p>
<div class="callout c-warn"><div class="ct">算法认知的边界</div><p>「算法秘密」类内容绝大多数是传言。可靠的机制认知只有两个来源：平台官方文档，与可复现的数据实验（模块 6）。X 的开源仓库是特例而非常态——它公开的是默认参数，不等于线上实时配置。</p></div>`,
    },
    { id:"m4-3", title:"平台选择：匹配定位与受众", html:`
<h3>平台选择决策矩阵</h3>
<table class="tb">
<tr><th style="width:130px">评估维度</th><th>关键问题</th></tr>
<tr><td><b>受众在场</b></td><td>目标受众是否活跃于此？（用访谈与竞品验证，而非感觉）</td></tr>
<tr><td><b>形态匹配</b></td><td>你的内容优势形态（深文/视频/图文）与平台主流形态是否一致？</td></tr>
<tr><td><b>机制匹配</b></td><td>你的内容适合哪种分发？（长青干货→搜索；观点→社交图谱；技能演示→推荐）</td></tr>
<tr><td><b>商业路径</b></td><td>平台的转化路径是否顺畅？（LinkedIn 的私信、YouTube 的简介链接、Substack 的付费墙）</td></tr>
<tr><td><b>产能现实</b></td><td>以你每周可投入时间，能稳定交付该平台要求的形态吗？</td></tr>
<tr><td><b>风险敞口</b></td><td>该平台的账号政策、内容审核、算法波动对你的敞口有多大？</td></tr>
</table>
<h3>常见平台组合策略</h3>
<div class="grid2">
<div class="mini-card"><b>B2B 专业人士</b><p>主：LinkedIn（专业人群+合作机会）；辅：邮件列表/个人网站（沉淀）；视频按产能选 YouTube。</p></div>
<div class="mini-card"><b>知识型创作者</b><p>主：Substack/邮件+个人网站（自有资产）；辅：X/LinkedIn 分发观点；Medium 做长文补充。</p></div>
<div class="mini-card"><b>技能教学者</b><p>主：YouTube（搜索+推荐双引擎）；辅：短视频平台引流；邮件列表沉淀。</p></div>
<div class="mini-card"><b>视觉/生活方式</b><p>主：Instagram/TikTok（推荐机制+品牌合作生态）；辅：邮件列表沉淀核心粉丝。</p></div>
</div>
<div class="callout c-practice"><div class="ct">选择原则</div><p>一个主平台 + 一个沉淀渠道 + 一个分发渠道，是个人创作者的现实配置。同时运营 4 个以上平台而没有产能支撑，是大多数「全平台账号矩阵」失败的原因。平台数据口径差异巨大（LinkedIn 的 12 亿是注册会员，其他平台多为月活/广告触达），横向对比规模没有意义<sup class="ref" data-src="S41">[S41]</sup>。</p></div>`,
    },
    { id:"m4-4", title:"主页、简介与代表作设计", html:`
<p>平台主页是你的「落地页」。访客在 3 秒内要能回答：你是谁、为谁服务、为什么可信、下一步做什么。</p>
<h3>主页五要素</h3>
<table class="tb">
<tr><th style="width:110px">要素</th><th>内容</th><th>示例要点</th></tr>
<tr><td><b>定位句</b></td><td>人群+问题+方法</td><td>「帮 B2B 市场人把内容生产系统化」</td></tr>
<tr><td><b>证据</b></td><td>成果/履历/数据</td><td>「方法在 30+ 团队验证」</td></tr>
<tr><td><b>关键词</b></td><td>领域术语（服务搜索）</td><td>Instagram 官方建议简介/标题/话题含相关关键词<sup class="ref" data-src="S23">[S23]</sup></td></tr>
<tr><td><b>行动指引</b></td><td>关注/订阅/联系路径</td><td>LinkedIn 自定义按钮可链接网站<sup class="ref" data-src="S18">[S18]</sup></td></tr>
<tr><td><b>置顶/代表作</b></td><td>2–4 个最强内容</td><td>选「最能让新访客理解你价值」的，不是数据最好的</td></tr>
</table>
<h3>内容栏目化</h3>
<p>固定栏目（系列）让新访客快速理解你的内容结构，也让老读者形成期待。栏目设计三原则：数量 ≤5；每个栏目有明确主题与更新预期；栏目名可被搜索。</p>`,
    },
    { id:"m4-5", title:"发布节奏、测试与复盘", html:`
<div class="callout c-warn"><div class="ct">先破误区</div><p>「每天固定早 8 点发布」「一周必须五更」这类说法没有普适依据。各平台官方文档从未承诺任何固定发布时间或频率的收益。节奏只有一条铁律：<b>你能稳定坚持的下限，优于你无法维持的上限</b>。</p></div>
<h3>节奏设计的三个输入</h3>
<ul>
<li><b>产能</b>：每周可稳定投入的生产时间 ÷ 单篇耗时 = 现实频率。</li>
<li><b>平台特性</b>：推荐机制平台（TikTok/Reels）对更新频率更敏感；订阅机制（邮件）对节奏稳定性更敏感；搜索机制（长文）对单篇质量更敏感。</li>
<li><b>受众场景</b>：B2B 内容在工作日白天表现通常更好；深度长文在周末阅读场景更好——但这是假设，要用你的数据验证（模块 6）。</li>
</ul>
<h3>测试与复盘周期</h3>
<table class="tb">
<tr><th style="width:110px">周期</th><th>动作</th></tr>
<tr><td>每篇</td><td>记录核心数据（曝光/完播或阅读/互动/转化事件）</td></tr>
<tr><td>每周</td><td>15 分钟快速复盘：哪篇超预期？哪篇低于预期？为什么？</td></tr>
<tr><td>每月</td><td>主题级复盘：哪类主题持续有效？调整下月选题配比</td></tr>
<tr><td>每季</td><td>策略复盘：平台/形态/栏目是否调整？更新/合并/停更决策</td></tr>
</table>`,
    },
    { id:"m4-6", title:"互动运营：评论、私信与社群", html:`
<ul>
<li><b>评论</b>：前 30 分钟内的作者回复会提升互动率（多数平台的排序信号都含互动速度）。回复要补充信息而非「感谢支持」。</li>
<li><b>私信/咨询</b>：这是从影响力到机会的转化通道。设置好承接：自动回复、常见问题清单、咨询入口。别让潜在客户卡在「怎么联系你」。</li>
<li><b>社群</b>：社群是关系深化场。参与标准：能持续提供价值（答疑、资源、连接），而不是单向广播。模块 5 会讨论专业关系的长期维护。</li>
</ul>
<div class="callout c-practice"><div class="ct">互动质量指标</div><p>比「评论数」更有意义的指标：提问式评论占比（受众是否在求方法）、私信咨询数、评论中目标人群占比。这些直接反映可信度与机会信号，而非娱乐性。</p></div>`,
    },
    { id:"m4-7", title:"数据分析：区分四类问题", html:`
<p>内容表现不佳时，先归因再优化。四类问题的诊断逻辑：</p>
<table class="tb">
<tr><th style="width:130px">问题类型</th><th>数据特征</th><th>对策</th></tr>
<tr><td><b>内容质量问题</b></td><td>曝光正常但完播/阅读率低、互动率低</td><td>改开头、结构、信息密度（模块 3）</td></tr>
<tr><td><b>受众匹配问题</b></td><td>互动来自非目标人群、增长不带来咨询</td><td>收紧选题与表达的人群指向（模块 1）</td></tr>
<tr><td><b>分发问题</b></td><td>同类内容表现骤降、账号状态异常</td><td>查平台规则/账号资格；排查限流因素（如 IG 的 Account Status）</td></tr>
<tr><td><b>转化问题</b></td><td>数据好但无咨询/订阅/购买</td><td>补行动指引与转化路径（模块 7）</td></tr>
</table>
<h3>各平台核心指标（官方口径）</h3>
<ul>
<li><b>YouTube</b>：平均观看时长、平均观看百分比（官方明确的排名依据）<sup class="ref" data-src="S19">[S19]</sup>。</li>
<li><b>Instagram</b>：Accounts Reached 区分粉丝/非粉丝；Account Status 查推荐资格<sup class="ref" data-src="S23">[S23]</sup>。</li>
<li><b>邮件</b>：点击率与点击打开比（CTOR）比打开率可靠——Apple 邮件隐私保护使打开率被系统性高估<sup class="ref" data-src="S35">[S35]</sup>。</li>
</ul>`,
    },
    { id:"m4-8", title:"多平台协同与平台风险", html:`
<h3>协同策略：一个家园，多个触点</h3>
<ul>
<li><b>自有阵地</b>：个人网站+邮件列表是唯一完全可控的资产（直接访问机制）。</li>
<li><b>平台角色分工</b>：每个平台只承担一个角色（获客/展示/沉淀/转化），不重复建设。</li>
<li><b>内容路由</b>：深度内容发自有阵地，平台发切片与导流版，避免「为平台做嫁衣」却不沉淀。</li>
</ul>
<h3>平台风险清单</h3>
<table class="tb">
<tr><th style="width:130px">风险</th><th>表现</th><th>对冲</th></tr>
<tr><td><b>规则变化</b></td><td>功能下线（如 LinkedIn 创作者模式开关 2024 年移除<sup class="ref" data-src="S18">[S18]</sup>）</td><td>以官方文档为准，不把策略绑定在单一功能上</td></tr>
<tr><td><b>账号风险</b></td><td>封禁、误判、审核</td><td>遵守社区规则；核心资产多平台备份</td></tr>
<tr><td><b>流量波动</b></td><td>算法调整导致曝光骤降</td><td>邮件列表+搜索长青内容做底盘</td></tr>
<tr><td><b>形态过时</b></td><td>平台重心转移（图文→短视频）</td><td>技能可迁移（表达/策划），资产跟着人走</td></tr>
</table>
<div class="callout c-warn"><div class="ct">风险提示</div><p>把所有希望寄托在单一平台的创作者，在每次算法调整中都是最大受害者。邮件列表、个人网站、可复用的方法论与案例库——这些「带得走的资产」才是个人品牌的保险单。创作者研究中反复出现的「不敢停更」焦虑，根源正是这种结构性依赖<sup class="ref" data-src="S17">[S17]</sup>。</p></div>`,
    },
    { id:"m4-9", title:"国内平台生态：机制、定位与受众差异", html:`
<p>前几节以国际平台为例讲解机制，因其官方文档最透明。但对绝大多数中国专业人士，目标受众、客户与职业机会主要在国内——微信公众号/视频号、小红书、B站、抖音、知乎的优先级通常更高。这五者的分发机制、内容形态、受众与商业化入口差异极大，且合规环境（站内闭环、广告标识、导流管制）比国际平台更严格。</p>
<div class="callout c-info"><div class="ct">证据分级提示</div><p>国内平台几乎不公开完整推荐算法。B站激励规则、抖音星图门槛有<sup class="ref" data-src="S45">[S45]</sup><sup class="ref" data-src="S46">[S46]</sup><sup class="ref" data-src="S47">[S47]</sup>官方文档可查；而小红书的 CES 评分、公众号改版权重等均为<sup class="ref" data-src="S48">[S48]</sup><sup class="ref" data-src="S49">[S49]</sup>第三方行业观察。下文分别标注「官方」与「行业观察」，请勿把后者当官方规则引用。</p></div>

<h3>五大国内平台定位速览</h3>
<table class="tb">
<tr><th style="width:120px">平台</th><th>核心分发机制</th><th>主力内容形态</th><th>受众与场景</th><th>主要变现入口</th><th>规则透明度</th></tr>
<tr><td><b>微信公众号 / 视频号</b></td><td>订阅私域 + 看一看/搜一搜/朋友推荐公域<sup class="ref" data-src="S48">[S48]</sup></td><td>长文、图文、短视频</td><td>深度阅读、私域沉淀、职业人群</td><td>流量主、赞赏、付费阅读、商品橱窗、视频号小店</td><td>低（算法不公开，多为行业观察）</td></tr>
<tr><td><b>小红书</b></td><td>CES 互动评分 + 阶梯流量池 + 搜索长尾<sup class="ref" data-src="S49">[S49]</sup></td><td>图文 / 短视频种草</td><td>消费决策、生活方式</td><td>蒲公英商单、直播带货、店铺</td><td>低（公式非官方公开）</td></tr>
<tr><td><b>哔哩哔哩</b></td><td>完播 / 互动驱动的兴趣推荐 + 关注订阅</td><td>中长视频、专栏</td><td>高知年轻用户、深度内容</td><td>创作激励、广告分成、充电、花火商单<sup class="ref" data-src="S45">[S45]</sup></td><td>较高（激励规则官方公开）</td></tr>
<tr><td><b>抖音</b></td><td>强算法公域推荐</td><td>短视频、直播</td><td>泛人群、爆发式破圈</td><td>巨量星图商单、小店、直播带货<sup class="ref" data-src="S47">[S47]</sup></td><td>中（商单门槛官方公开）</td></tr>
<tr><td><b>知乎</b></td><td>问答排序 + 搜索（长尾强）</td><td>问答、长文</td><td>专业讨论、决策前调研</td><td>致知计划、好物推荐、盐选、付费咨询<sup class="ref" data-src="S51">[S51]</sup></td><td>中低（门槛口径不一）</td></tr>
</table>

<h3>各平台机制要点</h3>
<h4>微信公众号 / 视频号：私域正在「公域化」</h4>
<ul>
<li>公众号信息流已从纯时间线订阅，演变为「订阅 + 看一看 + 搜一搜 + 朋友推荐 + 视频号联动」的混合分发；后台阅读渠道分析中「推荐」独占一栏<sup class="ref" data-src="S48">[S48]</sup>。</li>
<li>视频号被描述为「社交分发 + 兴趣算法」双重机制；张小龙公开课提出的经验比例为「关注:朋友赞:系统推荐 ≈ 1:2:10」，即社交推荐是放大器（第三方转述，非精确算法）。</li>
<li>官方对推荐偏好的概括是「有真心、有干货、有审美」，偏好有深度、有观点的原创内容。</li>
<li><b>策略含义</b>：别再把公众号当纯私域群发工具；长文仍适合沉淀专业体系，但需为「看一看 / 搜一搜」优化选题与标题，并把视频号作为社交裂变入口。</li>
</ul>
<h4>小红书：互动权重 + 搜索长尾</h4>
<ul>
<li>运营圈共识：以 CES 分配流量（评论 / 转发 / 关注权重远高于点赞），并叠加阶梯流量池——先给小范围曝光，按点击与互动逐级放大<sup class="ref" data-src="S49">[S49]</sup>。</li>
<li>搜索是长尾主引擎：用户带着决策需求而来，标题 / 正文的关键词布局直接影响被搜到的概率；优质笔记可持续数月获客。</li>
<li><b>策略含义</b>：适合「有用 + 好看」的决策型内容（攻略、测评、避坑）；追求收藏与深度评论而非单纯点赞；把关键词当 SEO 做，但避免堆砌被降权。</li>
</ul>
<h4>哔哩哔哩：深度内容的信用高地</h4>
<ul>
<li>以中长视频为主，完播与「三连」是核心信号；社区氛围强调真诚与专业，适合系统性、可反复观看的知识内容。</li>
<li>官方激励规则透明：单个原创自制稿件满 1000 播放开始计收益，但要求站内首发且不含商业推广<sup class="ref" data-src="S45">[S45]</sup>；商单走花火平台<sup class="ref" data-src="S46">[S46]</sup>。</li>
<li><b>策略含义</b>：若你能产出体系化深度内容，B站是建立专业可信度的高地；但商单与激励互斥（含广告内容不计激励），需规划「公益内容攒信用 + 商单变现」的双轨。</li>
</ul>
<h4>抖音：破圈快、归属弱</h4>
<ul>
<li>强公域算法推荐，粉丝数不决定分发，适合快速破圈；但流量归属平台，粉丝关系弱。</li>
<li>商单走巨量星图，门槛随任务类型而不同（图文一口价粉丝≥1 千、短视频投稿≥1 万、指派任务≥10 万）<sup class="ref" data-src="S47">[S47]</sup>。</li>
<li><b>策略含义</b>：适合放大已在小红书 / B站验证过的内容，作为获客前端；把流量向微信 / 社群等自有阵地沉淀。</li>
</ul>
<h4>知乎：专业可信度与决策前调研</h4>
<ul>
<li>问答 + 搜索双引擎，长尾极强；用户多为决策前调研，专业、克制、可验证的内容更受认可。</li>
<li>变现含致知计划（流量分成，单价偏低）、好物推荐（带货佣金）、盐选专栏（付费签约）、付费咨询等<sup class="ref" data-src="S51">[S51]</sup>。</li>
<li><b>策略含义</b>：适合作为专业背书与搜索资产；一篇高质量回答可持续带来精准流量与咨询。</li>
</ul>

<div class="diagram">
<svg viewBox="0 0 680 360" role="img" aria-label="国内平台定位图：横轴为公域爆发力，纵轴为长期资产与私域沉淀力">
<g font-family="sans-serif">
<defs><marker id="ar9" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#526174"/></marker></defs>
<rect x="90" y="30" width="550" height="280" fill="#FBFCFE" stroke="#DEE4EC"/>
<line x1="365" y1="30" x2="365" y2="310" stroke="#DEE4EC" stroke-dasharray="4 4"/>
<line x1="90" y1="170" x2="640" y2="170" stroke="#DEE4EC" stroke-dasharray="4 4"/>
<text x="95" y="46" font-size="10" fill="#9AA5B4">沉淀强 · 爆发弱（深耕型）</text>
<text x="635" y="46" font-size="10" fill="#9AA5B4" text-anchor="end">沉淀强 · 爆发强（理想区）</text>
<text x="95" y="303" font-size="10" fill="#9AA5B4">沉淀弱 · 爆发弱</text>
<text x="635" y="303" font-size="10" fill="#9AA5B4" text-anchor="end">沉淀弱 · 爆发强（流量型）</text>
<text x="365" y="335" font-size="11" fill="#526174" text-anchor="middle" font-weight="700">公域爆发力 →</text>
<text x="30" y="170" font-size="11" fill="#526174" text-anchor="middle" font-weight="700" transform="rotate(-90 30 170)">长期资产 / 私域沉淀力 →</text>
<g>
<circle cx="150" cy="255" r="10" fill="#526174"/><text x="150" y="280" font-size="11" fill="#17243A" text-anchor="middle" font-weight="600">知乎</text>
<circle cx="265" cy="300" r="10" fill="#4263EB"/><text x="265" y="322" font-size="11" fill="#17243A" text-anchor="middle" font-weight="600">公众号 / 视频号</text>
<circle cx="345" cy="225" r="10" fill="#7048E8"/><text x="345" y="208" font-size="11" fill="#17243A" text-anchor="middle" font-weight="600">B站</text>
<circle cx="450" cy="185" r="10" fill="#159A8C"/><text x="450" y="168" font-size="11" fill="#17243A" text-anchor="middle" font-weight="600">小红书</text>
<circle cx="575" cy="80" r="10" fill="#A05E1A"/><text x="575" y="63" font-size="11" fill="#17243A" text-anchor="middle" font-weight="600">抖音</text>
</g>
</svg>
<div class="cap">图 9 · 国内平台定位图（定性归纳，非官方分类）。横轴为公域爆发力、纵轴为长期资产与私域沉淀力；理想策略是用右侧平台获客，向左侧与上方沉淀自有资产。</div>
</div>
`,
    },
    { id:"m4-10", title:"国内平台的合规红线与商单报备", html:`
<p>国内平台对商业内容的管控远严于国际平台。核心原则：所有付费 / 置换 / 佣金合作，都应通过平台官方合作通道下单并标注，否则大概率被限流、下架甚至封号。</p>
<h3>商单必须走官方平台报备</h3>
<table class="tb">
<tr><th>平台</th><th>官方商单通道</th><th>关键门槛（以当期为准）</th><th>未报备后果</th></tr>
<tr><td>小红书</td><td>蒲公英</td><td>专业号 + 实名，粉丝量随类目浮动<sup class="ref" data-src="S50">[S50]</sup></td><td>限流、下架、封号、无法投放广告</td></tr>
<tr><td>哔哩哔哩</td><td>花火平台</td><td>万粉、电磁力≥5、信用分≥60<sup class="ref" data-src="S46">[S46]</sup></td><td>商单无效、账号处罚</td></tr>
<tr><td>抖音</td><td>巨量星图</td><td>按任务类型 1 千–10 万粉不等<sup class="ref" data-src="S47">[S47]</sup></td><td>视为无效单、违规处罚</td></tr>
<tr><td>知乎</td><td>品牌任务 / 知+ 等</td><td>创作者等级门槛<sup class="ref" data-src="S51">[S51]</sup></td><td>内容被判违规广告</td></tr>
</table>
<div class="callout c-warn"><div class="ct">合规底线</div><p>《互联网广告管理办法》第九条要求：通过知识介绍、体验分享、消费测评等形式推销商品或服务并附加购买方式的，应当显著标明「广告」<sup class="ref" data-src="S30">[S30]</sup>。这与各平台「报备 + 广告标识」要求是同一逻辑——让受众能分辨内容与广告。</p></div>

<h3>五条高频红线</h3>
<ol>
<li><b>站外导流</b>：各平台严打引导加微信、放二维码、外部链接、站外成交；转化应留在站内生态（小红书店铺、抖音小店、视频号小店、知乎好物）。这是处罚最重的一类。</li>
<li><b>绝对化与功效宣称</b>：禁用「第一 / 顶级 / 100% / 根治 / 速效」等；医疗、金融、留学等强监管领域不得做「保过 / 包赚」类承诺。</li>
<li><b>AI 生成内容须标注</b>：使用 AI 生成的图文 / 视频需明确标注「AI 创作」，否则可能被限流<sup class="ref" data-src="S50">[S50]</sup>。</li>
<li><b>数据造假</b>：刷播放、刷互动、互赞互刷会被识别并降权；B站明确将其列为「非合理手段」<sup class="ref" data-src="S45">[S45]</sup>。</li>
<li><b>商单与平台激励互斥</b>：B站含商业推广的稿件不计入创作激励收益<sup class="ref" data-src="S45">[S45]</sup>——接商单前要算清机会成本。</li>
</ol>

<h3>把合规成本算进商业模型</h3>
<ul>
<li>报备通常伴随平台服务费（如星图约 5%），报价时应计入成本。</li>
<li>「站内闭环」意味着你不能随意把受众导到站外私域成交——这与国际平台（Substack / 邮件）逻辑相反，需重新设计转化路径（如站内店铺 + 官方客服，或合规引导至已认证的企业微信 / 小程序）。</li>
<li>合规不是增长的对立面：带「广告」标识的报备笔记反而能获得官方流量分发与保护，并降低翻车风险<sup class="ref" data-src="S50">[S50]</sup>。</li>
</ul>
<div class="callout c-info"><div class="ct">核查提醒</div><p>国内平台规则调整频繁（门槛、标识、导流政策几乎每季变化）。本节所有门槛与规则均须在决策前到各平台官方创作者中心 / 帮助中心复核，并记录核查日期——这正是模块练习 m4-t3 的用途。</p></div>
`,
    }
  ],
  exercise:{
    title:"模块 4 实操练习：完成平台选择与主页设计",
    desc:"用决策矩阵做出有依据的平台选择，并改造你的主页。",
    tasks:[
      { id:"m4-t1", t:"用六维决策矩阵评估 3 个候选平台，写出选择结论与放弃理由", out:"《平台选择决策表》" },
      { id:"m4-t2", t:"按五要素改造主平台主页（定位句/证据/关键词/行动指引/置顶代表作）", out:"《主页改造前后对比》" },
      { id:"m4-t3", t:"查阅 2 个目标平台的官方创作者文档，记录 3 条与你的策略相关的当前规则（注明核查日期）", out:"《平台规则核查笔记》" },
      { id:"m4-t4", t:"设计你的平台风险对冲方案：自有阵地是什么？资产备份规则是什么？", out:"《风险对冲清单》" },
      { id:"m4-t5", t:"选定 1 个国内主平台：对照「报备通道/广告标识/站外导流/AI标注」四项合规清单，写出你的发布合规自检表", out:"《国内平台合规自检表》" }
    ]
  },
  quiz:[
    { q:"TikTok 官方对推荐机制的说明中，正确的是？", options:["粉丝数越多推荐越多","粉丝数不是推荐直接因素，推荐基于互动/内容/用户信息加权，且系统主动保证多样性","只有付费内容能获得推荐","发布时间决定推荐量"], answer:1, explain:"TikTok Newsroom 官方文章明确粉丝数非直接因素；强信号（如完播）权重更高；系统会打散同作者内容（S21）。" },
    { q:"YouTube 官方明确的视频表现评估依据是？", options:["点赞数","平均观看时长与平均观看百分比","订阅转化","评论数量"], answer:1, explain:"YouTube 帮助中心明确：系统同时依据平均观看时长和平均观看百分比确定视频表现排名（S19）。" },
    { q:"Instagram 关于内容被推荐资格的正确说法是？", options:["所有内容都会被推荐","需原创、无水印、Reels ≤3 分钟，且可通过 Account Status 查看资格","粉丝越多越会被推荐","付费推广才能被推荐"], answer:1, explain:"Instagram 官方：原创内容、无可见水印、Reels 3 分钟以内是推荐基本门槛；Account Status 可自查推荐资格（S22/S23）。" },
    { q:"X 开源算法给内容策略的最大启示是？", options:["应该追求更多点赞","转发与对话的权重远高于点赞，负向信号（举报/屏蔽）代价极高","应该多发以量取胜","算法完全不可知"], answer:1, explain:"开源参数文件显示回复、分享类行为权重数倍于点赞；举报等负向反馈权重极高。注意仓库为默认参数，线上配置可能不同（S24/S44）。" },
    { q:"关于发布节奏，本模块的立场是？", options:["存在通用的最优发布时间","固定频率越高越好","没有普适规律，只有「能稳定坚持的下限」，具体节奏用数据验证","只在周末发布"], answer:2, explain:"平台官方文档从未承诺固定时间/频率的收益；节奏应由产能、平台特性与受众场景共同决定，并通过自己的数据验证。" },
    { q:"关于国内平台推荐机制的证据分级，正确说法是？", options:["小红书 CES 公式是官方公开的精确算法","国内平台普遍公开完整算法，可精确复现","B站激励规则、抖音星图门槛有官方文档；而 CES 评分、公众号改版权重多为第三方行业观察，不能当官方规则","所有第三方总结都不可信，应完全忽略"], answer:2, explain:"国内平台几乎不公开完整算法。官方文档（B站激励/星图门槛）可作依据；CES、改版权重等是第三方共识或测算，用于理解方向而非精确复现（S45/S47/S48/S49）。" },
    { q:"在小红书做品牌合作，正确的合规做法是？", options:["私下接单、软广伪装成自用分享更安全","必须走蒲公英报备并标注「广告/合作」，否则面临限流甚至封号","只要内容质量高就不需要报备","把联系方式放主页背景图引导加微信"], answer:1, explain:"蒲公英是官方唯一商单通道，商业笔记须报备并带标识；未报备软广与站外导流是处罚最重的两类行为（S50）。" },
    { q:"B站创作激励计划对享受收益的稿件有什么硬性要求？", options:["粉丝越多收益越高，与内容无关","须站内首发（不晚于其他平台）且不含商业推广内容，满 1000 播放起计","必须日更才能获得激励","只有参加活动才有收益"], answer:1, explain:"官方规则：稿件须自制原创、站内首发、不含商业推广（含口播/软广/logo），单个原创稿件满 1000 播放开始计收益；商单内容不计激励（S45）。" },
    { q:"在国内平台运营中，被处罚最严重、最需避免的行为是？", options:["发布时间不固定","站外导流（引导加微信/二维码/站外成交）","标题字数太长","不使用平台贴纸"], answer:1, explain:"各平台严打站外导流，要求转化留在站内生态，此类行为直接面临限流、封号；这与国际平台可自由导流到邮件列表的逻辑相反（S48/S50）。" }
  ]
});
