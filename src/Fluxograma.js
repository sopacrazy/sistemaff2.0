// frontend/src/Fluxograma.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddBoxIcon from "@mui/icons-material/AddBox";
import SaveIcon from "@mui/icons-material/Save";
import SaveAsIcon from "@mui/icons-material/DriveFileRenameOutline";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";

import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { toPng } from "html-to-image";

/* ============================
 * Single, fully-customizable Node
 * ============================ */

function Handles({ sides, active, color }) {
  const s = {
    top: true,
    bottom: true,
    left: true,
    right: true,
    ...(sides || {}),
  };

  // tamanhos
  const SIZE_INACTIVE = 6; // bem pequeno, sempre visível
  const SIZE_ACTIVE = 10; // um pouco maior quando ativo
  const RING = 5; // hitbox extra
  const size = active ? SIZE_ACTIVE : SIZE_INACTIVE;
  const OUT = Math.round(size / 2) + 2;

  const base = (kind /* 'source' | 'target' */) => ({
    width: size,
    height: size,
    borderRadius: 9999,
    background: color || "#1976d2",
    border: "2px solid #fff",
    outline: `${RING}px solid transparent`,
    boxShadow: "0 1px 2px rgba(0,0,0,.25)",
    cursor: "crosshair",
    pointerEvents: "all",
    zIndex: kind === "source" ? 6 : 5, // source por cima
    opacity: 1,
    transition: "transform 150ms ease, width 120ms ease, height 120ms ease",
    transform: active ? "scale(1)" : "scale(0.9)",
  });

  const posStyle = (pos) => {
    switch (pos) {
      case Position.Top:
        return { top: -OUT };
      case Position.Bottom:
        return { bottom: -OUT };
      case Position.Left:
        return { left: -OUT };
      case Position.Right:
        return { right: -OUT };
      default:
        return {};
    }
  };

  // Par (source + target) no mesmo lado
  const Pair = ({ position }) => (
    <>
      <Handle
        type="source"
        position={position}
        style={{ ...base("source"), ...posStyle(position) }}
        className="custom-handle"
        id={`s-${position}`}
      />
      <Handle
        type="target"
        position={position}
        style={{ ...base("target"), ...posStyle(position) }}
        className="custom-handle"
        id={`t-${position}`}
      />
    </>
  );

  return (
    <>
      {s.top && <Pair position={Position.Top} />}
      {s.bottom && <Pair position={Position.Bottom} />}
      {s.left && <Pair position={Position.Left} />}
      {s.right && <Pair position={Position.Right} />}
    </>
  );
}

