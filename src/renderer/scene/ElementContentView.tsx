"use client";

import type { ElementNode, ElementStyle } from "@/document/schema";
import { paintToSvgAttr, strokeToSvgAttrs } from "./paint";
import { useAssetResolver } from "./AssetResolver";
import { selectSpriteFrameIndex } from "@/renderer/runtime";
import styles from "./scene.module.css";

type ContentProps = { element: ElementNode; style: ElementStyle; scrollOffsetPx: number };

function AssetImage({
  assetId,
  alt,
  style,
}: {
  assetId: string;
  alt: string;
  style: React.CSSProperties;
}) {
  const resolveAsset = useAssetResolver();
  const url = resolveAsset(assetId);
  if (!url) {
    return (
      <div role="img" aria-label={alt} className={styles.assetPlaceholder}>
        {alt || "Missing asset"}
      </div>
    );
  }
  // The shared renderer must display guest `blob:` URLs and signed private URLs alike,
  // which next/image's optimizer does not support - a plain <img> is intentional here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} style={style} />;
}

export function ElementContentView({ element, style, scrollOffsetPx }: ContentProps) {
  const content = element.content;

  switch (content.kind) {
    case "group":
      return null;

    case "shape":
      return null;

    case "text":
      return (
        <p
          className={styles.text}
          style={{
            fontFamily: content.typography.fontFamily,
            fontSize: content.typography.fontSizePx,
            fontWeight: content.typography.fontWeight,
            lineHeight: `${content.typography.lineHeightPx}px`,
            letterSpacing: content.typography.letterSpacingPx,
            color: content.typography.color,
            textAlign: content.typography.textAlign,
          }}
        >
          {content.text}
        </p>
      );

    case "image":
      return (
        <AssetImage
          assetId={content.assetId}
          alt={content.alt}
          style={{ width: "100%", height: "100%", objectFit: content.fit, display: "block" }}
        />
      );

    case "polygon": {
      const points = content.points.map((p) => `${p.x},${p.y}`).join(" ");
      const strokeAttrs = strokeToSvgAttrs(style.stroke);
      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${style.width} ${style.height}`}
          preserveAspectRatio="none"
        >
          <polygon points={points} fill={paintToSvgAttr(style.fill)} {...strokeAttrs} />
        </svg>
      );
    }

    case "path": {
      const strokeAttrs = strokeToSvgAttrs(style.stroke);
      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${style.width} ${style.height}`}
          preserveAspectRatio="none"
        >
          <path
            d={content.svgPath}
            fill={paintToSvgAttr(style.fill)}
            {...strokeAttrs}
            fillRule={content.closed ? "nonzero" : undefined}
          />
        </svg>
      );
    }

    case "sprite": {
      const frames = [...content.frames].sort((a, b) => a.order - b.order);
      const frameIndex = selectSpriteFrameIndex(content.playback, frames.length, scrollOffsetPx);
      const frame = frameIndex >= 0 ? frames[frameIndex] : undefined;
      if (!frame) {
        return (
          <div role="img" aria-label={element.name} className={styles.assetPlaceholder}>
            No sprite frames
          </div>
        );
      }
      return (
        <AssetImage
          assetId={frame.assetId}
          alt={element.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      );
    }

    default:
      return null;
  }
}
