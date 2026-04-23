import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Paper,
    List,
    ListItem,
    alpha,
    Stack,
    Chip,
    ListItemIcon,
    ListItemText,
    DialogActions,
    Button
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PrintIcon from "@mui/icons-material/Print";

const brMoney = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });

export default function OrderEntregaDialog({
    open,
    onClose,
    gruposOriginais,
    onPrintWithOrder,
}) {
    const [grupos, setGrupos] = useState(gruposOriginais || []);
    const [dragIndex, setDragIndex] = useState(null);

    useEffect(() => {
        if (open) {
            setGrupos(gruposOriginais || []);
            setDragIndex(null);
        }
    }, [open, gruposOriginais]);

    const handleDragStart = (idx) => (e) => {
        setDragIndex(idx);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(idx));
    };
    const handleDragOver = (idx) => (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };
    const reorder = (list, from, to) => {
        const arr = list.slice();
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return arr;
    };
    const handleDrop = (idx) => (e) => {
        e.preventDefault();
        const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from) && from !== idx) {
            setGrupos((prev) => reorder(prev, from, idx));
        }
        setDragIndex(null);
    };

    const handlePrint = () => {
        const orderedBilhetes = grupos.flatMap((g) =>
            (g.bilhetes || []).map((b) => b.bilhete).filter(Boolean)
        );
        onPrintWithOrder(orderedBilhetes);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TuneIcon fontSize="small" /> Organizar ordem de entrega (por cliente)
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                    Arraste os clientes para definir a sequência. Ao imprimir, será usada
                    <b> esta ordem temporária</b>. Ao fechar, a tela volta ao padrão
                    (Protheus).
                </Typography>

                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <List dense disablePadding>
                        {grupos.map((g, idx) => (
                            <ListItem
                                key={g.key}
                                divider
                                draggable
                                onDragStart={handleDragStart(idx)}
                                onDragOver={handleDragOver(idx)}
                                onDrop={handleDrop(idx)}
                                sx={{
                                    cursor: "grab",
                                    "&:active": { cursor: "grabbing" },
                                    bgcolor:
                                        dragIndex === idx
                                            ? (t) => alpha(t.palette.primary.main, 0.06)
                                            : "transparent",
                                }}
                                secondaryAction={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={brMoney(g.total)}
                                            variant="outlined"
                                            color="success"
                                        />
                                        <Chip
                                            size="small"
                                            label={`${g.bilhetes?.length ?? 0} bilhete(s)`}
                                            variant="outlined"
                                        />
                                    </Stack>
                                }
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <DragIndicatorIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2">{g.nome}</Typography>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="text.secondary">
                                            {g.vendedor ? `Vendedor: ${g.vendedor}` : ""}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar (sem salvar)</Button>
                <Button
                    onClick={handlePrint}
                    startIcon={<PrintIcon />}
                    variant="contained"
                >
                    Imprimir nessa ordem
                </Button>
            </DialogActions>
        </Dialog>
    );
}
