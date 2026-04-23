import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    DialogActions,
    Button,
} from "@mui/material";

export default function ConfirmPrintDialog({ open, faltando = [], onClose }) {
    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Faltam arquivos em alguns clientes</DialogTitle>
            <DialogContent dividers sx={{ maxHeight: 420 }}>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                    Deseja <b>imprimir mesmo assim</b> (apenas o que existir na pasta)?
                </Typography>
                <Paper
                    variant="outlined"
                    sx={{ maxHeight: 320, overflow: "auto", borderRadius: 1 }}
                >
                    <List dense>
                        {faltando.map((c, i) => (
                            <ListItem key={`${c.seq}-${i}`} sx={{ alignItems: "flex-start" }}>
                                <ListItemText
                                    primary={`• ${c.seq} — ${c.cliente}`}
                                    secondary={`faltando: ${c.missing?.join(", ")}`}
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button variant="contained" onClick={() => onClose(true)}>
                    Imprimir assim mesmo
                </Button>
            </DialogActions>
        </Dialog>
    );
}
