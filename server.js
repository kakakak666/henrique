// Importa os módulos necessários
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const port = process.env.PORT || 4000;

// Criação do app e do servidor HTTP
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Dados do jogo em memória
let jogadores = []; // Lista de jogadores conectados
let pontuacoes = {}; // Pontuação dos jogadores
// (usada para frontend)

// Lista de bandeiras (pode adicionar mais)
let bandeiras = [
  { pais: 'Brasil', url: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg' },
  { pais: 'Alemanha', url: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Flag_of_Germany.svg' },
  { pais: 'EUA', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg' },
  { pais: 'Japão', url: 'https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg' },
  { pais: 'França', url: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg' }
];

// Função utilitária para sortear uma bandeira
function obterBandeiraAleatoria() {
  return bandeiras[Math.floor(Math.random() * bandeiras.length)];
}

// Quando um jogador se conecta
io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  // Quando o jogador inicia o jogo com seu nome
  socket.on('iniciar_jogo', (nomeJogador) => {
    const bandeiraInicial = obterBandeiraAleatoria();

    const novoJogador = {
      id: socket.id,
      nome: nomeJogador,
      pontuacao: 0,
      tempo: 0,
      bandeiraAtual: bandeiraInicial // Guardamos a bandeira que ele recebeu
    };

    jogadores.push(novoJogador);
    pontuacoes[socket.id] = {
      nome: nomeJogador,
      pontuacao: 0,
      tempo: 0
    };

    // Envia a lista atualizada de jogadores para todos
    io.emit('atualizar_jogadores', jogadores);

    // Envia a primeira bandeira apenas para o jogador que começou
    io.to(socket.id).emit('bandeira', bandeiraInicial);
  });

  // Quando o jogador envia uma resposta
  socket.on('resposta', (resposta) => {
    const jogador = jogadores.find(j => j.id === socket.id);
    if (!jogador) return;

    // Verifica se a resposta está correta
    if (resposta.trim().toLowerCase() === jogador.bandeiraAtual.pais.toLowerCase()) {
      jogador.pontuacao += 10;
      pontuacoes[socket.id].pontuacao = jogador.pontuacao;
    }

    // Sorteia uma nova bandeira para esse jogador
    const novaBandeira = obterBandeiraAleatoria();
    jogador.bandeiraAtual = novaBandeira;

    // Envia a nova bandeira para esse jogador
    io.to(socket.id).emit('bandeira', novaBandeira);

    // Atualiza a pontuação de todos os jogadores
    io.emit('atualizar_pontuacao', jogadores);
  });

  // Quando um jogador desconecta
  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);

    // Remove o jogador da lista e limpa a pontuação
    jogadores = jogadores.filter(j => j.id !== socket.id);
    delete pontuacoes[socket.id];

    // Atualiza os jogadores conectados no frontend
    io.emit('atualizar_jogadores', jogadores);
  });
});

// Servindo os arquivos da pasta 'estrutura' (HTML, CSS, JS frontend)
app.use(express.static('estrutura'));

// Inicia o servidor
server.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
