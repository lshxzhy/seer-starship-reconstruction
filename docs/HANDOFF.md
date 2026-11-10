# 接手一个舱室

先运行 `python work/assemble-seer.py`，打开 `outputs/seer-starship.html`。在“目的地”选择要负责的房间。进入后先从玩家视角看设备，再选“全舰定位”看它与甲板和升降机的关系。

## 各模块由谁负责

|制作职责|文件|交付范围|
|---|---|---|
|公共舱| `src/habitat/civic.js` |传送舱、教官办公室、荣誉大厅、瞭望露台|
|科研与指挥| `src/habitat/science.js` |船长室、实验室、资料室、瞭望舱|
|动力与检修| `src/habitat/engineering.js` |动力室、机械室、发明室|
|全舰总装| `src/habitat/installation.js`、`kit.js`、`layout-record.js` |甲板、公共门洞、通道、碰撞、坐标及交通；跨舱连通由此处统一处理|
|赛尔与驻舱| `src/population/robot.js`、`population.js`、`player.js`、`berths.js` |机体、步态、船员近场实例、动作输入和充能位|
|操控与视图| `src/viewer/boarding.js`、`explore.js`、`work/seer-layout.html` |登舰、视角、定位和全舰浏览|
|舰体和装配| `work/hull-next.js`、`bridge-and-pod.js`、`machinery.js`、`src/habitat/exterior-scale.js`、`work/assemble-seer.py` |舰壳、外构件、米制标尺和离线构建|

## 改动怎样接入成品

舱室由稳定 ID 注册，例如 `cabinBuilders.teleport = function (kit) { ... }`。装配顺序由构建脚本定义。局部原点在舱室地面中心，单位为米，Y 向上，+Z 指门口。公共门净宽 3.4 米、高 3.1 米。每个舱传入自己的 W、D、H。公共壳体负责地面和门洞；舱内大型设备在 `kit.block(x,z,w,d)` 登记占地，使玩家能从入口走到工位并绕回。新开出口须同步设计两端落点、朝向和碰撞。

玩家和船员共用 `seerRobots` 模板。第一人称眼位读 `eyeHeight`，步态读 `phaseStep`。需要改体型时同时看正面剪影、侧面轮廓、鞋底触地和光学面盘高度。人口层只绘制近场实例，远程船员的位置由同一时钟与路线求得。

角色资料从 [characters.json](../src/ai/characters.json) 读取。稳定角色 ID 对应联系人，`departmentId` 对应功能分组，`roomId` 对应模型舱室；外部联系人可没有舱室。原作依据写进 `facts` 和 `sources`，项目拟定的语气及专长写进 `persona` 和 `expertise`。补资料时同步[角色说明](舰上组织与角色.md)。普通船员复用 `crew`，会话按实际 SE 编号区分。

本地对话由 `src/ai/server.py` 提供同源登舰页和流式接口，`dialogue.js` 处理选角、输入、停止和页面内会话。每次舰上请求显式发送 `think: false` 和 `options.num_ctx: 8192`，思考设置仅作用于本项目的角色通讯。角色直接以中文生成同人对白。接手时从项目根运行 `python src/ai/server.py --open`，从舰内按钮实际发送消息；浏览单文件离线版时，运行入口见其通讯提示。只将公开角色资料和运行方法写入仓库。

## 贡献一次改动

近景材质的颜色、粗糙度和浮雕由 `kit.js` 按米制铺设；玩家清漆、底箍、密封圈和面盘分层在 `robot.js`。天空在 `src/viewer/orbit-sky.js`，舰内与舰外分别使用 `lighting.js` 的反射环境。`finish.js` 用主场景的同一张深度图计算精细档的接触遮蔽，再处理边缘。舱室大件的方向阴影在换舱时更新。精修一个工位时，在第一人称门口确认整体轮廓，再近看构件的真实嵌装、受光和遮挡；对颜色有判断时附同机位游戏出处与当前模型画面。

1. 在对应 Issue 留下舱名或角色、准备解决的问题、负责文件和依据，确认该文件当前的制作人。基于主线建分支，例如 `room/machine-arrival`。
2. 为每个观察记录游戏版本或来源发布日期、页面链接或视频时间码、进入动作、出发房间和到达房间。把能看见的构件与必须补画的背面分别记下。自录时保留一份本地原始材料，公开文档只放有权分发的内容，避开账号、聊天和个人标识。
3. 在所属源文件制作，从离线入口核对实际使用的视角。提交 PR 时说明原图的哪一处促成了哪项修改、从哪里能看到结果，以及仍欠哪个角度。总装维护者合入后在原 Issue 留下提交、交付物与下一步。

若暂时不能进入相符版本的客户端，可先交付查过的历史图文和可再次定位的录像时间码。当前 H5 和经典页游分别建记录，接手人从最近一个已确认的落点继续。
