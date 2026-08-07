"use client";

import type { CSSProperties } from "react";
import type {
  AnimatableProperty,
  ElementNode,
  ProjectDocument,
  ViewportName,
} from "@/document/schema";
import { animatableProperties } from "@/document/schema";
import { resolveElementStyle } from "@/document/geometry";
import { evaluateElementAnimation } from "@/document/animation";
import { getOrderedChildren } from "@/document/schema/scene-graph";
import { resolveBoxPaintStyle } from "./paint";
import { ElementContentView } from "./ElementContentView";
import { ElementErrorBoundary } from "./ElementErrorBoundary";

type ElementRendererProps = {
  document: ProjectDocument;
  element: ElementNode;
  viewport: ViewportName;
  scrollOffsetPx: number;
};

export function ElementRenderer(props: ElementRendererProps) {
  if (props.element.hidden) return null;
  return (
    <ElementErrorBoundary elementId={props.element.id} elementName={props.element.name}>
      <ElementRendererInner {...props} />
    </ElementErrorBoundary>
  );
}

function ElementRendererInner({
  document,
  element,
  viewport,
  scrollOffsetPx,
}: ElementRendererProps) {
  const resolvedStyle = resolveElementStyle(element, viewport);

  const animated: Record<AnimatableProperty, number> = {
    x: resolvedStyle.x,
    y: resolvedStyle.y,
    width: resolvedStyle.width,
    height: resolvedStyle.height,
    rotationDeg: resolvedStyle.rotationDeg,
    opacity: resolvedStyle.opacity,
  };
  for (const property of animatableProperties) {
    const value = evaluateElementAnimation(
      document.animations,
      element.id,
      viewport,
      property,
      scrollOffsetPx,
    );
    if (value !== undefined) animated[property] = value;
  }

  const style: CSSProperties = {
    position: "absolute",
    left: animated.x,
    top: animated.y,
    width: animated.width,
    height: animated.height,
    transform: animated.rotationDeg !== 0 ? `rotate(${animated.rotationDeg}deg)` : undefined,
    opacity: animated.opacity,
    ...resolveBoxPaintStyle(resolvedStyle, element.content),
  };

  const children = getOrderedChildren(document, element.id);

  return (
    <div style={style} data-element-id={element.id} data-element-kind={element.kind}>
      <ElementContentView element={element} style={resolvedStyle} scrollOffsetPx={scrollOffsetPx} />
      {children.map((child) => (
        <ElementRenderer
          key={child.id}
          document={document}
          element={child}
          viewport={viewport}
          scrollOffsetPx={scrollOffsetPx}
        />
      ))}
    </div>
  );
}
