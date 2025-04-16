const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());

// Mock route para testes
app.get('/mock-resposta', (req, res) => {
  const caminhoMock = path.join(__dirname, 'mock', 'resposta-mock.json');
  fs.readFile(caminhoMock, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ sucesso: false, erro: err.message });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  });
});

// Rota real (mantida)
app.post('/consulta', async (req, res) => {
  try {
    const { pagina } = req.body;

    const payload = {
      consultaPersonalizada: {
        Consulta: "Power BI - Movimentação Financeira",
        Id: 9
      },
      filtros: [
        { chave: "pagina", valor: pagina.toString() }
      ]
    };

    const resposta = await fetch('https://apisistema.eduqtecnologia.com.br/emissao-consulta-personalizada/obter-dados', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token-auth': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJOb21lIjoiQWRtaW5pc3RyYWRvciIsIkxvZ2luIjoiYWRtaW5pc3RyYWRvciIsIkRvbWluaW8iOiJpcG9zIiwiUGVzc29hIjowLCJFaEFkbWluaXN0cmFkb3IiOnRydWUsIkVoU3VwZXJ2aXNvciI6ZmFsc2UsIkVoQWNlc3NvVGVtcG9yYXJpbyI6ZmFsc2UsIkNwZiI6bnVsbCwiVmFsaWRvQXRlIjoiMjAyNS0wNC0xNFQyMzozMTo0Ny4zNTk3NDc5LTAzOjAwIiwiVWx0aW1hQWx0ZXJhY2FvRGVTZW5oYSI6bnVsbCwiSWQiOjF9.pifcmttnM4Tq0aQ_kJR8bbEDnz2SHXjS9CqU9ybsCsQ'
      },
      body: JSON.stringify(payload)
    });

    const json = await resposta.json();
    res.json(json);
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
