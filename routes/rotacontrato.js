const express = require("express");
const router = express.Router();

module.exports = () => {
    
    // Rota para buscar os dados do funcionário no Protheus pela matrícula
    router.get("/funcionario/:matricula", async (req, res) => {
        try {
            const { matricula } = req.params;
            const poolMSSQL = req.app.locals.mssqlPool;
            
            if (!poolMSSQL) {
                return res.status(500).json({ error: "Conexão com Protheus não disponível no momento." });
            }

            const request = poolMSSQL.request();
            request.input('matricula', matricula);
            
            // Query completa buscando dados da SRA e a função na SRJ
            const query = `
                SELECT TOP 1 
                    A.RA_MAT AS matricula,
                    A.RA_NOME AS nome,
                    A.RA_CIC AS cpf,
                    A.RA_RG AS rg,
                    A.RA_ENDEREC AS endereco,
                    A.RA_COMPLEM AS complemento,
                    A.RA_BAIRRO AS bairro,
                    A.RA_MUNICIP AS cidade,
                    A.RA_ESTADO AS uf,
                    A.RA_CEP AS cep,
                    A.RA_SALARIO AS salario,
                    J.RJ_DESC AS funcao,
                    A.RA_NUMCP AS ctps,
                    A.RA_SERCP AS serie,
                    A.RA_DEPTO AS setor,
                    A.RA_ADMISSA AS admissao
                FROM SRA140 A WITH (NOLOCK)
                LEFT JOIN SRJ140 J WITH (NOLOCK) ON A.RA_CODFUNC = J.RJ_FUNCAO AND J.D_E_L_E_T_ = ''
                WHERE A.RA_FILIAL = '01' 
                  AND A.RA_MAT = @matricula 
                  AND A.D_E_L_E_T_ = ''
            `;
            
            const result = await request.query(query);
            
            if (result.recordset.length > 0) {
                const data = result.recordset[0];
                
                // Formatar dados do Protheus (trim)
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'string') {
                        data[key] = data[key].trim();
                    }
                });

                res.json(data);
            } else {
                res.status(404).json({ error: "Funcionário não encontrado no Protheus." });
            }

            
        } catch (error) {
            console.error("Erro ao buscar dados do funcionário:", error.message);
            res.status(500).json({ error: "Erro interno ao buscar funcionário." });
        }
    });

    return router;
};
