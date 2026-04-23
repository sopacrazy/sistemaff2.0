// Crie a pasta 'components' e dentro dela o arquivo 'GerenciadorFilters.js'

import React from "react";
import { Input, Select, DatePicker, Space, Checkbox } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

const GerenciadorFilters = ({
  filtro,
  setFiltro,
  pesquisa,
  setPesquisa,
  dataFiltro,
  setDataFiltro,
  apenasSemFoto,
  setApenasSemFoto,
}) => {
  return (
    <Space style={{ marginBottom: "20px", flexWrap: "wrap" }}>
      <Select value={filtro} onChange={setFiltro} style={{ width: 150 }}>
        <Option value="bilhete">Bilhete</Option>
        <Option value="data">Data</Option>
        <Option value="cliente">Cliente</Option>
        <Option value="rota">Rota</Option>
        <Option value="status">Status</Option>
      </Select>

      {filtro === "data" ? (
        <DatePicker
          format="DD/MM/YYYY"
          onChange={setDataFiltro}
          value={dataFiltro}
        />
      ) : (
        <Input
          placeholder={`Pesquisar por ${filtro}...`}
          prefix={<SearchOutlined />}
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          style={{ width: 200 }}
        />
      )}

      <Checkbox
        checked={apenasSemFoto}
        onChange={(e) => setApenasSemFoto(e.target.checked)}
      >
        Apenas entregas <strong>sem foto</strong>
      </Checkbox>
    </Space>
  );
};

// React.memo impede que o componente renderize se suas props não mudarem
export default React.memo(GerenciadorFilters);
