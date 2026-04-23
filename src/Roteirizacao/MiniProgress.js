import React from "react";
import { Stack, Box, LinearProgress, Typography } from "@mui/material";

export default function MiniProgress({ value, label, color }) {
    const pct = Math.max(0, Math.min(100, value || 0));
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Box sx={{ width: 160 }}>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={color || "primary"}
                    sx={(t) => ({
                        height: 8,
                        borderRadius: 8,
                        "& .MuiLinearProgress-bar": {
                            borderRadius: 8,
                            backgroundColor: pct >= 100 ? t.palette.success.main : undefined,
                        },
                    })}
                />
            </Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 72, textAlign: "right" }}
            >
                {label}
            </Typography>
        </Stack>
    );
}
