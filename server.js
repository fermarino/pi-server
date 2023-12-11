const express = require('express');
const path = require('path');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

client.connect();

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dados-bibliotecas', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const dataPublicas = await client.query(
      `
      SELECT sg_uf, sum(in_biblioteca) as soma
      FROM escolas1
      WHERE sg_uf = $1 AND (tp_dependencia = 1 OR tp_dependencia = 2 OR tp_dependencia = 3)
      GROUP BY sg_uf
    `,
      [estado]
    );

    const dataPrivadas = await client.query(
      `
      SELECT sg_uf, sum(in_biblioteca) as soma
      FROM escolas1
      WHERE sg_uf = $1 AND tp_dependencia = 4
      GROUP BY sg_uf
    `,
      [estado]
    );

    res.json({
      publicas: dataPublicas.rows[0]?.soma || 0,
      privadas: dataPrivadas.rows[0]?.soma || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados da tabela biblioteca' });
  }
});

app.get('/dados-bibliotecarios-publicos', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const data = await client.query(
      `
      SELECT e.sg_uf, sum(b2.in_prof_bibliotecario) as total_bibliotecarios_publicos
      FROM escolas1 e
      JOIN biblioteca b on e.co_entidade = b.co_entidade
      JOIN bibliotecario b2 on b.id_equip = b2.id_equip
      WHERE e.sg_uf = $1 AND (e.tp_dependencia = 1 OR e.tp_dependencia = 2 OR e.tp_dependencia = 3)
      GROUP BY e.sg_uf;
    `,
      [estado]
    );

    res.json(data.rows[0] || { total_bibliotecarios_publicos: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados da tabela bibliotecario' });
  }
});

app.get('/dados-bibliotecarios-privados', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const data = await client.query(
      `
      SELECT e.sg_uf, sum(b2.in_prof_bibliotecario) as total_bibliotecarios_privados
      FROM escolas1 e
      JOIN biblioteca b on e.co_entidade = b.co_entidade
      JOIN bibliotecario b2 on b.id_equip = b2.id_equip
      WHERE e.sg_uf = $1 AND e.tp_dependencia = 4
      GROUP BY e.sg_uf;
    `,
      [estado]
    );

    res.json(data.rows[0] || { total_bibliotecarios_privados: 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados da tabela bibliotecario' });
  }
});

app.get('/dados-equipamentos', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const data = await client.query(
      `
      SELECT 
        e.sg_uf,
        sum(b.qt_desktop_aluno) as totalDeskPriv,
        sum(b.qt_equip_som) as totalSomPriv,
        sum(b.qt_equip_tv) as totalTvPriv,
        sum(b.qt_equip_multimidia) as totalMultPriv
      FROM escolas1 e
      JOIN biblioteca b on e.co_entidade = b.co_entidade
      WHERE e.sg_uf = $1
      GROUP BY e.sg_uf
    `,
      [estado]
    );

    res.json(data.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados de equipamentos' });
  }
});

app.get('/dados-equipamentos-publicos', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const data = await client.query(
      `
      SELECT
        e.sg_uf,
        sum(b.qt_desktop_aluno) as totalDesk,
        sum(b.qt_equip_som) as totalSom,
        sum(b.qt_equip_tv) as totalTv,
        sum(b.qt_equip_multimidia) as totalMult
      FROM escolas1 e
      JOIN biblioteca b on e.co_entidade = b.co_entidade
      WHERE e.sg_uf = $1 AND e.tp_dependencia in (1, 2, 3)
      GROUP BY e.sg_uf;
    `,
      [estado]
    );

    res.json(data.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados de equipamentos públicos' });
  }
});

app.get('/dados-equipamentos-privados', async (req, res) => {
  const estado = req.query.estado || '';

  try {
    const data = await client.query(
      `
      SELECT 
        e.sg_uf,
        sum(b.qt_desktop_aluno) as totalDeskPriv,
        sum(b.qt_equip_som) as totalSomPriv,
        sum(b.qt_equip_tv) as totalTvPriv,
        sum(b.qt_equip_multimidia) as totalMultPriv
      FROM escolas1 e
      JOIN biblioteca b on e.co_entidade = b.co_entidade
      WHERE e.sg_uf = $1 AND e.tp_dependencia = 4
      GROUP BY e.sg_uf;
    `,
      [estado]
    );

    res.json(data.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados de equipamentos privados' });
  }
});

app.get('/estados', async (req, res) => {
  try {
    const data = await client.query(
      `
      SELECT DISTINCT sg_uf
      FROM escolas1
    `
    );

    const estados = data.rows.map(row => row.sg_uf);
    res.json(estados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter dados de estados' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});