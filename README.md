Physicaloid.js
==============

Google Chrome Package Apps用のPhysicaloid JavaScriptライブラリです。
現在はPhysicaloid FPGA（PERIDOT基板）のみの対応です。


利用環境
========

Windows/Linux/MacOS上のGoogle Chrome 32以下で動作します。
*※最新のChrome 33では動作しません。*


サンプルの使い方
================

Chrome Package Appsの登録
-------------------------
- sample_appsフォルダをローカルに保存します。
- Chromeの設定→拡張機能でデベロッパーモードにチェックを入れます。
- 'パッケージ化されてない拡張機能を読み込む'をクリックして保存したフォルダを指定します。
- Chromeのアドレスバーに'chrome://apps/'を入力（またはChromeのブックマークバーを右クリック→アプリのショートカットを表示）
- アプリウィンドウに追加したアプリが表示されているのでクリックして起動。

PERIDOTの接続
-------------
- USBでホストPCに接続します。
- Windowsの場合は、デバイスマネージャから該当ドライバのVCPロードするにチェックを入れ、再度接続し直します。
- アプリを起動して、Serial Portの中からPERIDOTが接続されているポートを選択してConnectボタンを押します。
- 正しく認識されればチェックアイコンが出て、ボタン表示がDisconnectに切り替わります。
- 'ファイルを選択'から、RBF形式のコンフィグレーションデータを選択し、Configurationボタンをクリックします。正常にコンフィグされればチェックアイコンが出て、接続状態になります。
- I/O AcceessとMemory DumpでQsysペリフェラルにアクセスすることができます。Qsysコンポーネントの存在しないコンフィグでは動作しません。


簡単なAPIの説明
===============

Physicaloidオブジェクトの生成
-----------------------------
`var myps = new Pysicaloid();`


Physicaloidデバイスのオープン
-----------------------------
`myps.open(port portname, function callback(bool result));`

    portname : chrome.serialで返されるポート名を指定
    result : 成功＝true / 失敗＝false


Physicaloidデバイスのクローズ
-----------------------------
`myps.close(function callback(bool result));`

    result : 成功＝true / 失敗＝false


Physicaloidデバイスのコンフィグレーション
-----------------------------------------
`myps.upload(obj boardInfo, arraybuffer rbfdata[], function callback(bool result));`

    boardInfo : コンフィグレーション対象のボード情報オブジェクト（現状では0を指定する）
    rbfdata[] : コンフィグデータが格納された ArrayBufferオブジェクト
    result : 成功＝true / 失敗＝false


AvalonMMペリフェラルの読み書き
------------------------------
`myps.avm.iord(uint address, int offset, function callback(bool result, uint readdata));`
`myps.avm.iowr(uint address, int offset, uint writedata, function callback(bool result));`

    address : AvalonMMベースアドレス
    offset : レジスタオフセット
    writedata : 書き込むレジスタ値
    readdata : 読み出したレジスタ値
    result : 成功＝true / 失敗＝false


AvalonMMメモリの読み書き
------------------------
`myps.avm.read(uint address, int bytenum, function callback(bool result, arraybuffer readdata[]));`
`myps.avm.write(uint address, arraybuffer writedata[], function callback(bool result));`

    address : AvalonMMメモリ先頭アドレス
    bytenum : リードするバイト数
    readdata[] : 読み出したデータバイト列
    writedata[] : 書き込むデータバイト列
    result : 成功＝true / 失敗＝false


ライセンス
=========

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)
