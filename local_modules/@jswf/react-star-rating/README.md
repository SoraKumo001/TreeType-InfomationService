# @jswf/react-star-rating

Text-based rating that allows decimal numbers  
![ScreenShot](https://raw.githubusercontent.com/JavaScript-WindowFramework/react-star-rating/screenshot/screenshot.gif)

## １．Contents

### 1.1 Props

```ts:
interface Props {
  style?: React.CSSProperties;       //Owner CSS
  backStyle?: React.CSSProperties;   //Background Text CSS
  foreStyle?: React.CSSProperties;   //Foreground Text CSS
  star?: string;                     //Star charactor '★'
  max: number;                       //Max Star value
  value: number;                     //Current Star value
  onValue?: (value: number) => void; //Change current value Event
}
```

### 1.2 Usage

```ts:
<StarRating max={5} value={2.5} />
<StarRating max={10} value={3} star="▲" />
<StarRating
  style={{ fontSize: "150%" }}
  max={max}
  value={value}
  star="星"
  backStyle={{color:"black"}}
  foreStyle={{color:"red"}}
  onValue={v => {
    setValue(v);
  }}
/>
```

## ２．links

- Source code  
[https://github.com/JavaScript-WindowFramework/react-star-rating](https://github.com/JavaScript-WindowFramework/react-star-rating)

- Sample code  
[https://github.com/JavaScript-WindowFramework/react-star-rating-sample](https://github.com/JavaScript-WindowFramework/react-star-rating-sample)

- Operation sample  
[https://javascript-windowframework.github.io/react-star-rating-sample/dist/](https://javascript-windowframework.github.io/react-star-rating-sample/dist/)

## ３．Sample source

```tsx:
import { useState } from "react";
import React from "react";
import { StarRating } from "./StarRating";
import styled from "styled-components";

const Root = styled.div`
  > div {
    display: flex;
    > div {
      width: 5em;
      text-align: center;
    }
    > button {
      width: 3em;
    }
  }
`;

export function RatingTest() {
  const [max, setMax] = useState(5);
  const [value, setValue] = useState(2.2);

  return (
    <>
      <StarRating max={max} value={value} />
      <StarRating max={max} value={value} star="▲" />
      <StarRating
        style={{ fontSize: "150%" }}
        max={max}
        value={value}
        star="あ"
        backStyle={{color:"black"}}
        foreStyle={{color:"red"}}
        onValue={v => {
          setValue(v);
        }}
      />
      <Root>
        <div>
          <div>max</div>
          <button onClick={() => {setMax(max - 2);}}>-2</button>
          <button onClick={() => {setMax(max - 1);}}>-1</button>
          <div>{max}</div>
          <button onClick={() => {setMax(max + 1);}}>+1</button>
          <button onClick={() => {setMax(max + 2);}}>+2</button>
        </div>
        <div>
          <div>value</div>
          <button onClick={() => {setValue(value - 1);}}>-1</button>
          <button onClick={() => {setValue(value - 0.1);}}>-0.1</button>
          <div>{value.toFixed(1)}</div>
          <button onClick={() => {setValue(value + 0.1);}}>+0.1</button>
          <button onClick={() => {setValue(value + 1);}}>+1</button>
        </div>
      </Root>
    </>
  );
}


```

## ５．license

MIT