const CardNode = ({ data, selected }) => {
  const color = data?.color || "#1976d2";
  const shape = data?.shape || "rectangle";
  const sides = data?.sides || {
    top: true,
    bottom: true,
    left: true,
    right: true,
  };

  const [hovered, setHovered] = useState(false);
  const active = selected || hovered || !!data?.__showAllHandles;

  if (shape === "text") {
    return (
      <Box
        sx={{ position: "relative", px: 1, overflow: "visible" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Handles sides={sides} active={active} color={color} />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {data?.title?.trim() || "Texto"}
        </Typography>
        {data?.description && (
          <Typography variant="body2" color="text.secondary">
            {data.description}
          </Typography>
        )}
      </Box>
    );
  }

  const base = {
    bgcolor: "#fff",
    border: "2px solid",
    borderColor: color,
    userSelect: "none",
    boxShadow: selected
      ? `0 0 0 3px ${alpha(color, 0.28)}`
      : "0 4px 10px rgba(0,0,0,.08)",
  };

  if (shape === "diamond") {
    const size = 160;
    return (
      <Box
        sx={{ position: "relative", overflow: "visible" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Handles sides={sides} active={active} color={color} />
        <Box
          sx={{
            width: size,
            height: size,
            transform: "rotate(45deg)",
            borderRadius: 2,
            ...base,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Box sx={{ transform: "rotate(-45deg)", px: 2, textAlign: "center" }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color, mb: 0.5 }}
            >
              {data?.title?.trim() || "Título"}
            </Typography>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="body2">
              {data?.description?.trim() || "Descrição / decisão"}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  const skew = shape === "parallelogram" ? "-16deg" : "0deg";
  const skewText = shape === "parallelogram" ? "16deg" : "0deg";
  const radius = shape === "rounded" ? 9999 : 8;

  return (
    <Box
      sx={{ position: "relative", overflow: "visible" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handles sides={sides} active={active} color={color} />
      <Box
        sx={{
          minWidth: 220,
          p: 1.25,
          borderRadius: radius,
          transform: `skewX(${skew})`,
          ...base,
        }}
      >
        <Box sx={{ transform: `skewX(${skewText})` }}>
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 700, color, mb: 0.25 }}
          >
            {data?.title?.trim() || "Título"}
          </Typography>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="body2" sx={{ minHeight: 18 }}>
            {data?.description?.trim() || "Descrição / instruções"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const nodeTypes = { card: CardNode };

/* ============================
 * Helpers
 * ============================ */

import { API_BASE_URL } from "./utils/apiConfig";
const API_BASE = API_BASE_URL;
const ENDPOINT = `${API_BASE}/fluxogramas`;

const defaultViewport = { x: 0, y: 0, zoom: 1 };
const SNAP_GRID = [16, 16];

/* ============================
 * Main Component
 * ============================ */

const Fluxograma = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const rf = useRef(null);

  // diagrama
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // seleção/cópia
  const [clipboard, setClipboard] = useState(null);

  // meta
  const [diagramName, setDiagramName] = useState("Fluxo Faturamento");
  const [currentId, setCurrentId] = useState(null);
  const [loading, setLoading] = useState(false);

  // dialogs (fluxo)
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [fluxosList, setFluxosList] = useState([]);

  // editor de bloco
  const [editOpen, setEditOpen] = useState(false);
  const [editNodeId, setEditNodeId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    color: "#1976d2",
    shape: "rectangle",
    sides: { top: true, bottom: true, left: true, right: true },
  });

  // editor de linha
  const [edgeOpen, setEdgeOpen] = useState(false);
  const [editEdgeId, setEditEdgeId] = useState(null);
  const [edgeForm, setEdgeForm] = useState({
    label: "",
    type: "bezier",
    dashed: false,
    color: "#666666",
  });

  // snackbar
  const [toast, setToast] = useState({ open: false, msg: "", sev: "success" });
  const showToast = useCallback(
    (msg, sev = "success") => setToast({ open: true, msg, sev }),
    []
  );

  // impressão
  const [printOpen, setPrintOpen] = useState(false);
  const [printOpts, setPrintOpts] = useState({
    orientation: "portrait",
    marginMm: 10,
    quality: 3,
  });
  const [cleanPrintMode, setCleanPrintMode] = useState(false);

  // mostrar bolinhas em todos os nós durante arraste
  const [showAllHandles, setShowAllHandles] = useState(false);

  /* ===== React Flow handlers ===== */

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            type: "bezier",
            style: { stroke: "#666", strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  );

  const addNode = useCallback(() => {
    const id = uuidv4();
    const position = {
      x: 120 + Math.random() * 280,
      y: 120 + Math.random() * 220,
    };
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "card",
        position,
        data: {
          title: "",
          description: "",
          color: "#1976d2",
          shape: "rectangle",
          sides: { top: true, bottom: true, left: true, right: true },
        },
      },
    ]);
  }, []);

  // deletar seleção
  const deleteSelection = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, []);

  // copiar/colar
  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (!selectedNodes.length && !selectedEdges.length) {
      showToast("Nada selecionado para copiar", "info");
      return;
    }
    setClipboard({
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(selectedEdges)),
    });
    showToast("Copiado!", "success");
  }, [nodes, edges, showToast]);

  const pasteSelection = useCallback(() => {
    if (!clipboard) return;
    const offset = 24;
    const newNodeIds = new Map();
    const pastedNodes = clipboard.nodes.map((n) => {
      const id = uuidv4();
      newNodeIds.set(n.id, id);
      return {
        ...n,
        id,
        position: { x: n.position.x + offset, y: n.position.y + offset },
        selected: false,
      };
    });
    const pastedEdges = clipboard.edges.map((e) => ({
      ...e,
      id: uuidv4(),
      source: newNodeIds.get(e.source) || e.source,
      target: newNodeIds.get(e.target) || e.target,
      selected: false,
    }));
    setNodes((nds) => [...nds, ...pastedNodes]);
    setEdges((eds) => [...eds, ...pastedEdges]);
  }, [clipboard]);

  // zoom/viewport
  const doZoomIn = useCallback(() => rf.current?.zoomIn?.(), []);
  const doZoomOut = useCallback(() => rf.current?.zoomOut?.(), []);
  const doFit = useCallback(() => rf.current?.fitView?.({ padding: 0.2 }), []);
  const doReset = useCallback(
    () => rf.current?.setViewport?.(defaultViewport),
    []
  );

  /* ===== Load draft or start empty ===== */

  useEffect(() => {
    const draft = localStorage.getItem("fluxograma_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
        setDiagramName(parsed.name || "Fluxo Faturamento");
        setCurrentId(parsed.id || null);
      } catch {}
    } else {
      addNode();
    }
  }, [addNode]);

  // persistência local
  useEffect(() => {
    const payloadLS = { id: currentId, name: diagramName, nodes, edges };
    localStorage.setItem("fluxograma_draft", JSON.stringify(payloadLS));
  }, [nodes, edges, diagramName, currentId]);

  /* ============================
   * Backend (já preparado)
   * ============================ */

  const payload = useMemo(
    () => ({
      id: currentId,
      name: diagramName,
      nodes,
      edges,
      viewport: rf.current?.getViewport?.() || defaultViewport,
      updatedAt: new Date().toISOString(),
    }),
    [currentId, diagramName, nodes, edges]
  );

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      if (currentId) {
        await axios.put(`${ENDPOINT}/${currentId}`, payload);
        showToast("Fluxo atualizado com sucesso!");
      } else {
        const { data } = await axios.post(ENDPOINT, payload);
        setCurrentId(data?.id || data?._id || null);
        showToast("Fluxo salvo com sucesso!");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar fluxo", "error");
    } finally {
      setLoading(false);
    }
  }, [currentId, payload, showToast]);

  const handleSaveAs = async (newName) => {
    try {
      setLoading(true);
      const { data } = await axios.post(ENDPOINT, {
        ...payload,
        id: null,
        name: newName,
      });
      setCurrentId(data?.id || data?._id || null);
      setDiagramName(newName);
      showToast("Salvo como novo fluxo!");
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar como", "error");
    } finally {
      setLoading(false);
      setSaveAsOpen(false);
    }
  };

  const handleOpenList = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(ENDPOINT);
      setFluxosList(Array.isArray(data) ? data : []);
      setOpenDialog(true);
    } catch (e) {
      console.error(e);
      showToast("Erro ao listar fluxos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (fluxo) => {
    try {
      setLoading(true);
      const id = fluxo.id || fluxo._id;
      const { data } = await axios.get(`${ENDPOINT}/${id}`);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setDiagramName(data.name || "Fluxo Faturamento");
      setCurrentId(id);
      const vp = data.viewport || defaultViewport;
      setTimeout(() => rf.current?.setViewport?.(vp), 0);
      setOpenDialog(false);
      showToast("Fluxo carregado!");
    } catch (e) {
      console.error(e);
      showToast("Erro ao abrir fluxo", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ===== Edição do bloco ===== */

  const openEditorFor = useCallback((node) => {
    setEditNodeId(node.id);
    setForm({
      title: node.data.title || "",
      description: node.data.description || "",
      color: node.data.color || "#1976d2",
      shape: node.data.shape || "rectangle",
      sides: node.data.sides || {
        top: true,
        bottom: true,
        left: true,
        right: true,
      },
    });
    setEditOpen(true);
  }, []);

  const applyEdit = () => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editNodeId ? { ...n, data: { ...n.data, ...form } } : n
      )
    );
    setEditOpen(false);
  };

  /* ===== Edição da linha ===== */

  const openEdgeEditor = useCallback((edge) => {
    setEditEdgeId(edge.id);
    const dashed = !!edge?.style?.strokeDasharray;
    setEdgeForm({
      label: edge.label || "",
      type: edge.type || "bezier",
      dashed,
      color: (edge.style && edge.style.stroke) || "#666666",
    });
    setEdgeOpen(true);
  }, []);

  const applyEdgeEdit = () => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === editEdgeId
          ? {
              ...e,
              type: edgeForm.type,
              label: edgeForm.label,
              style: {
                ...(e.style || {}),
                stroke: edgeForm.color,
                strokeDasharray: edgeForm.dashed ? "6 6" : undefined,
                strokeWidth: e.selected ? 3 : 2,
              },
            }
          : e
      )
    );
    setEdgeOpen(false);
  };

  /* ===== Teclado ===== */

  // ignora atalhos quando o foco está em um campo editável
  const isEditableTarget = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    // MUI TextField vira um input/textarea por baixo, mas por via das dúvidas:
    if ((el.getAttribute && el.getAttribute("role")) === "textbox") return true;
    return false;
  };

  useEffect(() => {
    const onKey = (e) => {
      // se estiver digitando em um campo OU com qualquer diálogo aberto, não dispare atalhos
      if (
        isEditableTarget(e.target) ||
        editOpen ||
        edgeOpen ||
        openDialog ||
        saveAsOpen ||
        printOpen
      ) {
        return;
      }

      // atalhos globais
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        doReset();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        doZoomIn();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        doZoomOut();
        return;
      }
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey) {
        addNode();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    // deps
    editOpen,
    edgeOpen,
    openDialog,
    saveAsOpen,
    printOpen,
    deleteSelection,
    handleSave,
    copySelection,
    pasteSelection,
    doReset,
    doZoomIn,
    doZoomOut,
    addNode,
  ]);

  /* ===== Aparência de seleção das linhas ===== */

  const edgesView = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        style: {
          ...(e.style || {}),
          strokeWidth: e.selected ? 3 : 2,
        },
      })),
    [edges]
  );

  // Nós com flag para exibir handles durante arraste
  const nodesView = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, __showAllHandles: showAllHandles },
      })),
    [nodes, showAllHandles]
  );

  /* ===== Import/Export JSON ===== */

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `${diagramName.replace(/\s+/g, "_")}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = async (file) => {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setDiagramName(data.name || "Fluxo Importado");
      setCurrentId(data.id || null);
      const vp = data.viewport || defaultViewport;
      setTimeout(() => rf.current?.setViewport?.(vp), 0);
      showToast("JSON importado!");
    } catch {
      showToast("Arquivo inválido", "error");
    }
  };

  const FileInputButton = ({ onPick, children }) => {
    const inputRef = useRef();
    return (
      <>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadIcon />}
          onClick={() => inputRef.current?.click()}
        >
          {children}
        </Button>
      </>
    );
  };

  // cria um iframe invisível e imprime
  const printHTMLUsingIframe = (html) => {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);
    iframe.srcdoc = html;

    const onLoad = () => {
      try {
        iframe.contentWindow.focus();
        setTimeout(() => {
          iframe.contentWindow.print();
          const cleanup = () => {
            iframe.removeEventListener("load", onLoad);
            if (iframe && iframe.parentNode)
              iframe.parentNode.removeChild(iframe);
            iframe.contentWindow.removeEventListener("afterprint", cleanup);
          };
          iframe.contentWindow.addEventListener("afterprint", cleanup);
        }, 150);
      } catch {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }
    };
    iframe.addEventListener("load", onLoad);
  };

  /* ===== Impressão A4 (limpa) ===== */

  const handlePrintA4 = async () => {
    try {
      const node = wrapperRef.current;
      if (!node) {
        showToast("Canvas não encontrado", "error");
        return;
      }
      setLoading(true);

      setCleanPrintMode(true);
      await new Promise((r) => setTimeout(r, 60)); // espera re-render

      await rf.current?.fitView?.({ padding: 0.2 });

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: Math.max(2, Math.min(4, Number(printOpts.quality) || 3)),
        backgroundColor: "#ffffff",
        filter: (domNode) => {
          if (!domNode || domNode.nodeType !== 1) return true;
          const cl = domNode.classList;
          if (!cl) return true;
          return !(
            cl.contains("react-flow__background") ||
            cl.contains("react-flow__minimap") ||
            cl.contains("react-flow__controls") ||
            cl.contains("react-flow__attribution") ||
            cl.contains("react-flow__selection") ||
            cl.contains("react-flow__resize-control") ||
            cl.contains("react-flow__edgeupdater") ||
            cl.contains("react-flow__handle")
          );
        },
      });

      const margin = Math.max(0, Number(printOpts.marginMm) || 10);
      const orient =
        printOpts.orientation === "landscape" ? "landscape" : "portrait";

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Impressão Fluxograma</title>
    <style>
      @page { size: A4 ${orient}; margin: ${margin}mm; }
      html, body { height: 100%; margin: 0; background: #fff; }
      .page { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; }
      img { width: 100%; height: auto; page-break-inside: avoid; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="page">
      <img src="${dataUrl}" alt="Fluxograma"/>
    </div>
  </body>
</html>`;

      printHTMLUsingIframe(html);
    } catch (err) {
      console.error(err);
      showToast("Falha ao gerar imagem para impressão", "error");
    } finally {
      setCleanPrintMode(false);
      setLoading(false);
      setPrintOpen(false);
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* CSS do modo de impressão limpa */}
      {cleanPrintMode && (
        <style>{`
          .print-clean .react-flow__handle,
          .print-clean .custom-handle { display: none !important; }
        `}</style>
      )}

      <AppBar position="static">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Button color="inherit" onClick={() => navigate("/")}>
            <ArrowBackIcon sx={{ mr: 1 }} />
            Home
          </Button>
          <AccountTreeIcon />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Fluxograma — Faturamento
          </Typography>

          <TextField
            size="small"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            sx={{
              bgcolor: "rgba(255,255,255,.1)",
              borderRadius: 1,
              mr: 1,
              input: { color: "white", fontWeight: 600 },
            }}
          />

          <Tooltip title="Salvar (Ctrl+S)">
            <span>
              <IconButton
                color="inherit"
                onClick={handleSave}
                disabled={loading}
              >
                <SaveIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Salvar como...">
            <span>
              <IconButton color="inherit" onClick={() => setSaveAsOpen(true)}>
                <SaveAsIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Abrir">
            <span>
              <IconButton color="inherit" onClick={handleOpenList}>
                <FolderOpenIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Imprimir em A4">
            <span>
              <IconButton
                color="inherit"
                onClick={() => setPrintOpen(true)}
                disabled={loading}
              >
                <PrintIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Toolbar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Blocos:
          </Typography>
          <Tooltip title="Novo bloco (N)">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddBoxIcon />}
              onClick={addNode}
            >
              Bloco
            </Button>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Copiar (Ctrl+C)">
            <span>
              <IconButton size="small" onClick={copySelection}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Colar (Ctrl+V)">
            <span>
              <IconButton size="small" onClick={pasteSelection}>
                <ContentPasteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Apagar seleção (Del)">
            <span>
              <IconButton size="small" onClick={deleteSelection}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Zoom - (Ctrl -)">
            <IconButton size="small" onClick={doZoomOut}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom + (Ctrl +)">
            <IconButton size="small" onClick={doZoomIn}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ajustar à tela">
            <IconButton size="small" onClick={doFit}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <FileInputButton onPick={importJSON}>Importar JSON</FileInputButton>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportJSON}
          >
            Exportar JSON
          </Button>
        </Stack>
      </Box>

      {/* Canvas */}
      <Box
        ref={wrapperRef}
        className={cleanPrintMode ? "print-clean" : undefined}
        sx={{ flex: 1, bgcolor: "#fff" }}
      >
        <ReactFlow
          nodes={nodesView}
          edges={edgesView}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={defaultViewport}
          snapToGrid
          snapGrid={SNAP_GRID}
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => (rf.current = instance)}
          onNodeDoubleClick={(_, node) => openEditorFor(node)}
          onEdgeDoubleClick={(_, edge) => openEdgeEditor(edge)}
          onConnectStart={() => setShowAllHandles(true)}
          onConnectEnd={() => setShowAllHandles(false)}
          onConnectStop={() => setShowAllHandles(false)}
        >
          {!cleanPrintMode && <Background gap={16} size={1} />}
          {!cleanPrintMode && <MiniMap pannable zoomable />}
          {!cleanPrintMode && <Controls showInteractive={false} />}
        </ReactFlow>
      </Box>

      {/* Dialog: Editar Bloco */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar bloco</DialogTitle>
        <DialogContent sx={{ pt: 2, display: "grid", gap: 2 }}>
          <TextField
            label="Título"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Descrição"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            multiline
            minRows={3}
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2">Cor do bloco:</Typography>
            <input
              type="color"
              value={form.color}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
              style={{ width: 48, height: 32, border: "none" }}
            />
          </Box>
          <FormControl fullWidth>
            <InputLabel id="shape-label">Formato</InputLabel>
            <Select
              labelId="shape-label"
              label="Formato"
              value={form.shape}
              onChange={(e) =>
                setForm((f) => ({ ...f, shape: e.target.value }))
              }
            >
              <MenuItem value="rectangle">Retângulo</MenuItem>
              <MenuItem value="rounded">Arredondado (Início/Fim)</MenuItem>
              <MenuItem value="diamond">Losango (Decisão)</MenuItem>
              <MenuItem value="parallelogram">Paralelogramo (E/S)</MenuItem>
              <MenuItem value="text">Texto livre</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2">Conectores</Typography>
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.sides.top}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sides: { ...f.sides, top: e.target.checked },
                    }))
                  }
                />
              }
              label="Topo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.sides.bottom}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sides: { ...f.sides, bottom: e.target.checked },
                    }))
                  }
                />
              }
              label="Baixo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.sides.left}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sides: { ...f.sides, left: e.target.checked },
                    }))
                  }
                />
              }
              label="Esquerda"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!form.sides.right}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sides: { ...f.sides, right: e.target.checked },
                    }))
                  }
                />
              }
              label="Direita"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={applyEdit}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Editar Linha */}
      <Dialog
        open={edgeOpen}
        onClose={() => setEdgeOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar ligação</DialogTitle>
        <DialogContent sx={{ pt: 2, display: "grid", gap: 2 }}>
          <TextField
            label="Rótulo (ex.: SIM / NÃO)"
            value={edgeForm.label}
            onChange={(e) =>
              setEdgeForm((f) => ({ ...f, label: e.target.value }))
            }
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="edge-type-label">Tipo</InputLabel>
            <Select
              labelId="edge-type-label"
              label="Tipo"
              value={edgeForm.type}
              onChange={(e) =>
                setEdgeForm((f) => ({ ...f, type: e.target.value }))
              }
            >
              <MenuItem value="bezier">Curva (Bezier)</MenuItem>
              <MenuItem value="straight">Reta</MenuItem>
              <MenuItem value="step">Escada (Step)</MenuItem>
              <MenuItem value="smoothstep">Suave (SmoothStep)</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2">Cor da linha:</Typography>
            <input
              type="color"
              value={edgeForm.color}
              onChange={(e) =>
                setEdgeForm((f) => ({ ...f, color: e.target.value }))
              }
              style={{ width: 48, height: 32, border: "none" }}
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={edgeForm.dashed}
                onChange={(e) =>
                  setEdgeForm((f) => ({ ...f, dashed: e.target.checked }))
                }
              />
            }
            label="Pontilhada"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdgeOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={applyEdgeEdit}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Salvar como */}
      <Dialog
        open={saveAsOpen}
        onClose={() => setSaveAsOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Salvar como…</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nome do fluxo"
            fullWidth
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveAsOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={() => handleSaveAs(diagramName.trim() || "Novo Fluxo")}
            variant="contained"
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Abrir */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Abrir Fluxo</DialogTitle>
        <DialogContent dividers>
          {fluxosList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum fluxo encontrado.
            </Typography>
          ) : (
            <List dense>
              {fluxosList.map((f) => (
                <ListItemButton
                  key={f.id || f._id}
                  onClick={() => handleOpen(f)}
                >
                  <ListItemText
                    primary={f.name}
                    secondary={new Date(
                      f.updatedAt || f.createdAt || Date.now()
                    ).toLocaleString()}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Opções de Impressão */}
      <Dialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Imprimir em A4</DialogTitle>
        <DialogContent sx={{ pt: 2, display: "grid", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="orient-label">Orientação</InputLabel>
            <Select
              labelId="orient-label"
              label="Orientação"
              value={printOpts.orientation}
              onChange={(e) =>
                setPrintOpts((o) => ({ ...o, orientation: e.target.value }))
              }
            >
              <MenuItem value="portrait">Retrato (210 × 297 mm)</MenuItem>
              <MenuItem value="landscape">Paisagem (297 × 210 mm)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Margem (mm)"
            type="number"
            inputProps={{ min: 0, max: 25, step: 1 }}
            value={printOpts.marginMm}
            onChange={(e) =>
              setPrintOpts((o) => ({ ...o, marginMm: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Qualidade (2 a 4)"
            type="number"
            inputProps={{ min: 2, max: 4, step: 1 }}
            value={printOpts.quality}
            onChange={(e) =>
              setPrintOpts((o) => ({ ...o, quality: e.target.value }))
            }
            helperText="Aumente para impressão mais nítida (pode demorar mais)"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handlePrintA4}
            disabled={loading}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.sev}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Fluxograma;
