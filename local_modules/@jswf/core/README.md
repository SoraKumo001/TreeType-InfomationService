# @jswf/core -- javascript window framework

Front end framework
JavaScript Window Framework (npm module version)

## screen

![screenshot](https://raw.githubusercontent.com/JavaScript-WindowFramework/javascript-window-framework/ScreenShot/ScreenShot.gif)

## link

- [source code](https://github.com/JavaScript-WindowFramework/core)
- [document](https://javascript-windowframework.github.io/TypeDocViewer/dist/)
- [sample](https://github.com/JavaScript-WindowFramework/jwf_sample01)

## target

- TypeScript+ES5(JavaScript)
- IE11 or later

## history

- 2019/09/06 0.1.10 Fix Splitter
- 2019/08/23 0.1.09 Change package name

## 使い方

- install

```.sh
npm i @jswf/core
```

- install template

```.sh
npx init-jwf
```

- build sample

```.sh
npx webpack
```

- result file

```.sh
dist/public/js/bundle.js
```

- Confirm in browser

```.sh
dist/public/index.html
```

- Use server

```.sh
npx webpack-dev-server
```

## Sample

```src/public/index.ts
import {FrameWindow} as JWF from '@jswf/core'

addEventListener("DOMContentLoaded", ()=>{
  const win = new FrameWindow();
  win.setTitle('SampleWindow') ;
  win.setPos();
});
```

## License

- [MIT License](https://opensource.org/licenses/mit-license.php)
