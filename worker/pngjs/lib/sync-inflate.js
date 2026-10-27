"use strict";

/**
 * pngjs@7.0.0 的 workerd 兼容实现，本目录是 pngjs 的本地副本，这是唯一被改写的文件。
 *
 * 渲染链路是 jimp → @jimp/js-png → pngjs，解码时靠这个文件做同步 zlib 解压。
 * 上游用 ES5 风格继承 Node 的 zlib.Inflate：
 *
 *   zlib.Inflate.call(this, opts);
 *   util.inherits(Inflate, zlib.Inflate);
 *
 * workerd 的 zlib.Inflate 是 ES class，构造函数不允许以 .call(this) 调用，部署后
 * 处理第一张图就会抛 "Class constructor Inflate cannot be invoked without 'new'"。
 * 编码方向不受影响，packer-sync.js 直接调 zlib.deflateSync，没有继承问题。
 *
 * 修复方式是直接透传 zlib.inflateSync：workerd 的 nodejs_compat 已原生提供，
 * 语义与 Node 一致。上游那个 Inflate 类是为流式分块控制（chunkSize / maxLength）
 * 存在的，对一次性 inflateSync 没有意义，丢弃即可；pipeline.js 只依赖 exports 上的
 * inflateSync，不引用 Inflate / createInflate。
 *
 * 备选方案是 pnpm.patchedDependencies，代价是每次升级都要走一遍 patch 流程、补丁以
 * diff 形式存在、报错栈指向虚拟 store 路径。本地副本更直白，代价是要手动同步版本。
 *
 * 维护注意：
 * 1. 除本文件外，lib/ 下所有文件都应与上游 pngjs@<version>/lib 逐字节一致。升级时
 *    整体重新复制再 `diff -rq` 复核，若出现多余差异说明副本被别的工具改写过。
 * 2. 本目录曾在 eslint 忽略规则生效前被 `--fix` 处理过，bitmapper.js、constants.js、
 *    png.js 里的 eslint-disable-line 注释被静默删除。现已还原并在 globalIgnores 中
 *    排除了 worker/pngjs/**，升级后请确认该规则仍在。
 * 3. package.json 的 version 锁定版本，升级 pngjs 时同步修改，避免副本与依赖错配。
 * 4. wrangler.jsonc 的 alias 把 pngjs 指向 ./worker/pngjs，改动目录位置需同步改配置。
 */

const zlib = require("zlib");

function inflateSync(buffer) {
  return zlib.inflateSync(buffer);
}

module.exports = exports = inflateSync;
exports.inflateSync = inflateSync;
