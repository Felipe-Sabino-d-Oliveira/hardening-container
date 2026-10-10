const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

function criarConexaoBanco() {
    return mysql.createConnection({
        host: process.env.DB_HOST || "banco",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
}

app.get("/", (req, res) => {
    res.json({
        mensagem: "Aplicação de demonstração de hardening funcionando.",
        endpoints: ["/health", "/db-check"]
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/db-check", async (req, res) => {
    let conexao;

    try {
        conexao = await criarConexaoBanco();
        const [resultado] = await conexao.query("SELECT 1 AS resultado");


        res.status(200).json({
            status: "ok",
            banco: "conectado",
            teste: resultado[0].resultado
        });


    } catch (erro) {
        console.error("Falha ao verificar a conexão com o banco.");


        res.status(503).json({
            status: "erro",
            mensagem: "Não foi possível conectar ao banco de dados."
        });


    } finally {
        if (conexao) {
            await conexao.end().catch(() => { });
        }
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor iniciado na porta ${port}`);
});
