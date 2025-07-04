## 简介

Noteblocks是一个基于web的本地极简文本记录应用。[在线Demo](https://noteblocks-roan.vercel.app/)

目前仅针对Windows使用，但理论上也可用于移动设备。

**声明：该应用的web部分完全由AI生成。**（感谢Gemini的鼎力相助）

<br>
由于我自己有在PC上记录纯文本内容的需求，现有的许多笔记软件虽然功能强大，但也拖慢了启动速度，而我希望的是记事本和Notepad++这样的性能。此前我一直使用N++来记录这些，但很快就发现内容过多难以查询，因此通过AI来开发了这样一个应用。

PS：该程序与Minecraft中的音符盒（Note block）无任何关联。暂时以英文界面提供，但实际上可以汉化的部分非常少。

## 功能特性

- 类似于Obsidian和Joplin的左右布局，左侧管理笔记，右侧查看、编辑和删除。
- 以json格式导入和导出全部笔记，本地应用中导出位置在“下载”文件夹中。
- 导入笔记时自动检测已存在的笔记，可选择覆盖或跳过。
- 搜索笔记标题。
- 夜间模式支持（暂未实现自动切换，需手动点击按钮）。
- 所有数据通过Indexed DB保存在本地。**安装新版本前，请先从旧版本备份原笔记。尽管不会覆盖，但目前安装新版后可能会创建新的本地存储，无法自动读取旧版本的笔记内容。**

## 使用方法

要使用本应用，我推荐以下方法：

1. 最简单：

   从[release](https://github.com/zjxdiu/Noteblocks/releases)中下载预打包的安装程序，运行安装即可使用。

   程序通过[Nativefier](https://github.com/nativefier/nativefier)打包，安装程序由Setup Factory生成

2. 在线使用：

   可通过上方[在线Demo](https://github.com/zjxdiu/Noteblocks#%E7%AE%80%E4%BB%8B)，或者访问项目源地址[https://websim.com/@zjxdiu/noteblocks](https://websim.com/@zjxdiu/noteblocks)即可使用（该网站可能需要境外网络访问）。

3. 网页端部署：

   下载仓库内容，使用任意web服务器软件，选择index.html即可使用。

## 开发

由于我并没有任何web前端设计和编程能力，因此本仓库不接受任何PR，但可任意fork自己的版本，也欢迎在issues中提出建议或反馈问题。（也可以直接去websim中fork项目）

所有的后续更新都将在Websim进行开发，并同步稳定版本到此仓库。

## TO-DO

- [ ] 实现夜间模式自动切换
- [ ] 全中文汉化

## 已知问题

- 部分情况下Windows程序在启动、导入笔记后可能出现内容无法编辑，通常重启应用可以解决。
- 少数情况下按Enter键时内容不会换行，多按一次可暂时解决（目前发现有时会写入`\r`而不是`\n`，正在进一步排查问题中）
