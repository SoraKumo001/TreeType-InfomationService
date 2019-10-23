import styled from "styled-components";
import React, { useRef, useLayoutEffect, useState } from "react";

const Root = styled.div`
  position: relative;
  cursor: default;
  user-select: none;
  > div {
    display: inline-block;
    position: relative;
    left: 0px;
    top: 0px;
    white-space: nowrap;
    &:nth-child(2) {
      position: absolute;
      overflow: hidden;
    }
  }
`;

interface Props {
  style?: React.CSSProperties; //Owner CSS
  backStyle?: React.CSSProperties; //Background Text CSS
  foreStyle?: React.CSSProperties; //Foreground Text CSS
  star?: string; //Star charactor '★'
  max: number; //Max Star value
  value: number; //Current Star value
  onValue?: (value: number) => void; //Change current value Event
}
export function StarRating(props: Props) {
  const max = props.max > 1 ? props.max : 1;
  const star = props.star || "★";
  const text = Array(max + 1).join(star);
  const v = props.value / max;
  const ref = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const shadowColor = "rgb(100,100,100)";
  const foreStyle: React.CSSProperties = {
    color: "#FFFF22",
    pointerEvents: "none",
    WebkitTextStroke: `1px ${shadowColor}`
  };
  const backStyle: React.CSSProperties = {
    color: "white",
    WebkitTextStroke: `1px ${shadowColor}`
  };
  if (window.navigator.userAgent.indexOf("msie") !== -1) {
    const v = `1px 1px 0 ${shadowColor},-1px 1px 0 ${shadowColor},1px -1px 0 ${shadowColor},-1px -1px 0 ${shadowColor}`;
    foreStyle.textShadow = v;
    backStyle.textShadow = v;
  }

  useLayoutEffect(() => {
    setWidth(ref.current!.offsetWidth);
  });
  return (
    <Root style={props.style}>
      <div ref={ref} style={{ ...backStyle, ...props.backStyle }}>
        {Array.apply(null, Array(max)).map((_, i) => (
          <span key={i} onClick={() => props.onValue && props.onValue(i + 1)}>
            {star}
          </span>
        ))}
      </div>
      <div
        style={{ ...foreStyle, ...props.foreStyle, width: width * v + "px" }}
      >
        {text}
      </div>
    </Root>
  );
}
