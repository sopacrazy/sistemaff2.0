import React, { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import InfoIcon from "@mui/icons-material/Info";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import DefaultAppBar from "../components/DefaultAppBar";
import L from "leaflet";

// Imagem do carro personalizado (adicione na pasta public ou src)
import carroIcone from "../img/icons/carro-top.png"; // <- Altere o caminho conforme necessário

const drawerWidth = 240;

const RastreadorPage = () => {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

  const belemCoords = [-1.4558, -48.4902];

  const [veiculos, setVeiculos] = useState([]);

  // Ícone personalizado de carro (visto de cima)
  const iconeCarro = new L.Icon({
    iconUrl: carroIcone,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  // Gerar 5 veículos aleatórios em Belém
  useEffect(() => {
    const belemCoords = [-1.4558, -48.4902]; // moveu pra dentro

    const gerarVeiculos = () => {
      const novosVeiculos = Array.from({ length: 5 }).map((_, i) => {
        const lat = belemCoords[0] + (Math.random() - 0.5) * 0.1;
        const lng = belemCoords[1] + (Math.random() - 0.5) * 0.1;
        return {
          id: i + 1,
          nome: `Caminhão ${i + 1}`,
          coords: [lat, lng],
        };
      });
      setVeiculos(novosVeiculos);
    };

    gerarVeiculos();
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Menu lateral */}
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#f5f5f5",
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <MenuIcon />
          <Typography variant="h6">Menu</Typography>
        </Box>
        <List>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <LocationOnIcon />
              </ListItemIcon>
              <ListItemText primary="Localização Atual" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <DirectionsCarIcon />
              </ListItemIcon>
              <ListItemText primary="Veículos Ativos" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="Sobre o Sistema" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Conteúdo com AppBar e Mapa */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <DefaultAppBar title="Rastreamento da Frota" />
        <Box sx={{ flexGrow: 1 }}>
          <MapContainer
            center={belemCoords}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`}
              attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
              tileSize={512}
              zoomOffset={-1}
            />

            {/* Veículos no mapa */}
            {veiculos.map((v) => (
              <Marker key={v.id} position={v.coords} icon={iconeCarro}>
                <Popup>{v.nome}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default RastreadorPage;
