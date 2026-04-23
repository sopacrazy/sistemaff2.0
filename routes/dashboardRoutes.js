const express = require("express");

module.exports = (dbOcorrencias) => {
  const router = express.Router();

  const fetchTotal = (query, res) => {
    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados:", err);
        return res.status(500).send(err);
      }
      const total = rows[0]?.totalValue ? parseFloat(rows[0].totalValue) : 0; // Ajuste para pegar o primeiro valor da soma total
      res.send({ total });
    });
  };

  router.get("/tipo", (req, res) => {
    const { startDate, endDate, cliente, conferente, vendedor, tipo } =
      req.query;
    let query = `
      SELECT itens_produto.tipo, SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    if (tipo) {
      query += ` AND itens_produto.tipo = '${tipo}'`;
    }
    if (vendedor) {
      query += ` AND ocorrencias.vendedor = '${vendedor}'`;
    }

    query += " GROUP BY itens_produto.tipo";

    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados por tipo:", err);
        return res.status(500).send(err);
      }
      res.send(rows);
    });
  });

  router.get("/dashboard/data", async (req, res) => {
    const { startDate, endDate, cliente, conferente, tipo, vendedor } =
      req.query; // Inclua vendedor

    let queryTipo = `
      SELECT itens_produto.tipo, SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    let queryMotivo = `
      SELECT itens_produto.motivo, itens_produto.tipo, SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    if (startDate && endDate) {
      const dateFilter = ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
      queryTipo += dateFilter;
      queryMotivo += dateFilter;
    }
    if (cliente) {
      const clienteFilter = ` AND ocorrencias.cliente = '${cliente}'`;
      queryTipo += clienteFilter;
      queryMotivo += clienteFilter;
    }
    if (conferente) {
      const conferenteFilter = ` AND ocorrencias.conferente = '${conferente}'`;
      queryTipo += conferenteFilter;
      queryMotivo += conferenteFilter;
    }
    if (tipo) {
      const tipoFilter = ` AND itens_produto.tipo = '${tipo}'`;
      queryMotivo += tipoFilter;
    }
    if (vendedor) {
      const vendedorFilter = ` AND ocorrencias.vendedor = '${vendedor}'`; // Filtro de vendedor
      queryTipo += vendedorFilter;
      queryMotivo += vendedorFilter;
    }

    queryTipo += " GROUP BY itens_produto.tipo";
    queryMotivo += " GROUP BY itens_produto.motivo, itens_produto.tipo";

    try {
      const [tipoData, motivoData] = await Promise.all([
        new Promise((resolve, reject) =>
          dbOcorrencias.query(queryTipo, (err, rows) =>
            err ? reject(err) : resolve(rows)
          )
        ),
        new Promise((resolve, reject) =>
          dbOcorrencias.query(queryMotivo, (err, rows) =>
            err ? reject(err) : resolve(rows)
          )
        ),
      ]);
      res.send({ tipo: tipoData, motivo: motivoData });
    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      res.status(500).send(err);
    }
  });

  router.get("/tipos-fixos", (req, res) => {
    const tiposFixos = ["AVARIA", "DIVERGENCIA", "FALTA", "SOBRA"];
    res.send(tiposFixos);
  });

  router.get("/tipos", (req, res) => {
    const query = `
      SELECT DISTINCT itens_produto.tipo
      FROM itens_produto
      WHERE itens_produto.D_E_L_E_T_ = ''
    `;

    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar tipos:", err);
        return res.status(500).send(err);
      }
      res.send(rows.map((row) => row.tipo)); // Retorna apenas os valores de `tipo`
    });
  });

  router.get("/motivo", (req, res) => {
    const { startDate, endDate, cliente, conferente, tipo, vendedor } =
      req.query;

    let query = `
      SELECT 
        itens_produto.motivo, 
        SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    if (tipo) {
      query += ` AND itens_produto.tipo = '${tipo}'`;
    }
    if (vendedor) {
      query += ` AND ocorrencias.vendedor = '${vendedor}'`;
    }

    query += " GROUP BY itens_produto.motivo"; // Garantir a agregação por motivo

    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados por motivo:", err);
        return res.status(500).send(err);
      }
      res.send(rows);
    });
  });

  router.get("/conferente", (req, res) => {
    const { startDate, endDate, cliente, conferente } = req.query;
    let query = `
      SELECT ocorrencias.conferente, SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
        AND itens_produto.motivo = 'ERRO OPERACIONAL'  -- Filtro para motivo "Erro Operacional"
    `;

    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }

    query += " GROUP BY ocorrencias.conferente";
    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados por conferente:", err);
        return res.status(500).send(err);
      }
      res.send(rows);
    });
  });

  router.get("/dashboard/cliente", (req, res) => {
    const { startDate, endDate, tipo, motivo, vendedor } = req.query;

    // Query principal com parâmetros dinâmicos
    let query = `
      SELECT 
        clientes.nome AS nomeCliente, 
        SUM(itens_produto.valor * itens_produto.quantidade) AS totalValue
      FROM 
        ocorrencias
      INNER JOIN 
        itens_produto 
        ON ocorrencias.id = itens_produto.ocorrencia_id
      INNER JOIN 
        clientes 
        ON ocorrencias.cliente = clientes.nome
      WHERE 
        ocorrencias.D_E_L_E_T_ = '' 
        AND itens_produto.D_E_L_E_T_ = ''
    `;

    // Lista de parâmetros para a query
    const params = [];

    // Aplicação dinâmica dos filtros
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN ? AND ?`;
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }
    if (tipo) {
      query += ` AND itens_produto.tipo = ?`;
      params.push(tipo);
    }
    if (motivo) {
      query += ` AND itens_produto.motivo = ?`;
      params.push(motivo);
    }
    if (vendedor) {
      query += ` AND ocorrencias.vendedor = ?`;
      params.push(vendedor);
    }

    // Fechamento da query com agrupamento e ordenação
    query += `
      GROUP BY clientes.nome
      ORDER BY totalValue DESC
      LIMIT 10
    `;

    // Log para depuração
    console.log("Query SQL:", query);
    console.log("Parâmetros:", params);

    // Execução da query
    dbOcorrencias.query(query, params, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados de clientes:", err);
        return res.status(500).send(err);
      }
      console.log("Resultado da query de clientes:", rows);
      res.send(rows);
    });
  });

  router.get("/cliente", (req, res) => {
    const { startDate, endDate, tipo, motivo, vendedor } = req.query;

    let query = `
      SELECT ocorrencias.cliente, SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;

    // Adicione os filtros recebidos
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (tipo) {
      query += ` AND itens_produto.tipo = '${tipo}'`;
    }
    if (motivo) {
      query += ` AND itens_produto.motivo = '${motivo}'`;
    }
    if (vendedor) {
      query += ` AND ocorrencias.vendedor = '${vendedor}'`;
    }

    query += " GROUP BY ocorrencias.cliente";

    dbOcorrencias.query(query, (err, rows) => {
      if (err) {
        console.error("Erro ao buscar dados por cliente:", err);
        return res.status(500).send(err);
      }
      res.send(rows);
    });
  });

  router.get("/total/tipo", (req, res) => {
    const { startDate, endDate, cliente, conferente } = req.query;
    let query = `
      SELECT SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    fetchTotal(query, res);
  });

  router.get("/total/motivo", (req, res) => {
    const { startDate, endDate, cliente, conferente } = req.query;
    let query = `
      SELECT SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    fetchTotal(query, res);
  });

  router.get("/total/conferente", (req, res) => {
    const { startDate, endDate, cliente, conferente } = req.query;
    let query = `
      SELECT SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    fetchTotal(query, res);
  });

  router.get("/total/cliente", (req, res) => {
    const { startDate, endDate, cliente, conferente } = req.query;
    let query = `
      SELECT SUM(itens_produto.valor) as totalValue
      FROM ocorrencias
      JOIN itens_produto ON ocorrencias.id = itens_produto.ocorrencia_id
      WHERE ocorrencias.D_E_L_E_T_ = '' AND itens_produto.D_E_L_E_T_ = ''
    `;
    if (startDate && endDate) {
      query += ` AND ocorrencias.data BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    }
    if (cliente) {
      query += ` AND ocorrencias.cliente = '${cliente}'`;
    }
    if (conferente) {
      query += ` AND ocorrencias.conferente = '${conferente}'`;
    }
    fetchTotal(query, res);
  });

  return router;
};
