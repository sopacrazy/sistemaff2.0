import React from "react";
import { Dialog, DialogTitle, DialogContent, Typography, DialogActions, Button } from "@mui/material";

export default function InfoDialog({ open, title, message, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title || "Informação"}</DialogTitle>
            <DialogContent dividers>
                <Typography whiteSpace="pre-wrap">{message}</Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={onClose}>
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
