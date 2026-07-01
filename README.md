# Realistic Garden | 写实花园

一个基于 **Three.js** 打造的写实风格 3D 互动花园，运行在浏览器中。

![Garden](https://img.shields.io/badge/Three.js-0.160.0-black?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ 特性

- 🌿 **写实生态系统**：程序化生成的草地、树木、灌木、石头、野花和池塘
- 💨 **动态风动**：草丛、树木、灌木随风摇曳
- 🌊 **喷泉与水面**：真实感水体材质 + 动态喷泉粒子
- 🌅 **昼夜切换**：白昼 / 黄昏 / 夜晚三种光照氛围
- 🍂 **四季轮回**：春、夏、秋、冬叶片色彩切换
- ✨ **粒子效果**：花粉漂浮、夜晚萤火虫
- 🖱️ **丰富交互**：
  - 鼠标拖动旋转视角，滚轮缩放
  - 点击植物触发晃动反馈
  - `W`/`S`/`A`/`D` 或方向键在花园中漫游
  - 空格键暂停/恢复风动
- 📱 **响应式设计**：适配桌面与移动设备

## 🚀 快速开始

这是一个纯前端项目，无需构建工具。

### 方式一：直接打开

1. 下载本仓库
2. 用浏览器打开 `index.html`
3. 开始探索花园

### 方式二：本地服务器

```bash
cd realistic-garden
npx serve .
```

然后访问 `http://localhost:3000`

> 注意：由于使用了 ES Modules 和 import map，建议通过本地服务器访问，直接打开文件可能因 CORS 限制导致 Three.js 加载失败。

## 🎮 操作说明

| 操作 | 说明 |
|------|------|
| 鼠标拖动 | 旋转视角 |
| 鼠标滚轮 | 缩放 |
| 点击植物 | 互动反馈 |
| `W` `A` `S` `D` / 方向键 | 漫游移动 |
| 空格键 | 风动开关 |
| 底部按钮 | 切换昼夜 / 季节 |

## 🛠 技术栈

- [Three.js](https://threejs.org/) — WebGL 3D 渲染
- 程序化纹理生成（Canvas API）
- InstancedMesh 高性能草地渲染
- EffectComposer 后期处理（Bloom 辉光）

## 📁 项目结构

```
realistic-garden/
├── index.html          # 主页面
├── js/
│   └── main.js         # 花园核心逻辑
└── README.md
```

## 📝 License

MIT
