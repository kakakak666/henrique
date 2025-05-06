const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const schedule = require('node-schedule');
const app = express();

const BASE_DIR = 'salas';

// Garante que a pasta base exista
fs.ensureDirSync(BASE_DIR);

// Permite requisições de qualquer origem (incluindo 127.0.0.1:5500)
app.use(cors());
app.use(express.json());

// Função para deletar uma sala após 15 minutos
function agendarExclusaoSala(caminhoSala, nomeSala) {
  schedule.scheduleJob(Date.now() + 900000, () => {  // 900000ms = 15 minutos
    fs.remove(caminhoSala, err => {
      if (err) {
        console.log(`Erro ao excluir a sala ${nomeSala}: ${err}`);
      } else {
        console.log(`Sala ${nomeSala} excluída automaticamente após 15 minutos.`);
      }
    });
  });
}

// Rota para criar uma sala
app.post('/sala', (req, res) => {
  const timestamp = new Date().toISOString().replace(/[-:.T]/g, '');
  const nomeSala = `sala_${timestamp}`;
  const caminhoSala = path.join(BASE_DIR, nomeSala);
  fs.ensureDirSync(caminhoSala);

  // Registrar o momento da criação (opcional, para controle ou logs)
  fs.writeFileSync(path.join(caminhoSala, 'created_at.txt'), new Date().toISOString());

  // Agendar exclusão automática
  agendarExclusaoSala(caminhoSala, nomeSala);

  res.status(201).json({ mensagem: 'Sala criada', sala: nomeSala });
});

// Rota para adicionar um usuário à sala
app.post('/sala/:nomeSala/novo_usuario', (req, res) => {
  const { nomeSala } = req.params;
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome do usuário é obrigatório' });
  }

  const caminhoSala = path.join(BASE_DIR, nomeSala);
  if (!fs.existsSync(caminhoSala)) {
    return res.status(404).json({ erro: 'Sala não encontrada' });
  }

  const caminhoUsuario = path.join(caminhoSala, `${nome}.txt`);
  fs.writeFileSync(caminhoUsuario, `nome: ${nome}\npontos: 0\n`);

  res.status(201).json({ mensagem: `Usuário ${nome} adicionado à sala ${nomeSala}` });
});

// Rota para obter os pontos de um usuário
app.get('/sala/:nomeSala/usuario/:nomeUsuario/pontos', (req, res) => {
  const { nomeSala, nomeUsuario } = req.params;
  const caminhoUsuario = path.join(BASE_DIR, nomeSala, `${nomeUsuario}.txt`);

  if (!fs.existsSync(caminhoUsuario)) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const dadosUsuario = fs.readFileSync(caminhoUsuario, 'utf-8');
  const pontos = dadosUsuario.split('\n').find(line => line.startsWith('pontos:')).split(':')[1].trim();

  res.json({ usuario: nomeUsuario, pontos: parseInt(pontos, 10) });
});

// Rota para listar todas as salas
app.get('/salas', (req, res) => {
  if (!fs.existsSync(BASE_DIR)) {
    return res.json([]);
  }

  const salas = fs.readdirSync(BASE_DIR).filter(nome => fs.statSync(path.join(BASE_DIR, nome)).isDirectory());
  res.json(salas);
});

// Rota para atualizar os pontos de um usuário
app.post('/sala/:nomeSala/usuario/:nomeUsuario/pontos', (req, res) => {
  const { nomeSala, nomeUsuario } = req.params;
  const { pontos } = req.body;

  const caminhoUsuario = path.join(BASE_DIR, nomeSala, `${nomeUsuario}.txt`);
  if (!fs.existsSync(caminhoUsuario)) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const dadosUsuario = fs.readFileSync(caminhoUsuario, 'utf-8');
  const linhas = dadosUsuario.split('\n');

  const novoConteudo = linhas.map(linha => {
    if (linha.startsWith('pontos:')) {
      return `pontos: ${pontos}`;
    }
    return linha;
  }).join('\n');

  fs.writeFileSync(caminhoUsuario, novoConteudo);

  res.json({ mensagem: `Pontos do usuário ${nomeUsuario} atualizados para ${pontos}` });
});

// Rota para obter o ranking de uma sala
app.get('/sala/:nomeSala/ranking', (req, res) => {
  const { nomeSala } = req.params;
  const caminhoSala = path.join(BASE_DIR, nomeSala);

  if (!fs.existsSync(caminhoSala)) {
    return res.status(404).json({ erro: 'Sala não encontrada' });
  }

  const arquivos = fs.readdirSync(caminhoSala).filter(arquivo => arquivo.endsWith('.txt') && arquivo !== 'created_at.txt');
  
  const ranking = arquivos.map(arquivo => {
    const nomeUsuario = arquivo.replace('.txt', '');
    const caminhoUsuario = path.join(caminhoSala, arquivo);
    const dadosUsuario = fs.readFileSync(caminhoUsuario, 'utf-8');
    const pontos = parseInt(dadosUsuario.split('\n').find(line => line.startsWith('pontos:')).split(':')[1].trim(), 10);
    return { usuario: nomeUsuario, pontos };
  });

  // Ordena por pontos decrescentes
  ranking.sort((a, b) => b.pontos - a.pontos);

  res.json(ranking);
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
