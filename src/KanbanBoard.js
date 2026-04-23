// src/KanbanBoard.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Badge,
  Tooltip,
  Divider,
  Stack,
  Collapse,
} from "@mui/material";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import LinkIcon from "@mui/icons-material/InsertLink";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import { red, indigo, grey } from "@mui/material/colors";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { API_BASE_URL } from './utils/apiConfig';

// Responsáveis e prioridades
const RESPONSAVEIS = [
  "Amarildo",
  "Gustavo",
  "Ana",
  "Aprendiz",
  "Elissandra",
  "Adna",
  "Jeniffer",
  "Keysse",
  "Faturamento",
  "Noite",
  "Dia",
];

const PRIORIDADES = ["BAIXA", "MÉDIA", "ALTA", "CRÍTICA"];

// estilos base
const columnStyle = {
  p: 2,
  width: 380,
  minHeight: 560,
  borderRadius: 3,
  overflow: "visible",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: (t) =>
    t.palette.mode === "light"
      ? "0 2px 12px rgba(0,0,0,0.04)"
      : "0 2px 12px rgba(0,0,0,0.6)",
};

const cardStyle = {
  p: 1.5,
  mb: 1.5,
  borderRadius: 2,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  transition: "transform 120ms ease, box-shadow 120ms ease",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
  },
};

// gera colunas com fundo levemente colorido conforme o tema
const getColumns = (t) => [
  {
    id: "todo",
    title: "A Fazer",
    emoji: "📝",
    color: "#1976d2",
    bg: alpha("#1976d2", t.palette.mode === "light" ? 0.06 : 0.12),
  },
  {
    id: "doing",
    title: "Em Progresso",
    emoji: "🚧",
    color: "#ed6c02",
    bg: alpha("#ed6c02", t.palette.mode === "light" ? 0.07 : 0.14),
  },
  {
    id: "done",
    title: "Concluído",
    emoji: "✅",
    color: "#2e7d32",
    bg: alpha("#2e7d32", t.palette.mode === "light" ? 0.07 : 0.14),
  },
];

function prioridadeChipColor(p) {
  switch (p) {
    case "CRÍTICA":
      return { color: "error", variant: "filled" };
    case "ALTA":
      return { color: "warning", variant: "filled" };
    case "MÉDIA":
      return { color: "primary", variant: "outlined" };
    default:
      return { color: "default", variant: "outlined" };
  }
}

