import React, { useState, useEffect, useRef } from "react";

const LazyThumb = ({ src, alt, onClick, width = 50, height = 50 }) => {
  const holderRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={holderRef}
      style={{
        width,
        height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {visible ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          style={{ objectFit: "cover", cursor: "pointer", borderRadius: 4 }}
          onClick={onClick}
        />
      ) : (
        <div
          style={{
            width,
            height,
            background: "#f0f0f0",
            borderRadius: 4,
          }}
        />
      )}
    </div>
  );
};

export default LazyThumb;
