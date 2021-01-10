/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 *表示用パンくずリストプラグイン
 */

import { ContentsModule } from "../../Contents/ContentsModule";
import "./SnsButton.auto.scss";
import { getManager } from "../..";

const contentsModule = getManager().getModule(ContentsModule);

addEventListener("DOMContentLoaded", () => {
  const snsScripts = [
    "https://platform.twitter.com/widgets.js",
    "https://b.st-hatena.com/js/bookmark_button.js",
    "https://connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v4.0&appId=562797474252030",
  ];
  snsScripts.forEach((url) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    document.head.appendChild(script);
  });
});

contentsModule.addEventListener("drawContents", (client) => {
  const buttons = [
    `<a href="https://twitter.com/share?ref_src=twsrc%5Etfw" class="twitter-share-button" data-show-count="true">Tweet</a>`,
    `<div><a href="https://b.hatena.ne.jp/entry/" class="hatena-bookmark-button" data-hatena-bookmark-layout="basic-label-counter" data-hatena-bookmark-lang="ja" title="このエントリーをはてなブックマークに追加"><img src="https://b.st-hatena.com/images/v4/public/entry-button/button-only@2x.png" alt="このエントリーをはてなブックマークに追加" width="20" height="20" style="border: none;" /></a>`,
    `<div class="fb-share-button" data-href="${location}" data-layout="button_count" data-size="small"><a target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&amp;src=sdkpreparse" class="fb-xfbml-parse-ignore">シェア</a></div>
`,
  ];

  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (contentsPage) {
    const parent = document.createElement("div");
    parent.id = "SNS";
    buttons.forEach((rawHtml) => {
      const node = document.createElement("div");
      node.innerHTML = rawHtml;
      parent.appendChild(node);
    });
    contentsPage.appendChild(parent);
  }
  try {
    (window as any).FB.XFBML.parse();
  } catch {
    //
  }
  try {
    (window as any).twttr.widgets.load();
  } catch {
    //
  }
});
