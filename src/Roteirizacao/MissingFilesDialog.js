import React, { useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Chip,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    Box,
    Typography,
    ListItemText,
    DialogActions,
    Button,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

export default function MissingFilesDialog({ open, summary = [], onClose }) {
    const totals = useMemo(() => {
        const t = { ok: 0, incompletos: 0, ausentes: 0 };
        for (const s of summary) {
            const miss = s.missing || [];
            // Verifica se tem algum arquivo encontrado
            const filesObj = s.files || {};
            const count = (filesObj.bilhete?.length || 0) + (filesObj.boleto?.length || 0) + (filesObj.nota?.length || 0);

            if (miss.length === 0) {
                t.ok++;
            } else if (count > 0) {
                // Tem algo, mas faltam coisas (futuro)
                t.incompletos++;
            } else {
                t.ausentes++;
            }
        }
        return t;
    }, [summary]);

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
            <DialogTitle>Arquivos faltando nesta rota</DialogTitle>

            <DialogContent dividers sx={{ pt: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
                    <Chip
                        label={`Completos: ${totals.ok}`}
                        color="success"
                        variant="outlined"
                    />
                    <Chip
                        label={`Incompletos: ${totals.incompletos}`}
                        color="warning"
                        variant="outlined"
                    />
                    <Chip
                        label={`Ausentes: ${totals.ausentes}`}
                        color="error"
                        variant="outlined"
                    />
                </Stack>

                <Paper
                    variant="outlined"
                    sx={{ borderRadius: 1.5, overflow: "hidden" }}
                >
                    <List dense disablePadding>
                        {summary.map((s, i) => {
                            const prefix = String(s.prefix || "").replace(/\.pdf$/i, "");
                            const miss = s.missing || [];
                            const filesObj = s.files || {};
                            const count = (filesObj.bilhete?.length || 0) + (filesObj.boleto?.length || 0) + (filesObj.nota?.length || 0);

                            let statusColor = "success";
                            if (miss.length > 0) {
                                statusColor = count > 0 ? "warning" : "error";
                            }

                            return (
                                <ListItem
                                    key={`${prefix}-${i}`}
                                    divider
                                    alignItems="flex-start"
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Box
                                            sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                bgcolor: (t) =>
                                                ({
                                                    success: t.palette.success.main,
                                                    warning: t.palette.warning.main,
                                                    error: t.palette.error.main,
                                                }[statusColor]),
                                            }}
                                        />
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontFamily: "monospace" }}
                                                >
                                                    {prefix}
                                                </Typography>
                                                {statusColor === "success" && (
                                                    <Chip size="small" color="success" label="completo" />
                                                )}
                                                {statusColor !== "success" && (
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        sx={{ flexWrap: "wrap" }}
                                                    >
                                                        {statusColor === "error" && (
                                                            <Chip
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                                label="nenhum arquivo"
                                                            />
                                                        )}
                                                        {/* Se quiser listar o que falta, usaria 'miss' aqui, mas o backend atual manda generico */}
                                                        {miss.map((m, idx) => (
                                                            <Chip
                                                                key={idx}
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                                label={m}
                                                            />
                                                        ))}
                                                    </Stack>
                                                )}
                                            </Stack>
                                        }
                                        secondary={null}
                                    />
                                </ListItem>
                            );
                        })}
                        {!summary.length && (
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2">
                                            Nenhum item para mostrar.
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        )}
                    </List>
                </Paper>

                <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                    Deseja <b>imprimir mesmo assim</b>? Apenas os arquivos existentes
                    serão enviados à impressora.
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button
                    onClick={() => onClose(true)}
                    variant="contained"
                    startIcon={<PrintIcon />}
                >
                    Imprimir mesmo assim
                </Button>
            </DialogActions>
        </Dialog>
    );
}