export default function KanbanBoard() {
  const confettiCanvasRef = useRef(null);
  const confettiInstanceRef = useRef(null);
  const navigate = useNavigate();

  // tema: claro/escuro com persistência
  const [mode, setMode] = useState(
    () => localStorage.getItem("kanban_theme_mode") || "light"
  );

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === "light" ? "dark" : "light";
      localStorage.setItem("kanban_theme_mode", next);
      return next;
    });
  }, []);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#1976d2" },
          background: {
            default: mode === "light" ? "#f7f8fb" : "#0f1116",
            paper: mode === "light" ? "#fff" : "#11151b",
          },
        },
        shape: { borderRadius: 10 },
      }),
    [mode]
  );

  const COLUMNS = React.useMemo(() => getColumns(theme), [theme]);

  // anexo (novo / existente / flag de remoção)
  const [file, setFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [clearFile, setClearFile] = useState(false);

  // visualização (somente leitura)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTask, setViewTask] = useState(null);

  // filtros + colapso
  const [filters, setFilters] = useState({
    assignee: "",
    priority: "",
    dueBefore: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFiltersCount =
    (filters.assignee ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.dueBefore ? 1 : 0);

  const [tasksByCol, setTasksByCol] = useState({
    todo: [],
    doing: [],
    done: [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    priority: "MÉDIA",
    dueDate: "",
    status: "todo",
  });

  const api = API_BASE_URL;
  const base = `${api}/ocorrencias`; // backend montado sob /ocorrencias

  const fetchTasks = useCallback(async () => {
    const { data } = await axios.get(`${base}/tasks`);
    const next = { todo: [], doing: [], done: [] };
    data.forEach((t) => next[t.status]?.push(t));
    Object.keys(next).forEach((k) =>
      next[k].sort((a, b) => a.order_index - b.order_index)
    );
    setTasksByCol(next);
  }, [base]);

  useEffect(() => {
    if (!confettiCanvasRef.current) return;
    confettiInstanceRef.current = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    });
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // —— CRUD modal
  const openNew = (status = "todo") => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      assignee: "",
      priority: "MÉDIA",
      dueDate: "",
      status,
    });
    setFile(null);
    setExistingFile(null);
    setClearFile(false);
    setOpen(true);
  };

  const fireConfetti = () => {
    const conf = confettiInstanceRef.current;
    if (!conf) return;
    const defaults = { spread: 70, ticks: 110, gravity: 0.8 };
    conf({ ...defaults, particleCount: 90, origin: { y: 0.25 } });
    setTimeout(
      () =>
        conf({ ...defaults, particleCount: 60, origin: { x: 0.2, y: 0.35 } }),
      120
    );
    setTimeout(
      () =>
        conf({ ...defaults, particleCount: 60, origin: { x: 0.8, y: 0.35 } }),
      240
    );
  };

  const openEdit = (task) => {
    setEditing(task.id);
    setForm({
      id: task.id,
      title: task.title || "",
      description: task.description || "",
      assignee: task.assignee || "",
      priority: task.priority || "MÉDIA",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
      status: task.status || "todo",
    });
    setExistingFile(
      task.file_mime ? { name: task.file_name, mime: task.file_mime } : null
    );
    setFile(null);
    setClearFile(false);
    setOpen(true);
  };

  const openView = (task) => {
    setViewTask(task);
    setViewOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return alert("Título é obrigatório");

    if (file || editing) {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (file) fd.append("file", file);
      if (clearFile) fd.append("clearFile", "true");

      if (editing) {
        await axios.put(`${base}/tasks/${editing}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${base}/tasks`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    } else {
      await axios.post(`${base}/tasks`, form);
    }

    setOpen(false);
    setFile(null);
    setExistingFile(null);
    setClearFile(false);
    await fetchTasks();
  };

  const removeTask = async (id) => {
    const colAtual = ["todo", "doing", "done"].find((col) =>
      tasksByCol[col].some((t) => t.id === id)
    );
    if (colAtual === "done") {
      alert(
        "Demanda concluída não pode ser excluída. Arraste para outra coluna para excluir."
      );
      return;
    }
    if (!window.confirm("Remover esta demanda?")) return;
    await axios.delete(`${base}/tasks/${id}`);
    await fetchTasks();
    if (viewTask?.id === id) setViewOpen(false);
  };

  // —— Drag & Drop
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    const movedToDone = dstCol === "done" && srcCol !== "done";
    if (movedToDone) fireConfetti();

    const prev = JSON.parse(JSON.stringify(tasksByCol));
    const newState = JSON.parse(JSON.stringify(tasksByCol));
    const [moved] = newState[srcCol].splice(source.index, 1);
    moved.status = dstCol;
    newState[dstCol].splice(destination.index, 0, moved);

    Object.keys(newState).forEach((col) => {
      newState[col] = newState[col].map((t, idx) => ({
        ...t,
        order_index: idx,
      }));
    });
    setTasksByCol(newState);

    try {
      const payload = {
        moves: Object.keys(newState).flatMap((col) =>
          newState[col].map((t) => ({
            id: t.id,
            status: col,
            order_index: t.order_index,
          }))
        ),
      };
      await axios.post(`${base}/reorder`, payload);
    } catch (e) {
      console.error(e);
      setTasksByCol(prev);
    }
  };

  // ----- APLICAÇÃO DOS FILTROS -----
  const filteredByCol = React.useMemo(() => {
    const out = { todo: [], doing: [], done: [] };
    const dueBeforeDate = filters.dueBefore
      ? new Date(filters.dueBefore + "T23:59:59")
      : null;

    const pass = (t) => {
      if (filters.assignee && t.assignee !== filters.assignee) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (dueBeforeDate) {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (d.getTime() > dueBeforeDate.getTime()) return false;
      }
      return true;
    };

    Object.keys(tasksByCol).forEach((col) => {
      out[col] = tasksByCol[col].filter(pass);
    });
    return out;
  }, [tasksByCol, filters]);

  // util
  const colById = (id) => COLUMNS.find((c) => c.id === id);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        {/* TopBar padrão */}
        <AppBar position="sticky" color="primary" elevation={1}>
          {/* Canvas confetes */}
          <canvas
            ref={confettiCanvasRef}
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              pointerEvents: "none",
              zIndex: 1300,
            }}
          />
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate("/faturamento")}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              SistemaFF — Kanban de Demandas
            </Typography>

            {/* Toggle Light/Dark */}
            <Tooltip title={mode === "light" ? "Tema escuro" : "Tema claro"}>
              <IconButton color="inherit" onClick={toggleMode}>
                {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            <Button
              color="inherit"
              startIcon={<AddIcon />}
              onClick={() => openNew("todo")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Nova Demanda
            </Button>
          </Toolbar>
        </AppBar>

        {/* Conteúdo */}
        <Box sx={{ maxWidth: 1500, mx: "auto", p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
            Quadro Kanban
          </Typography>

          {/* ===== CABEÇALHO DOS FILTROS (COLAPSÁVEL) ===== */}
          <Paper
            elevation={0}
            sx={{
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                px: 2,
                py: 1,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setFiltersOpen((v) => !v)}
              spacing={1}
            >
              <FilterListIcon fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                Filtros
              </Typography>

              {activeFiltersCount > 0 && (
                <Chip
                  size="small"
                  color="primary"
                  label={`${activeFiltersCount} ativo${
                    activeFiltersCount > 1 ? "s" : ""
                  }`}
                />
              )}

              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setFiltersOpen((v) => !v);
                }}
                sx={{
                  transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform .15s ease",
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>

            <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <TextField
                    select
                    size="small"
                    label="Responsável"
                    value={filters.assignee}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, assignee: e.target.value }))
                    }
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {RESPONSAVEIS.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Prioridade"
                    value={filters.priority}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, priority: e.target.value }))
                    }
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {PRIORIDADES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    type="date"
                    label="Prazo até"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dueBefore}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dueBefore: e.target.value }))
                    }
                    sx={{ minWidth: 180 }}
                  />

                  <Box sx={{ flex: 1 }} />

                  <Button
                    variant="outlined"
                    onClick={() =>
                      setFilters({ assignee: "", priority: "", dueBefore: "" })
                    }
                  >
                    Limpar filtros
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          </Paper>

          <DragDropContext onDragEnd={onDragEnd}>
            <Grid
              container
              spacing={2}
              wrap="nowrap"
              sx={{ overflowX: "auto", pb: 1 }}
            >
              {COLUMNS.map((col) => {
                const count = filteredByCol[col.id]?.length || 0;
                return (
                  <Grid item key={col.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        ...columnStyle,
                        bgcolor: col.bg,
                        borderColor: "transparent",
                      }}
                    >
                      {/* Header da coluna */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1.5,
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            fontWeight={800}
                            sx={{
                              color: col.color,
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: 20 }}>{col.emoji}</span>{" "}
                            {col.title}
                          </Typography>
                          <Badge
                            badgeContent={count}
                            color="primary"
                            sx={{
                              ml: 1,
                              "& .MuiBadge-badge": {
                                bgcolor: col.color,
                                color: "#fff",
                                fontWeight: 700,
                              },
                            }}
                          />
                        </Box>
                        <Button
                          size="small"
                          onClick={() => openNew(col.id)}
                          sx={{ color: col.color }}
                        >
                          Adicionar
                        </Button>
                      </Box>

                      {/* Lista (Droppable) */}
                      <Droppable droppableId={col.id} direction="vertical">
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{
                              minHeight: 480,
                              transition: "background-color 120ms ease",
                              borderRadius: 2,
                              p: 0.5,
                              bgcolor: snapshot.isDraggingOver
                                ? "rgba(0,0,0,0.06)"
                                : "transparent",
                            }}
                          >
                            {filteredByCol[col.id]?.map((t, index) => {
                              const prChip = prioridadeChipColor(t.priority);
                              return (
                                <Draggable
                                  key={t.id}
                                  draggableId={String(t.id)}
                                  index={index}
                                >
                                  {(prov, snap) => (
                                    <Paper
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      {...prov.dragHandleProps}
                                      onClick={() => {
                                        if (!snap.isDragging) openView(t);
                                      }}
                                      sx={{
                                        ...cardStyle,
                                        borderLeft: `4px solid ${col.color}`,
                                        opacity: snap.isDragging ? 0.9 : 1,
                                        cursor: "pointer",
                                        bgcolor: "background.paper",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                        }}
                                      >
                                        <Typography fontWeight={700}>
                                          {t.title}
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          {/* Ícone do anexo (se houver) */}
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.5,
                                              mr: 0.5,
                                            }}
                                          >
                                            {t.file_mime && (
                                              <Tooltip
                                                title={
                                                  t.file_name || "Abrir anexo"
                                                }
                                              >
                                                <IconButton
                                                  size="small"
                                                  component="a"
                                                  href={`${base}/tasks/${t.id}/file`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  sx={{
                                                    color:
                                                      t.file_mime ===
                                                      "application/pdf"
                                                        ? red[600]
                                                        : t.file_mime?.startsWith(
                                                            "image/"
                                                          )
                                                        ? indigo[600]
                                                        : grey[700],
                                                    "&:hover": {
                                                      backgroundColor:
                                                        t.file_mime ===
                                                        "application/pdf"
                                                          ? red[50]
                                                          : t.file_mime?.startsWith(
                                                              "image/"
                                                            )
                                                          ? indigo[50]
                                                          : grey[100],
                                                    },
                                                  }}
                                                >
                                                  {t.file_mime ===
                                                  "application/pdf" ? (
                                                    <PictureAsPdfIcon fontSize="small" />
                                                  ) : t.file_mime?.startsWith(
                                                      "image/"
                                                    ) ? (
                                                    <ImageIcon fontSize="small" />
                                                  ) : (
                                                    <LinkIcon fontSize="small" />
                                                  )}
                                                </IconButton>
                                              </Tooltip>
                                            )}
                                          </Box>

                                          {/* Editar / Excluir */}
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEdit(t);
                                            }}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <Tooltip
                                            title={
                                              t.status === "done"
                                                ? "Concluída: mova para outra coluna para excluir"
                                                : "Excluir"
                                            }
                                          >
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeTask(t.id);
                                                }}
                                                disabled={t.status === "done"}
                                              >
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                        </Box>
                                      </Box>

                                      {t.description && (
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            mt: 0.5,
                                            mb: 1,
                                            color: "text.secondary",
                                          }}
                                        >
                                          {t.description}
                                        </Typography>
                                      )}

                                      <Box
                                        sx={{
                                          display: "flex",
                                          gap: 1,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {t.assignee && (
                                          <Chip
                                            size="small"
                                            label={`👤 ${t.assignee}`}
                                            variant="outlined"
                                          />
                                        )}
                                        {t.priority && (
                                          <Chip
                                            size="small"
                                            label={`🔥 ${t.priority}`}
                                            color={prChip.color}
                                            variant={prChip.variant}
                                          />
                                        )}
                                        {t.dueDate && (
                                          <Chip
                                            size="small"
                                            label={`🗓️ ${new Date(
                                              t.dueDate
                                            ).toLocaleDateString("pt-BR")}`}
                                            variant="outlined"
                                          />
                                        )}
                                      </Box>
                                    </Paper>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}

                            {/* estado vazio */}
                            {count === 0 && (
                              <Box
                                sx={{
                                  opacity: 0.7,
                                  fontSize: 13,
                                  textAlign: "center",
                                  py: 6,
                                  color: "text.secondary",
                                }}
                              >
                                Sem itens para os filtros selecionados.
                              </Box>
                            )}
                          </Box>
                        )}
                      </Droppable>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </DragDropContext>
        </Box>

        {/* Modal criar/editar */}
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {editing ? "Editar demanda" : "Nova demanda"}
          </DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
            <TextField
              label="Título *"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              autoFocus
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              multiline
              minRows={3}
            />

            <TextField
              select
              label="Responsável"
              value={form.assignee}
              onChange={(e) =>
                setForm((f) => ({ ...f, assignee: e.target.value }))
              }
            >
              <MenuItem value="">— Sem responsável —</MenuItem>
              {RESPONSAVEIS.map((nome) => (
                <MenuItem key={nome} value={nome}>
                  {nome}
                </MenuItem>
              ))}
            </TextField>

            {/* ANEXO (mostrar atual + remover/substituir) */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {existingFile && !clearFile && (
                <>
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={
                      existingFile.mime === "application/pdf" ? (
                        <PictureAsPdfIcon />
                      ) : existingFile.mime?.startsWith("image/") ? (
                        <ImageIcon />
                      ) : (
                        <LinkIcon />
                      )
                    }
                    label={existingFile.name || "Anexo atual"}
                    sx={{
                      color:
                        existingFile.mime === "application/pdf"
                          ? red[600]
                          : existingFile.mime?.startsWith("image/")
                          ? indigo[600]
                          : grey[700],
                      "& .MuiChip-icon": {
                        color:
                          existingFile.mime === "application/pdf"
                            ? red[600]
                            : existingFile.mime?.startsWith("image/")
                            ? indigo[600]
                            : grey[700],
                      },
                    }}
                  />
                  {editing && (
                    <Button
                      size="small"
                      href={`${base}/tasks/${editing}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir
                    </Button>
                  )}
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      setClearFile(true);
                      setFile(null);
                    }}
                  >
                    Remover
                  </Button>
                </>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
              >
                {existingFile && !clearFile
                  ? "Substituir anexo"
                  : "Anexar imagem/PDF"}
                <input
                  hidden
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setClearFile(false);
                  }}
                />
              </Button>

              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {file
                  ? file.name
                  : clearFile
                  ? "Anexo será removido ao salvar"
                  : !existingFile
                  ? "Nenhum arquivo selecionado"
                  : ""}
              </Typography>
            </Box>

            <TextField
              select
              label="Prioridade"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              {PRIORIDADES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Prazo"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.dueDate ? String(form.dueDate).slice(0, 10) : ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="error">
              Cancelar
            </Button>
            <Button onClick={saveTask} variant="contained">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de visualização da task (somente leitura) */}
        <Dialog
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
        >
          <Box
            sx={{
              px: 3,
              pt: 2.5,
              pb: 1.5,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ flex: 1, lineHeight: 1.2 }}
              >
                {viewTask?.title || "Visualizar demanda"}
              </Typography>

              {viewTask?.file_mime && (
                <Tooltip title={viewTask?.file_name || "Abrir anexo"}>
                  <IconButton
                    size="small"
                    component="a"
                    href={viewTask ? `${base}/tasks/${viewTask.id}/file` : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewTask.file_mime === "application/pdf" ? (
                      <PictureAsPdfIcon />
                    ) : viewTask.file_mime?.startsWith("image/") ? (
                      <ImageIcon />
                    ) : (
                      <LinkIcon />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {viewTask && (
                <>
                  <Chip
                    size="small"
                    label={`${colById(viewTask.status)?.emoji || ""} ${
                      colById(viewTask.status)?.title || "—"
                    }`}
                    sx={{
                      bgcolor: alpha(
                        colById(viewTask.status)?.color || "#999",
                        0.12
                      ),
                      color: colById(viewTask.status)?.color || "inherit",
                      fontWeight: 700,
                    }}
                  />
                  {viewTask.assignee && (
                    <Chip size="small" label={`👤 ${viewTask.assignee}`} />
                  )}
                  {viewTask.priority && (
                    <Chip
                      size="small"
                      label={`🔥 ${viewTask.priority}`}
                      color={prioridadeChipColor(viewTask.priority).color}
                      variant={prioridadeChipColor(viewTask.priority).variant}
                    />
                  )}
                  {viewTask.dueDate && (
                    <Chip
                      size="small"
                      label={`🗓️ ${new Date(
                        viewTask.dueDate
                      ).toLocaleDateString("pt-BR")}`}
                      variant="outlined"
                    />
                  )}
                </>
              )}
            </Stack>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {viewTask?.description ? (
              <Typography
                sx={{ whiteSpace: "pre-wrap", mb: 2, color: "text.secondary" }}
              >
                {viewTask.description}
              </Typography>
            ) : (
              <Typography sx={{ mb: 2, color: "text.disabled" }}>
                Sem descrição.
              </Typography>
            )}

            {viewTask?.file_mime?.startsWith?.("image/") && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box
                  component="img"
                  src={`${base}/tasks/${viewTask.id}/file`}
                  alt={viewTask.file_name || "Anexo"}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    display: "block",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              </>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
