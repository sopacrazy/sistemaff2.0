// Crie o arquivo 'components/ImagePreviewModal.js'

import React, { useState, useEffect } from "react";
import { Modal, Button } from "antd";
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";

const ImagePreviewModal = ({ visible, imageUrl, onClose }) => {
  const [rotacao, setRotacao] = useState(-90);
  const [zoom, setZoom] = useState(1.5);

  // Reseta o zoom e rotação quando a imagem muda
  useEffect(() => {
    if (visible) {
      setRotacao(-90);
      setZoom(1.5);
    }
  }, [visible]);

  const girarImagem = (angulo) => setRotacao((prev) => prev + angulo);
  const ajustarZoom = (fator) =>
    setZoom((prev) => Math.max(0.5, Math.min(prev * fator, 3)));

  const handleWheelZoom = (event) => {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    ajustarZoom(zoomFactor);
  };

  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onClose}
      width={900}
      destroyOnClose // Garante que o estado resete ao fechar
      bodyStyle={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        height: "80vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "10px",
        }}
      >
        <Button
          icon={<RotateLeftOutlined />}
          onClick={() => girarImagem(-90)}
          style={{ marginRight: "10px" }}
        />
        <Button
          icon={<RotateRightOutlined />}
          onClick={() => girarImagem(90)}
          style={{ marginRight: "10px" }}
        />
        <Button
          icon={<ZoomInOutlined />}
          onClick={() => ajustarZoom(1.2)}
          style={{ marginRight: "10px" }}
        />
        <Button icon={<ZoomOutOutlined />} onClick={() => ajustarZoom(0.8)} />
      </div>
      <div
        onWheel={handleWheelZoom}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <img
          src={imageUrl}
          alt="Foto Expandida"
          style={{
            maxWidth: "90%",
            maxHeight: "70vh",
            transform: `rotate(${rotacao}deg) scale(${zoom})`,
            objectFit: "contain",
            transition: "transform 0.2s ease",
          }}
        />
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
