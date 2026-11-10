# 赛尔号飞船复原

一个可离线登舰的三维同人项目。你将操控一名经典页游造型的小赛尔，从传送舱出发，沿走廊走进设备之间，也可以乘升降机前往其他甲板。

![首版基础赛尔的正面、右前方和背面](https://github.com/lshxzhy/seer-starship-reconstruction/releases/download/v0.1.0/robot-turnaround.png)

**直接游玩**　从 [GitHub Releases](https://github.com/lshxzhy/seer-starship-reconstruction/releases/latest) 下载 `seer-starship.html`，用支持 WebGL 的桌面浏览器打开。点一下画面，W/A/S/D 移动，Shift 快行，拖动环视，滚轮调整跟随距离，V 切换第一人称。“看正面”可以观察赛尔的面盘和双脚。触屏使用方向键和视角菜单。

**从源码构建**　安装 Python 3.8 或更新版本，在仓库根目录运行：

```sh
python work/assemble-seer.py
```

直接打开生成的 `outputs/seer-starship.html`。Three.js r128 随源码分发，构建使用 Python 标准库，运行时从本文件读取模型和渲染库。

## 舰上有哪些空间

手册标注的船长室、实验室、资料室、瞭望舱、瞭望露台、荣誉大厅、传送舱、机械室、教官办公室、发明室和动力室均可进入。不同舱室的图证年代与精修进度见[资料索引](docs/SOURCES.md)。

手册外廓为 530 × 370 × 450 米。可游玩的舰体采用 1.5 倍扩建尺寸，设四层驻舱、十六个分区和 12,000 个可定位的充能位。名册包括玩家和 11,999 名船员。船员按编号、路线与轮班时钟确定位置；当前甲板在玩家附近 42 米内最多绘制 112 名 NPC。

首版重点是基础赛尔机体、底层走廊、传送舱、动力室和瞭望舱。截图能确认设备的正面和相对遮挡；背板、支撑、米制尺寸、跨层接驳和承载万人所需的设施均有项目设计成分。

## 加入制作

从[交接文档](docs/HANDOFF.md)找到要改的模块，从[路线图](docs/ROADMAP.md)和[任务列表](https://github.com/lshxzhy/seer-starship-reconstruction/issues)领取具体工作。带游戏版本和出入路线的观察记录同样是贡献。

## 许可

本仓库原创程序与项目文档采用 [MIT License](LICENSE)。Three.js r128 附带[上游 MIT 许可](licenses/three-r128.txt)。赛尔号名称、角色形象及游戏原有美术归相应权利人；本项目为非官方同人创作。模型使用程序几何绘制，原游戏画面请通过资料索引前往出处查阅。
